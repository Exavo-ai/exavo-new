/**
 * Safe Excel file parsing utility with security safeguards.
 *
 * TODO: Migrate from `xlsx@0.18.5` to `exceljs` (actively maintained)
 * once a thorough compatibility review is completed.
 * xlsx@0.18.5 is the last npm-published version; SheetJS moved off npm after this.
 * See: https://github.com/nicolo-ribaudo/tc39-proposal-stop-patenting-software
 */

import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_EXTENSIONS = [".xlsx"] as const;

const ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

const REJECTED_EXTENSIONS = [".xlsm", ".xlsb", ".xls", ".xltm"] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExcelParseResult {
  sheets: Record<string, unknown[][]>;
  sheetNames: string[];
  fileName: string;
  fileSize: number;
}

export interface ExcelValidationError {
  code:
    | "INVALID_EXTENSION"
    | "MACRO_FILE"
    | "INVALID_MIME"
    | "FILE_TOO_LARGE"
    | "PARSE_ERROR";
  message: string;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx === -1 ? "" : fileName.slice(idx).toLowerCase();
}

/**
 * Validate an Excel file before parsing.
 * Returns `null` when valid, or an `ExcelValidationError` otherwise.
 */
export function validateExcelFile(
  file: File
): ExcelValidationError | null {
  const ext = getExtension(file.name);

  // Reject macro-enabled files first
  if ((REJECTED_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      code: "MACRO_FILE",
      message: `Macro-enabled files (${ext}) are not allowed for security reasons.`,
    };
  }

  // Extension whitelist
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      code: "INVALID_EXTENSION",
      message: `Only .xlsx files are accepted. Received: ${ext || "(none)"}`,
    };
  }

  // MIME type check (browsers sometimes report empty MIME; be lenient but log)
  if (
    file.type &&
    !(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)
  ) {
    return {
      code: "INVALID_MIME",
      message: `Invalid MIME type: ${file.type}. Expected application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.`,
    };
  }

  // File size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      code: "FILE_TOO_LARGE",
      message: `File exceeds the 5 MB limit (${(file.size / 1024 / 1024).toFixed(2)} MB).`,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Safe parsing
// ---------------------------------------------------------------------------

/**
 * Safely parse an Excel file, stripping formulas and treating all cells as
 * raw values.  Macros and VBA are never executed.
 *
 * @param file      The File/Blob to parse.
 * @param userId    Used for audit logging only — never logged with file content.
 */
export async function safeParseExcel(
  file: File,
  userId?: string
): Promise<ExcelParseResult> {
  // --- Validation ---
  const validationError = validateExcelFile(file);
  if (validationError) {
    throw validationError;
  }

  // --- Audit log (no content) ---
  console.log("[EXCEL-SAFE-PARSE] Processing file", {
    user_id: userId ?? "anonymous",
    file_name: file.name,
    file_size: file.size,
  });

  // --- Read file ---
  const buffer = await file.arrayBuffer();

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: "array",
      // Security: do not evaluate formulas — treat them as raw strings
      cellFormula: false,
      // Return raw values; do not format dates/numbers
      raw: true,
      // Do not parse VBA / macros
      bookVBA: false,
    });
  } catch (err) {
    console.error("[EXCEL-SAFE-PARSE] Parse error", {
      user_id: userId ?? "anonymous",
      file_name: file.name,
      error: err instanceof Error ? err.message : String(err),
    });
    throw {
      code: "PARSE_ERROR",
      message: "Failed to parse the Excel file. It may be corrupted.",
    } satisfies ExcelValidationError;
  }

  // --- Extract sheets as plain-text 2D arrays ---
  const sheets: Record<string, unknown[][]> = {};

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    // header: 1 → returns array-of-arrays (no key mapping)
    // raw: true → no formatting, plain values
    // defval: "" → empty cells become empty strings
    sheets[name] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: "",
    }) as unknown[][];
  }

  console.log("[EXCEL-SAFE-PARSE] Successfully parsed", {
    user_id: userId ?? "anonymous",
    file_name: file.name,
    sheet_count: workbook.SheetNames.length,
  });

  return {
    sheets,
    sheetNames: workbook.SheetNames,
    fileName: file.name,
    fileSize: file.size,
  };
}
