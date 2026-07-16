# AI Test Case Generator

Enterprise-grade Jira-integrated AI test case generator powered by Langflow.
Runs as a fully static application — no build tools, no npm, no external JavaScript libraries.

---

## Project Purpose

Generate structured test cases from Jira backlog stories using a Langflow AI flow.
The frontend sends prompts to a local Langflow instance and presents results as
interactive cards, a table view, and an exportable Excel workbook.

---

## Architecture Overview

```
index.html          Semantic HTML shell — no inline scripts
css/styles.css      All styling: tokens, layout, components, themes, responsive
js/config.js        Frozen Langflow configuration (API key placeholder)
js/state.js         Central state, sessionStorage, localStorage
js/api.js           Pure HTTP transport — sends requests, throws typed errors
js/parsers.js       Markdown table and JSON parsers — no DOM, no XLSX logic
js/ui.js            DOM rendering — no storage writes, no business logic
js/app.js           Orchestrator — owns request lock, wires all events
js/xlsx-export.js   Native ZIP + OOXML .xlsx generator — no external libraries
```

**Module dependency graph (no circular dependencies):**

```
app.js → state.js
app.js → api.js    → config.js
app.js → parsers.js
app.js → ui.js
app.js → xlsx-export.js
```

---

## File Structure

```
jira-test-case-generator/
├── index.html
├── README.md
├── css/
│   └── styles.css
└── js/
    ├── config.js
    ├── state.js
    ├── api.js
    ├── parsers.js
    ├── ui.js
    ├── app.js
    └── xlsx-export.js
```

---

## Configure the Langflow API Key

Open `js/config.js` and replace the placeholder:

```javascript
apiKey: '<PASTE_CURRENT_LANGFLOW_POC_API_KEY_HERE>',
```

> **Do not commit the real API key to version control.**

---

## How to Run

### Option 1 — VS Code Go Live (recommended)

1. Install the **Live Server** extension in VS Code.
2. Open `index.html` in the editor.
3. Click **Go Live** in the status bar.
4. The app opens at `http://localhost:5500` or `http://127.0.0.1:5500`.

### Option 2 — Python static server

```bash
cd jira-test-case-generator
python3 -m http.server 5500
```

Then open `http://localhost:5500` in your browser.

---

## Langflow Endpoint Requirements

- Langflow must be running at `http://localhost:7860`
- The flow ID is configured in `js/config.js`
- **CORS must be enabled** on Langflow to allow browser requests

### CORS Configuration

VS Code Go Live may use either:

- `http://localhost:5500`
- `http://127.0.0.1:5500`

Both origins may need to be added to Langflow's allowed origins configuration.

**CORS errors appear as a generic "Unable to reach Langflow" message** because the
browser's `TypeError` cannot distinguish CORS rejection from other network failures.

---

## Browser Session Behavior

- One session ID is generated per browser tab using `crypto.randomUUID()`
- The session ID is stored in `sessionStorage` and reused on same-tab page reload
- A new tab always starts a fresh session
- The full conversation history is stored in `sessionStorage` and restored on reload
- Conversation history is cleared when the tab is closed
- The session ID is sent with every Langflow request to maintain conversation context

---

## Theme Behavior

- **Dark** is the default for first-time users
- The selected theme is stored in `localStorage` and restored on every page load
- Three themes: **Dark**, **Light**, **Dim**
- Themes use CSS custom properties — no duplicate stylesheets
- A brief transition may appear on startup when a non-dark theme is restored

---

## How .xlsx Export Works (Without SheetJS)

`js/xlsx-export.js` implements the Office Open XML format entirely from scratch:

1. **XML generation**: Builds valid OOXML XML strings for each workbook part
2. **ZIP STORE**: Packs the XML files into a ZIP archive using `Uint8Array` and
   `DataView`, with CRC-32 checksums and no compression (method 0)
3. **Download**: Wraps the ZIP bytes in a `Blob` and triggers a download via a
   synthetic `<a>` element

Workbook features:

- Sheet name: `Test Cases`
- Inline strings (no shared strings)
- Bold header row (row 1)
- Frozen first row
- Autofilter on header row
- Text wrap enabled for all data cells
- Multiline cell content (Excel line breaks via `&#10;`)
- Practical column widths

Filename format: `<ISSUE_KEY>_Test_Cases_YYYY-MM-DD.xlsx`
(date uses local calendar time, not UTC)

---

## ⚠️ Known POC Limitation — Browser-Visible API Key

The Langflow API key is stored in `js/config.js`, which is served as a static file.
**It is readable by anyone with browser DevTools access.**

This is acceptable only for local development on a trusted machine.

**Never deploy this application to a shared, public, or production environment**
without moving the API key to a server-side proxy.

---

## Common CORS Troubleshooting

| Symptom                                | Likely cause         | Fix                                                                |
| -------------------------------------- | -------------------- | ------------------------------------------------------------------ |
| "Unable to reach Langflow" on startup  | CORS not enabled     | Add `localhost:5500` and `127.0.0.1:5500` to Langflow CORS origins |
| App works in one browser, not another  | Origin mismatch      | Check exact origin VS Code Go Live uses (port 5500 vs 5501)        |
| Works after refresh but not first load | Langflow starting up | Wait for Langflow to fully initialize                              |
| 401 error message                      | Wrong API key        | Replace placeholder in `js/config.js`                              |
| 404 error message                      | Wrong flow ID        | Check the endpoint URL in `js/config.js`                           |

---

## Manual Verification Steps

1. Open the app — dark theme loads, issue list skeleton appears
2. Issue list populates with all 25 GUSL issues
3. Search `GUSL-25` — only matching issues visible
4. Click GUSL-25 — details panel shows all fields; domain badge = "Health Care"
5. Click **Generate Test Cases** — cards appear in the chat panel
6. Switch to **Table** view — 8 columns visible with horizontal scroll
7. Click **Copy All** — paste into a text editor; no literal `<br>` in output
8. Click **Export .xlsx** — file downloads as `GUSL-25_Test_Cases_YYYY-MM-DD.xlsx`
9. Open in Excel/LibreOffice — header bold, freeze pane active, autofilter visible
10. Switch theme from Dark → Light → Dim → Dark; refresh — saved theme restores
11. Open new tab — different session ID generated
12. Tab through entire UI without mouse — all controls reachable
