/**
 * js/app.js
 * Application entry point and event orchestrator.
 *
 * Responsibilities (exclusively):
 *   - Request locking — state.activeRequest is set and cleared ONLY here
 *   - Operation coordination (loadIssueList, selectIssue, generateTestCases, sendChatPrompt)
 *   - State updates — calls state.setState after every operation
 *   - Parser selection — calls the correct parsers.* function for each response
 *   - UI orchestration — calls ui.render* functions after state updates
 *   - Error-to-message mapping — translates api.js errors to user-visible messages
 *   - XLSX error handling — catches xlsx-export.js errors and calls ui.renderToast
 *
 * Phase 1 implements:
 *   - DOMContentLoaded initialization
 *   - Theme restoration (first action)
 *   - Session ID initialization
 *   - Conversation history restoration
 *   - Theme selector wiring
 *   - Mobile tab navigation wiring
 *   - Send button enable/disable on textarea input
 *
 * Later phases add:
 *   - loadIssueList (Phase 4)
 *   - selectIssue   (Phase 5)
 *   - generateTestCases (Phase 6)
 *   - sendChatPrompt    (Phase 7)
 *   - clipboard + export wiring (Phase 8)
 *   - request lock integration (Phase 9)
 */

import {
  getState,
  setState,
  initSessionId,
  getTheme,
  setTheme,
  loadConversation,
} from "./state.js";

import { sendToLangflow } from "./api.js";

import {
  parseIssueList,
  parseIssueDetails,
  parseTestCaseTable,
  classifyResponse,
  testCasesToPlainText,
} from "./parsers.js";

import {
  applyTheme,
  renderHeader,
  renderConnectionStatus,
  renderDomainBadge,
  renderIssueListSkeleton,
  renderIssueList,
  renderFilteredIssueList,
  renderIssueListError,
  updateIssueSelection,
  renderDetailEmpty,
  renderDetailSkeleton,
  renderDetailError,
  renderIssueDetails,
  renderContextChip,
  renderValidationMessage,
  renderUserMessage,
  renderAssistantMessage,
  renderChatLoading,
  removeChatLoading,
  renderChatError,
  setSendButtonEnabled,
  renderTestCaseResults,
  renderToast,
  activateMobileTab,
  setRefreshButtonLoading,
  setGenerateButtonLoading,
  copyToClipboard,
  setCopySuccess,
} from "./ui.js";

import { exportToXlsx } from "./xlsx-export.js";

// ── Entry point ───────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  try {
    init();
  } catch (err) {
    // Surface any init-time error so it is never silently swallowed
    console.error("[app] Initialization error:", err);
    const header = document.getElementById("app-header");
    if (header && !header.querySelector(".init-error")) {
      const msg = document.createElement("div");
      msg.className = "init-error";
      msg.style.cssText =
        "padding:12px 24px;background:var(--danger,#e0514a);color:#fff;font-size:13px;";
      msg.textContent = `Startup error: ${err.message}. Check the browser console.`;
      header.appendChild(msg);
    }
  }
});

// ── Initialization ────────────────────────────────────────────────────────────

function init() {
  // 1. Restore saved theme — FIRST action, before anything else renders
  const savedTheme = getTheme();
  applyTheme(savedTheme);
  setState({ theme: savedTheme });

  // 2. Render application header (logo, theme selector, connection status)
  renderHeader(savedTheme);

  // 3. Initialize session ID
  const sessionId = initSessionId();
  setState({ sessionId });

  // 4. Restore conversation history from sessionStorage
  const conversation = loadConversation();
  if (conversation.length > 0) {
    setState({ conversation });
    _restoreConversationUI(conversation);
  }

  // 5. Wire all event listeners
  _wireThemeSelector();
  _wireMobileNav();
  _wireChatInput();
  _wireIssueListControls();
  _wireRefreshButton();

  // 6. Render initial panel states
  renderDetailEmpty();
  renderConnectionStatus("idle");

  // 7. Auto-load issue list on startup (spec §8.1)
  loadIssueList();
}

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST LOCK — owned exclusively by app.js
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Acquire the request lock, run an async operation, release the lock.
 * app.js is the ONLY place that sets state.activeRequest.
 */
async function _withLock(label, asyncFn) {
  const { activeRequest } = getState();
  if (activeRequest !== null) {
    renderToast(`Please wait — "${activeRequest}" is running.`, "warning");
    return false;
  }

  setState({ activeRequest: label, connectionStatus: "active" });
  renderConnectionStatus("active");
  _updateSendButtonState();

  try {
    await asyncFn();
    setState({ connectionStatus: "connected" });
    renderConnectionStatus("connected");
    return true;
  } catch (err) {
    setState({ connectionStatus: "error" });
    renderConnectionStatus("error");
    throw err;
  } finally {
    setState({ activeRequest: null });
    _updateSendButtonState();
  }
}

// ── Load Issue List (spec §8.1) ───────────────────────────────────────────────

async function loadIssueList() {
  const { sessionId } = getState();
  renderIssueListSkeleton();
  setRefreshButtonLoading(true);

  try {
    await _withLock("Loading issues", async () => {
      const text = await sendToLangflow("List all Jira issues", sessionId);
      const issues = parseIssueList(text);

      if (!issues || issues.length === 0) {
        setState({ issues: [], filteredIssues: [] });
        renderIssueListError(
          "No issues returned. Verify the Langflow backlog data.",
        );
        return;
      }

      setState({ issues, filteredIssues: issues });
      renderIssueList(issues, getState().selectedIssueKey);
      _populateStatusFilter(issues);
    });
  } catch (err) {
    renderIssueListError(_errorMessage(err));
  } finally {
    setRefreshButtonLoading(false);
  }
}

function _populateStatusFilter(issues) {
  const select = document.getElementById("filter-status");
  if (!select) return;
  const statuses = [
    ...new Set(issues.map((i) => i.status).filter(Boolean)),
  ].sort();
  const existing = Array.from(select.options).map((o) => o.value);
  statuses.forEach((s) => {
    if (!existing.includes(s)) {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      select.appendChild(opt);
    }
  });
}

// ── Select Issue / Show Details (spec §8.2) ───────────────────────────────────

async function selectIssue(issueKey) {
  if (!issueKey) return;
  const { selectedIssueKey, sessionId } = getState();

  updateIssueSelection(issueKey, selectedIssueKey);
  setState({
    selectedIssueKey: issueKey,
    selectedIssueDetails: null,
    testCases: [],
  });
  renderDetailSkeleton();
  renderContextChip(issueKey);

  try {
    await _withLock(`Loading ${issueKey}`, async () => {
      const text = await sendToLangflow(
        `Show details for ${issueKey}`,
        sessionId,
      );
      const detail = parseIssueDetails(text);
      setState({ selectedIssueDetails: detail });
      renderIssueDetails(detail);
      renderDomainBadge(detail.project_name || "");
      _wireGenerateButton(issueKey);
    });
  } catch (err) {
    renderDetailError(_errorMessage(err), issueKey);
    renderToast(_errorMessage(err), "error");
  }
}

function _wireGenerateButton(issueKey) {
  const btn = document.getElementById("btn-generate");
  if (!btn) return;
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener("click", () => generateTestCases(issueKey));
}

// ── Generate Test Cases (spec §8.3) ──────────────────────────────────────────

async function generateTestCases(issueKey) {
  if (!issueKey) return;
  const { sessionId } = getState();
  const prompt = `Generate test cases for ${issueKey}`;

  const userMsg = _makeMessage("user", prompt, "raw");
  _appendMessage(userMsg);
  renderUserMessage(userMsg);

  setGenerateButtonLoading(true);
  renderChatLoading();

  try {
    await _withLock("Generating test cases", async () => {
      const text = await sendToLangflow(prompt, sessionId);
      removeChatLoading();

      const testCases = parseTestCaseTable(text);
      if (!testCases || testCases.length === 0) {
        const msg = _makeMessage("assistant", text, "raw");
        _appendMessage(msg);
        renderAssistantMessage(msg);
        renderToast("Test cases returned in unexpected format.", "warning");
        return;
      }

      setState({ testCases });
      const msg = _makeMessage("assistant", text, "test-table");
      _appendMessage(msg);

      const { copyAllBtn, exportBtn, clearBtn } = renderTestCaseResults(
        testCases,
        issueKey,
        getState().testCaseView,
      );
      _wireCopyAll(copyAllBtn, testCases);
      _wireExportBtn(exportBtn, issueKey);
      _wireClearBtn(clearBtn);
    });
  } catch (err) {
    removeChatLoading();
    renderChatError(_errorMessage(err));
    renderToast(_errorMessage(err), "error");
  } finally {
    setGenerateButtonLoading(false);
  }
}

// ── User-Authored Chat Prompt (spec §8.4) ─────────────────────────────────────

async function sendChatPrompt(rawInput) {
  const trimmed = rawInput.trim();
  if (!trimmed) return;

  const { selectedIssueKey, sessionId, activeRequest } = getState();
  const textarea = document.getElementById("chat-textarea");

  // Issue key injection logic (spec §8.4)
  const hasExplicitKey = /[A-Z]+-\d+/i.test(trimmed);
  let prompt = trimmed;

  if (!hasExplicitKey && !selectedIssueKey) {
    renderValidationMessage(
      "Select a Jira issue or include an issue key in your request.",
    );
    setTimeout(() => renderValidationMessage(null), 4000);
    return;
  }
  if (!hasExplicitKey && selectedIssueKey) {
    prompt = `${trimmed}\n\nUse Jira issue key ${selectedIssueKey}.`;
  }

  renderValidationMessage(null);

  // Capture input BEFORE clearing (failure-restore behavior, spec correction §7)
  const capturedInput = rawInput;

  if (activeRequest !== null) {
    renderToast(`Please wait — "${activeRequest}" is running.`, "warning");
    return;
  }

  // Clear textarea AFTER lock is available (request accepted)
  if (textarea) textarea.value = "";
  _updateSendButtonState();

  const userMsg = _makeMessage("user", trimmed, "raw");
  _appendMessage(userMsg);
  renderUserMessage(userMsg);
  renderChatLoading();

  try {
    await _withLock("Chat request", async () => {
      const text = await sendToLangflow(prompt, sessionId);
      removeChatLoading();

      const type = classifyResponse(text);
      if (type === "table-testcases") {
        const testCases = parseTestCaseTable(text);
        if (testCases && testCases.length > 0) {
          setState({ testCases });
          const msg = _makeMessage("assistant", text, "test-table");
          _appendMessage(msg);
          const { copyAllBtn, exportBtn, clearBtn } = renderTestCaseResults(
            testCases,
            selectedIssueKey || "",
            getState().testCaseView,
          );
          _wireCopyAll(copyAllBtn, testCases);
          _wireExportBtn(exportBtn, selectedIssueKey || "Unknown");
          _wireClearBtn(clearBtn);
          return;
        }
      }

      const msg = _makeMessage("assistant", text, "raw");
      _appendMessage(msg);
      renderAssistantMessage(msg);
    });
  } catch (err) {
    removeChatLoading();
    renderChatError(_errorMessage(err));
    renderToast(_errorMessage(err), "error");
    // Restore captured input if textarea is still empty
    if (textarea && textarea.value.trim() === "") {
      textarea.value = capturedInput;
      _updateSendButtonState();
    }
  }
}

// ── XLSX Export ───────────────────────────────────────────────────────────────

function _triggerExport(issueKey) {
  const { testCases } = getState();
  if (!testCases || testCases.length === 0) {
    renderToast("No test cases to export.", "warning");
    return;
  }
  try {
    exportToXlsx(testCases, issueKey);
  } catch (err) {
    renderToast(`Export failed: ${err.message}`, "error");
  }
}

// ── Event wiring ──────────────────────────────────────────────────────────────

function _wireThemeSelector() {
  const buttons = document.querySelectorAll(".theme-btn[data-theme]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.theme;
      setTheme(theme);
      applyTheme(theme);
      buttons.forEach((b) => {
        const active = b.dataset.theme === theme;
        b.setAttribute("aria-pressed", String(active));
        b.classList.toggle("active", active);
      });
    });
  });
}

function _wireMobileNav() {
  const tabs = document.querySelectorAll(".mobile-tab[data-panel]");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateMobileTab(tab.dataset.panel));
    tab.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        tab.click();
      }
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      /* future: close overlays */
    }
  });
}

function _wireChatInput() {
  const textarea = document.getElementById("chat-textarea");
  const sendBtn = document.getElementById("btn-send");
  if (!textarea || !sendBtn) return;

  textarea.addEventListener("input", _updateSendButtonState);

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) sendBtn.click();
    }
  });

  sendBtn.addEventListener("click", () => {
    const text = textarea.value;
    if (text.trim()) sendChatPrompt(text);
  });

  _updateSendButtonState();
}

function _wireIssueListControls() {
  const container = document.getElementById("issue-list-container");
  if (container) {
    container.addEventListener("click", (e) => {
      const item = e.target.closest("[data-issue-key]");
      const clearBtn = e.target.closest('[data-action="clear-filters"]');
      const retryBtn = e.target.closest('[data-action="retry-issue-list"]');
      if (item) selectIssue(item.dataset.issueKey);
      if (clearBtn) _clearFilters();
      if (retryBtn) loadIssueList();
    });
    container.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        const item = e.target.closest("[data-issue-key]");
        if (item) {
          e.preventDefault();
          selectIssue(item.dataset.issueKey);
        }
      }
    });
  }

  const detailContent = document.getElementById("detail-content");
  if (detailContent) {
    detailContent.addEventListener("click", (e) => {
      const retryBtn = e.target.closest('[data-action="retry-issue-details"]');
      if (retryBtn && retryBtn.dataset.issueKey)
        selectIssue(retryBtn.dataset.issueKey);
    });
  }

  const searchInput = document.getElementById("search-issues");
  const statusFilter = document.getElementById("filter-status");
  const priorityFilter = document.getElementById("filter-priority");

  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(_applyFilters, 150);
    });
  }
  if (statusFilter) statusFilter.addEventListener("change", _applyFilters);
  if (priorityFilter) priorityFilter.addEventListener("change", _applyFilters);
}

function _wireRefreshButton() {
  const btn = document.getElementById("btn-refresh-issues");
  if (!btn) return;
  if (btn.innerHTML.trim() === "") {
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M1 7a6 6 0 106-6 6 6 0 00-4.24 1.76L1 4.5"
        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M1 1v3.5h3.5" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }
  btn.addEventListener("click", () => {
    _clearFilters();
    loadIssueList();
  });
}

function _wireCopyAll(copyAllBtn, testCases) {
  if (!copyAllBtn) return;
  copyAllBtn.addEventListener("click", async () => {
    try {
      await copyToClipboard(testCasesToPlainText(testCases));
      setCopySuccess(copyAllBtn);
    } catch {
      renderToast("Failed to copy test cases.", "error");
    }
  });
}

function _wireExportBtn(exportBtn, issueKey) {
  if (!exportBtn) return;
  exportBtn.addEventListener("click", () => _triggerExport(issueKey));
}

/**
 * Wire the Clear All button.
 * Removes the test case result wrapper from the DOM and resets state.
 * Does NOT clear conversation history or the selected issue.
 */
function _wireClearBtn(clearBtn) {
  if (!clearBtn) return;
  clearBtn.addEventListener("click", () => {
    // Clear every message from the visible chat log
    const chatLog = document.getElementById("chat-messages");
    if (chatLog) chatLog.textContent = "";

    // Reset full conversation history and test cases in state.
    // setState persists the empty arrays to sessionStorage automatically.
    setState({ conversation: [], testCases: [] });

    renderToast(
      "Chat cleared. Select a user story and click Generate Test Cases to start fresh.",
      "info",
    );
  });
}

// ── Filter logic ──────────────────────────────────────────────────────────────

function _applyFilters() {
  const { issues, selectedIssueKey } = getState();
  if (!issues.length) return;

  const search = (document.getElementById("search-issues")?.value || "")
    .trim()
    .toLowerCase();
  const status = document.getElementById("filter-status")?.value || "all";
  const priority = document.getElementById("filter-priority")?.value || "all";

  setState({ filters: { search, status, priority } });

  const filtered = issues.filter((issue) => {
    const matchSearch =
      !search ||
      issue.issueKey.toLowerCase().includes(search) ||
      issue.summary.toLowerCase().includes(search);
    const matchStatus = status === "all" || issue.status === status;
    const matchPriority = priority === "all" || issue.priority === priority;
    return matchSearch && matchStatus && matchPriority;
  });

  setState({ filteredIssues: filtered });
  renderFilteredIssueList(filtered, issues.length, selectedIssueKey);
}

function _clearFilters() {
  const s = document.getElementById("search-issues");
  const f = document.getElementById("filter-status");
  const p = document.getElementById("filter-priority");
  if (s) s.value = "";
  if (f) f.value = "all";
  if (p) p.value = "all";
  setState({ filters: { search: "", status: "all", priority: "all" } });
}

// ── Conversation helpers ──────────────────────────────────────────────────────

function _makeMessage(role, text, type) {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
    type,
    timestamp: new Date().toISOString(),
  };
}

function _appendMessage(message) {
  const { conversation } = getState();
  setState({ conversation: [...conversation, message] });
}

function _restoreConversationUI(conversation) {
  conversation.forEach((msg) => {
    if (msg.role === "user") {
      renderUserMessage(msg);
    } else {
      if (msg.type === "test-table") {
        const tcs = parseTestCaseTable(msg.text);
        if (tcs && tcs.length > 0) {
          const { copyAllBtn, exportBtn, clearBtn } = renderTestCaseResults(
            tcs,
            getState().selectedIssueKey || "",
            getState().testCaseView,
          );
          _wireCopyAll(copyAllBtn, tcs);
          _wireExportBtn(exportBtn, getState().selectedIssueKey || "Unknown");
          _wireClearBtn(clearBtn);
          return;
        }
      }
      renderAssistantMessage(msg);
    }
  });
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function _updateSendButtonState() {
  const textarea = document.getElementById("chat-textarea");
  const hasText = textarea ? textarea.value.trim().length > 0 : false;
  const isLocked = getState().activeRequest !== null;
  setSendButtonEnabled(hasText && !isLocked);
}

function _errorMessage(err) {
  if (err && err.message) return err.message;
  return "An unexpected error occurred. Please try again.";
}

// ── Exports ───────────────────────────────────────────────────────────────────

export { init, loadIssueList, selectIssue, generateTestCases, sendChatPrompt };
