# Engineering Decisions

Answers to the open questions from the architecture plan.

| # | Question | Decision |
|---|---|---|
| 1 | Agent boundaries | 4 agents as defined: Preprocessing, PII Masking, Sentiment, Response+Escalation+Avatar |
| 2 | Dataset | Public (Amazon reviews subset) + synthetic retail chat messages |
| 3 | Success metrics | 80%+ 3-class sentiment accuracy, PII recall, response quality rubric |
| 4 | LLM provider | Google Gemini (free tier available). Fallback: OpenAI. External calls allowed. |
| 5 | Avatar | 2D SVG/CSS avatar with swappable expressions (MVP). Lottie if time. |
| 6 | Multilingual | English only for MVP. Hinglish flagged but not handled. |
| 7 | Batch review | Live chat is primary. Batch is secondary/optional. |
| 8 | Human handoff | Escalation banner in chat + case list panel. No separate console. |
