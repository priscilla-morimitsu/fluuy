---
title: Security
description: Security requirements for input, auth, data, secrets, and AI/LLM integration
globs: []
alwaysApply: true
---

The server never trusts the client.

- Secrets live only in server contexts — never in `"use client"` files, `NEXT_PUBLIC_*`, source code, or logs. No hardcoded keys, tokens, connection strings, or private keys.
- Validate every external input on the server with a schema (Server Action args, route bodies, query params, webhooks). Validate type, shape, length, and allowed values; reject unexpected fields. Client-side validation is UX only.
- Re-check authentication on the server for every protected action. Enforce per-resource authorization (ownership/role), not just "logged in" — guard against IDOR (changing an `id` to reach another user's data). Enforce at the data-access layer, not middleware alone.
- Use parameterized queries / safe ORM APIs; never concatenate SQL with user input. Avoid `dangerouslySetInnerHTML` (sanitize if unavoidable). Allow-list dynamic fetch/redirect targets (SSRF / open redirect).
- Return only the fields the client needs; never serialize whole DB records. Error responses are generic to users; details go to server logs.
- Set security headers (CSP where feasible, `nosniff`, `Referrer-Policy`, HSTS in prod). Session cookies: `httpOnly`, `secure`, `SameSite`. Protect state-changing requests against CSRF. Validate file uploads (type, size, storage) and never trust their content.

## AI / LLM security (OWASP LLM Top 10)

When the application integrates language models (OpenAI, Anthropic, Gemini, local models):

- **Prompt injection (LLM01)**: Never interpolate raw user input directly into a system prompt. Separate system instructions from user content structurally. Treat LLM output as untrusted data — validate and sanitize before acting on it or rendering it.
- **Insecure output handling (LLM02)**: Do not pass LLM output to `eval`, `exec`, shell commands, SQL, or `dangerouslySetInnerHTML` without sanitization. If the model produces code or structured data, parse and validate it with a schema before use.
- **Training data poisoning (LLM03)**: Document the provenance of any data used for fine-tuning. Do not use user-submitted content for training without review.
- **Excessive agency (LLM08)**: Agents should operate with minimum necessary permissions. Require explicit user confirmation before irreversible tool calls (delete, send, pay). Log all agentic actions.
- **Model access controls**: API keys for AI providers are secrets — store in environment variables, never in source. Rotate keys regularly. Set spend limits and rate limits on AI provider accounts.
- **Sensitive data in prompts (LLM06)**: Do not include PII, credentials, or internal system details in prompts unless strictly necessary. Log prompts only in environments where that is approved.
- **Supply chain (LLM05)**: Pin AI SDK versions. Evaluate model cards and terms of use before adopting a new model or provider.
