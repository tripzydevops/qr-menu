# Tripzy QR Menu SaaS - LLM Model Guidelines

To prevent coding agents from reverting to deprecated or unsupported LLM models, this document outlines the strict model requirements for all AI-assisted features (such as Invoice OCR, Recipe Parsing, Menu Import, and Ingredient Density Suggestion).

---

## 🚨 Active Model Requirement (Strict)

### Use ONLY:
- **`gemini-3.1-flash-lite`**

This model is the project's current active stable model. It is fully supported on the user's API key, responds instantly (200 OK), and is 6x cheaper than standard Flash models.

---

## 🚫 Prohibited Models (DO NOT USE)

Do **NOT** use or revert to the following models:
1. **`gemini-3.5-flash`**: Do not use (causes severe server timeouts and `503 Service Unavailable` errors due to high demand on Google's API side).
2. **`gemini-1.5-flash`** (or **`gemini-flash-latest`**): This model line is **deprecated**. Do not use it as a fallback.
3. **`gemini-2.0-flash`**: Do not use (causes quota/access limitations with the active API key).
4. **`gemini-2.5-flash`**: Do not use (causes quota/access limitations and `429` rate limit errors with the active API key).

---

## 🛠️ Error Handling Policy

If `gemini-3.1-flash-lite` encounters a rate limit (`429`) or a temporary server error (`503 Service Unavailable` due to high demand):
1. **Do NOT fall back to older/deprecated models.**
2. **Do NOT fall back to mock data / dummy objects.**
3. **Instead, use the implemented retry-loop with exponential backoff** (which runs for up to 4 attempts) to handle transient errors.
4. If all retries fail, **bubble up the actual HTTP/API error** to the user interface so they are aware of the service issue, rather than showing a silent fallback.
