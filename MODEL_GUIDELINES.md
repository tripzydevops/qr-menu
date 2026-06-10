# Tripzy QR Menu SaaS - LLM Model Guidelines

To prevent coding agents from reverting to deprecated or unsupported LLM models, this document outlines the strict model requirements for all AI-assisted features (such as Invoice OCR, Recipe Parsing, Menu Import, and Ingredient Density Suggestion).

---

## 🚨 Active Model Requirement (Strict)

### Use ONLY:
- **`gemini-3.5-flash`**

This model is the project's current active stable model, configured in the user's settings, and fully verified to work with the API key (returning `200 OK` on requests).

---

## 🚫 Prohibited Models (DO NOT USE)

Do **NOT** use or revert to the following models:
1. **`gemini-1.5-flash`** (or **`gemini-flash-latest`**): This model line is **deprecated**. Do not use it as a fallback.
2. **`gemini-2.0-flash`**: Do not use (causes quota/access limitations with the active API key).
3. **`gemini-2.5-flash`**: Do not use (causes quota/access limitations and `429` rate limit errors with the active API key).

---

## 🛠️ Error Handling Policy

If `gemini-3.5-flash` encounters a rate limit (`429`) or a temporary server error (`503 Service Unavailable` due to high demand):
1. **Do NOT fall back to older/deprecated models.**
2. **Do NOT fall back to mock data / dummy objects.**
3. **Instead, use the implemented retry-loop with exponential backoff** (which runs for up to 4 attempts) to handle transient errors.
4. If all retries fail, **bubble up the actual HTTP/API error** to the user interface so they are aware of the service issue, rather than showing a silent fallback.
