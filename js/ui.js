/**
 * js/ui.js
 * DOM manipulation and rendering functions.
 *
 * Responsibilities:
 *   - Create and update DOM elements
 *   - Apply the selected theme by setting document.documentElement.dataset.theme
 *   - Render all UI components from structured data passed as arguments
 *
 * Must NOT:
 *   - Write to localStorage or sessionStorage (that belongs to state.js)
 *   - Import state.js (state is passed as arguments to render functions)
 *   - Import api.js
 *   - Contain business logic or parser calls
 *   - Use unsafe innerHTML with untrusted/LLM-derived content
 *
 * Note on innerHTML:
 *   innerHTML is used ONLY for hardcoded, developer-authored SVG strings and
 *   static template strings. LLM output is always rendered via textContent
 *   or explicit DOM node construction.
 */

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — Theme
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Apply the given theme to the document root element.
 * @param {'dark'|'light'|'dim'} theme
 */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — SVG Icon Library (hardcoded developer-authored strings only)
// ══════════════════════════════════════════════════════════════════════════════

const ICONS = {
  logo: `<svg width="28" height="28" viewBox="0 0 28 28" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <rect width="28" height="28" rx="6" fill="currentColor" opacity="0.12"/>
    <path d="M14 7l2 5.5L21.5 14l-5.5 2L14 21l-2-5.5L6.5 14l5.5-2L14 7z"
      fill="currentColor"/>
    <circle cx="20.5" cy="7.5" r="1.5" fill="currentColor" opacity="0.55"/>
  </svg>`,

  sun: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <circle cx="7.5" cy="7.5" r="2.75" stroke="currentColor" stroke-width="1.4"/>
    <line x1="7.5" y1="1" x2="7.5" y2="2.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="7.5" y1="12.2" x2="7.5" y2="14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="1" y1="7.5" x2="2.8" y2="7.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="12.2" y1="7.5" x2="14" y2="7.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="2.9" y1="2.9" x2="4.2" y2="4.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="10.8" y1="10.8" x2="12.1" y2="12.1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="2.9" y1="12.1" x2="4.2" y2="10.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="10.8" y1="4.2" x2="12.1" y2="2.9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,

  moon: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M12.5 9A5.5 5.5 0 016 2.5a5.5 5.5 0 100 10A5.5 5.5 0 0012.5 9z"
      stroke="currentColor" stroke-width="1.4" stroke-linecap="round"
      stroke-linejoin="round"/>
  </svg>`,

  dim: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" stroke-width="1.4"/>
    <path d="M7.5 2.5v5l2.5 2.5" stroke="currentColor" stroke-width="1.4"
      stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  refresh: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M1 7a6 6 0 106-6 6 6 0 00-4.24 1.76L1 4.5"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
      stroke-linejoin="round"/>
    <path d="M1 1v3.5h3.5" stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  send: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M2 8l12-5.5-4.5 5.5 4.5 5.5L2 8z"
      stroke="currentColor" stroke-width="1.5"
      stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="2" y1="8" x2="9.5" y2="8"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  copy: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <rect x="4.5" y="4.5" width="8" height="8" rx="1.5"
      stroke="currentColor" stroke-width="1.4"/>
    <path d="M4.5 9.5H3a1.5 1.5 0 01-1.5-1.5V3A1.5 1.5 0 013 1.5h5A1.5 1.5 0 019.5 3v1.5"
      stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,

  check: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M2 7l4 4 6-6" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  export: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M1 10v1.5A1.5 1.5 0 002.5 13h9a1.5 1.5 0 001.5-1.5V10"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  generate: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M7.5 1.5l1.2 3.6L12.3 6.3l-3.6 1.2-1.2 3.6-1.2-3.6L2.7 6.3l3.6-1.2L7.5 1.5z"
      stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="12" cy="11.5" r="1" fill="currentColor"/>
    <circle cx="3.5" cy="11.5" r="1" fill="currentColor"/>
  </svg>`,

  emptyList: `<svg width="44" height="44" viewBox="0 0 44 44" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <rect x="6" y="10" width="32" height="24" rx="3"
      stroke="currentColor" stroke-width="1.5"/>
    <line x1="12" y1="18" x2="32" y2="18"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="12" y1="23" x2="28" y2="23"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="12" y1="28" x2="22" y2="28"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  emptyDetail: `<svg width="48" height="48" viewBox="0 0 48 48" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M10 36V12a2 2 0 012-2h24a2 2 0 012 2v24a2 2 0 01-2 2H12a2 2 0 01-2-2z"
      stroke="currentColor" stroke-width="1.5"/>
    <line x1="17" y1="19" x2="31" y2="19"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="17" y1="24" x2="31" y2="24"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="17" y1="29" x2="25" y2="29"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="35" cy="35" r="7" fill="none"
      stroke="currentColor" stroke-width="1.5"/>
    <path d="M32.5 35h5M35 32.5v5"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  error: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.5"/>
    <line x1="10" y1="6" x2="10" y2="11"
      stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <circle cx="10" cy="14" r="1" fill="currentColor"/>
  </svg>`,

  healthCare: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M8 14s-6-4-6-8a4 4 0 018 0 4 4 0 018 0c0 4-6 8-6 8z" fill="none"
      stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M6 8h4M8 6v4" stroke="currentColor" stroke-width="1.4"
      stroke-linecap="round"/>
  </svg>`,

  insurance: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M8 2L2 5v4c0 3.3 2.5 5.7 6 6.8 3.5-1.1 6-3.5 6-6.8V5L8 2z"
      stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M5.5 8.5l2 2 3-3" stroke="currentColor" stroke-width="1.4"
      stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  banking: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M1 6h14M3 6V13M7 6v7M11 6v7M13 6v7M1 13h14M8 2L1.5 6h13L8 2z"
      stroke="currentColor" stroke-width="1.4" stroke-linecap="round"
      stroke-linejoin="round"/>
  </svg>`,

  general: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <rect x="2" y="9" width="12" height="5" rx="1"
      stroke="currentColor" stroke-width="1.4"/>
    <rect x="4" y="5" width="8" height="4" rx="1"
      stroke="currentColor" stroke-width="1.4"/>
    <rect x="6" y="2" width="4" height="3" rx="1"
      stroke="currentColor" stroke-width="1.4"/>
  </svg>`,

  close: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M1.5 1.5l9 9M10.5 1.5l-9 9"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  spinner: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"
    class="spin-icon">
    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" opacity="0.25"/>
    <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" stroke-width="2"
      stroke-linecap="round"/>
  </svg>`,

  cards: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <rect x="1" y="1" width="12" height="5" rx="1.5"
      stroke="currentColor" stroke-width="1.4"/>
    <rect x="1" y="8" width="12" height="5" rx="1.5"
      stroke="currentColor" stroke-width="1.4"/>
  </svg>`,

  table: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <rect x="1" y="1" width="12" height="12" rx="1.5"
      stroke="currentColor" stroke-width="1.4"/>
    <line x1="1" y1="5" x2="13" y2="5"
      stroke="currentColor" stroke-width="1.4"/>
    <line x1="5" y1="5" x2="5" y2="13"
      stroke="currentColor" stroke-width="1.4"/>
  </svg>`,
};

/**
 * Create a DOM element containing a hardcoded inline SVG icon.
 * Uses innerHTML only for developer-authored static SVG strings (never LLM output).
 * @param {string} name - Key from ICONS object
 * @param {string} [wrapperTag='span'] - Wrapper element tag
 * @returns {HTMLElement}
 */
function createIcon(name, wrapperTag = "span") {
  const wrapper = document.createElement(wrapperTag);
  wrapper.className = "icon-wrapper";
  // Safe: ICONS values are hardcoded developer-authored strings, not user/LLM input
  wrapper.innerHTML = ICONS[name] || "";
  return wrapper;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — Header
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Render the application header into #app-header.
 * Called once during initialization; updates domain badge and connection
 * status are handled by dedicated functions below.
 * @param {'dark'|'light'|'dim'} currentTheme
 */
function renderHeader(currentTheme) {
  const header = document.getElementById("app-header");
  if (!header) return;

  const inner = document.createElement("div");
  inner.className = "header-inner";

  // Brand
  const brand = document.createElement("div");
  brand.className = "header-brand";
  brand.appendChild(createIcon("logo", "span"));
  const name = document.createElement("span");
  name.className = "header-product-name";
  name.textContent = "AI Test Case Generator";
  brand.appendChild(name);

  // Controls
  const controls = document.createElement("div");
  controls.className = "header-controls";

  // Domain badge (initially empty — kept for legacy CSS fallback)
  const domainBadge = document.createElement("div");
  domainBadge.id = "domain-badge";
  domainBadge.className = "domain-badge";
  domainBadge.setAttribute("aria-hidden", "true");

  // Domain pills — all three always visible; active one is highlighted
  const domainPillsEl = document.createElement("div");
  domainPillsEl.id = "domain-pills";
  domainPillsEl.className = "domain-pills";
  domainPillsEl.setAttribute("aria-label", "Project domains");

  // Build one pill per known domain
  const PILL_DEFS = [
    { domain: "health", icon: "healthCare", label: "Health Care" },
    { domain: "insurance", icon: "insurance", label: "Insurance" },
    { domain: "banking", icon: "banking", label: "Banking" },
  ];
  PILL_DEFS.forEach(({ domain, icon, label }) => {
    const pill = document.createElement("span");
    pill.className = "domain-pill";
    pill.dataset.domain = domain;
    pill.setAttribute("aria-label", `${label} domain`);
    pill.appendChild(createIcon(icon, "span"));
    const lbl = document.createElement("span");
    lbl.textContent = label;
    pill.appendChild(lbl);
    // Blinking dot + Active label — only shown on the active pill via CSS
    const dot = document.createElement("span");
    dot.className = "pill-active-dot";
    dot.setAttribute("aria-hidden", "true");
    const activeLbl = document.createElement("span");
    activeLbl.className = "pill-active-label";
    activeLbl.textContent = "Active";
    pill.appendChild(dot);
    pill.appendChild(activeLbl);
    domainPillsEl.appendChild(pill);
  });

  // Legacy active indicator — hidden (replaced by pill system)
  const activeIndicator = document.createElement("div");
  activeIndicator.id = "domain-active-indicator";
  activeIndicator.hidden = true;
  activeIndicator.setAttribute("aria-hidden", "true");

  // Theme selector
  const themeSelector = _buildThemeSelector(currentTheme);

  // Connection status
  const connStatus = document.createElement("div");
  connStatus.id = "connection-status";
  connStatus.className = "connection-status";
  connStatus.setAttribute("role", "status");
  connStatus.setAttribute("aria-live", "polite");
  connStatus.setAttribute("aria-label", "Connection status");
  connStatus.dataset.status = "idle";
  _updateConnectionEl(connStatus, "idle");

  controls.appendChild(domainBadge);
  controls.appendChild(domainPillsEl);
  controls.appendChild(activeIndicator);
  controls.appendChild(themeSelector);
  controls.appendChild(connStatus);

  inner.appendChild(brand);
  inner.appendChild(controls);
  header.appendChild(inner);
}

function _buildThemeSelector(currentTheme) {
  const group = document.createElement("div");
  group.className = "theme-selector";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Theme selection");

  const themes = [
    { value: "dark", label: "Dark theme", icon: "moon" },
    { value: "light", label: "Light theme", icon: "sun" },
    { value: "dim", label: "Dim theme", icon: "dim" },
  ];

  themes.forEach(({ value, label, icon }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-icon theme-btn";
    btn.dataset.theme = value;
    btn.setAttribute("aria-label", label);
    btn.setAttribute("aria-pressed", String(value === currentTheme));
    btn.title = label;
    if (value === currentTheme) btn.classList.add("active");
    // Safe: ICONS is hardcoded
    btn.innerHTML = ICONS[icon] || "";
    group.appendChild(btn);
  });

  return group;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — Connection Status
// ══════════════════════════════════════════════════════════════════════════════

const CONNECTION_LABELS = {
  idle: "Idle",
  connecting: "Connecting",
  connected: "Connected",
  active: "Request in progress",
  error: "Connection error",
  offline: "Offline",
};

/**
 * Update the connection status indicator.
 * @param {'idle'|'connecting'|'connected'|'active'|'error'|'offline'} status
 */
function renderConnectionStatus(status) {
  const el = document.getElementById("connection-status");
  if (!el) return;
  el.dataset.status = status;
  _updateConnectionEl(el, status);
}

function _updateConnectionEl(el, status) {
  el.textContent = "";
  const dot = document.createElement("span");
  dot.className = "connection-dot";
  dot.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "connection-label";
  label.textContent = CONNECTION_LABELS[status] || status;
  el.appendChild(dot);
  el.appendChild(label);
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — Domain Badge
// ══════════════════════════════════════════════════════════════════════════════

const DOMAIN_PATTERNS = [
  {
    // Covers all healthcare-related project names including ward/nursing/billing terms
    test: /health\s*care|healthcare|health|hospital|clinical|medical|pharma|pharmacy|diagnostic|radiology|nursing|patient|ward|laboratory|lab|pathology|outpatient|inpatient|daycare|consultant|doctor|billing|surgery|emergency|icu|orthopaedic|orthopedic|dental|dentist|gynaecology|gynecology|paediatric|pediatric|oncology|cardiology|neurology/i,
    icon: "healthCare",
    label: "Health Care",
    domain: "health",
  },
  {
    test: /insurance|policy|claims|premium/i,
    icon: "insurance",
    label: "Insurance",
    domain: "insurance",
  },
  {
    test: /banking|bank|payments|finance|cards|upi/i,
    icon: "banking",
    label: "Banking",
    domain: "banking",
  },
];

/**
 * Update the domain pills: activate the pill matching projectName,
 * deactivate all others.
 * @param {string} projectName
 */
function renderDomainBadge(projectName) {
  const name = String(projectName || "").trim();
  let matched = null;

  for (const domain of DOMAIN_PATTERNS) {
    if (domain.test.test(name)) {
      matched = domain;
      break;
    }
  }

  const activeDomain = matched ? matched.domain : "general";

  // Activate the matched pill and deactivate all others
  const pills = document.querySelectorAll("#domain-pills .domain-pill");
  pills.forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.domain === activeDomain);
  });
}

/**
 * Deactivate all domain pills (called when no issue is selected or loading).
 * @param {boolean} visible - false = deactivate all pills
 */
function _setDomainActiveIndicator(visible) {
  if (!visible) {
    document
      .querySelectorAll("#domain-pills .domain-pill")
      .forEach((pill) => pill.classList.remove("active"));
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — Issue List Panel
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Render the skeleton loading state for the issue list.
 */
function renderIssueListSkeleton() {
  const container = document.getElementById("issue-list-container");
  if (!container) return;
  container.setAttribute("aria-busy", "true");
  container.textContent = "";
  for (let i = 0; i < 6; i++) {
    const item = document.createElement("div");
    item.className = "skeleton-item";
    item.setAttribute("role", "presentation");
    const l1 = document.createElement("div");
    l1.className = "skeleton-line short";
    const l2 = document.createElement("div");
    l2.className = "skeleton-line long";
    const l3 = document.createElement("div");
    l3.className = "skeleton-line medium";
    item.appendChild(l1);
    item.appendChild(l2);
    item.appendChild(l3);
    container.appendChild(item);
  }
  _updateIssueCount("");
}

/**
 * Render the issue list.
 * @param {Array<{issueKey:string,summary:string,status:string,priority:string}>} issues
 * @param {string|null} selectedKey
 */
function renderIssueList(issues, selectedKey) {
  const container = document.getElementById("issue-list-container");
  if (!container) return;
  container.setAttribute("aria-busy", "false");
  container.textContent = "";

  if (!issues || issues.length === 0) {
    renderIssueListEmpty("No issues found in backlog.");
    return;
  }

  issues.forEach((issue) => {
    container.appendChild(
      _buildIssueItem(issue, issue.issueKey === selectedKey),
    );
  });

  _updateIssueCount(`${issues.length} issue${issues.length !== 1 ? "s" : ""}`);
}

/**
 * Render a filtered sub-list (search/filter results).
 * @param {Array} filteredIssues - The filtered subset
 * @param {number} totalCount - Total before filtering
 * @param {string|null} selectedKey
 */
function renderFilteredIssueList(filteredIssues, totalCount, selectedKey) {
  const container = document.getElementById("issue-list-container");
  if (!container) return;
  container.textContent = "";

  if (filteredIssues.length === 0) {
    const empty = document.createElement("div");
    empty.className = "state-empty";
    const msg = document.createElement("p");
    msg.className = "state-message";
    msg.textContent = "No issues match your filters.";
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "btn btn-ghost";
    clear.textContent = "Clear filters";
    clear.dataset.action = "clear-filters";
    empty.appendChild(msg);
    empty.appendChild(clear);
    container.appendChild(empty);
    _updateIssueCount(`0 of ${totalCount} issues`);
    return;
  }

  filteredIssues.forEach((issue) => {
    container.appendChild(
      _buildIssueItem(issue, issue.issueKey === selectedKey),
    );
  });
  _updateIssueCount(`${filteredIssues.length} of ${totalCount} issues`);
}

/**
 * Render the empty state for the issue list.
 * @param {string} message
 */
function renderIssueListEmpty(message) {
  const container = document.getElementById("issue-list-container");
  if (!container) return;
  container.textContent = "";
  const empty = document.createElement("div");
  empty.className = "state-empty";
  const icon = createIcon("emptyList", "div");
  const msg = document.createElement("p");
  msg.className = "state-message";
  msg.textContent = message || "No issues found.";
  empty.appendChild(icon);
  empty.appendChild(msg);
  container.appendChild(empty);
  _updateIssueCount("");
}

/**
 * Render the error/retry state for the issue list.
 * @param {string} message
 */
function renderIssueListError(message) {
  const container = document.getElementById("issue-list-container");
  if (!container) return;
  container.setAttribute("aria-busy", "false");
  container.textContent = "";
  const errorEl = document.createElement("div");
  errorEl.className = "state-error";
  errorEl.setAttribute("role", "alert");
  const icon = createIcon("error", "div");
  const msg = document.createElement("p");
  msg.className = "state-message";
  msg.textContent = message || "Failed to load issues.";
  const retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.className = "btn btn-secondary";
  retryBtn.textContent = "Retry";
  retryBtn.dataset.action = "retry-issue-list";
  errorEl.appendChild(icon);
  errorEl.appendChild(msg);
  errorEl.appendChild(retryBtn);
  container.appendChild(errorEl);
  _updateIssueCount("");
}

/**
 * Update the selection state of a single issue item without re-rendering the full list.
 * @param {string|null} newKey
 * @param {string|null} prevKey
 */
function updateIssueSelection(newKey, prevKey) {
  const container = document.getElementById("issue-list-container");
  if (!container) return;

  if (prevKey) {
    const prev = container.querySelector(`[data-issue-key="${prevKey}"]`);
    if (prev) {
      prev.classList.remove("selected");
      prev.setAttribute("aria-current", "false");
    }
  }
  if (newKey) {
    const next = container.querySelector(`[data-issue-key="${newKey}"]`);
    if (next) {
      next.classList.add("selected");
      next.setAttribute("aria-current", "true");
    }
  }
}

function _buildIssueItem(issue, isSelected) {
  const item = document.createElement("div");
  item.className = "issue-item" + (isSelected ? " selected" : "");
  item.setAttribute("role", "listitem");
  item.setAttribute("tabindex", "0");
  item.setAttribute("data-issue-key", issue.issueKey);
  item.setAttribute("aria-current", String(isSelected));
  item.setAttribute(
    "aria-label",
    `${issue.issueKey}: ${issue.summary}. Status: ${issue.status}. Priority: ${issue.priority}`,
  );

  // Row 1: key + priority
  const keyEl = document.createElement("span");
  keyEl.className = "issue-key";
  keyEl.textContent = issue.issueKey;

  const priorityEl = document.createElement("span");
  priorityEl.className = `issue-priority ${_priorityClass(issue.priority)}`;
  priorityEl.textContent = issue.priority;

  // Row 2: summary
  const summaryEl = document.createElement("span");
  summaryEl.className = "issue-summary";
  summaryEl.textContent = issue.summary;

  // Row 3: status
  const statusRow = document.createElement("div");
  statusRow.className = "issue-status-row";
  const statusBadge = document.createElement("span");
  statusBadge.className = `badge ${_statusClass(issue.status)}`;
  statusBadge.textContent = issue.status;
  statusRow.appendChild(statusBadge);

  item.appendChild(keyEl);
  item.appendChild(priorityEl);
  item.appendChild(summaryEl);
  item.appendChild(statusRow);

  return item;
}

function _priorityClass(priority) {
  const p = String(priority).toUpperCase();
  if (p === "P1") return "badge badge-p1";
  if (p === "P2") return "badge badge-p2";
  if (p === "P3") return "badge badge-p3";
  if (p === "P4") return "badge badge-p4";
  return "badge";
}

function _statusClass(status) {
  const s = String(status).toLowerCase();
  if (s.includes("progress")) return "badge-inprogress";
  if (s === "done" || s.includes("complete") || s.includes("resolved"))
    return "badge-done";
  return "badge-todo";
}

function _updateIssueCount(text) {
  const el = document.getElementById("issue-count");
  if (el) el.textContent = text;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — Issue Details Panel
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Render the "no issue selected" placeholder.
 */
function renderDetailEmpty() {
  const content = document.getElementById("detail-content");
  if (!content) return;
  content.textContent = "";
  // Clear the sticky footer too — no issue is selected
  const actions = document.getElementById("detail-actions");
  if (actions) actions.textContent = "";
  // Hide Active indicator — no issue loaded
  _setDomainActiveIndicator(false);
  const empty = document.createElement("div");
  empty.className = "detail-empty-state";
  const icon = createIcon("emptyDetail", "div");
  const msg = document.createElement("p");
  msg.className = "text-muted";
  msg.textContent = "Select a Jira issue to view details";
  empty.appendChild(icon);
  empty.appendChild(msg);
  content.appendChild(empty);
  _setGenerateButtonEnabled(false);
}

/**
 * Render the skeleton loading state for issue details.
 */
function renderDetailSkeleton() {
  const content = document.getElementById("detail-content");
  if (!content) return;
  content.textContent = "";
  // Clear footer while loading — button is re-created when details arrive
  const actions = document.getElementById("detail-actions");
  if (actions) actions.textContent = "";
  // Dim the Active indicator while skeleton is loading
  _setDomainActiveIndicator(false);
  const skeletonEl = document.createElement("div");
  skeletonEl.setAttribute("aria-label", "Loading issue details");
  skeletonEl.setAttribute("aria-busy", "true");
  [80, 60, 100, 50, 70, 90].forEach((pct) => {
    const line = document.createElement("div");
    line.className = "skeleton-line";
    line.style.width = pct + "%";
    line.style.height = "12px";
    line.style.marginBottom = "12px";
    Object.assign(line.style, {
      background:
        "linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-surface) 50%, var(--bg-elevated) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      borderRadius: "var(--radius-md)",
    });
    skeletonEl.appendChild(line);
  });
  content.appendChild(skeletonEl);
  _setGenerateButtonEnabled(false);
}

/**
 * Render an error state in the details panel.
 * @param {string} message
 * @param {string} issueKey
 */
function renderDetailError(message, issueKey) {
  const content = document.getElementById("detail-content");
  if (!content) return;
  content.textContent = "";
  // Clear the footer on error — no valid issue loaded
  const actions = document.getElementById("detail-actions");
  if (actions) actions.textContent = "";
  const errorEl = document.createElement("div");
  errorEl.className = "state-error";
  errorEl.setAttribute("role", "alert");
  const icon = createIcon("error", "div");
  const msg = document.createElement("p");
  msg.className = "state-message";
  msg.textContent = message;
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "btn btn-secondary";
  retry.textContent = "Retry";
  retry.dataset.action = "retry-issue-details";
  retry.dataset.issueKey = issueKey || "";
  errorEl.appendChild(icon);
  errorEl.appendChild(msg);
  errorEl.appendChild(retry);
  content.appendChild(errorEl);
  _setGenerateButtonEnabled(false);
}

/**
 * Render the full issue detail view.
 * @param {object} detail - Parsed issue details object
 */
function renderIssueDetails(detail) {
  const content = document.getElementById("detail-content");
  if (!content) return;
  content.textContent = "";

  // Header: key, summary, badges
  const header = document.createElement("div");
  header.className = "detail-header";

  const keyEl = document.createElement("div");
  keyEl.className = "detail-issue-key";
  keyEl.textContent = detail.issue_key || "";

  const summaryEl = document.createElement("h2");
  summaryEl.className = "detail-issue-summary";
  // Strip any leading Markdown heading markers (## or # etc.) that
  // the LLM may include in the summary field, e.g. "## Wards Dashboard..."
  const rawSummary = String(detail.summary || "");
  summaryEl.textContent = rawSummary.replace(/^#+\s*/, "");

  const badgeRow = document.createElement("div");
  badgeRow.className = "detail-badge-row";

  [
    { val: detail.status, cls: _statusBadgeClass(detail.status) },
    { val: detail.priority, cls: _priorityBadgeClass(detail.priority) },
    { val: detail.risk, cls: _riskBadgeClass(detail.risk) },
  ].forEach(({ val, cls }) => {
    if (val && val !== "Not provided") {
      const b = document.createElement("span");
      b.className = `badge ${cls}`;
      b.textContent = val;
      badgeRow.appendChild(b);
    }
  });

  header.appendChild(keyEl);
  header.appendChild(summaryEl);
  header.appendChild(badgeRow);
  content.appendChild(header);

  // Description
  _appendSection(
    content,
    "Description",
    _notProvided(detail.description) ? "Not provided" : detail.description,
    "detail-description-block",
    _notProvided(detail.description),
  );

  // Acceptance Criteria
  _appendSection(
    content,
    "Acceptance Criteria",
    _notProvided(detail.acceptance_criteria)
      ? "Not provided"
      : detail.acceptance_criteria,
    "detail-description-block",
    _notProvided(detail.acceptance_criteria),
  );

  // Metadata grid
  _appendMetadataGrid(content, detail);

  // Labels
  if (Array.isArray(detail.labels) && detail.labels.length > 0) {
    const group = document.createElement("div");
    group.className = "detail-field-group";
    const title = document.createElement("div");
    title.className = "detail-section-title";
    title.textContent = "Labels";
    group.appendChild(title);
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.flexWrap = "wrap";
    row.style.gap = "6px";
    detail.labels.forEach((lbl) => {
      const chip = document.createElement("span");
      chip.className = "badge badge-todo";
      chip.textContent = lbl;
      row.appendChild(chip);
    });
    group.appendChild(row);
    content.appendChild(group);
  }

  // Generate Test Cases button — rendered into #detail-actions (sticky footer),
  // NOT into #detail-content, so it is always visible without scrolling.
  const actionsEl = document.getElementById("detail-actions");
  if (actionsEl) {
    actionsEl.textContent = "";
    const generateBtn = document.createElement("button");
    generateBtn.type = "button";
    generateBtn.id = "btn-generate";
    generateBtn.className = "btn btn-generate";
    generateBtn.dataset.issueKey = detail.issue_key || "";
    generateBtn.appendChild(createIcon("generate", "span"));
    const genText = document.createElement("span");
    genText.textContent = "Generate Test Cases";
    generateBtn.appendChild(genText);
    actionsEl.appendChild(generateBtn);
  }
  _setGenerateButtonEnabled(true);
}

function _appendSection(parent, title, text, blockClass, isMuted) {
  const group = document.createElement("div");
  group.className = "detail-field-group";

  const heading = document.createElement("div");
  heading.className = "detail-section-title";
  heading.textContent = title;

  const block = document.createElement("div");
  block.className = blockClass || "detail-description-block";
  if (isMuted) block.classList.add("muted");
  // Use textContent — never LLM input via innerHTML
  block.textContent = text;

  group.appendChild(heading);
  group.appendChild(block);
  parent.appendChild(group);
}

function _appendMetadataGrid(parent, detail) {
  const group = document.createElement("div");
  group.className = "detail-field-group";

  const heading = document.createElement("div");
  heading.className = "detail-section-title";
  heading.textContent = "Metadata";
  group.appendChild(heading);

  const grid = document.createElement("div");
  grid.className = "detail-metadata-grid";

  const fields = [
    ["Project", detail.project_name],
    ["Issue Type", detail.issue_type],
    ["Parent", detail.parent_summary],
    ["Story Points", detail.story_points],
    ["Sprint", detail.sprint],
    ["Team", detail.team],
    ["Start Date", detail.jira_start_date],
    ["Created", _formatDate(detail.created_date)],
    ["Last Modified", _formatDate(detail.last_modified_date)],
    ["Flagged", detail.flagged],
    ["Jira Status", detail.jira_status_category],
    ["Custom Status", detail.custom_status_category],
  ];

  fields.forEach(([label, value]) => {
    const field = document.createElement("div");
    field.className = "detail-field";
    const lbl = document.createElement("span");
    lbl.className = "detail-field-label";
    lbl.textContent = label;
    const val = document.createElement("span");
    const isMuted = _notProvided(value);
    val.className = "detail-field-value" + (isMuted ? " muted" : "");
    val.textContent = isMuted ? "Not provided" : value;
    field.appendChild(lbl);
    field.appendChild(val);
    grid.appendChild(field);
  });

  group.appendChild(grid);
  parent.appendChild(group);
}

function _notProvided(val) {
  return (
    !val ||
    String(val).trim().toLowerCase() === "not provided" ||
    String(val).trim() === ""
  );
}

function _formatDate(dateStr) {
  if (_notProvided(dateStr)) return "Not provided";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function _statusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("progress")) return "badge-inprogress";
  if (s === "done" || s.includes("complete")) return "badge-done";
  return "badge-todo";
}

function _priorityBadgeClass(priority) {
  const p = String(priority || "").toUpperCase();
  if (p === "P1") return "badge-p1";
  if (p === "P2") return "badge-p2";
  if (p === "P3") return "badge-p3";
  if (p === "P4") return "badge-p4";
  return "";
}

function _riskBadgeClass(risk) {
  const r = String(risk || "").toLowerCase();
  if (r === "critical") return "badge-critical";
  if (r === "high") return "badge-high";
  if (r === "medium") return "badge-medium";
  if (r === "low") return "badge-low";
  return "";
}

function _setGenerateButtonEnabled(enabled) {
  const btn = document.getElementById("btn-generate");
  if (!btn) return;
  btn.disabled = !enabled;
  btn.setAttribute("aria-disabled", String(!enabled));
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — Chat Panel
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Update the context chip displayed above the chat input.
 * @param {string|null} issueKey
 */
function renderContextChip(issueKey) {
  const chip = document.getElementById("chat-context-chip");
  if (!chip) return;
  if (!issueKey) {
    chip.hidden = true;
    chip.textContent = "";
    return;
  }
  chip.hidden = false;
  chip.textContent = "";
  const label = document.createElement("span");
  label.textContent = `Context: ${issueKey}`;
  chip.appendChild(label);
}

/**
 * Show or hide the inline validation message in the chat input area.
 * @param {string|null} message  Pass null/empty to hide.
 */
function renderValidationMessage(message) {
  const el = document.getElementById("validation-message");
  if (!el) return;
  if (!message) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = message;
}

/**
 * Append a user message bubble to the chat log.
 * @param {{id:string, text:string, timestamp:string}} message
 */
function renderUserMessage(message) {
  const log = document.getElementById("chat-messages");
  if (!log) return;

  const wrapper = document.createElement("div");
  wrapper.className = "chat-message user";
  wrapper.dataset.messageId = message.id;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = message.text; // textContent: never innerHTML for user input

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = _formatTimestamp(message.timestamp);

  wrapper.appendChild(bubble);
  wrapper.appendChild(meta);
  log.appendChild(wrapper);
  _scrollChatToBottom(log);
}

/**
 * Append a plain assistant text message bubble.
 * @param {{id:string, text:string, timestamp:string}} message
 */
function renderAssistantMessage(message) {
  const log = document.getElementById("chat-messages");
  if (!log) return;

  const wrapper = document.createElement("div");
  wrapper.className = "chat-message assistant";
  wrapper.dataset.messageId = message.id;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  // Render <br> as actual line breaks using safe DOM construction
  _appendTextWithBr(bubble, message.text);

  const meta = document.createElement("div");
  meta.className = "message-meta";

  const time = document.createElement("span");
  time.textContent = _formatTimestamp(message.timestamp);

  // Copy button for this message
  const copyBtn = _buildCopyButton(message.text);

  meta.appendChild(time);
  meta.appendChild(copyBtn);
  wrapper.appendChild(bubble);
  wrapper.appendChild(meta);
  log.appendChild(wrapper);
  _scrollChatToBottom(log);
}

/**
 * Show a typing / loading indicator in the chat.
 */
function renderChatLoading() {
  const log = document.getElementById("chat-messages");
  if (!log) return;

  const existing = log.querySelector(".typing-indicator-wrapper");
  if (existing) return;

  const wrapper = document.createElement("div");
  wrapper.className = "chat-message assistant typing-indicator-wrapper";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  const indicator = document.createElement("div");
  indicator.className = "typing-indicator";
  indicator.setAttribute("aria-label", "AI is generating a response");
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.className = "typing-dot";
    indicator.appendChild(dot);
  }
  bubble.appendChild(indicator);
  wrapper.appendChild(bubble);
  log.appendChild(wrapper);
  _scrollChatToBottom(log);
}

/**
 * Remove the typing indicator.
 */
function removeChatLoading() {
  const indicator = document.querySelector(".typing-indicator-wrapper");
  if (indicator) indicator.remove();
}

/**
 * Render an error message in the chat panel.
 * @param {string} message
 */
function renderChatError(message) {
  removeChatLoading();
  const log = document.getElementById("chat-messages");
  if (!log) return;

  const wrapper = document.createElement("div");
  wrapper.className = "chat-message assistant";
  wrapper.setAttribute("role", "alert");

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.style.borderColor = "var(--danger)";
  bubble.style.color = "var(--danger)";

  const iconWrapper = createIcon("error", "span");
  iconWrapper.style.marginRight = "8px";
  bubble.appendChild(iconWrapper);

  const text = document.createTextNode(message);
  bubble.appendChild(text);

  wrapper.appendChild(bubble);
  log.appendChild(wrapper);
  _scrollChatToBottom(log);
}

/**
 * Enable or disable the Send button.
 * @param {boolean} enabled
 */
function setSendButtonEnabled(enabled) {
  const btn = document.getElementById("btn-send");
  if (!btn) return;
  btn.disabled = !enabled;
  btn.setAttribute("aria-disabled", String(!enabled));
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 9 — Test Case Presentation
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Render a full test case result container (view switch + cards + table).
 * @param {Array} testCases
 * @param {string} issueKey
 * @param {'cards'|'table'} defaultView
 */
function renderTestCaseResults(testCases, issueKey, defaultView = "cards") {
  const log = document.getElementById("chat-messages");
  if (!log) return;

  const wrapper = document.createElement("div");
  wrapper.className = "chat-message assistant tc-result-wrapper";
  wrapper.dataset.issueKey = issueKey;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  // ── Single compact icon toolbar ──────────────────────────────────────────
  // All controls in one unified pill bar: [Cards][Table] | [Copy][Export][Clear]
  const headerRow = document.createElement("div");
  headerRow.className = "tc-result-header";

  const toolbar = document.createElement("div");
  toolbar.className = "tc-toolbar";
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", "Test case actions");

  // ── View: Cards
  const cardsBtn = document.createElement("button");
  cardsBtn.type = "button";
  cardsBtn.className = "tc-toolbar-btn";
  cardsBtn.dataset.view = "cards";
  cardsBtn.dataset.tooltip = "Cards view";
  cardsBtn.setAttribute("role", "tab");
  cardsBtn.setAttribute("aria-selected", String(defaultView === "cards"));
  cardsBtn.setAttribute("aria-label", "Cards view");
  cardsBtn.appendChild(createIcon("cards", "span"));

  // ── View: Table
  const tableBtn = document.createElement("button");
  tableBtn.type = "button";
  tableBtn.className = "tc-toolbar-btn";
  tableBtn.dataset.view = "table";
  tableBtn.dataset.tooltip = "Table view";
  tableBtn.setAttribute("role", "tab");
  tableBtn.setAttribute("aria-selected", String(defaultView === "table"));
  tableBtn.setAttribute("aria-label", "Table view");
  tableBtn.appendChild(createIcon("table", "span"));

  // ── Separator
  const sep = document.createElement("span");
  sep.className = "tc-toolbar-sep";
  sep.setAttribute("aria-hidden", "true");

  // ── Copy All
  const copyAllBtn = document.createElement("button");
  copyAllBtn.type = "button";
  copyAllBtn.className = "tc-toolbar-btn";
  copyAllBtn.id = "btn-copy-all";
  copyAllBtn.dataset.tooltip = "Copy All";
  copyAllBtn.setAttribute("aria-label", "Copy all test cases");
  copyAllBtn.appendChild(createIcon("copy", "span"));

  // ── Export .xlsx
  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.className = "tc-toolbar-btn btn-export";
  exportBtn.id = "btn-export-xlsx";
  exportBtn.dataset.tooltip = "Export .xlsx";
  exportBtn.setAttribute("aria-label", "Export to Excel (.xlsx)");
  exportBtn.appendChild(createIcon("export", "span"));

  // ── Clear
  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "tc-toolbar-btn btn-clear-tc";
  clearBtn.dataset.tooltip = "Clear chat";
  clearBtn.setAttribute("aria-label", "Clear chat and test cases");
  clearBtn.appendChild(createIcon("close", "span"));

  toolbar.appendChild(cardsBtn);
  toolbar.appendChild(tableBtn);
  toolbar.appendChild(sep);
  toolbar.appendChild(copyAllBtn);
  toolbar.appendChild(exportBtn);
  toolbar.appendChild(clearBtn);

  headerRow.appendChild(toolbar);
  bubble.appendChild(headerRow);

  // Build a synthetic switchEl compatible with _switchTestCaseView
  const switchEl = { querySelectorAll: (sel) => toolbar.querySelectorAll(sel) };

  // Cards view
  const cardsContainer = document.createElement("div");
  cardsContainer.id = "tc-cards-view";
  cardsContainer.className = "tc-cards-container";
  cardsContainer.setAttribute("role", "tabpanel");
  cardsContainer.setAttribute("aria-label", "Test cases as cards");
  testCases.forEach((tc) => cardsContainer.appendChild(_buildTestCaseCard(tc)));

  // Table view (initially hidden)
  const tableContainer = document.createElement("div");
  tableContainer.id = "tc-table-view";
  tableContainer.setAttribute("role", "tabpanel");
  tableContainer.setAttribute("aria-label", "Test cases as table");
  tableContainer.appendChild(_buildTestCaseTable(testCases));

  bubble.appendChild(cardsContainer);
  bubble.appendChild(tableContainer);

  wrapper.appendChild(bubble);
  log.appendChild(wrapper);

  // Apply default view
  _switchTestCaseView(defaultView, cardsContainer, tableContainer, switchEl);
  _scrollChatToBottom(log);

  // Wire view-switch buttons (Cards / Table inside the toolbar)
  [cardsBtn, tableBtn].forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      _switchTestCaseView(view, cardsContainer, tableContainer, switchEl);
    });
  });

  return { copyAllBtn, exportBtn, clearBtn };
}

function _buildViewSwitch(activeView) {
  const group = document.createElement("div");
  group.className = "view-switch";
  group.setAttribute("role", "tablist");
  group.setAttribute("aria-label", "Test case view");

  [
    { value: "cards", label: "Cards", icon: "cards" },
    { value: "table", label: "Table", icon: "table" },
  ].forEach(({ value, label, icon }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.role = "tab";
    btn.className = "view-switch-btn";
    btn.dataset.view = value;
    btn.setAttribute("aria-selected", String(value === activeView));
    btn.setAttribute("aria-label", `${label} view`);
    btn.appendChild(createIcon(icon, "span"));
    const txt = document.createTextNode(` ${label}`);
    btn.appendChild(txt);
    group.appendChild(btn);
  });

  return group;
}

function _switchTestCaseView(view, cardsContainer, tableContainer, switchEl) {
  const isCards = view === "cards";
  cardsContainer.style.display = isCards ? "" : "none";
  tableContainer.style.display = isCards ? "none" : "";

  // Update aria-selected on both legacy .view-switch-btn and new tc-toolbar-btn[data-view]
  switchEl.querySelectorAll("[data-view]").forEach((btn) => {
    btn.setAttribute("aria-selected", String(btn.dataset.view === view));
  });
}

function _buildTestCaseCard(tc) {
  const card = document.createElement("article");
  card.className = "tc-card";
  card.setAttribute("aria-label", `Test case ${tc.sno}: ${tc.testCaseName}`);

  // Card header
  const cardHeader = document.createElement("div");
  cardHeader.className = "tc-card-header";

  const sno = document.createElement("span");
  sno.className = "tc-sno";
  sno.textContent = tc.sno;

  const nameEl = document.createElement("span");
  nameEl.className = "tc-name";
  nameEl.textContent = tc.testCaseName;

  const priorityBadge = document.createElement("span");
  priorityBadge.className = `badge ${_tcPriorityClass(tc.priority)}`;
  priorityBadge.textContent = tc.priority;

  cardHeader.appendChild(sno);
  cardHeader.appendChild(nameEl);
  cardHeader.appendChild(priorityBadge);
  card.appendChild(cardHeader);

  // Card body
  const body = document.createElement("div");
  body.className = "tc-body";

  const fields = [
    { label: "Description", key: "description", isList: false },
    { label: "Pre-Requisite", key: "preRequisite", isList: false },
    { label: "Test Data", key: "testData", isList: false },
    { label: "Test Steps", key: "testSteps", isList: true },
    { label: "Expected Result", key: "expectedResult", isList: false },
  ];

  fields.forEach(({ label, key, isList }) => {
    const field = document.createElement("div");
    field.className = "tc-field";

    const lbl = document.createElement("span");
    lbl.className = "tc-field-label";
    lbl.textContent = label;

    const val = document.createElement("div");
    val.className = "tc-field-value";

    const rawText = tc[key] || "";

    if (isList && _looksNumbered(rawText)) {
      // Render as ordered list only when content is clearly numbered
      const lines = rawText
        .split(/<br>/i)
        .map((l) => l.trim())
        .filter(Boolean);
      const ol = document.createElement("ol");
      ol.className = "tc-steps-list";
      lines.forEach((line) => {
        const cleaned = line.replace(/^\d+[\.\)]\s*/, "").trim();
        const li = document.createElement("li");
        li.textContent = cleaned;
        ol.appendChild(li);
      });
      val.appendChild(ol);
    } else {
      // Preserve original line structure — no invented list
      _appendTextWithBr(val, rawText);
    }

    field.appendChild(lbl);
    field.appendChild(val);
    body.appendChild(field);
  });

  card.appendChild(body);
  return card;
}

function _looksNumbered(text) {
  // Return true only when lines clearly start with digit + dot/paren
  const lines = text.split(/<br>/i).filter((l) => l.trim());
  if (lines.length < 2) return false;
  const numbered = lines.filter((l) => /^\s*\d+[\.\)]\s/.test(l.trim()));
  return numbered.length >= Math.ceil(lines.length * 0.6);
}

function _tcPriorityClass(priority) {
  const p = String(priority || "").toLowerCase();
  if (p === "critical") return "badge-critical";
  if (p === "high") return "badge-high";
  if (p === "medium") return "badge-medium";
  if (p === "low") return "badge-low";
  return "";
}

function _buildTestCaseTable(testCases) {
  const wrapper = document.createElement("div");
  wrapper.className = "tc-table-wrapper";

  const table = document.createElement("table");
  table.className = "tc-table";

  const caption = document.createElement("caption");
  caption.textContent = "Generated Test Cases";
  table.appendChild(caption);

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  [
    "Sno",
    "Test Case Name",
    "Priority",
    "Description",
    "Pre-Requisite",
    "Test Data",
    "Test Steps",
    "Expected Result",
  ].forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    th.scope = "col";
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  testCases.forEach((tc) => {
    const row = document.createElement("tr");
    [
      tc.sno,
      tc.testCaseName,
      tc.priority,
      tc.description,
      tc.preRequisite,
      tc.testData,
      tc.testSteps,
      tc.expectedResult,
    ].forEach((cellText) => {
      const td = document.createElement("td");
      _appendTextWithBr(td, cellText || "");
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 10 — Clipboard
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Copy text to the clipboard with primary API and textarea fallback.
 * @param {string} text
 * @returns {Promise<void>}
 */
async function copyToClipboard(text) {
  if (
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for non-secure or unsupported contexts
  const ta = document.createElement("textarea");
  ta.value = text;
  Object.assign(ta.style, {
    position: "fixed",
    top: "-9999px",
    left: "-9999px",
    opacity: "0",
  });
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

/**
 * Animate a button through its copy-success state.
 * @param {HTMLButtonElement} btn
 */
function setCopySuccess(btn) {
  const originalHTML = btn.innerHTML;
  const originalLabel = btn.getAttribute("aria-label");
  btn.innerHTML = ICONS.check;
  btn.setAttribute("aria-label", "Copied!");
  btn.classList.add("btn-success");
  setTimeout(() => {
    btn.innerHTML = originalHTML;
    btn.setAttribute("aria-label", originalLabel || "Copy");
    btn.classList.remove("btn-success");
  }, 1500);
}

function _buildCopyButton(messageText) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-ghost btn-sm";
  btn.setAttribute("aria-label", "Copy response");
  btn.innerHTML = ICONS.copy;
  btn.addEventListener("click", async () => {
    try {
      // Convert <br> to newlines for readable clipboard content
      const readable = messageText.replace(/<br>/gi, "\n");
      await copyToClipboard(readable);
      setCopySuccess(btn);
    } catch {
      btn.textContent = "Failed";
      setTimeout(() => {
        btn.innerHTML = ICONS.copy;
      }, 1500);
    }
  });
  return btn;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 11 — Toast Notifications
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Show a non-blocking toast notification.
 * @param {string} message
 * @param {'info'|'success'|'warning'|'error'} [type='info']
 * @param {number} [durationMs=4000]
 */
function renderToast(message, type = "info", durationMs = 4000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const text = document.createElement("span");
  text.textContent = message;

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "toast-dismiss";
  dismiss.setAttribute("aria-label", "Dismiss notification");
  dismiss.innerHTML = ICONS.close;
  dismiss.addEventListener("click", () => toast.remove());

  toast.appendChild(text);
  toast.appendChild(dismiss);
  container.appendChild(toast);

  if (durationMs > 0) {
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, durationMs);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 12 — Mobile Navigation
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Activate a mobile tab and show/hide the corresponding panels.
 * @param {'panel-issues'|'panel-details'|'panel-chat'} panelId
 */
function activateMobileTab(panelId) {
  const panels = ["panel-issues", "panel-details", "panel-chat"];
  panels.forEach((id) => {
    const panel = document.getElementById(id);
    if (panel) panel.classList.toggle("panel-hidden", id !== panelId);
  });

  const tabs = document.querySelectorAll(".mobile-tab");
  tabs.forEach((tab) => {
    const active = tab.dataset.panel === panelId;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 13 — Utility DOM helpers
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Append text to an element, converting <br> markers to actual <br> DOM elements.
 * Never uses innerHTML for untrusted content.
 * @param {HTMLElement} parent
 * @param {string} text
 */
function _appendTextWithBr(parent, text) {
  if (!text) {
    parent.textContent = "";
    return;
  }
  const parts = text.split(/<br>/i);
  parts.forEach((part, index) => {
    parent.appendChild(document.createTextNode(part));
    if (index < parts.length - 1) {
      parent.appendChild(document.createElement("br"));
    }
  });
}

function _scrollChatToBottom(log) {
  requestAnimationFrame(() => {
    log.scrollTop = log.scrollHeight;
  });
}

function _formatTimestamp(isoString) {
  if (!isoString) return "";
  try {
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 14 — Refresh button state
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Set the refresh button loading state.
 * @param {boolean} loading
 */
function setRefreshButtonLoading(loading) {
  const btn = document.getElementById("btn-refresh-issues");
  if (!btn) return;
  btn.disabled = loading;
  btn.setAttribute("aria-disabled", String(loading));
  if (loading) {
    btn.innerHTML = ICONS.spinner;
    btn.classList.add("loading-spin");
  } else {
    btn.innerHTML = ICONS.refresh;
    btn.classList.remove("loading-spin");
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 15 — Generate button state
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Set the generate button to loading state.
 * @param {boolean} loading
 */
function setGenerateButtonLoading(loading) {
  const btn = document.getElementById("btn-generate");
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.setAttribute("aria-disabled", "true");
    btn.setAttribute("aria-label", "Generating test cases");
    btn.textContent = "";
    const spinIcon = createIcon("spinner", "span");
    const txt = document.createTextNode(" Generating…");
    btn.appendChild(spinIcon);
    btn.appendChild(txt);
  } else {
    btn.disabled = false;
    btn.setAttribute("aria-disabled", "false");
    btn.setAttribute("aria-label", "Generate test cases");
    btn.textContent = "";
    btn.appendChild(createIcon("generate", "span"));
    const txt = document.createTextNode(" Generate Test Cases");
    btn.appendChild(txt);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Exports
// ══════════════════════════════════════════════════════════════════════════════

export {
  // Theme
  applyTheme,
  // Header
  renderHeader,
  renderConnectionStatus,
  renderDomainBadge,
  // Issue list
  renderIssueListSkeleton,
  renderIssueList,
  renderFilteredIssueList,
  renderIssueListEmpty,
  renderIssueListError,
  updateIssueSelection,
  // Details
  renderDetailEmpty,
  renderDetailSkeleton,
  renderDetailError,
  renderIssueDetails,
  // Chat
  renderContextChip,
  renderValidationMessage,
  renderUserMessage,
  renderAssistantMessage,
  renderChatLoading,
  removeChatLoading,
  renderChatError,
  setSendButtonEnabled,
  // Test cases
  renderTestCaseResults,
  // Clipboard
  copyToClipboard,
  setCopySuccess,
  // Toast
  renderToast,
  // Mobile
  activateMobileTab,
  // Button states
  setRefreshButtonLoading,
  setGenerateButtonLoading,
  // Domain active indicator
  _setDomainActiveIndicator,
  // Utilities (exported for use in copy/export)
  ICONS,
  createIcon,
};
