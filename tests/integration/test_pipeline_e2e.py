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
