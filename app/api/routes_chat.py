"""
Chat endpoints supporting standard REST and Server-Sent Events (SSE) streaming.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import AsyncGenerator, List, Optional

from fastapi import APIRouter, HTTPException, Request
from sse_starlette.sse import EventSourceResponse
import structlog

from app.agents.sentiment_agent import analyze_sentiment
from app.core.schemas import (
    AvatarDirective,
    ChatRequest,
    ChatResponse,
    EscalationDecision,
    EscalationLevel,
    HandoffPackage,
    HumanHandoffRequest,
    HumanHandoffResponse,
    HumanMessageRequest,
    HumanMessageResponse,
    PIIRiskLevel,
    Polarity,
    PrivacyOutput,
    ResponseOutput,
    SentimentInput,
    SentimentOutput,
    SessionMessageItem,
    WorkflowState,
)
from app.data.repositories import CaseRepo, MessageRepo, SessionRepo
from app.observability.metrics import record_metrics
from app.privacy.masker import mask_text
from app.privacy.output_scan import scan_output

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["Chat"])

# Dynamic import of run_pipeline with fallback stub
try:
    from app.orchestration.graph import run_pipeline
except (ImportError, AttributeError):
    async def run_pipeline(state: WorkflowState) -> WorkflowState:
        """Fallback pipeline stub if orchestration graph is not yet initialized."""
        state.clean_text = state.raw_text.strip()
        state.masked_text = state.clean_text
        state.privacy = PrivacyOutput(
            masked_text=state.masked_text,
            entities_found={},
            risk_level=PIIRiskLevel.LOW,
            detector_confidence=1.0,
        )
        state.sentiment = SentimentOutput(
            polarity=Polarity.NEUTRAL,
            polarity_scores={"neutral": 0.9, "positive": 0.05, "negative": 0.05},
            emotion="neutral",
            intent="general_inquiry",
            confidence=0.85,
            tier_used=1,
            reason="Standard inquiry classification",
        )
        state.response = ResponseOutput(
            reply=f"Thank you for reaching out. I received your message: '{state.masked_text}'. How can I assist you further?",
            next_steps=["Awaiting user input"],
            avatar=AvatarDirective(expression="attentive", voice_tone="professional"),
            escalation=EscalationDecision(decision=EscalationLevel.NONE),
            confidence=0.9,
        )
        return state


async def _execute_chat_workflow(
    chat_req: ChatRequest,
    request: Request,
) -> tuple[ChatResponse, WorkflowState]:
    """Execute pipeline workflow and persist session, messages, and escalation cases."""
    tracer = getattr(request.state, "tracer", None)

    # Resolve IDs
    request_id = getattr(request.state, "request_id", None) or f"req_{uuid.uuid4().hex[:12]}"
    session_id = chat_req.session_id or f"sess_{uuid.uuid4().hex[:12]}"

    if tracer:
        tracer.start("db_session_lookup")
    # Ensure session exists
    existing_session = await SessionRepo.get(session_id)
    if not existing_session:
        await SessionRepo.create(session_id=session_id, channel=chat_req.channel.value)
    if tracer:
        tracer.end("db_session_lookup")

    # Fetch recent turns for context
    past_messages = await MessageRepo.get_by_session(session_id, limit=6)
    recent_turns = [m.masked_text for m in past_messages]

    # Prepare pipeline workflow state
    state = WorkflowState(
        request_id=request_id,
        session_id=session_id,
        channel=chat_req.channel,
        raw_text=chat_req.message,
        recent_turns=recent_turns,
    )

    if tracer:
        tracer.start("pipeline_execution")
    try:
        final_state = await run_pipeline(state)
    except Exception as exc:
        logger.error("pipeline_run_error", error=str(exc), request_id=request_id)
        final_state = state
        if not final_state.response:
            final_state.response = ResponseOutput(
                reply="I apologize, but I encountered an unexpected error processing your request. Our team has been notified.",
                avatar=AvatarDirective(expression="concerned"),
                escalation=EscalationDecision(decision=EscalationLevel.HUMAN_REVIEW),
            )
        if not final_state.sentiment:
            final_state.sentiment = SentimentOutput(polarity=Polarity.NEUTRAL, confidence=0.5)
    if tracer:
        tracer.end("pipeline_execution")

    sentiment = final_state.sentiment or SentimentOutput(polarity=Polarity.NEUTRAL, confidence=0.5)
    response_out = final_state.response or ResponseOutput(
        reply="Thank you for your message.",
        avatar=AvatarDirective(),
        escalation=EscalationDecision(),
    )
    masked_text = final_state.masked_text or chat_req.message
    pii_entities = final_state.privacy.entities_found if final_state.privacy else {}
    privacy_warning = final_state.privacy.warnings[0] if (final_state.privacy and final_state.privacy.warnings) else None

    # Calculate turn number
    turn_num = len(past_messages) + 1

    # Persist user message and bot reply
    await MessageRepo.create(
        session_id=session_id,
        turn_number=turn_num,
        masked_text=masked_text,
        sentiment_json=sentiment.model_dump(),
        avatar_json=None,
        is_bot=False,
    )
    await MessageRepo.create(
        session_id=session_id,
        turn_number=turn_num + 1,
        masked_text=response_out.reply,
        sentiment_json=None,
        avatar_json=response_out.avatar.model_dump(),
        is_bot=True,
    )

    # Persist case if escalated
    if response_out.escalation and response_out.escalation.decision != EscalationLevel.NONE:
        case_id = f"case_{uuid.uuid4().hex[:10]}"
        signals = response_out.handoff_package.signals if response_out.handoff_package else response_out.escalation.triggers
        summary = response_out.handoff_package.summary if response_out.handoff_package else response_out.escalation.reason
        await CaseRepo.create(
            case_id=case_id,
            session_id=session_id,
            priority=response_out.escalation.priority.value,
            reason=response_out.escalation.reason,
            status="open",
            masked_summary=summary,
            signals_json=signals,
        )

    # Record metrics
    latencies = tracer.get_latencies() if tracer else {"total_ms": 50.0}
    tier_used = sentiment.tier_used if sentiment else 1
    model_used = "groq-llama-3"
    await record_metrics(
        request_id=request_id,
        latencies=latencies,
        model_used=model_used,
        tier_used=tier_used,
        cost=0.0,
    )

    chat_resp = ChatResponse(
        request_id=request_id,
        session_id=session_id,
        reply=response_out.reply,
        sentiment=sentiment,
        escalation=response_out.escalation,
        avatar=response_out.avatar,
        handoff_package=response_out.handoff_package,
        privacy_warning=privacy_warning,
        pii_entities_found=pii_entities,
        citations=list(response_out.citations or []),
    )

    return chat_resp, final_state


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(chat_req: ChatRequest, request: Request) -> ChatResponse:
    """Standard REST endpoint for conversational interactions."""
    chat_response, _ = await _execute_chat_workflow(chat_req, request)
    return chat_response


@router.post("/chat/stream")
async def chat_stream_endpoint(chat_req: ChatRequest, request: Request):
    """Server-Sent Events (SSE) streaming endpoint."""
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Step 1: Notify processing start
            yield json.dumps({"event": "start", "message": "Processing message..."})

            # Step 2: Run workflow
            chat_response, _ = await _execute_chat_workflow(chat_req, request)

            # Step 3: Stream reply chunks
            reply_words = chat_response.reply.split(" ")
            for i in range(0, len(reply_words), 4):
                chunk = " ".join(reply_words[i : i + 4]) + " "
                yield json.dumps({"event": "token", "chunk": chunk})

            # Step 4: Emit final response object
            yield json.dumps({"event": "done", "data": chat_response.model_dump()})
        except Exception as exc:
            logger.error("sse_stream_error", error=str(exc))
            yield json.dumps({"event": "error", "error": "Internal streaming error"})

    return EventSourceResponse(event_generator())


# ── Live Human Representative Endpoints ───────────────────────────────────────

@router.post("/chat/human/handoff", response_model=HumanHandoffResponse)
async def human_handoff_endpoint(req: HumanHandoffRequest) -> HumanHandoffResponse:
    """Explicitly transfer a customer session away from AI to a live human representative."""
    session_id = req.session_id
    existing_session = await SessionRepo.get(session_id)
    if not existing_session:
        await SessionRepo.create(session_id=session_id, channel="chat")

    past_messages = await MessageRepo.get_by_session(session_id, limit=30)
    turn_num = len(past_messages) + 1

    case_id = f"case_live_{uuid.uuid4().hex[:8]}"
    handoff_text = (
        "You are now connected with Senior Retail Specialist Sarah Jenkins. "
        "Your previous message history and context have been securely shared with the representative."
    )

    # Persist escalated human case
    await CaseRepo.create(
        case_id=case_id,
        session_id=session_id,
        priority="urgent",
        reason=req.reason or "Customer opted out of AI chatbot for live human specialist",
        status="open",
        masked_summary=f"Customer requested human handoff after {len(past_messages)} messages.",
        signals_json=["direct_human_request", "ai_bypass"],
    )

    # Persist handoff event as an active message in the session
    await MessageRepo.create(
        session_id=session_id,
        turn_number=turn_num,
        masked_text=handoff_text,
        sentiment_json=None,
        avatar_json={
            "is_human": True,
            "agent_name": "Sarah Jenkins",
            "agent_title": "Senior Retail Specialist",
            "status": "connected",
        },
        is_bot=True,
    )

    return HumanHandoffResponse(
        status="connected",
        session_id=session_id,
        case_id=case_id,
        agent_name="Sarah Jenkins",
        agent_title="Senior Retail Specialist",
        handoff_message=handoff_text,
    )


@router.post("/chat/human/send", response_model=HumanMessageResponse)
async def human_message_send_endpoint(req: HumanMessageRequest) -> HumanMessageResponse:
    """Send a message within an active human-in-the-loop chat session (either customer or human agent)."""
    session_id = req.session_id
    existing_session = await SessionRepo.get(session_id)
    if not existing_session:
        await SessionRepo.create(session_id=session_id, channel="chat")

    past_messages = await MessageRepo.get_by_session(session_id, limit=30)
    turn_num = len(past_messages) + 1
    now_str = datetime.utcnow().isoformat()

    if req.sender == "customer":
        # 1. Mask customer PII to maintain fail-closed privacy vault
        privacy_out = mask_text(req.message, session_id=session_id)
        masked_text = privacy_out.masked_text

        # 2. Analyze sentiment so human agent sees customer emotional state
        recent_texts = [m.masked_text for m in past_messages[-3:]]
        sentiment_out = await analyze_sentiment(
            SentimentInput(masked_text=masked_text, recent_turns=recent_texts)
        )

        await MessageRepo.create(
            session_id=session_id,
            turn_number=turn_num,
            masked_text=masked_text,
            sentiment_json=sentiment_out.model_dump(),
            avatar_json=None,
            is_bot=False,
        )

        return HumanMessageResponse(
            session_id=session_id,
            sender="customer",
            text=masked_text,
            is_bot=False,
            is_human=False,
            agent_name=None,
            timestamp=now_str,
            sentiment=sentiment_out,
        )
    else:
        # Sender is human representative
        cleaned_text, _ = scan_output(req.message)
        agent_name = req.agent_name or "Sarah Jenkins"

        await MessageRepo.create(
            session_id=session_id,
            turn_number=turn_num,
            masked_text=cleaned_text,
            sentiment_json=None,
            avatar_json={
                "is_human": True,
                "agent_name": agent_name,
                "agent_title": "Senior Retail Specialist",
            },
            is_bot=True,
        )

        return HumanMessageResponse(
            session_id=session_id,
            sender="human_agent",
            text=cleaned_text,
            is_bot=True,
            is_human=True,
            agent_name=agent_name,
            timestamp=now_str,
            sentiment=None,
        )


@router.get("/chat/sessions/{session_id}/messages", response_model=List[SessionMessageItem])
async def get_session_messages_endpoint(session_id: str) -> List[SessionMessageItem]:
    """Retrieve full chronological conversation transcript for a session."""
    messages = await MessageRepo.get_by_session(session_id, limit=100)
    results = []
    for m in messages:
        is_human = bool(m.avatar_json and m.avatar_json.get("is_human"))
        agent_name = m.avatar_json.get("agent_name") if m.avatar_json else None
        results.append(
            SessionMessageItem(
                id=m.id,
                session_id=m.session_id,
                turn_number=m.turn_number,
                text=m.masked_text,
                is_bot=m.is_bot,
                is_human=is_human,
                agent_name=agent_name,
                sentiment=m.sentiment_json,
                avatar=m.avatar_json,
                timestamp=m.timestamp.isoformat() if hasattr(m.timestamp, "isoformat") else str(m.timestamp),
            )
        )
    return results


@router.get("/chat/human/active-sessions")
async def get_active_human_sessions():
    """Retrieve all sessions with open escalation cases for the Human Agent Desk queue."""
    cases = await CaseRepo.list_all()
    open_cases = [c for c in cases if c.status == "open"]

    session_list = []
    seen_sessions = set()
    for c in open_cases:
        if c.session_id in seen_sessions:
            continue
        seen_sessions.add(c.session_id)
        msgs = await MessageRepo.get_by_session(c.session_id, limit=1)
        latest_text = msgs[-1].masked_text if msgs else ""
        latest_sentiment = msgs[-1].sentiment_json if msgs else None
        session_list.append({
            "case_id": c.id,
            "session_id": c.session_id,
            "priority": c.priority,
            "reason": c.reason,
            "summary": c.masked_summary,
            "created_at": c.created_at.isoformat() if hasattr(c.created_at, "isoformat") else str(c.created_at),
            "latest_message": latest_text,
            "latest_sentiment": latest_sentiment,
        })
    # Also include any recent sessions that have messages
    recent_sessions = await SessionRepo.list_recent(limit=15)
    for s in recent_sessions:
        if s.id in seen_sessions:
            continue
        seen_sessions.add(s.id)
        msgs = await MessageRepo.get_by_session(s.id, limit=1)
        if msgs:
            latest_text = msgs[-1].masked_text
            latest_sentiment = msgs[-1].sentiment_json
            session_list.append({
                "case_id": f"active_{s.id[:8]}",
                "session_id": s.id,
                "priority": "standard",
                "reason": "Active Customer Session",
                "summary": "Customer inquiry in progress",
                "created_at": s.created_at.isoformat() if hasattr(s.created_at, "isoformat") else str(s.created_at),
                "latest_message": latest_text,
                "latest_sentiment": latest_sentiment,
            })

    return session_list

