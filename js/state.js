/**
 * js/state.js
 * Central application state, sessionStorage, and localStorage management.
 *
 * Responsibilities:
 *   - Own the single application state object (spec §26)
 *   - Persist session ID and conversation to sessionStorage
 *   - Persist theme to localStorage
 *   - Notify subscribers on every state change
 *
 * Must NOT:
 *   - Import api.js, ui.js, or app.js
 *   - Perform any DOM manipulation
 */

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEY_SESSION_ID = "jira_session_id";
const KEY_CONVERSATION = "jira_conversation";
const KEY_THEME = "jira_theme";

// Maximum sessionStorage size guard (bytes)
const MAX_CONVERSATION_BYTES = 4 * 1024 * 1024; // 4 MB
const MAX_CONVERSATION_MESSAGES = 100;

// ── Default state (exact shape from spec §26) ─────────────────────────────────
const DEFAULT_STATE = Object.freeze({
  sessionId: "",
  theme: "dark",
  connectionStatus: "idle", // idle | connecting | connected | active | error | offline
  issues: [],
  filteredIssues: [],
  selectedIssueKey: null,
  selectedIssueDetails: null,
  testCases: [],
  conversation: [],
  activeRequest: null, // string label | null  — owned exclusively by app.js
  filters: {
    search: "",
    status: "all",
    priority: "all",
  },
  testCaseView: "cards", // 'cards' | 'table'
});

// ── Private state ─────────────────────────────────────────────────────────────
let _state = { ...DEFAULT_STATE, filters: { ...DEFAULT_STATE.filters } };
const _listeners = new Set();

// ── Session ID ────────────────────────────────────────────────────────────────

/**
 * Generate a new session ID.
 * Uses crypto.randomUUID when available; falls back to a timestamp + random string.
 * @returns {string}
 */
function _generateSessionId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Safe fallback (spec §6)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Read the session ID from sessionStorage or create a new one.
 * Stores the ID in sessionStorage so it survives same-tab refreshes.
 * @returns {string} The current session ID
 */
function initSessionId() {
  let id = _safeGet(sessionStorage, KEY_SESSION_ID);
  if (!id) {
    id = _generateSessionId();
    _safeSet(sessionStorage, KEY_SESSION_ID, id);
  }
  _state = { ..._state, sessionId: id };
  return id;
}

// ── Theme ─────────────────────────────────────────────────────────────────────

/**
 * Read the saved theme from localStorage. Returns 'dark' when nothing is saved.
 * Called by app.js before DOMContentLoaded to restore theme early.
 * @returns {'dark'|'light'|'dim'}
 */
function getTheme() {
  return _safeGet(localStorage, KEY_THEME) || "dark";
}

/**
 * Persist a theme choice to localStorage and update application state.
 * @param {'dark'|'light'|'dim'} theme
 */
function setTheme(theme) {
  _safeSet(localStorage, KEY_THEME, theme);
  setState({ theme });
}

// ── Conversation ──────────────────────────────────────────────────────────────

/**
 * Load the conversation array from sessionStorage.
 * Returns an empty array if storage is unavailable or data is malformed.
 * @returns {Array}
 */
function loadConversation() {
  try {
    const raw = sessionStorage.getItem(KEY_CONVERSATION);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Serialize and save the conversation array to sessionStorage.
 * Prunes oldest messages if the payload exceeds the size limit.
 * @param {Array} conversation
 * @returns {Array} The (possibly pruned) conversation that was saved
 */
function _persistConversation(conversation) {
  try {
    let toSave = conversation;
    const serialized = JSON.stringify(toSave);
    if (
      serialized.length > MAX_CONVERSATION_BYTES ||
      toSave.length > MAX_CONVERSATION_MESSAGES
    ) {
      toSave = conversation.slice(-50);
    }
    _safeSet(sessionStorage, KEY_CONVERSATION, JSON.stringify(toSave));
    return toSave;
  } catch {
    return conversation;
  }
}

// ── Core state API ────────────────────────────────────────────────────────────

/**
 * Return the current application state (read-only reference).
 * @returns {object}
 */
function getState() {
  return _state;
}

/**
 * Apply a shallow patch to application state and notify all subscribers.
 * The 'conversation' key triggers automatic sessionStorage persistence.
 * The 'filters' key is merged shallowly (not replaced).
 * @param {Partial<typeof DEFAULT_STATE>} patch
 */
function setState(patch) {
  const prev = _state;

  // Shallow-merge filters sub-object when present
  const nextFilters =
    "filters" in patch
      ? { ..._state.filters, ...patch.filters }
      : _state.filters;

  _state = { ..._state, ...patch, filters: nextFilters };

  // Persist conversation whenever it changes
  if ("conversation" in patch) {
    const saved = _persistConversation(_state.conversation);
    if (saved !== _state.conversation) {
      _state = { ..._state, conversation: saved };
    }
  }

  _notify(prev, _state);
}

/**
 * Subscribe to state changes.
 * @param {(prev: object, next: object) => void} listener
 * @returns {() => void} Unsubscribe function
 */
function subscribe(listener) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function _notify(prev, next) {
  _listeners.forEach((fn) => {
    try {
      fn(prev, next);
    } catch (err) {
      // Subscriber errors must not break state management
      console.error("[state] subscriber error:", err);
    }
  });
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function _safeGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function _safeSet(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    /* quota exceeded — fail silently */
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

export {
  getState,
  setState,
  subscribe,
  initSessionId,
  getTheme,
  setTheme,
  loadConversation,
};
