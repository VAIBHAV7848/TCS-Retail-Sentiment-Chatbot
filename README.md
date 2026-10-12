# Retail Customer Sentiment Analysis Chatbot

**Winner — TCS Technology Day Hackathon, M.S. Sheshgiri College of Engineering & Technology, Belagavi (October 2026)**

A four-agent pipeline that receives retail customer messages, strips PII before any model sees the text, classifies sentiment with a fast-classifier + LLM fallback, generates grounded empathetic responses, and drives an avatar whose expression matches the customer's emotional state. Privacy-first: the system fails closed if masking breaks.

## How it works

```
Customer message
    │
    ▼
Agent 1 – Preprocessing
    Clean text, fix encoding, detect language.
    Does NOT lowercase, remove negations, or strip emojis — those carry sentiment.
    │
    ▼
Agent 2 – PII Masking
    Layered detection: regex with checksums (Luhn, Aadhaar) → Presidio NER →
    custom Indian recognizers (PAN, UPI, IFSC, +91 mobile).
    Replaces values with typed placeholders: [PERSON_1], [PHONE_1], [CARD_1].
    Mapping stored encrypted in a separate vault DB with TTL.
    If this step fails → pipeline halts. No model sees raw text.
    │
    ▼
Agent 3 – Sentiment Analysis
    Tier 1 (every message): Cardiff RoBERTa polarity + emotion DistilRoBERTa + rule engine.
    Tier 2 (when needed):  LLM structured review — triggered by low confidence,
                           sarcasm signals, model disagreement, or declining trend.
    Outputs: polarity, emotion, intent, urgency, confidence, escalation signals.
    │
    ▼
Agent 4 – Response + Escalation + Avatar
    Generates reply grounded in retrieved policy documents (RAG via SQLite FTS5).
    Decides escalation using transparent rules — never a black box.
    Produces avatar directives (expression, tone, pace) matched to sentiment.
    │
    ▼
Output PII scan (Agent 2 re-checks the response)
    │
    ▼
Customer sees reply + avatar
```

The orchestrator routes between agents, enforces timeouts, validates schemas at every boundary, and skips Tier 2 when confidence is high. RAG is fail-open (errors don't block replies). PII masking is fail-closed (errors block everything).

## Running it

**Backend:**

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

cp .env.example .env   # add your GEMINI_API_KEY or GROQ_API_KEY

python scripts/ingest_policies.py   # index policy KB
uvicorn app.main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend && npm install && npm run dev
```

UI at `localhost:5173`, API at `localhost:8000`.

## Project layout

```
app/
  agents/              Preprocessing, PII masking, sentiment, response, escalation, avatar
  api/                 Route handlers — chat, streaming, human handoff, dashboard, privacy, health
  core/                Settings (pydantic-settings) and request/response schemas
  data/                SQLAlchemy async models and repositories (sessions, messages, cases, vault)
  model_gateway/       LLM provider abstraction — Gemini primary, Groq fallback, template last resort
  observability/       Request tracing (correlation IDs) and latency metrics
  orchestration/       Pipeline graph, routing logic, shared state, escalation policies
  privacy/             Masker engine, Indian PII recognizers, encrypted vault, output scanner
  retrieval/           Lightweight RAG — FTS5 search + TF-overlap reranking, no vector DB needed
  sentiment/           Polarity model, emotion model, rule engine, LLM tier-2 review

frontend/src/
  components/          ChatWindow, AvatarPanel, PrivacyPanel, Dashboard, HumanAgentDesk, DemoButtons
  hooks/               useChat — manages session, streaming, and human handoff flow

data/policies/         Retail policy markdown docs (shipping, returns, refunds) consumed by RAG
scripts/               ingest_policies.py — rebuilds the knowledge base index
tests/                 Unit tests (preprocessing, privacy, sentiment rules, avatar) + integration e2e
```

## API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST   | `/chat` | Full pipeline — returns reply, sentiment, avatar directives, escalation |
| POST   | `/chat/stream` | Same, but SSE streaming |
| POST   | `/chat/human/handoff` | Transfer session to live human representative |
| POST   | `/chat/human/send` | Message within human-in-the-loop session |
| GET    | `/chat/sessions/{id}/messages` | Conversation transcript |
| GET    | `/chat/human/active-sessions` | Human agent queue |
| GET    | `/dashboard/summary` | Sentiment distribution, trends, escalation counts |
| GET    | `/cases/{id}` | Escalated case detail (masked) |
| POST   | `/privacy/preview` | Show raw vs masked text |
| DELETE | `/session/{id}` | Delete session + vault entries |
| GET    | `/health` | Service and model health |

## Key design decisions

**Why layered PII detection instead of just an LLM?**
LLMs hallucinate. A regex with Luhn validation will never miss a valid card number. Presidio catches names the regex misses. The layers complement each other, and we never send unmasked text to an external model for detection — that defeats the purpose.

**Why two-tier sentiment instead of LLM-for-everything?**
Cost and latency. RoBERTa runs locally in ~50ms and handles 85%+ of messages correctly. The LLM tier fires only for low-confidence, sarcasm, or contradictory signals — keeping API costs proportional to difficulty, not volume.

**Why SQLite FTS5 for RAG instead of a vector database?**
For a retail policy KB with <100 documents, FTS5 + TF-overlap reranking is fast, requires zero external dependencies, and the retrieval quality is equivalent. No embeddings to maintain, no vector DB to operate.

**Why fail-closed on privacy but fail-open on RAG?**
A missed PII entity is a data leak. A missed policy snippet just means a slightly less grounded response. The risk profiles are completely different, so the failure modes should be too.

## Stack

- **Backend:** Python, FastAPI, Pydantic v2, SQLAlchemy (async), aiosqlite, structlog
- **Frontend:** React 19, Vite, TypeScript, Tailwind, Lucide, Motion, Three.js (R3F), react-ai-avatar
- **PII:** Microsoft Presidio, spaCy, custom recognizers for Indian formats
- **Sentiment:** `cardiffnlp/twitter-roberta-base-sentiment-latest`, `j-hartmann/emotion-english-distilroberta-base`, VADER
- **LLM:** Google Gemini (primary), Groq Llama 3.2 (local fallback)
- **Storage:** SQLite with WAL mode, encrypted vault (Fernet, separate DB file)

## Testing

```bash
pytest tests/ -v
```

Unit tests cover preprocessing edge cases (emojis, caps, negations preserved), PII detection (Aadhaar, PAN, card numbers, phone, UPI), sentiment rule triggers, and avatar expression mapping. Integration tests run the full pipeline end-to-end.

---

Built at M.S. Sheshgiri College of Engineering & Technology, Belagavi for TCS Technology Day.
