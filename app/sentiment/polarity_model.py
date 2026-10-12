"""
RoBERTa-based Polarity Model using CardiffNLP twitter-roberta-base-sentiment-latest.
Optimized for CUDA acceleration and lazy model loading.
"""

from __future__ import annotations

from typing import Dict, Optional
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import structlog

from app.core.config import get_settings

logger = structlog.get_logger(__name__)

_tokenizer: Optional[AutoTokenizer] = None
_model: Optional[AutoModelForSequenceClassification] = None
_device: Optional[torch.device] = None


def get_model_and_tokenizer():
    """Lazy load tokenizer and RoBERTa model to CUDA if available."""
    global _tokenizer, _model, _device
    if _model is None:
        settings = get_settings()
        model_name = settings.sentiment_model or "cardiffnlp/twitter-roberta-base-sentiment-latest"
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info("loading_polarity_model", model_name=model_name, device=str(_device))
        _tokenizer = AutoTokenizer.from_pretrained(model_name)
        _model = AutoModelForSequenceClassification.from_pretrained(model_name)
        _model.to(_device)
        _model.eval()
        logger.info("polarity_model_loaded_successfully", device=str(_device))
    return _tokenizer, _model, _device


def predict_polarity(text: str) -> Dict:
    """
    Predict sentiment polarity for input text.

    Returns:
        {
            "label": "negative" | "neutral" | "positive",
            "scores": {
                "negative": 0.85,
                "neutral": 0.10,
                "positive": 0.05
            },
            "confidence": 0.85
        }
    """
    if not text or not text.strip():
        return {
            "label": "neutral",
            "scores": {"negative": 0.0, "neutral": 1.0, "positive": 0.0},
            "confidence": 1.0,
        }

    tokenizer, model, device = get_model_and_tokenizer()

    try:
        inputs = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True,
        )
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1).squeeze(0).tolist()

        # Map labels from model config
        id2label = model.config.id2label
        # Standardize labels to lowercase: negative, neutral, positive
        label_scores: Dict[str, float] = {}
        for idx, score in enumerate(probs):
            raw_label = id2label.get(idx, str(idx)).lower()
            if "neg" in raw_label:
                normalized_label = "negative"
            elif "pos" in raw_label:
                normalized_label = "positive"
            else:
                normalized_label = "neutral"
            label_scores[normalized_label] = round(float(score), 4)

        # Fallback if any missing
        for lbl in ["negative", "neutral", "positive"]:
            label_scores.setdefault(lbl, 0.0)

        # Determine winning label
        best_label = max(label_scores, key=label_scores.get)
        confidence = label_scores[best_label]

        return {
            "label": best_label,
            "scores": label_scores,
            "confidence": confidence,
        }
    except Exception as e:
        logger.error("polarity_prediction_error", error=str(e))
        # Fallback neutral
        return {
            "label": "neutral",
            "scores": {"negative": 0.33, "neutral": 0.34, "positive": 0.33},
            "confidence": 0.34,
        }
