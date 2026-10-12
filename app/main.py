"""
FastAPI entrypoint for the Sentiment Chatbot application.
"""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

from app.api.routes_cases import router as cases_router
from app.api.routes_chat import router as chat_router
from app.api.routes_dashboard import router as dashboard_router
from app.api.routes_health import router as health_router
from app.api.routes_privacy import router as privacy_router
from app.api.routes_session import router as session_router
from app.core.config import get_settings
from app.data.database import app_engine, init_db, vault_engine
from app.observability.tracing import TracingMiddleware

logger = structlog.get_logger(__name__)
settings = get_settings()


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Middleware that ensures every request has a unique X-Request-ID header."""

    async def dispatch(self, request: Request, call_next) -> Response:
        req_id = request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:12]}"
        request.state.request_id = req_id

        # Bind request_id to structlog context
        structlog.contextvars.bind_contextvars(request_id=req_id)

        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager for startup and shutdown."""
    logger.info(
        "app_startup",
        env=settings.app_env,
        host=settings.app_host,
        port=settings.app_port,
        db_url=settings.database_url,
    )
    # Initialize databases and create tables
    await init_db()
    logger.info("database_initialized")

    yield

    logger.info("app_shutdown")
    await app_engine.dispose()
    await vault_engine.dispose()
    logger.info("database_engines_disposed")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    application = FastAPI(
        title="Retail Customer Sentiment Analysis API",
        description="FastAPI backend for multi-agent sentiment analysis and customer care chatbot.",
        version="1.0.0",
        lifespan=lifespan,
    )

    # Middleware registration (executed in reverse order of addition)
    application.add_middleware(TracingMiddleware)
    application.add_middleware(RequestIdMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    application.include_router(health_router)
    application.include_router(chat_router)
    application.include_router(dashboard_router)
    application.include_router(privacy_router)
    application.include_router(cases_router)
    application.include_router(session_router)

    return application


app = create_app()
