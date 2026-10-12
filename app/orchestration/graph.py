"""
Orchestration Pipeline: Sequential multi-agent pipeline executing Preprocessing,
Privacy masking, Sentiment analysis, and Response generation with privacy isolation.
"""

from __future__ import annotations

import time
from typing import List, Optional
import structlog

from app.agents.preprocess_agent import preprocess
from app.agents.privacy_agent import run_privacy
from app.agents.response_agent import generate_response
from app.agents.sentiment_agent import analyze_sentiment
from app.core.schemas import (
    AvatarDirective,
    Channel,
    EscalationDecision,
    PreprocessInput,
    ResponseInput,
    ResponseOutput,
    SentimentInput,
    WorkflowState,
)
from app.orchestration.policies import validate_no_raw_text
from app.orchestration.router import determine_route
from app.privacy.output_scan import scan_output

logger = structlog.get_logger(__name__)


def _resolve_channel(channel: str | Channel) -> Channel:
    """Normalize channel string or enum to Channel enum."""
    if isinstance(channel, Channel):
        return channel
    try:
        return Channel(channel.lower())
    except Exception:
        return Channel.CHAT


async def run_pipeline(
    request_id: str | WorkflowState,
    raw_text: str = "",
    session_id: str = "",
    channel: str = "chat",
    recent_turns: Optional[List[str]] = None,
) -> WorkflowState:
    """
    Execute the 4-agent conversational workflow sequentially:

    1. Agent 1: Preprocessing (cleaning, normalization, encoding, HTML stripping).
    2. Agent 2: Privacy / PII redaction and vaulting (fail-closed security).
    3. Privacy Isolation Barrier: Purges raw_text permanently from state.
    4. Agent 3: Sentiment & Urgency Analysis (RoBERTa, DistilRoBERTa & Groq Tier-2).
    5. Dynamic Route Calculation.
    6. Agent 4: Response Generation (Groq LLM tone-adapted reply, escalation & avatar).
    7. Outbound Safety Scan: Assures no raw PII leaks in outbound messages.
    """
    start_time = time.perf_counter()

    # Support either WorkflowState directly or individual parameters
    if isinstance(request_id, WorkflowState):
        state = request_id
        request_id = state.request_id
        raw_text = state.raw_text
        session_id = state.session_id
        chan = _resolve_channel(state.channel)
        recent_turns = state.recent_turns or []
    else:
        recent_turns = recent_turns or []
        chan = _resolve_channel(channel)
        # 1. Initialize State
        state = WorkflowState(
            request_id=request_id,
            session_id=session_id,
            channel=chan,
            raw_text=raw_text,
            recent_turns=recent_turns,
        )

    # 2. Run Preprocess Agent
    try:
        prep_input = PreprocessInput(raw_text=raw_text, channel=chan)
        prep_output = preprocess(prep_input)
        state.preprocess = prep_output
        state.clean_text = prep_output.clean_text
    except Exception as e:
        logger.error("pipeline_preprocess_error", request_id=request_id, error=str(e))
        state.errors.append(f"Preprocess error: {str(e)}")
        state.clean_text = raw_text

    # 3. Run Privacy Agent (Fail-Closed)
    try:
        privacy_output = run_privacy(state.clean_text, session_id)
        state.privacy = privacy_output
        state.masked_text = privacy_output.masked_text
        if privacy_output.risk_level.value == "high" and "[CONTENT_REDACTED" in privacy_output.masked_text:
            state.failed_closed = True
    except Exception as e:
        logger.error("pipeline_privacy_error_fail_closed", request_id=request_id, error=str(e))
        state.failed_closed = True
        state.errors.append(f"Privacy error: {str(e)}")

    # 4. Mandatory Security Barrier: DROP raw_text
    state.raw_text = ""
    assert validate_no_raw_text(state), "Security invariant violated: raw_text must be empty!"

    # Fail closed check
    if state.failed_closed:
        state.route = "fail_closed"
        state.response = ResponseOutput(
            reply=(
                "I apologize, but we are unable to process your request at this time "
                "due to privacy and security validations. Please contact customer care directly."
            ),
            next_steps=["Contact support representative via phone or email."],
            escalation=EscalationDecision(),
            avatar=AvatarDirective(expression="serious", voice_tone="calm_respectful"),
            confidence=1.0,
        )
        state.metrics["latency_ms"] = round((time.perf_counter() - start_time) * 1000, 2)
        return state

    # 5. Run Sentiment Agent
    try:
        sentiment_input = SentimentInput(
            masked_text=state.masked_text,
            recent_turns=recent_turns,
            channel=chan,
        )
        sentiment_output = await analyze_sentiment(sentiment_input)
        state.sentiment = sentiment_output
    except Exception as e:
        logger.error("pipeline_sentiment_error", request_id=request_id, error=str(e))
        state.errors.append(f"Sentiment error: {str(e)}")

    # 6. Determine Route
    state.route = determine_route(state)

    # 7. Run Response Agent
    if state.sentiment is not None:
        try:
            response_input = ResponseInput(
                masked_text=state.masked_text,
                sentiment=state.sentiment,
                recent_turns=recent_turns,
            )
            response_output = await generate_response(response_input)

            # 8. Output Sanitation Scan
            cleaned_reply, warnings = scan_output(response_output.reply)
            response_output.reply = cleaned_reply
            state.response = response_output
            if warnings:
                state.metrics["output_scan_warnings"] = warnings
        except Exception as e:
            logger.error("pipeline_response_error", request_id=request_id, error=str(e))
            state.errors.append(f"Response error: {str(e)}")

    state.metrics["latency_ms"] = round((time.perf_counter() - start_time) * 1000, 2)
    return state
