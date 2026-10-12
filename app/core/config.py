"""
Application configuration loaded from environment variables.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    log_level: str = "INFO"

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/app.db"
    vault_database_url: str = "sqlite+aiosqlite:///./data/vault.db"

    # PII vault encryption
    vault_encryption_key: str = ""

    # LLM providers
    llm_provider: str = "ollama"  # "ollama" (100% local) or "groq"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    groq_api_key: str = ""
    gemini_api_key: str = ""
    openai_api_key: str = ""
    stitch_api_key: str = ""

    # Models
    sentiment_model: str = "cardiffnlp/twitter-roberta-base-sentiment-latest"
    emotion_model: str = "j-hartmann/emotion-english-distilroberta-base"
    spacy_model: str = "en_core_web_sm"

    # Tier-2
    tier2_confidence_threshold: float = 0.70
    tier2_model: str = "gemini-2.0-flash"

    # Response
    response_model_fast: str = "gemini-2.0-flash"
    response_model_strong: str = "gemini-2.0-flash"

    # Limits
    max_message_length: int = 2000
    max_retries: int = 2
    request_timeout_seconds: int = 30

    # RAG (optional, fail-open lightweight retrieval)
    rag_enabled: bool = True
    rag_top_k: int = 3

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
