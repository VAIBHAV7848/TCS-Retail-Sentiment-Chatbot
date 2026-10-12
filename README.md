# Retail Customer Sentiment Analysis Chatbot (SentimentIQ)

**Winner — TCS Technology Day Hackathon, M.S. Sheshgiri College of Engineering & Technology, Belagavi (October 2026)**

A multi-agent retail care chatbot designed for real-time customer engagement, fail-closed privacy protection, two-tier sentiment analysis, and sentiment-adaptive avatar feedback. 

The system runs **100% locally out-of-the-box** using Ollama (`llama3.2:3b`), local transformer classifiers, and SQLite. No cloud API keys or external subscriptions are required to run the pipeline end-to-end.

---

## 🎬 Product Demo & Launch Video

<p align="center">
  <a href="https://github.com/VAIBHAV7848/TCS-Retail-Sentiment-Chatbot/raw/main/docs/assets/brag.mp4">
    <img src="docs/assets/demo.gif" alt="SentimentIQ Product Launch Demo" width="100%" style="border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.4);" />
  </a>
</p>

<p align="center">
  <em>▶ <strong>Watch the full 1080p launch video with audio (42s):</strong> <a href="https://github.com/VAIBHAV7848/TCS-Retail-Sentiment-Chatbot/raw/main/docs/assets/brag.mp4"><code>docs/assets/brag.mp4</code></a></em>
</p>

---

## Architecture & Data Flow

```
Customer Message
    │
    ▼
Agent 1: Preprocessing
    • Normalizes unicode, strips control codes, collapses excessive whitespace.
    • Preserves casing, negations ("not", "never"), and emojis (critical sentiment signals).
    │
    ▼
Agent 2: PII Masking (Fail-Closed)
    • Layered detection: Checksum-validated regex (Luhn, Aadhaar) → Presidio NER →
      custom Indian pattern recognizers (PAN, UPI IDs, IFSC, +91 mobile).
    • Tokenizes sensitive values into typed placeholders ([PERSON_1], [PHONE_1], [CARD_1]).
    • Secret-to-token map is AES/Fernet-encrypted in an isolated SQLite vault DB with TTL.
    • Invariant: If masking fails or encounters unresolvable errors, the pipeline halts.
      Raw text is never forwarded to subsequent agents or models.
    │
    ▼
Agent 3: Sentiment & Emotion Analysis
    • Tier 1 (Every turn, local ~50ms):
        - Cardiff RoBERTa: 3-class polarity (negative, neutral, positive).
        - Hartmann DistilRoBERTa: 7-class granular emotion (anger, disgust, joy, etc.).
        - Rule Engine: Escalation keyword detection & urgency scoring.
    • Tier 2 (Conditional LLM Review):
        - Triggered only when confidence < 0.70, polarity/emotion diverge,
          sarcasm indicators appear, or multi-turn customer sentiment trends decline.
    │
    ▼
Agent 4: Response, Escalation & Avatar
    • Response Generation: Grounded against local policy docs via SQLite FTS5 RAG.
      Strict policy: Never autonomously authorize monetary refunds or account modifications.
    • Escalation Decision: Evaluates trigger matrices (repeat contacts, legal threats, high urgency).
      Generates structured handoff packages for human agents.
    • Avatar Directives: Maps detected emotion/urgency into facial expressions, speech rates,
      and vocal tones with transition smoothing.
    │
    ▼
Output Scan & Render
    • Agent 2 re-scans model output for accidental PII leaks before presentation.
    • Client renders synchronized avatar animation, sentiment metrics, and chat response.
```

---

## Local Models Used & Installation

The entire intelligence stack runs on local hardware (tested on modest consumer GPUs down to laptop RTX 4050, or CPU):

| Role | Model / Library | Runtime | Size / Footprint |
|------|-----------------|---------|------------------|
| **Local LLM (Generation & Tier-2)** | `llama3.2:3b` | Ollama | ~2.0 GB VRAM / RAM |
| **Sentiment Polarity** | `cardiffnlp/twitter-roberta-base-sentiment-latest` | PyTorch / Transformers | ~499 MB |
| **Emotion Classifier** | `j-hartmann/emotion-english-distilroberta-base` | PyTorch / Transformers | ~329 MB |
| **Entity Recognition** | `en_core_web_sm` | spaCy / Presidio | ~12 MB |
| **Sentiment Baseline** | `vaderSentiment` | Python stdlib/math | Zero weight footprint |

### Setting Up the Local Models

#### 1. Install & Run Ollama

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# macOS
brew install ollama
# (or download from https://ollama.com/download)

# Windows
# Download and run installer from https://ollama.com/download
```

Start the Ollama daemon and pull the model:

```bash
# Pull the 3B parameter model
ollama pull llama3.2:3b

# Start the Ollama server (listens on http://localhost:11434)
ollama serve
```

*Note: Verify the model is ready by running `ollama run llama3.2:3b "Hello"` in a terminal.*

#### 2. Install Python Dependencies & spaCy Model

```bash
python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

*Note: The Cardiff RoBERTa and Hartmann DistilRoBERTa models will download automatically from Hugging Face on the first inference pass and cache locally in `~/.cache/huggingface/`.*

---

## Running the Application

### 1. Backend

```bash
# Copy sample configuration (defaults to 100% local Ollama, no API key needed)
cp .env.example .env

# Index the local retail policy documents into SQLite FTS5
python scripts/ingest_policies.py

# Launch the FastAPI backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The web interface will be available at `http://localhost:5173`.

---

## Optional: Cloud Failover Setup

If you wish to configure a cloud provider for faster generation or cloud failover, update `.env`:

```ini
# Switch primary to Groq or keep Ollama as primary with Groq failover
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_your_key_here

# Alternatively configure Google Gemini or OpenAI
GEMINI_API_KEY=your_gemini_key_here
```

When `GROQ_API_KEY` is present, the model gateway routes calls through Groq (`openai/gpt-oss-120b` for complex reasoning, `openai/gpt-oss-20b` for rapid responses) and automatically fails over to local Ollama if network or rate limits occur.

---

## Engineering Design Decisions

### 1. Layered PII Detection vs. Single Prompt Masking
Prompting an LLM to "find and redact PII" is non-deterministic and susceptible to hallucinations and prompt injection. This pipeline utilizes:
- Deterministic regex with mathematical checksum validation (Luhn algorithm for credit cards, Verhoeff/Aadhaar format validation).
- Microsoft Presidio with spaCy NER for person names, organizations, and geographical identifiers.
- Custom recognizers tailored for Indian retail formats (PAN cards, UPI IDs, IFSC codes, Indian mobile prefixes).
- **Result:** Complete data privacy prior to any downstream model call.

### 2. Two-Tier Sentiment Analysis
Running every inbound customer sentence through an LLM introduces latency (800ms–2s) and high operating cost. 
- **Tier 1:** Local Cardiff RoBERTa + Emotion DistilRoBERTa executes in ~50ms on GPU (~120ms CPU) and handles >85% of standard interactions.
- **Tier 2:** An LLM second opinion is dispatched only when model confidence drops below 0.70, polarity contradicts emotional intensity, or customer sentiment demonstrates a negative slope across historical turns.

### 3. Zero-Dependency RAG via SQLite FTS5
Rather than managing a separate vector database cluster (e.g., Pinecone, Chroma, Qdrant) for a standard retail knowledge base, the policy retriever uses SQLite's built-in FTS5 engine paired with custom term-frequency overlap reranking. It operates in under 2ms, runs entirely in-process, and requires zero cloud infrastructure.

### 4. Asymmetric Failure Modes
- **Privacy Engine (Fail-Closed):** If the PII detector encounters an unhandled exception or the vault cannot be accessed, the pipeline immediately halts, logs an error, and returns a sanitized fallback message. No unmasked data escapes.
- **Policy Retrieval (Fail-Open):** If knowledge base retrieval fails, the pipeline logs a warning and proceeds with general empathetic reasoning rather than interrupting customer communication.

---

## API Reference

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `POST` | `/chat` | Processes inbound message through full 4-agent pipeline. |
| `POST` | `/chat/stream` | Server-Sent Events (SSE) streaming chat endpoint. |
| `POST` | `/chat/human/handoff` | Transfers session from AI agent to live human specialist. |
| `POST` | `/chat/human/send` | Bidirectional messaging for human agent desk. |
| `GET`  | `/chat/sessions/{id}/messages` | Retrieves chronological message transcript for a session. |
| `GET`  | `/chat/human/active-sessions` | Returns active customer queues for human agent console. |
| `GET`  | `/dashboard/summary` | Aggregated analytics: sentiment distribution, escalation counts. |
| `GET`  | `/cases/{id}` | Fetches masked escalation case package. |
| `POST` | `/privacy/preview` | Debug endpoint comparing raw vs. masked text. |
| `DELETE` | `/session/{id}` | Purges session data and deletes associated vault entries. |
| `GET`  | `/health` | Health check endpoint reporting database and model status. |

---

## Directory Structure

```
.
├── app/
│   ├── agents/              # 4 core agents (preprocess, privacy, sentiment, response)
│   ├── api/                 # FastAPI routes (chat, stream, human handoff, dashboard)
│   ├── core/                # Application settings (pydantic-settings) & schemas
│   ├── data/                # Database models & repositories (sessions, messages, vault)
│   ├── model_gateway/       # Gateway routing between Ollama, Groq, and templates
│   ├── observability/       # Correlation ID tracing & latency logging
│   ├── orchestration/       # Graph controller, routing logic, and policies
│   ├── privacy/             # Masker, vault, Indian PII recognizers, output scanner
│   ├── retrieval/           # SQLite FTS5 search & term-frequency reranker
│   └── sentiment/           # RoBERTa polarity, emotion model, and tier-2 reviewer
├── data/
│   └── policies/            # Markdown retail policy documents indexed by RAG
├── frontend/                # React 19 + TypeScript + Vite + Tailwind CSS interface
├── scripts/
│   └── ingest_policies.py   # CLI tool to rebuild SQLite FTS5 knowledge base
└── tests/
    ├── integration/         # Full pipeline end-to-end integration tests
    └── unit/                # Unit tests for preprocessing, privacy, and sentiment rules
```

---

## Testing

Run the test suite:

```bash
pytest tests/ -v
```

Unit test suites validate:
- Preprocessing preservation of emojis, caps, and negations.
- Regex and NER detection of Aadhaar, PAN, UPI, cards, and emails.
- Emotion mapping and escalation rule triggers.
- End-to-end multi-agent pipeline execution.

---

**Built at M.S. Sheshgiri College of Engineering & Technology, Belagavi for TCS Technology Day.**
