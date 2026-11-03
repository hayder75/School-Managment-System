import * as XLSX from "xlsx";

function cellValue(row, col) {
  if (typeof col.value === "function") return col.value(row);
  const v = row?.[col.key];
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v;
}

/**
 * Write a real .xlsx workbook in the browser.
 * sheets: [{ name, columns: [{ key, label, width?, value? }], rows: [object] }]
 */
export function exportExcel(filename, sheets) {
  const wb = XLSX.utils.book_new();
  const used = new Set();

  for (const sheet of sheets || []) {
    const columns = (sheet.columns || []).filter(Boolean);
    if (!columns.length) continue;

    const header = columns.map((c) => c.label ?? c.key);
    const body = (sheet.rows || []).map((row) => columns.map((c) => cellValue(row, c)));
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    ws["!cols"] = columns.map((c) => ({
      wch: c.width || Math.max(12, String(c.label ?? c.key).length + 2),
    }));

    let name = String(sheet.name || "Sheet").replace(/[\\/*?:[\]]/g, " ").trim().slice(0, 31) || "Sheet";
    let n = 2;
    while (used.has(name)) {
      const suffix = ` ${n++}`;
      name = `${name.slice(0, 31 - suffix.length)}${suffix}`;
    }
    used.add(name);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  const file = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, file);
}
