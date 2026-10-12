"""End-to-end integration tests for FastAPI routes and multi-agent pipeline."""

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.data.database import init_db


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    await init_db()


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data


@pytest.mark.asyncio
async def test_privacy_preview_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "text": "Hi Priya Sharma, your order #ORD-1234 has been processed. Call 9845012345."
        }
        response = await ac.post("/privacy/preview", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "original" in data
        assert "masked" in data
        assert "entities" in data
        assert "9845012345" not in data["masked"]


@pytest.mark.asyncio
async def test_chat_pipeline_positive_message():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "message": "I love the new shoes! The quality is amazing and delivery was super fast! 😍",
            "session_id": f"test_session_pos_{uuid.uuid4().hex[:8]}",
        }
        response = await ac.post("/chat", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        assert "sentiment" in data
        assert data["sentiment"]["polarity"] in ["positive", "neutral"]
        assert "avatar" in data
        assert data["avatar"]["expression"] in ["warm_smile", "attentive"]
        assert data["escalation"]["decision"] == "none"


@pytest.mark.asyncio
async def test_chat_pipeline_escalation_message():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "message": "This is terrible! My order is broken and I demand an immediate refund or I'm taking legal action! Transfer me to a human!",
            "session_id": f"test_session_esc_{uuid.uuid4().hex[:8]}",
        }
        response = await ac.post("/chat", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["escalation"]["decision"] in ["urgent_human_handoff", "human_review"]
        # Avatar expression must NEVER be cheerful for angry/escalated
        assert data["avatar"]["expression"] != "warm_smile"
        assert data["handoff_package"] is not None


@pytest.mark.asyncio
async def test_dashboard_summary():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/dashboard/summary")
        assert response.status_code == 200
        data = response.json()
        assert "total_messages" in data
        assert "sentiment_distribution" in data
        assert "escalation_counts" in data


@pytest.mark.asyncio
async def test_cases_listing():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/cases")
        assert response.status_code == 200
        cases = response.json()
        assert isinstance(cases, list)


@pytest.mark.asyncio
async def test_human_handoff_and_messaging_e2e():
    """Verify customer opt-out to human specialist, seamless message relay, and queue sync."""
    session_id = f"test_human_sess_{uuid.uuid4().hex[:8]}"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Customer initiates handoff
        handoff_res = await ac.post(
            "/chat/human/handoff",
            json={
                "session_id": session_id,
                "reason": "Customer opted out of AI to speak with a human",
            },
        )
        assert handoff_res.status_code == 200
        handoff_data = handoff_res.json()
        assert handoff_data["status"] == "connected"
        assert handoff_data["agent_name"] == "Sarah Jenkins"
        assert "Sarah Jenkins" in handoff_data["handoff_message"]

        # 2. Customer sends a message with sensitive phone number
        cust_res = await ac.post(
            "/chat/human/send",
            json={
                "session_id": session_id,
                "sender": "customer",
                "message": "Hi Sarah, my order #ORD-7711 is damaged. Please call me at 9845012345.",
            },
        )
        assert cust_res.status_code == 200
        cust_data = cust_res.json()
        assert cust_data["sender"] == "customer"
        assert "9845012345" not in cust_data["text"]  # Must be masked by privacy vault
        assert cust_data["sentiment"] is not None

        # 3. Human Representative Sarah Jenkins sends a response
        agent_res = await ac.post(
            "/chat/human/send",
            json={
                "session_id": session_id,
                "sender": "human_agent",
                "message": "Hello! I am reviewing your order right now and processing an immediate replacement.",
                "agent_name": "Sarah Jenkins",
            },
        )
        assert agent_res.status_code == 200
        agent_data = agent_res.json()
        assert agent_data["is_human"] is True
        assert agent_data["agent_name"] == "Sarah Jenkins"

        # 4. Fetch full session messages to verify seamless combined transcript
        transcript_res = await ac.get(f"/chat/sessions/{session_id}/messages")
        assert transcript_res.status_code == 200
        msgs = transcript_res.json()
        assert len(msgs) >= 3  # Handoff notice + Customer msg + Agent reply
        assert any(m["is_human"] for m in msgs)

        # 5. Verify session appears in active representative desk queue
        queue_res = await ac.get("/chat/human/active-sessions")
        assert queue_res.status_code == 200
        queue_sessions = queue_res.json()
        assert any(s["session_id"] == session_id for s in queue_sessions)

