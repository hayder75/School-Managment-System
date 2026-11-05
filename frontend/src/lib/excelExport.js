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

  const base = String(filename || "report")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim() || "report";
  const file = base.toLowerCase().endsWith(".xlsx") ? base : `${base}.xlsx`;

  // Explicit Blob download with the .xlsx name and MIME type. XLSX.writeFile
  // can leave the browser without an extension in some setups.
  if (typeof document === "undefined") {
    XLSX.writeFile(wb, file);
    return;
  }
  const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
