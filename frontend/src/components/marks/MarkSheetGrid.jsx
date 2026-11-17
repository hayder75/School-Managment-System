import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  ArrowLeft, CheckCircle2, Download, Lock, Save, Send, Settings2, ShieldCheck, AlertTriangle, XCircle,
} from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";
import {
  useMarkSheet, useSaveMarkSheet, useSubmitMarkSheet, useReviewMarkSheet, useUpdateSheetConfig,
} from "../../hooks/useMarkSheets";
import MarkSheetConfigDialog from "./MarkSheetConfigDialog";

function letterFor(scale, percent) {
  if (percent == null) return "";
  const list = Array.isArray(scale) && scale.length ? scale : [
    { letter: "A", min: 90, max: 100 }, { letter: "B", min: 80, max: 89.99 },
    { letter: "C", min: 60, max: 79.99 }, { letter: "D", min: 50, max: 59.99 },
    { letter: "F", min: 0, max: 49.99 },
  ];
  for (const b of list) {
    if (percent >= Number(b.min) && percent <= Number(b.max)) return b.letter;
  }
  return "F";
}

const STATUS_STYLE = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  submitted: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  returned: "bg-rose-50 text-rose-800 border-rose-200",
};

export default function MarkSheetGrid({ classId, subjectId, termId, onBack }) {
  const { t } = useI18n();
  const { data: res, isLoading, error: loadError } = useMarkSheet(classId, subjectId, termId);
  const save = useSaveMarkSheet();
  const submit = useSubmitMarkSheet();
  const review = useReviewMarkSheet();
  const updateConfig = useUpdateSheetConfig();

  const data = res?.data;
  const [edits, setEdits] = useState({});
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [blanks, setBlanks] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const tableRef = useRef(null);

  const sheetId = data?.sheet?.id;
  useEffect(() => {
    setEdits({});
    setDirty(false);
    setMessage("");
    setError("");
    setSavedAt(null);
  }, [sheetId, termId, classId, subjectId]);

  const columns = data?.columns || [];
  const groups = useMemo(() => {
    const configured = data?.sheet?.config?.groups || [];
    const byCode = new Map(configured.map((g) => [g.code, g]));
    for (const c of columns) {
      if (!byCode.has(c.group)) {
        byCode.set(c.group, {
          code: c.group,
          name: c.group_name || c.group,
          weight_pct: c.group_weight || 0,
          is_final: !!c.is_final,
          components: [],
        });
      }
    }
    return [...byCode.values()].filter((g) => columns.some((c) => c.group === g.code));
  }, [data?.sheet?.config, columns]);

  const totalWeight = useMemo(
    () => Math.round(groups.reduce((s, g) => s + Number(g.weight_pct || 0), 0) * 10) / 10,
    [groups]
  );

  function colKey(row, col) {
    return `${row.student_id}|${col.code}`;
  }

  function valueOf(row, col) {
    const key = colKey(row, col);
    if (Object.prototype.hasOwnProperty.call(edits, key)) return edits[key];
    const v = row.values?.[col.code];
    if (!v) return "";
    return col.input_type === "text" ? (v.text || "") : (v.marks ?? "");
  }

  function setValue(row, col, value) {
    setEdits((prev) => ({ ...prev, [colKey(row, col)]: value }));
    setDirty(true);
    setMessage("");
  }

  function calc(row) {
    let usedWeight = 0;
    let weighted = 0;
    let ca = 0;
    let final = 0;
    let missing = 0;
    const groupRows = [];
    for (const group of groups) {
      const gcols = columns.filter((c) => c.group === group.code);
      let marks = 0;
      let total = 0;
      let used = 0;
      for (const c of gcols) {
        const raw = valueOf(row, c);
        if (c.input_type === "text") {
          if (String(raw || "").trim() === "") missing += 1;
          continue;
        }
        if (raw === "" || raw == null) { missing += 1; continue; }
        const n = Number(raw);
        if (!Number.isFinite(n)) { missing += 1; continue; }
        marks += n;
        total += Number(c.max_marks || 0);
        used += 1;
      }
      const pct = total > 0 && used > 0 ? (marks / total) * 100 : null;
      const contribution = pct == null ? null : (pct * Number(group.weight_pct || 0)) / 100;
      if (pct != null) {
        weighted += pct * Number(group.weight_pct || 0);
        usedWeight += Number(group.weight_pct || 0);
        if (group.is_final) final += contribution;
        else ca += contribution;
      }
      groupRows.push({
        code: group.code,
        pct: pct == null ? null : Math.round(pct * 10) / 10,
        contribution: contribution == null ? null : Math.round(contribution * 100) / 100,
      });
    }
    const percent = usedWeight > 0 ? Math.round((weighted / usedWeight) * 10) / 10 : null;
    return {
      percent,
      ca: Math.round(ca * 100) / 100,
      final: Math.round(final * 100) / 100,
      letter: letterFor(data?.scale, percent),
      missing,
      complete: usedWeight > 0 && Math.abs(usedWeight - totalWeight) < 0.1 && missing === 0,
      groupRows,
    };
  }

  const computedRows = useMemo(
    () => (data?.students || []).map((row) => ({ row, calc: calc(row) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.students, edits, groups, columns, totalWeight]
  );

  const completeCount = computedRows.filter((x) => x.calc.complete).length;
  const withMarks = computedRows.filter((x) => x.calc.percent != null).length;
  const average = withMarks
    ? Math.round((computedRows.reduce((s, x) => s + (x.calc.percent || 0), 0) / withMarks) * 10) / 10
    : null;

  function collectCells(fillBlanks) {
    const cells = [];
    for (const row of data.students) {
      for (const col of columns) {
        const v = valueOf(row, col);
        if (v === "" || v == null) {
          if (fillBlanks && col.input_type !== "text") {
            cells.push({ student_id: row.student_id, component_code: col.code, marks: 0 });
          }
          continue;
        }
        if (col.input_type === "text") {
          cells.push({ student_id: row.student_id, component_code: col.code, text: String(v) });
        } else {
          cells.push({ student_id: row.student_id, component_code: col.code, marks: Number(v) });
        }
      }
    }
    return cells;
  }

  function countBlanks() {
    const used = new Set();
    for (const row of data.students) {
      for (const col of columns) {
        const v = valueOf(row, col);
        if (v !== "" && v != null) used.add(col.code);
      }
    }
    let count = 0;
    const names = [];
    for (const col of columns) {
      if (col.input_type === "text") continue;
      const blank = data.students.filter((r) => {
        const v = valueOf(r, col);
        return v === "" || v == null;
      }).length;
      if (blank > 0) { count += blank; names.push({ name: col.name, count: blank }); }
    }
    return { count, names };
  }

  async function doSave({ fillBlanks = false, thenSubmit = false } = {}) {
    setError("");
    setMessage("");
    try {
      const cells = collectCells(fillBlanks);
      const result = await save.mutateAsync({ id: data.sheet.id, cells, fillBlanks });
      setDirty(false);
      setSavedAt(new Date());
      const warnings = result?.data?.warnings || [];
      if (warnings.length) {
        setMessage(t("Saved, but {n} value(s) were skipped.", { n: warnings.length }));
      } else {
        setMessage(t("Saved {n} mark(s).", { n: result?.data?.saved ?? cells.length }));
      }
      if (thenSubmit) {
        try {
          await submit.mutateAsync({ id: data.sheet.id });
          setMessage(t("Submitted for approval."));
        } catch (err) {
          const e = err?.error || err?.response?.data?.error || {};
          if (e.code === "INCOMPLETE_SHEET") {
            setError(t("Some students still have blank marks. Save them as 0 before submitting."));
          } else {
            setError(e.message || t("Could not submit this sheet."));
          }
        }
      }
    } catch (err) {
      setError(err?.error?.message || err?.response?.data?.error?.message || err?.message || t("Could not save."));
    }
  }

  function startSave(thenSubmit = false) {
    const { count, names } = countBlanks();
    if (count > 0) {
      setBlanks({ count, names, thenSubmit });
      return;
    }
    doSave({ thenSubmit });
  }

  function onKeyDown(e, rowIndex, colIndex) {
    let nextRow = rowIndex;
    let nextCol = colIndex;
    if (e.key === "ArrowDown" || e.key === "Enter") nextRow += 1;
    else if (e.key === "ArrowUp") nextRow -= 1;
    else if (e.key === "ArrowRight" && e.target.selectionStart === e.target.value.length) nextCol += 1;
    else if (e.key === "ArrowLeft" && e.target.selectionStart === 0) nextCol -= 1;
    else return;
    const el = tableRef.current?.querySelector(`[data-r="${nextRow}"][data-c="${nextCol}"]`);
    if (el) {
      e.preventDefault();
      el.focus();
      if (el.select) el.select();
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">{t("Loading mark sheet...")}</p>;
  if (loadError || !data) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {loadError?.error?.message || t("Could not load this mark sheet.")}
      </div>
    );
  }

  const canEdit = data.permissions?.can_edit && data.sheet.status !== "approved" && data.sheet.status !== "submitted";
  const locked = !canEdit && !data.permissions?.read_only;
  const status = data.sheet.status;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-1">
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("Back")}
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold truncate">
            {data.class.name} · {data.subject.name}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {data.term.name}
            {data.teacher?.name ? ` · ${t("Teacher")}: ${data.teacher.name}` : ""}
            {` · ${data.students.length} ${t("students")}`}
            {(data.summary.male || data.summary.female) ? ` · M ${data.summary.male} / F ${data.summary.female}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`border ${STATUS_STYLE[status] || STATUS_STYLE.draft}`}>
            {t(status.charAt(0).toUpperCase() + status.slice(1))}
          </Badge>
          {data.permissions?.read_only && (
            <Badge variant="outline"><ShieldCheck className="h-3.5 w-3.5 mr-1" /> {t("View only")}</Badge>
          )}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setConfigOpen(true)}>
              <Settings2 className="h-4 w-4 mr-1" /> {t("Columns")}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => window.open(`/api/mark-sheets/${data.sheet.id}/export`, "_blank")}>
            <Download className="h-4 w-4 mr-1" /> {t("Excel")}
          </Button>
          {canEdit && (
            <Button size="sm" onClick={() => startSave(false)} disabled={save.isPending}>
              <Save className="h-4 w-4 mr-1" /> {save.isPending ? t("Saving...") : t("Save")}
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="secondary" onClick={() => startSave(true)} disabled={save.isPending || submit.isPending}>
              <Send className="h-4 w-4 mr-1" /> {t("Submit")}
            </Button>
          )}
          {data.permissions?.can_review && (
            <Button size="sm" onClick={() => { setReviewComment(""); setReviewOpen(true); }}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> {t("Review")}
            </Button>
          )}
        </div>
      </div>

      <div className={`flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-xs ${Math.abs(totalWeight - 100) > 0.1 ? "border-amber-300 bg-amber-50 text-amber-900" : "bg-muted/40"}`}>
        <span>{t("Weights")}: <b>{totalWeight}%</b></span>
        <span>{t("Entered")}: <b>{withMarks}/{data.students.length}</b></span>
        <span>{t("Complete")}: <b>{completeCount}/{data.students.length}</b></span>
        <span>{t("Class average")}: <b>{average == null ? "—" : average}</b></span>
        {dirty && <span className="text-amber-700 font-medium">{t("Unsaved changes")}</span>}
        {savedAt && !dirty && <span className="text-emerald-700">{t("Saved")} {savedAt.toLocaleTimeString()}</span>}
        {Math.abs(totalWeight - 100) > 0.1 && (
          <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {t("Weights must total 100")}</span>
        )}
      </div>

      {locked && (
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <Lock className="h-4 w-4" />
          {t("This mark sheet is locked because it was submitted or approved. Ask an administrator to reopen it.")}
        </div>
      )}
      {status === "returned" && data.sheet.review_comment && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <b>{t("Sent back")}:</b> {data.sheet.review_comment}
        </div>
      )}
      {message && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5" /> {message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
          <XCircle className="h-3.5 w-3.5" /> {error}
        </div>
      )}

      {!data.students.length ? (
        <p className="text-sm text-muted-foreground">{t("No active students in this class.")}</p>
      ) : (
        <div className="overflow-auto rounded-md border max-h-[70vh]" ref={tableRef}>
          <table className="border-separate border-spacing-0 text-xs">
            <thead>
              <tr className="bg-muted/70">
                <th rowSpan={2} className="sticky left-0 top-0 z-30 bg-muted px-2 py-1 text-center font-medium border-b border-r" style={{ minWidth: 34 }}>#</th>
                <th rowSpan={2} className="sticky left-[34px] top-0 z-30 bg-muted px-2 py-1 text-left font-medium border-b border-r" style={{ minWidth: 170 }}>{t("Student")}</th>
                {groups.map((g) => {
                  const count = columns.filter((c) => c.group === g.code).length;
                  return (
                    <th key={g.code} colSpan={count} className="sticky top-0 z-20 bg-muted px-2 py-1 text-center font-semibold border-b border-l whitespace-nowrap">
                      {g.name} <span className="font-normal text-muted-foreground">({g.weight_pct}%)</span>
                    </th>
                  );
                })}
                <th rowSpan={2} className="sticky top-0 z-20 bg-muted px-2 py-1 text-center font-semibold border-b border-l whitespace-nowrap">{t("Cont. Ass.")}</th>
                <th rowSpan={2} className="sticky top-0 z-20 bg-muted px-2 py-1 text-center font-semibold border-b border-l whitespace-nowrap">{t("100%")}</th>
                <th rowSpan={2} className="sticky top-0 z-20 bg-muted px-2 py-1 text-center font-semibold border-b border-l">{t("Grade")}</th>
              </tr>
              <tr className="bg-muted/50">
                {columns.map((c) => (
                  <th key={c.code} className="sticky top-[29px] z-20 bg-muted/90 px-1 py-1 text-center font-medium border-b border-l whitespace-nowrap">
                    <div className="max-w-[110px] truncate" title={c.name}>{c.name}</div>
                    {c.input_type === "number" && c.max_marks != null && (
                      <div className="text-[10px] font-normal text-muted-foreground">/{c.max_marks}</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {computedRows.map(({ row, calc: c }, ri) => (
                <tr key={row.student_id} className={ri % 2 ? "bg-muted/10" : ""}>
                  <td className="sticky left-0 z-10 bg-background px-2 py-0.5 text-center border-b border-r">{ri + 1}</td>
                  <td className="sticky left-[34px] z-10 bg-background px-2 py-0.5 border-b border-r">
                    <div className="font-medium truncate max-w-[180px]" title={row.name}>{row.name}</div>
                    <div className="text-[10px] text-muted-foreground">{row.student_number || ""}</div>
                  </td>
                  {columns.map((col, ci) => {
                    const val = valueOf(row, col);
                    return (
                      <td key={col.code} className="border-b border-l p-0.5">
                        <input
                          data-r={ri}
                          data-c={ci}
                          type={col.input_type === "text" ? "text" : "number"}
                          inputMode={col.input_type === "text" ? undefined : "decimal"}
                          step="0.5"
                          min="0"
                          max={col.max_marks ?? undefined}
                          value={val}
                          disabled={!canEdit}
                          onChange={(e) => setValue(row, col, e.target.value)}
                          onKeyDown={(e) => onKeyDown(e, ri, ci)}
                          className={`w-full min-w-[54px] rounded border-0 bg-transparent px-1 py-0.5 text-center text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-70 ${col.input_type === "text" ? "min-w-[120px] text-left" : ""}`}
                        />
                      </td>
                    );
                  })}
                  <td className="border-b border-l px-2 py-0.5 text-center font-medium">{c.ca || c.ca === 0 ? c.ca : "—"}</td>
                  <td className={`border-b border-l px-2 py-0.5 text-center font-bold ${c.percent == null ? "text-muted-foreground" : c.percent >= 50 ? "text-emerald-700" : "text-rose-700"}`}>
                    {c.percent == null ? "—" : c.percent}
                  </td>
                  <td className="border-b border-l px-2 py-0.5 text-center font-semibold">{c.letter || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {t("Tip: use the arrow keys or Enter to move between cells. You can paste a block copied from Excel.")}
      </p>

      <Dialog open={!!blanks} onOpenChange={(o) => !o && setBlanks(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Blank marks found")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              {t("There are {n} blank marks in this sheet.", { n: blanks?.count || 0 })}
            </p>
            <ul className="max-h-40 overflow-y-auto rounded border p-2 text-xs">
              {(blanks?.names || []).map((x) => (
                <li key={x.name} className="flex justify-between py-0.5">
                  <span>{x.name}</span><span className="text-muted-foreground">{x.count}</span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground">{t("Treat blank cells as 0 for this save?")}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setBlanks(null)}>{t("Cancel")}</Button>
            {!blanks?.thenSubmit && (
              <Button variant="outline" onClick={() => { const b = blanks; setBlanks(null); doSave({ fillBlanks: false, thenSubmit: b.thenSubmit }); }}>
                {t("Keep blank")}
              </Button>
            )}
            <Button onClick={() => { const b = blanks; setBlanks(null); doSave({ fillBlanks: true, thenSubmit: b.thenSubmit }); }}>
              {t("Save blanks as 0")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Review this mark sheet")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("Approving locks the sheet for the teacher. Sending it back requires a comment.")}
            </p>
            <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={4} placeholder={t("Comment (required when sending back)")} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReviewOpen(false)}>{t("Cancel")}</Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await review.mutateAsync({ id: data.sheet.id, decision: "return", comment: reviewComment });
                    setReviewOpen(false);
                  } catch (err) {
                    setError(err?.error?.message || err?.response?.data?.error?.message || t("Could not review."));
                  }
                }}
              >
                {t("Send back")}
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await review.mutateAsync({ id: data.sheet.id, decision: "approve", comment: reviewComment });
                    setReviewOpen(false);
                  } catch (err) {
                    setError(err?.error?.message || err?.response?.data?.error?.message || t("Could not review."));
                  }
                }}
              >
                {t("Approve")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MarkSheetConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        config={data.sheet.config}
        levelGroup={data.class.level_group}
        saving={updateConfig.isPending}
        onSave={async (config) => {
          try {
            await updateConfig.mutateAsync({ id: data.sheet.id, config });
            setConfigOpen(false);
            setMessage(t("Columns saved."));
          } catch (err) {
            setError(err?.error?.message || err?.response?.data?.error?.message || t("Could not save columns."));
          }
        }}
      />
    </div>
  );
}
