"""
Core Pydantic schemas — the shared contract for every agent, route, and test.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────────

class Channel(str, Enum):
    CHAT = "chat"
    REVIEW = "review"
    SURVEY = "survey"


class Polarity(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


class Urgency(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EscalationLevel(str, Enum):
    NONE = "none"
    FOLLOW_UP = "follow_up_flag"
    HUMAN_REVIEW = "human_review"
    URGENT_HANDOFF = "urgent_human_handoff"


class PIIRiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# ── Agent 1: Preprocessing ────────────────────────────────────────────────────

class PreprocessInput(BaseModel):
    raw_text: str
    channel: Channel = Channel.CHAT
    locale: Optional[str] = None


class PreprocessOutput(BaseModel):
    clean_text: str
    language: str = "en"
    flags: list[str] = Field(default_factory=list)
    report: dict = Field(default_factory=dict)


# ── Agent 2: Privacy / PII Masking ────────────────────────────────────────────

class PrivacyInput(BaseModel):
    clean_text: str
    session_id: str


class PrivacyOutput(BaseModel):
    masked_text: str
    entities_found: dict[str, int] = Field(default_factory=dict)
    vault_ref: Optional[str] = None
    risk_level: PIIRiskLevel = PIIRiskLevel.LOW
    detector_confidence: float = 1.0
    warnings: list[str] = Field(default_factory=list)


# ── Agent 3: Sentiment Analysis ───────────────────────────────────────────────

class SentimentInput(BaseModel):
    masked_text: str
    recent_turns: list[str] = Field(default_factory=list)
    channel: Channel = Channel.CHAT
    metadata: dict = Field(default_factory=dict)


class SentimentOutput(BaseModel):
    polarity: Polarity
    polarity_scores: dict[str, float] = Field(default_factory=dict)
    emotion: str = "neutral"
    emotion_scores: dict[str, float] = Field(default_factory=dict)
    intent: str = "general"
    topic: str = "general"
    urgency: Urgency = Urgency.LOW
    confidence: float = 0.0
    trend: str = "stable"
    escalation_signals: list[str] = Field(default_factory=list)
    tier_used: int = 1
    reason: str = ""
    evidence_spans: list[str] = Field(default_factory=list)
    degraded: bool = False


# ── Agent 4: Response, Escalation & Avatar ────────────────────────────────────

class AvatarDirective(BaseModel):
    expression: str = "attentive"
    intensity: float = 0.5
    voice_tone: str = "professional"
    speech_rate: float = 1.0
    gesture: str = "none"


class EscalationDecision(BaseModel):
    decision: EscalationLevel = EscalationLevel.NONE
    priority: Urgency = Urgency.LOW
    reason: str = ""
    triggers: list[str] = Field(default_factory=list)


class HandoffPackage(BaseModel):
    summary: str = ""
    signals: list[str] = Field(default_factory=list)
    excerpts: list[str] = Field(default_factory=list)
    policy_refs: list[str] = Field(default_factory=list)
    vault_ref: Optional[str] = None


class ResponseInput(BaseModel):
    masked_text: str
    sentiment: SentimentOutput
    recent_turns: list[str] = Field(default_factory=list)
    evidence: list[dict] = Field(default_factory=list)


class ResponseOutput(BaseModel):
    reply: str
    next_steps: list[str] = Field(default_factory=list)
    citations: list[str] = Field(default_factory=list)
    escalation: EscalationDecision = Field(default_factory=EscalationDecision)
    avatar: AvatarDirective = Field(default_factory=AvatarDirective)
    handoff_package: Optional[HandoffPackage] = None
    confidence: float = 0.0


# ── Orchestrator: Workflow State ──────────────────────────────────────────────

class WorkflowState(BaseModel):
    """Full pipeline state passed through the LangGraph graph."""
    request_id: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    session_id: str = ""
    channel: Channel = Channel.CHAT

    # Text lifecycle — raw_text is dropped after Agent 2
    raw_text: str = ""
    clean_text: str = ""
    masked_text: str = ""

    # Agent outputs
    preprocess: Optional[PreprocessOutput] = None
    privacy: Optional[PrivacyOutput] = None
    sentiment: Optional[SentimentOutput] = None
    response: Optional[ResponseOutput] = None

    # Conversation context
    recent_turns: list[str] = Field(default_factory=list)

    # Control
    route: str = ""
    errors: list[str] = Field(default_factory=list)
    metrics: dict = Field(default_factory=dict)
    failed_closed: bool = False


# ── API: Chat Request / Response ──────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None
    channel: Channel = Channel.CHAT


class ChatResponse(BaseModel):
    request_id: str
    session_id: str
    reply: str
    sentiment: SentimentOutput
    escalation: EscalationDecision
    avatar: AvatarDirective
    handoff_package: Optional[HandoffPackage] = None
    privacy_warning: Optional[str] = None
    pii_entities_found: dict[str, int] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str = "ok"
    models_loaded: dict[str, bool] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class DashboardSummary(BaseModel):
    total_messages: int = 0
    sentiment_distribution: dict[str, int] = Field(default_factory=dict)
    escalation_counts: dict[str, int] = Field(default_factory=dict)
    avg_confidence: float = 0.0
    tier2_rate: float = 0.0
    avg_latency_ms: float = 0.0


class CaseView(BaseModel):
    case_id: str
    session_id: str
    priority: str
    reason: str
    status: str
    summary: str
    signals: list[str] = Field(default_factory=list)
    created_at: str
