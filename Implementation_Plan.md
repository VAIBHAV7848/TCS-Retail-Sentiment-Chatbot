# Implementation Plan: Retail Customer Sentiment Analysis Chatbot

Task-by-task build plan for the 4-agent system described in `Agent_Architecture_Plan.md`.

**Stack:** React (Vite, Tailwind) · Python (FastAPI) · LangGraph · SQLite · Hugging Face Transformers · Presidio/spaCy · one LLM provider.

---

## 1. How to Use This Plan

**Effort scale** (we do not know the team size or deadline, so effort is relative):

| Size | Meaning |
|---|---|
| **S** | Under 2 hours |
| **M** | Half a day |
| **L** | 1 to 2 days |
| **XL** | More than 2 days (split it if possible) |

**Priority tags**

| Tag | Meaning |
|---|---|
| **[MUST]** | Required for the PS deliverables. Never cut. |
| **[SHOULD]** | Strong value. Cut only if time is short. |
| **[COULD]** | Nice to have. Do last. |

**Suggested roles** (merge or split to match your team): **BE** = backend and agents, **ML** = models, data and evaluation, **FE** = frontend and avatar, **DOC** = documentation and demo.

---

## 2. Phase Overview and Critical Path

| Phase | Name | Main outcome |
|---|---|---|
| 0 | Decisions and setup | Repo, environment, open questions answered |
| 1 | Foundation | Skeleton backend, frontend, database, graph |
| 2 | Data | Labelled, balanced, masked datasets and a frozen test set |
| 3 | Agent 1 | Preprocessing works and is tested |
| 4 | Agent 2 | PII masking works, vault, output scan, PII evaluation |
| 5 | Agent 3 | Sentiment, emotion, rules and tier-2 LLM, with measured accuracy |
| 6 | Agent 4 | Reply generation, escalation, avatar directives |
| 7 | Integration | Full pipeline in LangGraph, API, streaming |
| 8 | Frontend | Chat UI, avatar, privacy panel, dashboard |
| 9 | Evaluation | Final metrics and reports |
| 10 | Optional upgrades | RAG, fine-tuning, extras |
| 11 | Docs and demo | Documentation, demo video |
| 12 | Final QA | Freeze, dry run, submission |

**Critical path:** 0 → 1 → (3 → 4 → 5 → 6) → 7 → 9 → 11 → 12.
Phases 2 (data), 8 (frontend) and the avatar work can run **in parallel** with the agent work once Phase 1 is done.

**Parallel tracks**

| Track | Phases |
|---|---|
| Backend and agents (BE) | 1, 3, 4, 6, 7 |
| Data and models (ML) | 2, 5, 9, 10 |
| Frontend (FE) | 8, avatar assets |
| Docs and demo (DOC) | Starts in Phase 1, finishes in 11 |

---

## 3. Phase 0: Decisions and Setup

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T0.1 | Confirm the 4-agent boundaries and the open questions (Section 18 of the architecture plan) | Written decisions in `docs/decisions.md` | All | S | MUST | none |
| T0.2 | Re-read the PS photo for the cut-off success metrics, and confirm whether a dataset is provided | Metrics list confirmed | All | S | MUST | none |
| T0.3 | Choose the LLM provider, get API keys, confirm external calls are allowed | Key stored in `.env`, a test call succeeds on masked sample text | BE | S | MUST | T0.1 |
| T0.4 | Create the Git repo, branch rules, and the folder structure from the architecture plan | Repo with empty modules and a README | BE | S | MUST | none |
| T0.5 | Set up Python environment (3.10+), `requirements.txt`, pre-commit (ruff or black) | `pip install` reproduces the environment on every machine | BE | S | MUST | T0.4 |
| T0.6 | Set up the frontend project (Vite, React, Tailwind) | `npm run dev` shows a blank app | FE | S | MUST | T0.4 |
| T0.7 | Download the models: Cardiff RoBERTa, emotion DistilRoBERTa, spaCy model, and test that they load offline | Models cached, size and load time noted | ML | S | MUST | T0.5 |
| T0.8 | Create a shared task board with these task IDs | Board live | All | S | SHOULD | none |
| T0.9 | Define the definition of done and the code-review rule (one reviewer per merge) | Agreed in the README | All | S | SHOULD | T0.4 |

**Phase exit check:** the team agrees on the 4 agents, the LLM provider works, and everyone can run the repo.

---

## 4. Phase 1: Foundation

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T1.1 | FastAPI app skeleton with `/health` and config loading from `.env` | `GET /health` returns OK and model status | BE | S | MUST | T0.5 |
| T1.2 | Define Pydantic schemas for every agent's input and output (state, sentiment object, response object, avatar directive, handoff package) | `schemas.py` matches Sections 3.2, 6.5, and 7.6 of the architecture plan | BE | M | MUST | T1.1 |
| T1.3 | SQLite setup with SQLAlchemy and WAL mode. Create tables: `sessions`, `messages`, `cases`, `pii_audit`, `metrics` | Migration script creates the DB and a test inserts and reads | BE | M | MUST | T1.1 |
| T1.4 | Separate SQLite file for the PII vault (`pii_vault`) | Separate DB file created, with a TTL column | BE | S | MUST | T1.3 |
| T1.5 | LangGraph skeleton: `WorkflowState`, four placeholder nodes, conditional edges, recursion limit | A dummy message travels through all four nodes and returns a stub | BE | M | MUST | T1.2 |
| T1.6 | **Checkpointer decision**: confirm that `raw_text` is never persisted (drop it from state after masking, or skip checkpointing) | Written decision and a unit test that inspects the checkpoint for raw text | BE | S | MUST | T1.5 |
| T1.7 | Structured logging with request ID and a **log filter that rejects unmasked text** | Logs show request IDs, and a test proves raw text cannot be logged | BE | M | MUST | T1.1 |
| T1.8 | Model gateway v0: one function to call the LLM with timeout, bounded retry and JSON schema validation | `gateway.call(prompt, schema)` returns validated JSON or a clean error | BE | M | MUST | T0.3, T1.2 |
| T1.9 | Frontend app shell: chat page, layout for avatar and privacy panels, API client with mock data | Static UI renders with mocked messages | FE | M | MUST | T0.6 |
| T1.10 | Agree on the API contract: `/chat` request and response JSON | Contract in `docs/api.md`, shared by BE and FE | BE, FE | S | MUST | T1.2 |
| T1.11 | CI check: lint and tests run on each push | CI passes on the main branch | BE | S | COULD | T0.5 |

**Phase exit check:** a stub message goes from the React UI to the FastAPI endpoint, through the graph, and back, with a request ID and a masked log line.

---

## 5. Phase 2: Data Preparation (parallel with Phases 3 to 6)

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T2.1 | Select datasets: the PS dataset if provided, plus public reviews (Amazon or Yelp) and check licences | Dataset list with source, size, licence | ML | S | MUST | T0.2 |
| T2.2 | Generate **synthetic retail chat messages** (delivery, refund, quality, pricing, praise, sarcasm, repeat complaints) with templates and an LLM. Include Indian names, formats, and some Hinglish if in scope | At least 600 messages, labelled with sentiment, emotion, intent | ML | L | MUST | T0.3 |
| T2.3 | Generate **synthetic PII-laden messages** with planted entities (names, +91 phones, emails, Aadhaar, PAN, UPI, cards, order IDs, addresses), with misspelled and spaced-out variants | At least 300 messages with ground-truth entity spans | ML | L | MUST | none |
| T2.4 | Clean and deduplicate: remove empty rows, duplicates, extreme lengths | Cleaned files and a count report | ML | M | MUST | T2.1 |
| T2.5 | Map labels to positive, neutral, negative. For star-rated reviews use stars as weak labels (1 to 2 negative, 3 neutral, 4 to 5 positive) | Labelled dataset | ML | S | MUST | T2.4 |
| T2.6 | **Hand-verify a test set**: at least 300 examples (include chat and review styles, with neutral well represented). Two people label, and disagreements are resolved | Frozen `test_set_v1.csv` plus an inter-annotator note | ML, All | L | MUST | T2.2, T2.5 |
| T2.7 | Create a **balanced training set** (class weights or resampling), keeping the test set at its natural distribution | `train_balanced.csv`, `val.csv`, with a class-count table | ML | M | MUST | T2.6 |
| T2.8 | Create the **synthetic product and policy metadata** (catalog with categories, return, warranty, delivery and refund policies, FAQ) | `data/policies/*.md` and `catalog.csv` | ML | M | SHOULD | none |
| T2.9 | Write the **data quality report**: class counts, length stats, duplicates removed, label-noise findings | `docs/data_report.md` | ML | M | MUST | T2.7 |
| T2.10 | Apply Agent 2 (masking) to all datasets once it is ready, so training and testing text has placeholders | `*_masked.csv` files | ML | S | MUST | T4.8, T2.7 |

**Phase exit check:** a frozen, hand-verified, masked test set and a balanced training set exist, with a data report.

---

## 6. Phase 3: Agent 1, Preprocessing

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T3.1 | Input guards: empty check, character cap (for example 2,000), non-text detection | Unit tests pass for each rejection case | BE | S | MUST | T1.2 |
| T3.2 | Unicode and encoding fix (`ftfy`), control character removal, whitespace collapse | Unit tests pass | BE | S | MUST | T3.1 |
| T3.3 | HTML and markup stripping for scraped reviews | Test with sample HTML reviews | BE | S | MUST | T3.2 |
| T3.4 | Language detection and a flag for non-English or code-mixed text | Function returns the language code, with a test on English, Hindi and Hinglish samples | BE | M | SHOULD | T3.2 |
| T3.5 | Duplicate and near-duplicate detection for batch mode | Test on a list with planted duplicates | BE | S | SHOULD | T3.2 |
| T3.6 | Optional elongation normalization (soooo → soo) that keeps the emphasis | Unit tests | BE | S | COULD | T3.2 |
| T3.7 | **Protection tests**: caps, negations, emojis, "!!!", digits and PII characters must be unchanged | Test suite proving nothing sentiment-relevant or PII-relevant is altered | BE | M | MUST | T3.2 to T3.6 |
| T3.8 | Wrap as the graph node `preprocess_node` and output the preprocessing report | Node runs inside the LangGraph skeleton | BE | S | MUST | T1.5, T3.7 |

**Phase exit check:** Agent 1 passes all unit and protection tests and runs as a graph node.

---

## 7. Phase 4: Agent 2, Privacy (PII Masking)

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T4.1 | Install Presidio and spaCy, run on sample text, and confirm default entity detection works | Notebook or script output | BE | S | MUST | T0.5 |
| T4.2 | **Custom recognizers for India and retail**: Indian mobile and +91 phones, Aadhaar (12 digits), PAN, UPI ID, IFSC, PIN code (context only), order ID and tracking ID patterns | `recognizers_india.py` with a unit test per recognizer | BE | L | MUST | T4.1 |
| T4.3 | Validators: Luhn check for cards, and Aadhaar checksum if available, to cut false positives | Tests with valid and invalid numbers | BE | M | MUST | T4.2 |
| T4.4 | Masker: typed and numbered placeholders (`[PERSON_1]`), consistent within a session, handling of overlapping entities | Tests on multi-entity messages, including repeated names | BE | M | MUST | T4.2 |
| T4.5 | Allow-list for brands, store names and product names to reduce over-masking | Config file and a test | BE | S | SHOULD | T4.4 |
| T4.6 | **Encrypted vault**: store the placeholder-to-value map with `cryptography` (Fernet), key from env, TTL, delete on session end | Store, retrieve and expire tests. The vault is a separate DB file | BE | M | MUST | T1.4, T4.4 |
| T4.7 | **Output scan**: detect PII-like strings in the generated reply, block high-risk entities, never re-insert values by default | Tests with replies that contain planted card numbers and phones | BE | M | MUST | T4.4 |
| T4.8 | Wrap as the graph node `privacy_node`. **Fail closed**: on any error, set a flag so no external call is made | Test that forces an exception and verifies the pipeline returns a safe reply | BE | M | MUST | T1.5, T4.6 |
| T4.9 | Customer-facing warning: detect card or ID numbers and add a safety note to the reply | Test scenario passes | BE | S | SHOULD | T4.8 |
| T4.10 | Optional layer 3: local contextual check on masked text for leaks like "my husband Ravi" | Test set of contextual leaks and recall change | BE, ML | M | COULD | T4.8 |
| T4.11 | **PII evaluation**: run on the synthetic PII test set. Report precision and recall per entity type, false positive rate, and misses | `docs/pii_eval.md` with a table. Recall target agreed in advance (aim as high as possible, and list the weak spots) | ML | M | MUST | T2.3, T4.8 |
| T4.12 | Tune thresholds and patterns based on the misses from T4.11 | Improved recall with no big rise in over-masking | BE, ML | M | MUST | T4.11 |
| T4.13 | **Masking impact test**: sentiment accuracy on raw vs masked text | Table in the evaluation report | ML | S | MUST | T5.3, T4.8 |

**Phase exit check:** the PII evaluation report exists, the pipeline fails closed, and the vault and output scan are tested.

---

## 8. Phase 5: Agent 3, Sentiment Analysis

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T5.1 | Evaluation harness: load a test CSV, run a model, output accuracy, macro-F1, per-class precision and recall, and confusion matrix | `evaluate.py` produces a report for any model | ML | M | MUST | T2.6 |
| T5.2 | Baselines: VADER and raw DistilBERT SST-2 (binary) for comparison | Baseline numbers recorded | ML | S | MUST | T5.1 |
| T5.3 | **Tier 1 polarity**: Cardiff RoBERTa (3-class), run on the **masked** test set | Accuracy and macro-F1 recorded. Neutral recall noted | ML | M | MUST | T5.1, T2.10 |
| T5.4 | Compare optional alternatives (nlptown, siebert, XLM-RoBERTa) on the same set | Comparison table | ML | M | SHOULD | T5.3 |
| T5.5 | **Emotion model**: DistilRoBERTa emotion, and map its labels to urgency inputs | Output of emotion scores, tested on samples | ML | M | MUST | T0.7 |
| T5.6 | **Rule layer**: escalation keywords (refund, cancel, chargeback, consumer court, fraud, legal), caps and punctuation intensity, repeat-contact counter | `rules.py` with tests | BE | M | MUST | T1.2 |
| T5.7 | **Intent and topic**: start with the LLM or zero-shot labels (delivery, refund, quality, pricing, payment, warranty, service, information, praise) | Intent accuracy checked on a labelled sample | ML | M | MUST | T1.8, T2.2 |
| T5.8 | **Conversation signals**: score the last 3 to 5 turns, compute the trend (improving, stable, declining) | Unit tests on scripted conversations | BE | M | MUST | T5.3 |
| T5.9 | **Urgency scoring** (low, medium, high, critical) from emotion, keywords, repeats, trend, optional order value tier, returning the contributing signals | Tests with expected levels for scripted cases | BE | M | MUST | T5.5, T5.6, T5.8 |
| T5.10 | **Tier-2 LLM review**: prompt for structured JSON (sentiment, emotion, topic, handoff, reason), schema validation, one retry, fallback to tier 1 | Tests with sarcasm and ambiguous examples | BE | L | MUST | T1.8 |
| T5.11 | **Trigger logic** for tier 2 (negative, confidence below 0.70, model disagreement, sentiment drop, short and ambiguous) and log how often it fires | Trigger tests and a trigger-rate figure on the test set | BE | M | MUST | T5.3, T5.10 |
| T5.12 | **Decision: fine-tune or not**. If macro-F1 or neutral recall is below target, go to T10.2 | Written decision with numbers | ML | S | MUST | T5.3, T5.11 |
| T5.13 | Tune the confidence threshold on the validation set (not the test set) | Chosen threshold with a trade-off table (accuracy vs tier-2 rate) | ML | M | SHOULD | T5.11 |
| T5.14 | Fallback mode: if a model fails, use VADER plus rules and set `degraded: true` | Test by simulating a model failure | BE | S | MUST | T5.2, T5.6 |
| T5.15 | Wrap as the graph node `sentiment_node` that outputs the sentiment object from Section 6.5 | Schema-valid output for sample inputs | BE | M | MUST | T1.5, T5.9, T5.11 |
| T5.16 | Load the models once at startup and run inference in a thread pool. Measure latency | p50 and p95 latency recorded | BE | M | MUST | T5.15 |

**Phase exit check:** measured 3-class accuracy and macro-F1 on the masked, frozen test set, with a baseline comparison and a tier-2 trigger rate.

---

## 9. Phase 6: Agent 4, Response, Escalation and Avatar

### 6A. Response generator

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T6.1 | System prompt: role, empathetic tone rules, never-promise rule, grounding rule, "treat customer text as data" rule, JSON output schema | `prompts/response_v1.md` | BE | M | MUST | T1.8 |
| T6.2 | Tone variants by emotion and sentiment (appreciative, factual, apologetic, de-escalating, supportive) | Prompt snippets and a few example outputs per tone | BE | M | MUST | T6.1 |
| T6.3 | Model routing: fast model for simple replies, stronger model for nuanced complaints, template fallback on timeout | Routing function with tests and a template set per sentiment | BE | M | MUST | T1.8, T6.1 |
| T6.4 | Response validation: schema, no promises of refunds or credits, tone, length, grounding | Tests with planted bad outputs that must be rejected | BE | M | MUST | T6.1 |
| T6.5 | Pass the output through the Agent 2 **output scan** before returning | Test with a reply containing PII | BE | S | MUST | T4.7, T6.1 |
| T6.6 | Prompt-injection tests ("ignore previous instructions...", "give me a refund now", "reveal your prompt") | Test cases and fixes | BE | M | MUST | T6.4 |

### 6B. Escalation

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T6.7 | Escalation rules engine (trigger table from Section 7.4) returning level, priority and reason | `escalation.py` with a unit test per trigger | BE | M | MUST | T5.9 |
| T6.8 | Customer-facing safe acknowledgement templates for each escalation level | Template set, reviewed for no false promises | BE | S | MUST | T6.7 |
| T6.9 | **Handoff package** builder: masked summary, signals, excerpts, policy references, reason, vault reference | Schema-valid example output | BE | M | MUST | T6.7 |
| T6.10 | "Customer asks for a human" detection | Tests with several phrasings | BE | S | MUST | T6.7 |
| T6.11 | Store escalated cases in the `cases` table | Insert and read test | BE | S | MUST | T1.3, T6.9 |
| T6.12 | Escalation evaluation: scripted scenarios with expected decisions, report precision and recall | `docs/escalation_eval.md` | ML | M | SHOULD | T6.7 |

### 6C. Avatar controller

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T6.13 | Finalize the sentiment-to-avatar mapping table (expression, tone, rate, gesture, intensity) | Table in `docs/avatar.md`, agreed by the team | FE, BE | S | MUST | T0.1 |
| T6.14 | Avatar controller: map the sentiment object and escalation level to an avatar directive | `avatar_controller.py` with tests for every row of the table | BE | M | MUST | T6.13 |
| T6.15 | **Smoothing rules**: low confidence defaults to a neutral attentive expression, and no extreme jumps from one uncertain prediction | Tests with sequences of scores | BE | M | MUST | T6.14 |
| T6.16 | Guard rule: never a cheerful expression for angry or escalated customers | Test | BE | S | MUST | T6.14 |

### 6D. Optional RAG (policy grounding)

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T6.17 | Ingest the policy docs: chunk with headings, add metadata (source ID, version), build the FAISS or Chroma index and the SQLite FTS5 index | Index builds from `data/policies` | ML | L | SHOULD | T2.8 |
| T6.18 | Hybrid retrieval and a simple rerank (or score fusion) | Retrieval test on 20 curated questions with expected sources | ML | M | SHOULD | T6.17 |
| T6.19 | Grounding check: claims must be supported by the retrieved evidence, otherwise ask or escalate | Tests where evidence is missing | BE | M | SHOULD | T6.18, T6.4 |
| T6.20 | Add citations to replies and display them in the UI | Citations visible in the response | BE, FE | S | SHOULD | T6.19 |

### 6E. Node wrapper

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T6.21 | Wrap as the graph node `response_node` that runs generation, escalation, avatar directives and the output scan | Schema-valid output matching Section 7.6 | BE | M | MUST | T6.5, T6.9, T6.14 |

**Phase exit check:** scripted scenarios return correct replies, escalation decisions and avatar directives, with no false promises and no PII in replies.

---

## 10. Phase 7: Integration

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T7.1 | Connect the four real nodes in the LangGraph, with conditional edges (skip tier 2, escalate, fail closed, degraded mode) | End-to-end run on sample messages | BE | L | MUST | T3.8, T4.8, T5.15, T6.21 |
| T7.2 | Persist masked messages, sentiment results and metrics to SQLite after each turn | Rows appear in the tables, and a test confirms **no raw PII is stored anywhere** (scan the DB) | BE | M | MUST | T7.1 |
| T7.3 | `POST /chat` endpoint with request validation, rate limiting, and timeouts | Contract matches `docs/api.md` | BE | M | MUST | T7.1, T1.10 |
| T7.4 | Streaming of the reply (WebSocket or SSE), with sentiment and avatar metadata sent first | The UI receives partial text and directives | BE | M | MUST | T7.3 |
| T7.5 | `POST /reviews/batch` that runs Agents 1 to 3 and aggregates | Upload a CSV and get a summary | BE | M | SHOULD | T7.1 |
| T7.6 | `GET /dashboard/summary`, `GET /cases/{id}`, `POST /privacy/preview`, `DELETE /session/{id}` | Endpoints return masked data only | BE | M | MUST | T7.2 |
| T7.7 | Session retention and deletion: delete messages and vault entries on request and on expiry | Test that deletion removes all traces | BE | M | MUST | T7.6 |
| T7.8 | Latency tracing per step and end to end | Metrics table filled, a p50 and p95 report | BE | M | MUST | T7.1 |
| T7.9 | Failure drills: LLM timeout, model load failure, vault failure, malformed JSON | Each drill ends in a safe reply or a clean error | BE | M | MUST | T7.1 |
| T7.10 | Security checks: authentication placeholder, input size limits, CORS, secrets not in logs | Checklist passed | BE | M | SHOULD | T7.3 |

**Phase exit check:** the complete pipeline works through the API, the database holds no raw PII, and every failure drill ends safely.

---

## 11. Phase 8: Frontend (parallel from Phase 1)

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T8.1 | Chat window: message list, input, typing indicator, error states | Works against mocked API | FE | M | MUST | T1.9 |
| T8.2 | Connect to `/chat` with streaming, and render sentiment badge and emotion chip per message | Works against the real API | FE | M | MUST | T7.4 |
| T8.3 | **Avatar panel**: SVG or Lottie avatar with an expression for each row of the mapping table | All expressions render and switch | FE | L | MUST | T6.13 |
| T8.4 | Expression transitions and smoothing in the UI (ease between states, neutral default) | Visual check of transitions | FE | M | MUST | T8.3 |
| T8.5 | **Voice**: Web Speech API with tone, pitch and rate from the avatar directive. Mute toggle and captions | Voice changes with the directive | FE | M | SHOULD | T8.3 |
| T8.6 | **Privacy panel**: raw vs masked view with highlighted entities, plus the privacy indicator in the chat | Matches `POST /privacy/preview` | FE | M | MUST | T7.6 |
| T8.7 | Escalation banner and handoff status in the chat | Shown when an escalation occurs | FE | S | MUST | T7.4 |
| T8.8 | Mock **human agent console** that shows the handoff package and the case list | Page reads from `/cases` | FE | M | SHOULD | T7.6 |
| T8.9 | **Dashboard**: sentiment distribution, trend over time, escalation count, tier-2 rate, latency (Recharts) | Charts update from the API | FE | M | MUST | T7.6 |
| T8.10 | Batch upload page for reviews with a results table | Upload works | FE | M | SHOULD | T7.5 |
| T8.11 | Citations display for RAG answers | Shown under replies | FE | S | SHOULD | T6.20 |
| T8.12 | Responsive layout, accessibility basics (contrast, captions, keyboard), and the rule that raw text is never stored in `localStorage` | Checklist passed | FE | M | SHOULD | T8.2 |
| T8.13 | Demo mode: preloaded scenario buttons for the video (happy, neutral, frustrated, angry, sensitive data, sarcasm) | One click per scenario | FE | S | SHOULD | T8.2 |

**Phase exit check:** a user can chat, see the avatar react, see the masking panel, see escalations, and view the dashboard.

---

## 12. Phase 9: Evaluation and Reporting

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T9.1 | **Final sentiment evaluation** on the frozen masked test set: accuracy, macro-F1, per-class numbers, confusion matrix, for both review-style and chat-style subsets | `docs/sentiment_eval.md`. **State whether 80%+ is met, with the numbers** | ML | M | MUST | T5.15 |
| T9.2 | Evaluate the full two-tier system (tier 1 plus tier 2) and compare with tier 1 alone | Table showing the gain and the cost of tier 2 | ML | M | MUST | T9.1 |
| T9.3 | Final PII evaluation and masking impact | `docs/pii_eval.md` updated | ML | S | MUST | T4.12, T4.13 |
| T9.4 | Escalation evaluation on scripted scenarios | `docs/escalation_eval.md` updated | ML | S | SHOULD | T6.12 |
| T9.5 | **Response quality review**: sample at least 30 replies, score with a rubric (empathy, relevance, grounding, no false promises, no PII) | Rubric results table | All | M | MUST | T7.1 |
| T9.6 | Latency and cost report (p50, p95, tier-2 rate, tokens per interaction) | Table | BE | S | MUST | T7.8 |
| T9.7 | Avatar appropriateness check (manual review of expression vs emotion across the scenarios) | Checklist | FE, All | S | SHOULD | T8.4 |
| T9.8 | Error analysis: list the main failure patterns and the planned or applied fixes | `docs/error_analysis.md` | ML | M | SHOULD | T9.1 |
| T9.9 | Limitations section (accuracy, PII misses, language limits, synthetic data) | Honest and specific | All | S | MUST | T9.1 to T9.5 |

**Phase exit check:** every claim in the documentation has a measured number behind it.

---

## 13. Phase 10: Optional Upgrades (only after Phases 1 to 9 are stable)

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T10.1 | Multilingual or Hinglish support (XLM-RoBERTa, an LLM route) and a test set | Results reported | ML | L | COULD | T5.15 |
| T10.2 | **Fine-tune RoBERTa-base** on the balanced, masked training set (2 to 3 epochs on a free GPU), then compare with the off-the-shelf model on the same frozen test set | Fine-tuned model, and a before and after table. Use it only if it wins | ML | L | COULD (MUST if T5.12 says accuracy is short) | T5.12, T2.7 |
| T10.3 | Fine-tune DistilBERT for the speed comparison | Speed and accuracy table | ML | M | COULD | T10.2 |
| T10.4 | 3D avatar or lip sync | Demo-ready | FE | XL | COULD | T8.3 |
| T10.5 | Langfuse or OpenTelemetry tracing | Traces visible | BE | M | COULD | T7.8 |
| T10.6 | Reranker model for RAG | Retrieval metrics improve | ML | M | COULD | T6.18 |
| T10.7 | Docker Compose for one-command start | `docker compose up` runs the full app | BE | M | SHOULD | T7.3, T8.2 |

---

## 14. Phase 11: Documentation and Demo

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T11.1 | **Sentiment model documentation**: model choices, baselines, comparison, thresholds, two-tier design, results | `docs/sentiment_model.md` | ML, DOC | M | MUST | T9.1, T9.2 |
| T11.2 | **Integration documentation**: architecture diagram, agent flow, API reference, how to run | `docs/integration.md`, `docs/api.md` | BE, DOC | M | MUST | T7.6 |
| T11.3 | **Privacy and compliance documentation**: what is masked, how, vault design, retention, evaluation, limitations | `docs/privacy.md` | BE, DOC | M | MUST | T9.3 |
| T11.4 | Data documentation: sources, synthetic generation method, balancing, labels, licences | `docs/data_report.md` | ML | S | MUST | T2.9 |
| T11.5 | Setup guide and README (install, `.env`, run, test, demo mode) | Someone new can run the app from the README alone | BE | M | MUST | T7.3, T8.2 |
| T11.6 | Write the **demo script** for the 7 scenarios with exact messages and the expected avatar and escalation behaviour | `docs/demo_script.md` | DOC | M | MUST | T8.13 |
| T11.7 | Record the demo video (screen and voice-over). Scenarios: happy, neutral, frustrated, angry repeat with escalation, sensitive data with the masking panel, sarcasm, dashboard | Video file | DOC, FE | L | MUST | T11.6 |
| T11.8 | Edit the video: captions, a short intro with the problem and the architecture, and a closing metrics slide | Final video | DOC | M | MUST | T11.7 |
| T11.9 | Presentation deck (optional) with the architecture, differentiators, results and limitations | Slides | DOC | M | SHOULD | T9.1 |

---

## 15. Phase 12: Final QA and Submission

| ID | Task | Output / done when | Role | Effort | Priority | Depends on |
|---|---|---|---|---|---|---|
| T12.1 | **Code freeze**. Only bug fixes after this point | Tagged release | All | S | MUST | T9.9 |
| T12.2 | Full regression: all unit tests, the 7 demo scenarios, and the failure drills | Report with pass or fail | BE, ML | M | MUST | T12.1 |
| T12.3 | **Privacy audit**: search the database, logs, checkpoints and traces for planted PII strings. Check network calls to confirm only masked text leaves the machine | Zero raw PII found, and the audit documented | BE | M | MUST | T12.1 |
| T12.4 | Fresh-machine test: clone, install, run from the README | Works without help | Any teammate | M | MUST | T11.5 |
| T12.5 | Dry-run the demo end to end with a timer, and fix rough edges | Smooth run | All | M | MUST | T11.6 |
| T12.6 | Check all numbers in the docs match the latest evaluation outputs | Consistent figures | DOC | S | MUST | T9.9 |
| T12.7 | Package the submission: code, documentation, video, test reports | Complete submission folder | All | S | MUST | all above |
| T12.8 | Keep a backup recording and offline copy of models and the demo in case of network or API failure | Backup ready | All | S | SHOULD | T11.8 |

---

## 16. Dependency Summary

```
T0 setup ──► T1 foundation ──┬──► T3 Agent 1 ──┐
                             │                 ├──► T4 Agent 2 ──┐
                             ├──► T2 data ─────┘                 │
                             │                                   ├──► T5 Agent 3 ──► T6 Agent 4 ──► T7 integration ──► T9 evaluation ──► T11 docs and demo ──► T12 QA
                             └──► T8 frontend (mock first, then live) ─────────────────────────────────────┘
```

Key hand-offs:
- Agent 2 must exist before the datasets are masked (T2.10), and before the sentiment model is evaluated (T5.3).
- The API contract (T1.10) lets the frontend start with mock data on day one.
- The avatar mapping (T6.13) is needed by both the controller (T6.14) and the UI (T8.3), so agree on it early.

---

## 17. Cut Line (what to drop first if time runs short)

**Keep at all costs (the minimum viable product):**
Agents 1 to 3 with masking, the tier-1 model and rules, a reply with escalation, a basic avatar with at least 4 expressions, the chat UI with the privacy panel, the measured accuracy report, the documentation, and the demo video.

**Drop in this order:**
1. 3D avatar and lip sync (T10.4)
2. Langfuse or OpenTelemetry (T10.5), reranker (T10.6)
3. Multilingual support (T10.1)
4. Batch review upload (T7.5, T8.10)
5. Optional RAG (T6.17 to T6.20). Replace it with a short fixed policy text in the prompt.
6. Human agent console (T8.8). Replace it with the escalation banner and case list.
7. Voice (T8.5). Use captions only.
8. Contextual PII layer 3 (T4.10)

**Never drop:** fail-closed masking, the output scan, the measured evaluation, the "no false promises" rule, and the demo video.

---

## 18. Team Working Rules

1. **Contract first.** Change schemas only through a pull request that the other side approves.
2. **Mask by default.** Any code that handles text after Agent 2 uses `masked_text`. Reviewers check for raw text in every pull request.
3. **No raw PII in test fixtures** other than the clearly fake synthetic set.
4. **Never tune on the test set.** Use the validation set for thresholds. Freeze the test set after T2.6.
5. **Measure before claiming.** Every number in the docs links to an evaluation output file.
6. **Small merges.** Merge to main at least daily. Keep main always runnable.
7. **Daily 10-minute sync** to unblock the critical path, and a mid-project checkpoint at the end of Phase 6.

---

## 19. Milestones and Gates

| Milestone | Gate (all must be true) |
|---|---|
| **M1: Walking skeleton** | A message goes from the React UI through the graph to a stub reply, with a request ID and masked logs (end of Phase 1) |
| **M2: Safe pipeline** | Agents 1 and 2 work, fail-closed is proven, and PII evaluation is done (end of Phase 4) |
| **M3: Smart pipeline** | Sentiment accuracy is measured, and tier 2 works with a known trigger rate (end of Phase 5) |
| **M4: Complete agents** | Replies, escalation and avatar directives pass the scripted scenarios (end of Phase 6) |
| **M5: Working product** | End-to-end through the API and the UI, no raw PII in the DB, and failure drills passed (end of Phases 7 and 8) |
| **M6: Evidence ready** | All evaluation reports are complete and the limitations are written (end of Phase 9) |
| **M7: Submission ready** | Documentation, demo video, a fresh-machine run and the privacy audit are complete (end of Phase 12) |

---

## 20. Progress Tracker (copy to your board)

- [ ] Phase 0: Decisions and setup (T0.1 to T0.9)
- [ ] Phase 1: Foundation (T1.1 to T1.11)
- [ ] Phase 2: Data preparation (T2.1 to T2.10)
- [ ] Phase 3: Agent 1, Preprocessing (T3.1 to T3.8)
- [ ] Phase 4: Agent 2, Privacy (T4.1 to T4.13)
- [ ] Phase 5: Agent 3, Sentiment (T5.1 to T5.16)
- [ ] Phase 6: Agent 4, Response, Escalation, Avatar (T6.1 to T6.21)
- [ ] Phase 7: Integration (T7.1 to T7.10)
- [ ] Phase 8: Frontend (T8.1 to T8.13)
- [ ] Phase 9: Evaluation (T9.1 to T9.9)
- [ ] Phase 10: Optional upgrades (T10.1 to T10.7)
- [ ] Phase 11: Documentation and demo (T11.1 to T11.9)
- [ ] Phase 12: Final QA and submission (T12.1 to T12.8)
