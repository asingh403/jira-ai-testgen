/**
 * js/config.js
 * Langflow configuration — the single source of truth for API settings.
 *
 * Developer setup:
 *   Replace the apiKey placeholder with your actual Langflow API key.
 *   Do not commit the real key to version control.
 *
 * POC limitation:
 *   The API key is readable in browser DevTools when this file is served.
 *   This is acceptable only for local development. See README.md.
 */

export const LANGFLOW_CONFIG = Object.freeze({
  endpoint:
    "http://localhost:7860/api/v1/run/58d1b7fb-a5fe-4ef2-951f-a6e8f5fbd413",
  apiKey: "sk-9Z9XycvZ7hVcTJutMkC2srp3dLExg6U18Pzq6aBkaqc",
  outputType: "chat",
  inputType: "chat",
  requestTimeoutMs: 90_000,
  debug: false,
});
