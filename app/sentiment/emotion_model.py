"""
Emotion Classification Model using j-hartmann/emotion-english-distilroberta-base.
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
    """Lazy load emotion tokenizer and model to CUDA if available."""
    global _tokenizer, _model, _device
    if _model is None:
        settings = get_settings()
        model_name = settings.emotion_model or "j-hartmann/emotion-english-distilroberta-base"
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info("loading_emotion_model", model_name=model_name, device=str(_device))
        _tokenizer = AutoTokenizer.from_pretrained(model_name)
        _model = AutoModelForSequenceClassification.from_pretrained(model_name)
        _model.to(_device)
        _model.eval()
        logger.info("emotion_model_loaded_successfully", device=str(_device))
    return _tokenizer, _model, _device


def predict_emotion(text: str) -> Dict:
    """
    Predict emotion category (anger, disgust, fear, joy, neutral, sadness, surprise)
    for the input text.

    Returns:
        {
            "label": "anger",
            "scores": {
                "anger": 0.75,
                "disgust": 0.05,
                ...
            },
            "confidence": 0.75
        }
    """
    if not text or not text.strip():
        return {
            "label": "neutral",
            "scores": {"neutral": 1.0},
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

        id2label = model.config.id2label
        scores: Dict[str, float] = {}
        for idx, score in enumerate(probs):
            label_name = id2label.get(idx, str(idx)).lower()
            scores[label_name] = round(float(score), 4)

        best_label = max(scores, key=scores.get)
        confidence = scores[best_label]

        return {
            "label": best_label,
            "scores": scores,
            "confidence": confidence,
        }
    except Exception as e:
        logger.error("emotion_prediction_error", error=str(e))
        return {
            "label": "neutral",
            "scores": {"neutral": 1.0},
            "confidence": 1.0,
        }
