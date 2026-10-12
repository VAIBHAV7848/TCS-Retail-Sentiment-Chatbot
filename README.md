# Retail Customer Sentiment Analysis Chatbot

> **🏆 TCS Technology Day Hackathon Winner**

A multi-agent AI chatbot that engages retail customers, detects sentiment in real time, generates empathetic responses, and recommends escalation — with privacy-first PII masking and a sentiment-adaptive avatar.

## Architecture

```
Customer → API Gateway → Orchestrator
                            ├── Agent 1: Preprocessing (clean text, preserve sentiment signal)
                            ├── Agent 2: PII Masking   (Presidio + regex + encrypted vault)
                            ├── Agent 3: Sentiment      (two-tier: RoBERTa + LLM review)
                            └── Agent 4: Response        (empathetic reply + escalation + avatar)
```

### Key Differentiators

- **Privacy by design** — dedicated PII masking agent with layered detection (regex validators, Presidio NER, custom Indian-format recognizers), encrypted vault, and output scanning
- **Two-tier sentiment analysis** — fast classifier on every message, LLM second opinion only for hard cases (low confidence, sarcasm, declining trend)
- **Sentiment-adaptive avatar** — expression, tone, and pace adapt to detected emotion
- **Explainable escalation** — rule-based triggers with model confidence, transparent handoff packages

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 · Vite · Tailwind CSS · Lucide Icons |
| **Backend** | Python · FastAPI · Pydantic v2 · SQLAlchemy (async) |
| **PII Detection** | Microsoft Presidio · spaCy · Custom regex recognizers |
| **Sentiment Models** | Cardiff RoBERTa · Emotion DistilRoBERTa · VADER baseline |
| **LLM** | Google Gemini (primary) · Groq Llama (local fallback) |
| **RAG** | SQLite FTS5 · TF-overlap reranking |
| **Storage** | SQLite (WAL mode) · Encrypted PII vault |
| **Observability** | Structured logging (structlog) · Request tracing |

## Quick Start

### Backend

```bash
# Clone and setup
git clone https://github.com/VAIBHAV7848/TCS-Retail-Sentiment-Chatbot.git
cd TCS-Retail-Sentiment-Chatbot

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Index policy knowledge base
python scripts/ingest_policies.py

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI will be available at `http://localhost:5173`.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/chat` | POST | Single message → full pipeline → reply + sentiment + avatar |
| `/chat/stream` | POST | SSE streaming variant |
| `/chat/human/handoff` | POST | Transfer session to human representative |
| `/chat/human/send` | POST | Message within live human chat |
| `/dashboard/summary` | GET | Sentiment distribution, trends, escalation stats |
| `/cases/{id}` | GET | View escalated case (masked) |
| `/privacy/preview` | POST | Demo: raw vs masked text comparison |
| `/session/{id}` | DELETE | Delete session and vault entries |
| `/health` | GET | Health and model status |

## Project Structure

```
app/
  agents/          # 4 pipeline agents (preprocess, privacy, sentiment, response)
  api/             # FastAPI route handlers
  core/            # Config, Pydantic schemas
  data/            # SQLAlchemy models, repositories
  model_gateway/   # LLM provider abstraction with fallback
  observability/   # Tracing, metrics
  orchestration/   # Pipeline graph, routing, state, policies
  privacy/         # PII masker, vault, output scan, Indian recognizers
  retrieval/       # Lightweight RAG (FTS5 + TF rerank)
  sentiment/       # Polarity/emotion models, rules, LLM tier-2
data/
  policies/        # Retail policy documents for RAG
frontend/
  src/components/  # Chat, Avatar, Dashboard, Privacy, HumanAgentDesk
scripts/           # Policy ingestion utility
tests/             # Unit and integration tests
docs/              # Architecture decisions
```

## License

This project was built for the TCS Technology Day Hackathon.
