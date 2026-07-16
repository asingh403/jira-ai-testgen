/**
 * js/xlsx-export.js
 * Native XLSX workbook generation without any external libraries.
 *
 * Architecture:
 *   1. Build OOXML XML strings for each required workbook part
 *   2. Assemble a ZIP STORE archive (no compression) from those parts
 *   3. Wrap in a Blob and trigger a browser download
 *
 * ZIP STORE method (compression = 0):
 *   - Local file headers:   PK\x03\x04
 *   - Central directory:    PK\x01\x02
 *   - End-of-central-dir:  PK\x05\x06
 *   - All integers: little-endian via DataView
 *   - CRC-32 polynomial:   0xEDB88320
 *
 * OOXML inline strings:
 *   Cells use t="inlineStr" with <is><t>…</t></is>.
 *   No xl/sharedStrings.xml required.
 *
 * XML escaping and multiline order (safe, no double-escaping):
 *   Step 1: replace <br> markers with \n (actual newline)
 *   Step 2: XML-escape the string  (&, <, >, ")
 *   Step 3: replace remaining \n with &#10;
 *   <t xml:space="preserve"> is added when the value contains &#10;.
 *
 * Filename:  <ISSUE_KEY>_Test_Cases_YYYY-MM-DD.xlsx
 *   Date uses local calendar (getFullYear/getMonth/getDate) to avoid
 *   UTC date shift (e.g. midnight IST = previous UTC date).
 *
 * Must NOT import ui.js or state.js.
 * Throws Error on failure — app.js catches and calls ui.renderToast.
 */

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — CRC-32
// ══════════════════════════════════════════════════════════════════════════════

/** Pre-computed CRC-32 lookup table (IEEE 802.3 polynomial 0xEDB88320) */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

/**
 * Compute the CRC-32 of a Uint8Array.
 * @param {Uint8Array} bytes
 * @returns {number} 32-bit unsigned CRC
 */
function _crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — String / Buffer helpers
// ══════════════════════════════════════════════════════════════════════════════

const _encoder = new TextEncoder();

/** @param {string} str @returns {Uint8Array} */
function _encode(str) {
  return _encoder.encode(str);
}

/**
 * Concatenate multiple Uint8Arrays into one.
 * @param {Uint8Array[]} arrays
 * @returns {Uint8Array}
 */
function _concat(arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — XML helpers
// ══════════════════════════════════════════════════════════════════════════════

/**
 * XML-escape a string (& < > " only).
 * @param {string} str
 * @returns {string}
 */
function _escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Prepare a cell text value for OOXML inline string.
 *
 * Order (correct, prevents double-escaping):
 *   1. Replace <br> with \n
 *   2. XML-escape (&, <, >, ")
 *   3. Replace \n with &#10;
 *
 * @param {string} str
 * @returns {{ escaped: string, multiline: boolean }}
 */
/**
 * Strip characters that are illegal in XML 1.0.
 * Valid chars: #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD]
 * Removes null bytes, control chars, and non-characters.
 * @param {string} str
 * @returns {string}
 */
function _stripInvalidXmlChars(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, "");
}

function _prepareCell(str) {
  if (!str) return { escaped: "", multiline: false };
  // Step 0 — remove characters that are illegal in XML 1.0
  const clean = _stripInvalidXmlChars(String(str));
  // Step 1 — <br> → actual newline character
  const withNewlines = clean.replace(/<br>/gi, "\n");
  // Step 2 — XML-escape (&, <, >, ")
  const xmlEscaped = _escapeXml(withNewlines);
  // Step 3 — actual newline → XML character reference &#10;
  //           (done AFTER escapeXml so & is not double-escaped to &amp;#10;)
  const final = xmlEscaped.replace(/\n/g, "&#10;");
  return { escaped: final, multiline: final.includes("&#10;") };
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — OOXML builders
// ══════════════════════════════════════════════════════════════════════════════

const SHEET_NAME = "Test Cases";

const COLUMNS = [
  { header: "Sno", key: "sno", width: 8 },
  { header: "Test Case Name", key: "testCaseName", width: 30 },
  { header: "Priority", key: "priority", width: 13 },
  { header: "Description", key: "description", width: 36 },
  { header: "Pre-Requisite", key: "preRequisite", width: 30 },
  { header: "Test Data", key: "testData", width: 28 },
  { header: "Test Steps", key: "testSteps", width: 44 },
  { header: "Expected Result", key: "expectedResult", width: 44 },
];

// All XML builders use compact string concatenation — no embedded newlines.
// Template literals with whitespace between XML elements can create text nodes
// that some Excel versions reject as XML errors.
const _DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function _buildContentTypes() {
  const CT = "http://schemas.openxmlformats.org/package/2006/content-types";
  return (
    _DECL +
    `<Types xmlns="${CT}">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    "</Types>"
  );
}

function _buildRootRels() {
  const NS = "http://schemas.openxmlformats.org/package/2006/relationships";
  return (
    _DECL +
    `<Relationships xmlns="${NS}">` +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
    "</Relationships>"
  );
}

function _buildDocPropsApp() {
  return (
    _DECL +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
    "<Application>AI Test Case Generator</Application>" +
    "</Properties>"
  );
}

function _buildDocPropsCore(issueKey, dateStamp) {
  return (
    _DECL +
    "<cp:coreProperties" +
    ' xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"' +
    ' xmlns:dc="http://purl.org/dc/elements/1.1/"' +
    ' xmlns:dcterms="http://purl.org/dc/terms/"' +
    ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    `<dc:title>Test Cases - ${_escapeXml(issueKey)}</dc:title>` +
    "<dc:creator>AI Test Case Generator</dc:creator>" +
    "<cp:lastModifiedBy>AI Test Case Generator</cp:lastModifiedBy>" +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${dateStamp}T00:00:00Z</dcterms:created>` +
    "</cp:coreProperties>"
  );
}

function _buildWorkbook() {
  return (
    _DECL +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"' +
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    "<sheets>" +
    `<sheet name="${_escapeXml(SHEET_NAME)}" sheetId="1" r:id="rId1"/>` +
    "</sheets>" +
    "</workbook>"
  );
}

function _buildWorkbookRels() {
  const NS = "http://schemas.openxmlformats.org/package/2006/relationships";
  return (
    _DECL +
    `<Relationships xmlns="${NS}">` +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    "</Relationships>"
  );
}

function _buildStyles() {
  // xf index 0 = normal (wrapText, top-aligned); xf index 1 = bold header
  // cellStyles element is required by Excel — references cellStyleXfs
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2">' +
    '<font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
    "</fonts>" +
    '<fills count="2">' +
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    "</fills>" +
    '<borders count="1">' +
    "<border><left/><right/><top/><bottom/><diagonal/></border>" +
    "</borders>" +
    '<cellStyleXfs count="1">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>' +
    "</cellStyleXfs>" +
    '<cellXfs count="2">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0">' +
    '<alignment wrapText="1" vertical="top"/>' +
    "</xf>" +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0">' +
    '<alignment wrapText="1" vertical="center"/>' +
    "</xf>" +
    "</cellXfs>" +
    '<cellStyles count="1">' +
    '<cellStyle name="Normal" xfId="0" builtinId="0"/>' +
    "</cellStyles>" +
    "</styleSheet>"
  );
}

/**
 * Convert a 0-based column index to an Excel column letter (A, B, … Z, AA, …).
 * @param {number} idx
 * @returns {string}
 */
function _colLetter(idx) {
  let s = "";
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function _buildWorksheet(testCases) {
  const numCols = COLUMNS.length;
  const numRows = testCases.length + 1; // +1 for header
  const lastCol = _colLetter(numCols - 1);
  const dimRange = `A1:${lastCol}${numRows}`; // e.g. A1:H6

  // Column widths (no whitespace inside element — compact for safety)
  const colsXml = COLUMNS.map(
    (col, i) =>
      `<col min="${i + 1}" max="${i + 1}" width="${col.width}" customWidth="1"/>`,
  ).join("");

  // Header row (row 1, style index 1 = bold)
  const headerCells = COLUMNS.map(
    (col, i) =>
      `<c r="${_colLetter(i)}1" t="inlineStr" s="1"><is><t>${_escapeXml(col.header)}</t></is></c>`,
  ).join("");

  // Data rows (rows 2..n, style index 0 = wrapText + top-aligned)
  const dataRows = testCases
    .map((tc, rowIdx) => {
      const rowNum = rowIdx + 2;
      const cells = COLUMNS.map((col, colIdx) => {
        const { escaped, multiline } = _prepareCell(tc[col.key] || "");
        const tOpen = multiline ? '<t xml:space="preserve">' : "<t>";
        return (
          `<c r="${_colLetter(colIdx)}${rowNum}" t="inlineStr" s="0">` +
          `<is>${tOpen}${escaped}</t></is>` +
          `</c>`
        );
      }).join("");
      return `<row r="${rowNum}">${cells}</row>`;
    })
    .join("");

  // Build worksheet XML as compact string concatenation.
  // Template literals with embedded newlines create whitespace text nodes
  // that some Excel versions reject as XML errors — compact form is safer.
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    "<worksheet" +
    ' xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"' +
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    // dimension: declares the used range so Excel knows the extent
    `<dimension ref="${dimRange}"/>` +
    "<sheetViews>" +
    '<sheetView tabSelected="1" workbookViewId="0">' +
    // freeze first row: ySplit=1 splits after row 1
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
    '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>' +
    "</sheetView>" +
    "</sheetViews>" +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    `<cols>${colsXml}</cols>` +
    "<sheetData>" +
    `<row r="1">${headerCells}</row>` +
    dataRows +
    "</sheetData>" +
    // autoFilter must come after sheetData per OOXML schema
    `<autoFilter ref="A1:${lastCol}1"/>` +
    // Note: <sheetProtection> removed — was using invalid 'sheet' attribute
    "</worksheet>"
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — ZIP STORE writer
// ══════════════════════════════════════════════════════════════════════════════

/**
 * MS-DOS date format for ZIP (little-endian, 4 bytes split into date + time words).
 * @param {Date} d
 * @returns {{ modDate: number, modTime: number }}
 */
function _dosDate(d) {
  const modDate =
    ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const modTime =
    (d.getHours() << 11) |
    (d.getMinutes() << 5) |
    Math.floor(d.getSeconds() / 2);
  return { modDate, modTime };
}

/**
 * Write a 16-bit little-endian value into a DataView.
 * @param {DataView} dv @param {number} offset @param {number} val
 */
function _u16(dv, offset, val) {
  dv.setUint16(offset, val, true);
}

/**
 * Write a 32-bit little-endian value into a DataView.
 * @param {DataView} dv @param {number} offset @param {number} val
 */
function _u32(dv, offset, val) {
  dv.setUint32(offset, val, true);
}

/**
 * Build a ZIP local file header + data block for one entry.
 * @param {string} filename
 * @param {Uint8Array} data
 * @param {number} crc
 * @param {{ modDate: number, modTime: number }} dosTime
 * @returns {Uint8Array}
 */
function _localFileEntry(filename, data, crc, dosTime) {
  const nameBytes = _encode(filename);
  const header = new Uint8Array(30 + nameBytes.length);
  const dv = new DataView(header.buffer);

  _u32(dv, 0, 0x04034b50); // local file signature PK\x03\x04
  _u16(dv, 4, 20); // version needed: 2.0
  _u16(dv, 6, 0); // general purpose flags
  _u16(dv, 8, 0); // compression method: STORE
  _u16(dv, 10, dosTime.modTime);
  _u16(dv, 12, dosTime.modDate);
  _u32(dv, 14, crc);
  _u32(dv, 18, data.length); // compressed size = uncompressed (STORE)
  _u32(dv, 22, data.length); // uncompressed size
  _u16(dv, 26, nameBytes.length);
  _u16(dv, 28, 0); // extra field length
  header.set(nameBytes, 30);

  return _concat([header, data]);
}

/**
 * Build a central directory entry for one file.
 * @param {string} filename
 * @param {Uint8Array} data
 * @param {number} crc
 * @param {{ modDate: number, modTime: number }} dosTime
 * @param {number} localOffset - byte offset of the local file header
 * @returns {Uint8Array}
 */
function _centralDirEntry(filename, data, crc, dosTime, localOffset) {
  const nameBytes = _encode(filename);
  const entry = new Uint8Array(46 + nameBytes.length);
  const dv = new DataView(entry.buffer);

  _u32(dv, 0, 0x02014b50); // central dir signature PK\x01\x02
  _u16(dv, 4, 20); // version made by
  _u16(dv, 6, 20); // version needed
  _u16(dv, 8, 0); // flags
  _u16(dv, 10, 0); // compression: STORE
  _u16(dv, 12, dosTime.modTime);
  _u16(dv, 14, dosTime.modDate);
  _u32(dv, 16, crc);
  _u32(dv, 20, data.length);
  _u32(dv, 24, data.length);
  _u16(dv, 28, nameBytes.length);
  _u16(dv, 30, 0); // extra
  _u16(dv, 32, 0); // comment
  _u16(dv, 34, 0); // disk start
  _u16(dv, 36, 0); // internal attrs
  _u32(dv, 38, 0); // external attrs
  _u32(dv, 42, localOffset);
  entry.set(nameBytes, 46);

  return entry;
}

/**
 * Build the ZIP end-of-central-directory record.
 */
function _endRecord(entryCount, centralDirSize, centralDirOffset) {
  const rec = new Uint8Array(22);
  const dv = new DataView(rec.buffer);
  _u32(dv, 0, 0x06054b50); // EOCD signature PK\x05\x06
  _u16(dv, 4, 0); // disk number
  _u16(dv, 6, 0); // disk with CD
  _u16(dv, 8, entryCount);
  _u16(dv, 10, entryCount);
  _u32(dv, 12, centralDirSize);
  _u32(dv, 16, centralDirOffset);
  _u16(dv, 20, 0); // comment length
  return rec;
}

/**
 * Assemble a complete ZIP STORE archive from named entries.
 * @param {Array<{ name: string, data: Uint8Array }>} entries
 * @returns {Uint8Array}
 */
function _buildZip(entries) {
  const now = new Date();
  const dosTime = _dosDate(now);

  const localParts = [];
  const centralEntries = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const crc = _crc32(data);
    const local = _localFileEntry(name, data, crc, dosTime);
    const cd = _centralDirEntry(name, data, crc, dosTime, offset);
    localParts.push(local);
    centralEntries.push(cd);
    offset += local.length;
  }

  const centralDir = _concat(centralEntries);
  const eocd = _endRecord(entries.length, centralDir.length, offset);

  return _concat([...localParts, centralDir, eocd]);
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — Public export function
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate and download an XLSX workbook for the given test cases.
 *
 * Filename format: <ISSUE_KEY>_Test_Cases_YYYY-MM-DD.xlsx
 * Date uses LOCAL calendar components (not UTC) to avoid date shift.
 *
 * @param {Array<object>} testCases - Parsed test case objects from parsers.js
 * @param {string}        issueKey  - Jira issue key (e.g. "GUSL-25")
 * @throws {Error} When any build step fails
 */
function exportToXlsx(testCases, issueKey) {
  if (!Array.isArray(testCases) || testCases.length === 0) {
    throw new Error("No test cases provided for export.");
  }

  // Local calendar date — avoids UTC date shift
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStamp = `${yyyy}-${mm}-${dd}`;

  const safeKey = String(issueKey || "Unknown").replace(/[/\\?%*:|"<>]/g, "_");
  const filename = `${safeKey}_Test_Cases_${dateStamp}.xlsx`;

  // Build all OOXML parts
  const entries = [
    { name: "[Content_Types].xml", data: _encode(_buildContentTypes()) },
    { name: "_rels/.rels", data: _encode(_buildRootRels()) },
    { name: "docProps/app.xml", data: _encode(_buildDocPropsApp()) },
    {
      name: "docProps/core.xml",
      data: _encode(_buildDocPropsCore(safeKey, dateStamp)),
    },
    { name: "xl/workbook.xml", data: _encode(_buildWorkbook()) },
    { name: "xl/_rels/workbook.xml.rels", data: _encode(_buildWorkbookRels()) },
    { name: "xl/styles.xml", data: _encode(_buildStyles()) },
    {
      name: "xl/worksheets/sheet1.xml",
      data: _encode(_buildWorksheet(testCases)),
    },
  ];

  const zipBytes = _buildZip(entries);

  const blob = new Blob([zipBytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Export ────────────────────────────────────────────────────────────────────

export { exportToXlsx };
