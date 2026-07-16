/**
 * js/api.js
 * Pure HTTP transport layer for Langflow communication.
 *
 * Responsibilities:
 *   - Send Langflow requests
 *   - Apply AbortController timeout
 *   - Extract Langflow response text via four fallback paths
 *   - Throw typed errors
 *
 * Must NOT:
 *   - Import state.js
 *   - Import ui.js
 *   - Read or write activeRequest
 *   - Display toasts or call any render function
 */

import { LANGFLOW_CONFIG } from "./config.js";

// ── Typed error classes ───────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "AppError";
  }
}
export class TimeoutError extends AppError {
  constructor() {
    super("Request timed out after 90 seconds. Langflow may be busy.");
    this.name = "TimeoutError";
  }
}
export class NetworkError extends AppError {
  constructor() {
    super(
      "Unable to reach Langflow at localhost:7860. Confirm that Langflow is running and browser access is allowed.",
    );
    this.name = "NetworkError";
  }
}
export class AuthError extends AppError {
  constructor(status) {
    super(
      status === 401
        ? "Authentication failed. Verify the API key in config.js."
        : "Access denied by Langflow. Check your API key permissions.",
    );
    this.name = "AuthError";
  }
}
export class NotFoundError extends AppError {
  constructor() {
    super("Langflow flow not found. Verify the endpoint URL in config.js.");
    this.name = "NotFoundError";
  }
}
export class ServerError extends AppError {
  constructor(status) {
    super(
      `Langflow returned a server error (${status}). Check the Langflow console.`,
    );
    this.name = "ServerError";
  }
}
export class ParseError extends AppError {
  constructor(msg) {
    super(msg || "Unexpected response format from Langflow. Try again.");
    this.name = "ParseError";
  }
}

// ── Response text extraction (spec §7) ───────────────────────────────────────

/**
 * Extract the assistant message text from a Langflow response body.
 * Tries four fallback paths in order; returns the first non-empty string.
 * Logs the raw response only when LANGFLOW_CONFIG.debug === true.
 * Never logs the API key or request headers.
 *
 * @param {object} response - Parsed JSON response body
 * @returns {string} Non-empty response text
 * @throws {ParseError} When no usable text is found on any path
 */
function extractLangflowText(response) {
  if (LANGFLOW_CONFIG.debug) {
    console.debug("[api] Raw Langflow response:", response);
  }

  const candidates = [
    response?.outputs?.[0]?.outputs?.[0]?.results?.message?.text,
    response?.outputs?.[0]?.outputs?.[0]?.results?.message?.data?.text,
    response?.outputs?.[0]?.outputs?.[0]?.outputs?.message?.message,
    response?.outputs?.[0]?.outputs?.[0]?.artifacts?.message,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  throw new ParseError(
    "No usable text found in Langflow response. Verify the flow output configuration.",
  );
}

// ── Main request function ─────────────────────────────────────────────────────

/**
 * Send a chat message to Langflow and return the extracted response text.
 *
 * Uses AbortController for a 90-second timeout.
 * Never logs the API key or request headers.
 *
 * @param {string} userPrompt - The message to send
 * @param {string} sessionId  - The current browser session ID
 * @returns {Promise<string>} Extracted response text
 * @throws {TimeoutError|NetworkError|AuthError|NotFoundError|ServerError|ParseError}
 */
async function sendToLangflow(userPrompt, sessionId) {
  // Detect placeholder API key and fail fast with a clear message
  if (!LANGFLOW_CONFIG.apiKey || LANGFLOW_CONFIG.apiKey.startsWith("<PASTE_")) {
    throw new AppError(
      "API key not configured. Open js/config.js and replace the placeholder with your Langflow API key.",
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort("timeout"),
    LANGFLOW_CONFIG.requestTimeoutMs,
  );

  const body = JSON.stringify({
    output_type: LANGFLOW_CONFIG.outputType,
    input_type: LANGFLOW_CONFIG.inputType,
    input_value: userPrompt,
    session_id: sessionId,
  });

  let response;
  try {
    response = await fetch(LANGFLOW_CONFIG.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": LANGFLOW_CONFIG.apiKey,
      },
      body,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") throw new TimeoutError();
    // TypeError covers: CORS rejection, server unavailable, DNS failure, connection refused
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }

  // HTTP error classification
  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      throw new AuthError(response.status);
    if (response.status === 404) throw new NotFoundError();
    if (response.status >= 500) throw new ServerError(response.status);
    throw new AppError(`Langflow returned HTTP ${response.status}.`);
  }

  let json;
  try {
    json = await response.json();
  } catch {
    throw new ParseError("Langflow response could not be parsed as JSON.");
  }

  return extractLangflowText(json);
}

// ── Exports ───────────────────────────────────────────────────────────────────

export { sendToLangflow, extractLangflowText };
