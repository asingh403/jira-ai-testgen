/**
 * js/parsers.js
 * Langflow response parsing utilities.
 *
 * Responsibilities:
 *   - Parse and normalise Langflow response text into structured data
 *   - Convert <br> markers to newlines for copy/export contexts (brToText)
 *
 * Must NOT:
 *   - Contain any XML or XLSX escaping logic (that belongs in xlsx-export.js)
 *   - Import any other application module
 *   - Perform any DOM manipulation or API calls
 *
 * Parsing strategy for Markdown tables (corrected per plan):
 *   1. Trim the line
 *   2. Remove exactly one leading pipe
 *   3. Remove exactly one trailing pipe
 *   4. Split remaining content by pipe
 *   5. Trim every cell
 *   6. Preserve empty cells (do NOT filter)
 *   7. Validate final cell count against the header count
 *
 * Header detection is specific (validates required column names),
 * not merely "first line starting with |".
 *
 * Separator row validation:
 *   - Extract separator cells using the same algorithm
 *   - Separator cell count must equal header cell count
 *   - Every cell must match /^:?-{3,}:?$/
 */

// ── Required headers ──────────────────────────────────────────────────────────

const ISSUE_LIST_HEADERS = ["issue key", "summary", "status", "priority"];

const TEST_CASE_HEADERS = [
  "sno",
  "test case name",
  "priority",
  "description",
  "pre-requisite",
  "test data",
  "test steps",
  "expected result",
];

// ── Cell extraction ───────────────────────────────────────────────────────────

/**
 * Extract cells from a Markdown table row using the corrected algorithm.
 * Preserves empty cells; does not filter.
 *
 * @param {string} line
 * @returns {string[]}
 */
function _extractCells(line) {
  let s = line.trim();
  // Remove exactly one leading pipe
  if (s.startsWith("|")) s = s.slice(1);
  // Remove exactly one trailing pipe
  if (s.endsWith("|")) s = s.slice(0, -1);
  // Split by pipe, trim each cell, preserve empty strings
  return s.split("|").map((cell) => cell.trim());
}

/**
 * Validate whether a line is a Markdown separator row.
 * The cells must match /^:?-{3,}:?$/ and the count must match the header count.
 *
 * @param {string} line
 * @param {number} expectedCount
 * @returns {boolean}
 */
function _isSeparatorRow(line, expectedCount) {
  const cells = _extractCells(line);
  if (cells.length !== expectedCount) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

// ── Markdown table parser (spec §9.1) ─────────────────────────────────────────

/**
 * Find and parse the first valid Markdown table whose headers match the
 * required list.
 *
 * @param {string} markdownText - Full response text (may include preamble)
 * @param {string[]} requiredHeaders - Lowercase trimmed header names to match
 * @returns {{ headers: string[], rows: string[][] }|null}
 */
function _parseTableWithHeaders(markdownText, requiredHeaders) {
  const lines = markdownText.split("\n");
  const n = lines.length;

  for (let i = 0; i < n - 1; i++) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) continue;

    const cells = _extractCells(line);
    const normalized = cells.map((c) => c.toLowerCase().trim());

    // Check that all required headers are present at the right positions
    const headerCount = requiredHeaders.length;
    if (normalized.length < headerCount) continue;

    const matches = requiredHeaders.every((h, idx) => normalized[idx] === h);
    if (!matches) continue;

    // Validate separator row immediately after the header
    const sepLine = lines[i + 1];
    if (!sepLine || !_isSeparatorRow(sepLine, cells.length)) continue;

    // This is a valid table — parse data rows
    const headers = cells;
    const rows = [];

    for (let j = i + 2; j < n; j++) {
      const dataLine = lines[j].trim();
      if (!dataLine.startsWith("|")) break; // table ended

      const dataCells = _extractCells(lines[j]);
      if (dataCells.length !== headers.length) continue; // skip malformed row
      rows.push(dataCells);
    }

    return { headers, rows };
  }

  return null;
}

/**
 * Generic Markdown table parser (exported for use when headers are not
 * restricted to a specific set).
 *
 * @param {string} markdownText
 * @returns {{ headers: string[], rows: string[][] }|null}
 */
function parseMarkdownTable(markdownText) {
  if (!markdownText) return null;
  const lines = markdownText.split("\n");
  const n = lines.length;

  for (let i = 0; i < n - 1; i++) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) continue;

    const cells = _extractCells(line);
    if (cells.length === 0) continue;

    const sepLine = lines[i + 1];
    if (!sepLine || !_isSeparatorRow(sepLine, cells.length)) continue;

    const headers = cells;
    const rows = [];

    for (let j = i + 2; j < n; j++) {
      const dataLine = lines[j].trim();
      if (!dataLine.startsWith("|")) break;
      const dataCells = _extractCells(lines[j]);
      if (dataCells.length !== headers.length) continue;
      rows.push(dataCells);
    }

    return { headers, rows };
  }

  return null;
}

// ── Issue list parser (spec §9.2) ─────────────────────────────────────────────

/**
 * Parse a LIST_ISSUES Markdown table response into structured issue objects.
 *
 * @param {string} responseText
 * @returns {Array<{issueKey:string, summary:string, status:string, priority:string}>|null}
 */
function parseIssueList(responseText) {
  if (!responseText) return null;

  const result = _parseTableWithHeaders(responseText, ISSUE_LIST_HEADERS);
  if (!result || result.rows.length === 0) return null;

  const issues = result.rows.map((row) => ({
    issueKey: row[0] || "",
    summary: row[1] || "",
    status: row[2] || "",
    priority: row[3] || "",
  }));

  // Sort numerically by the number after the last hyphen (GUSL-1 < GUSL-9 < GUSL-10)
  issues.sort((a, b) => {
    const numA = parseInt(a.issueKey.replace(/^.*-/, ""), 10) || 0;
    const numB = parseInt(b.issueKey.replace(/^.*-/, ""), 10) || 0;
    return numA - numB;
  });

  return issues;
}

// ── Issue details parser (spec §9.3) ─────────────────────────────────────────

/**
 * Parse a SHOW_ISSUE_DETAILS JSON response into a structured object.
 * Strips accidental Markdown JSON fences.
 * Validates the presence of four required fields.
 *
 * @param {string} responseText
 * @returns {object} Parsed issue detail object
 * @throws {Error} When JSON is invalid or required fields are missing
 */
function parseIssueDetails(responseText) {
  if (!responseText) throw new Error("Empty response from Langflow.");

  let text = responseText.trim();

  // Strip accidental Markdown JSON fences
  text = text
    .replace(/^```json?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Issue details response is not valid JSON. ${err.message}`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Issue details response has unexpected structure.");
  }

  // Validate required fields
  const required = ["issue_key", "summary", "status", "priority"];
  const missing = required.filter((f) => !(f in parsed));
  if (missing.length > 0) {
    throw new Error(
      `Issue details response is missing required fields: ${missing.join(", ")}.`,
    );
  }

  return parsed;
}

// ── Test case parser (spec §9.4) ──────────────────────────────────────────────

/**
 * Parse a GENERATE_TEST_CASES Markdown table response.
 * Handles LLM chain-of-thought preamble before the table (observed in practice).
 *
 * @param {string} responseText
 * @returns {Array<{sno,testCaseName,priority,description,preRequisite,testData,testSteps,expectedResult}>|null}
 */
function parseTestCaseTable(responseText) {
  if (!responseText) return null;

  const result = _parseTableWithHeaders(responseText, TEST_CASE_HEADERS);
  if (!result || result.rows.length === 0) return null;

  return result.rows.map((row) => ({
    sno: row[0] || "",
    testCaseName: row[1] || "",
    priority: row[2] || "",
    description: row[3] || "",
    preRequisite: row[4] || "",
    testData: row[5] || "",
    testSteps: row[6] || "",
    expectedResult: row[7] || "",
  }));
}

// ── Response classifier ───────────────────────────────────────────────────────

/**
 * Classify a Langflow response text into one of four types.
 *
 * @param {string} text
 * @returns {'table-issues'|'table-testcases'|'json-issue'|'unknown'}
 */
function classifyResponse(text) {
  if (!text) return "unknown";

  const trimmed = text.trim();

  // JSON object → issue details
  if (trimmed.startsWith("{")) {
    try {
      const p = JSON.parse(
        trimmed.replace(/^```json?\s*/i, "").replace(/\s*```\s*$/, ""),
      );
      if (p && typeof p === "object" && "issue_key" in p) {
        return "json-issue";
      }
    } catch {
      /* fall through */
    }
  }

  // Check for test case table header (may be preceded by preamble)
  if (/\|\s*sno\s*\|/i.test(text)) return "table-testcases";

  // Check for issue list table header
  if (/\|\s*issue\s*key\s*\|/i.test(text)) return "table-issues";

  return "unknown";
}

// ── br-to-text conversion (for clipboard and export) ─────────────────────────

/**
 * Replace all <br> markers with actual newline characters.
 * Used only in clipboard copy and xlsx export contexts — never in DOM rendering.
 *
 * @param {string} str
 * @returns {string}
 */
function brToText(str) {
  if (!str) return "";
  return str.replace(/<br>/gi, "\n");
}

/**
 * Build structured plain text for "Copy All Test Cases".
 * Does NOT produce a Markdown table — produces readable labeled text.
 *
 * @param {Array} testCases
 * @returns {string}
 */
function testCasesToPlainText(testCases) {
  if (!Array.isArray(testCases) || testCases.length === 0) return "";

  const SEPARATOR = "-".repeat(40);

  return testCases
    .map((tc) => {
      const lines = [
        `Test Case ${tc.sno}: ${tc.testCaseName}`,
        `Priority: ${tc.priority}`,
        "",
        "Description:",
        brToText(tc.description || ""),
        "",
        "Pre-Requisite:",
        brToText(tc.preRequisite || ""),
        "",
        "Test Data:",
        brToText(tc.testData || ""),
        "",
        "Test Steps:",
        brToText(tc.testSteps || ""),
        "",
        "Expected Result:",
        brToText(tc.expectedResult || ""),
        SEPARATOR,
      ];
      return lines.join("\n");
    })
    .join("\n\n");
}

// ── Exports ───────────────────────────────────────────────────────────────────

export {
  parseMarkdownTable,
  parseIssueList,
  parseIssueDetails,
  parseTestCaseTable,
  classifyResponse,
  brToText,
  testCasesToPlainText,
};
