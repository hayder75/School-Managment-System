import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";
import { useSettings } from "../hooks/useSettings";
import { useClasses } from "../hooks/useClasses";
import { classLabel } from "../lib/classLabel";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Award, Printer, CheckCircle2, Loader2, Trophy, Users, Download } from "lucide-react";

function gradeColor(letter) {
  if (!letter) return "outline";
  if (/^A/.test(letter)) return "success";
  if (/^B/.test(letter)) return "secondary";
  if (letter === "F") return "destructive";
  return "outline";
}

export default function ReportCardsPage() {
  const user = useAuthStore((s) => s.user);
  const canPublish = ["admin", "owner", "principal", "vice_principal"].includes(user?.role);

  const { data: settingsData } = useSettings();
  const settings = settingsData?.data || {};
  const periodType = settings["report_card.period_type"] || "semester";
  const periodWord = periodType === "quarter" ? "Quarter" : "Semester";

  const { data: classesData } = useClasses({ limit: 300 });
  const classes = classesData?.data || [];
  const { data: termsData } = useQuery({ queryKey: ["terms-list"], queryFn: () => api.get("/academics/terms") });
  const terms = termsData?.data || [];

  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyAll, setBusyAll] = useState(false);
  const [remarkRow, setRemarkRow] = useState(null);
  const [remarkText, setRemarkText] = useState("");

  useEffect(() => { if (!classId && classes.length) setClassId(classes[0].id); }, [classes, classId]);
  useEffect(() => {
    if (!termId && terms.length) {
      // default to the term matching the configured period (Quarter/Semester) if named so
      const match = terms.find((tm) => String(tm.name || "").toLowerCase().includes(periodWord.toLowerCase()));
      setTermId((match || terms[0]).id);
    }
  }, [terms, termId, periodWord]);

  async function load() {
    if (!termId || !classId) return;
    setLoading(true);
    try {
      const res = await api.get("/reports/semester-results", { params: { term_id: termId, class_id: classId } });
      if (res.data?.students?.length) {
        const enriched = await Promise.all(res.data.students.map(async (s) => {
          try {
            const m = await api.get("/reports/report-card-meta", { params: { student_id: s.student_id, term_id: termId } });
            return { ...s, __published: !!m.data?.published, __remarks: m.data?.remarks || "" };
          } catch { return { ...s, __published: false, __remarks: "" }; }
        }));
        res.data.students = enriched;
      }
      setResults(res.data);
    } finally { setLoading(false); }
  }

  const subjects = useMemo(() => (results?.students?.[0]?.subjects || []), [results]);
  const publishedCount = (results?.students || []).filter((s) => s.__published).length;
  const classAverage = results?.students?.length
    ? Math.round((results.students.reduce((a, s) => a + Number(s.average || 0), 0) / results.students.length) * 10) / 10
    : 0;
  const top = results?.students?.slice().sort((a, b) => (a.rank || 999) - (b.rank || 999))[0];

  async function toggleAll(published) {
    setBusyAll(true);
    try {
      await api.post("/reports/report-cards/publish-all", { term_id: termId, class_id: classId, published });
      await load();
    } finally { setBusyAll(false); }
  }

  async function toggleOne(st) {
    const res = await api.put("/reports/report-card-meta", {
      student_id: st.student_id, term_id: termId, published: !st.__published,
    });
    setResults((r) => ({ ...r, students: r.students.map((x) => x.student_id === st.student_id ? { ...x, __published: res.data.published } : x) }));
  }

  async function saveRemark() {
    if (!remarkRow) return;
    await api.put("/reports/report-card-meta", { student_id: remarkRow.student_id, term_id: termId, remarks: remarkText });
    setResults((r) => ({ ...r, students: r.students.map((x) => x.student_id === remarkRow.student_id ? { ...x, __remarks: remarkText } : x) }));
    setRemarkRow(null);
  }

  // ── mass download / print ──
  const [selected, setSelected] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState("");

  const allSelected = !!results?.students?.length && results.students.every((s) => selected.has(s.student_id));

  function toggleSelect(sid) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid); else next.add(sid);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelected((prev) => (allSelected ? new Set() : new Set(results.students.map((s) => s.student_id))));
  }

  const selectedIds = useMemo(() => [...selected], [selected]);

  // Navigate to a URL that triggers a browser download / print.
  function hitUrl(kind) {
    const ids = selectedIds.length ? `&student_ids=${selectedIds.join(",")}` : "";
    return `/api/pdf/report-cards/${kind}?class_id=${classId}&term_id=${termId}${ids}`;
  }

  async function massDownload() {
    setBulkBusy("zip");
    try { window.location.href = hitUrl("download"); }
    finally { setTimeout(() => setBulkBusy(""), 2500); }
  }
  async function massPrint() {
    setBulkBusy("print");
    try { window.open(hitUrl("print"), "_blank"); }
    finally { setTimeout(() => setBulkBusy(""), 2500); }
  }
  function downloadOne(sid) {
    window.open(`/api/pdf/report-card/${sid}?term_id=${termId}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Report Cards</h1>
          <p className="text-muted-foreground">Rank students and issue {periodType === "quarter" ? "quarterly" : "semester"} report cards out of 100.</p>
        </div>
        <Badge variant="outline" className="gap-1"><Award className="h-3.5 w-3.5" />{periodWord} mode</Badge>
      </div>

      {/* Controls */}
      <Card><CardContent className="pt-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="w-56 mt-1"><SelectValue placeholder="Choose class…" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{classLabel(c)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{periodWord}</Label>
            <Select value={termId} onValueChange={setTermId}>
              <SelectTrigger className="w-52 mt-1"><SelectValue placeholder={`Choose ${periodWord.toLowerCase()}…`} /></SelectTrigger>
              <SelectContent>
                {terms.map((tm) => <SelectItem key={tm.id} value={tm.id}>{tm.name}{tm.year_name ? ` (${tm.year_name})` : ""}</SelectItem>)}
                {!terms.length && <div className="px-3 py-2 text-xs text-muted-foreground">No terms configured</div>}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={load} disabled={!termId || !classId || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Load
          </Button>
          {results?.students?.length > 0 && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {selectedIds.length ? `${selectedIds.length} selected` : "Whole class"}
              </span>
              <Button variant="outline" onClick={massPrint} disabled={bulkBusy === "print"}>
                {bulkBusy === "print" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
                {bulkBusy === "print" ? "Opening…" : "Mass print"}
              </Button>
              <Button variant="outline" onClick={massDownload} disabled={bulkBusy === "zip"}>
                {bulkBusy === "zip" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {bulkBusy === "zip" ? "Preparing…" : "Download PDFs"}
              </Button>
              {canPublish && (
                <>
                  <Button onClick={() => toggleAll(true)} disabled={busyAll}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />Publish all
                  </Button>
                  <Button variant="ghost" onClick={() => toggleAll(false)} disabled={busyAll}>Unpublish all</Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent></Card>

      {!results && !loading && (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          Pick a class and {periodWord.toLowerCase()} to compute marks out of 100, with class ranking and printable report cards.
        </CardContent></Card>
      )}

      {results && !loading && (
        results.students.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
            No grades recorded for this class in this period yet.
          </CardContent></Card>
        ) : (
          <>
            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card><CardContent className="pt-6">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Class size</p>
                <p className="text-2xl font-semibold mt-1">{results.students.length}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-6">
                <p className="text-xs text-muted-foreground font-medium">Class average</p>
                <p className="text-2xl font-semibold mt-1">{classAverage} <span className="text-sm text-muted-foreground">/100</span></p>
              </CardContent></Card>
              <Card><CardContent className="pt-6">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" />Top of class</p>
                <p className="text-lg font-semibold mt-1 truncate">{top?.student_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{top?.average} / 100 · rank {top?.rank}</p>
              </CardContent></Card>
            </div>

            <p className="text-sm text-muted-foreground">
              Weights: CA {results.weights?.ca_pct ?? 50}% + Exam {results.weights?.exam_pct ?? 50}% ·
              Published {publishedCount}/{results.students.length}
            </p>

            <Card><CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[860px] table-sticky-col">
                <thead><tr className="border-b bg-muted/50 text-left">
                  <th className="p-3 w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                      aria-label="Select all students" className="cursor-pointer" />
                  </th>
                  <th className="p-3 font-medium">Rank</th>
                  <th className="p-3 font-medium">Student</th>
                  {subjects.map((s, i) => <th key={s.subject_id || i} className="p-3 font-medium text-center text-xs">{s.name}</th>)}
                  <th className="p-3 font-medium text-center">Avg /100</th>
                  <th className="p-3 font-medium text-center">Grade</th>
                  <th className="p-3 font-medium text-center">Status</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {results.students.map((st) => (
                    <tr key={st.student_id} className={`border-b hover:bg-muted/30 ${selected.has(st.student_id) ? "bg-primary/5" : ""}`}>
                      <td className="p-3">
                        <input type="checkbox" checked={selected.has(st.student_id)}
                          onChange={() => toggleSelect(st.student_id)}
                          aria-label={`Select ${st.student_name}`} className="cursor-pointer" />
                      </td>
                      <td className="p-3"><Badge variant={st.rank <= 3 ? "success" : "outline"}>{st.rank}</Badge></td>
                      <td className="p-3 font-medium">{st.student_name}<span className="block text-[11px] text-muted-foreground">{st.student_number || ""}</span></td>
                      {subjects.map((s, i) => {
                        const mine = st.subjects[i];
                        return <td key={i} className="p-3 text-center">{mine ? <span>{mine.mark}<span className="text-xs text-muted-foreground"> ({mine.letter})</span></span> : "—"}</td>;
                      })}
                      <td className="p-3 text-center font-bold">{st.average}</td>
                      <td className="p-3 text-center"><Badge variant={gradeColor(st.letter)}>{st.letter}</Badge></td>
                      <td className="p-3 text-center">
                        <span className={`text-xs font-semibold ${st.__published ? "text-green-600" : "text-orange-600"}`}>
                          {st.__published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <a href={`/api/pdf/report-card/${st.student_id}?term_id=${termId}`} target="_blank" rel="noreferrer"
                          className="text-primary underline text-xs font-medium inline-flex items-center gap-1">
                          <Printer className="h-3 w-3" />Print
                        </a>
                        <button onClick={() => downloadOne(st.student_id)}
                          className="text-primary underline text-xs font-medium inline-flex items-center gap-1">
                          <Download className="h-3 w-3" />PDF
                        </button>
                        {canPublish && (
                          <>
                            <button className="text-xs underline text-muted-foreground hover:text-foreground"
                              onClick={() => { setRemarkRow(st); setRemarkText(st.__remarks || ""); }}>Comment</button>
                            <button className={`text-xs font-semibold underline ${st.__published ? "text-green-600" : "text-orange-600"}`}
                              onClick={() => toggleOne(st)}>{st.__published ? "Unpublish" : "Publish"}</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          </>
        )
      )}

      <Dialog open={!!remarkRow} onOpenChange={(v) => !v && setRemarkRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Teacher's comment — {remarkRow?.student_name}</DialogTitle></DialogHeader>
          <textarea rows={4} value={remarkText} onChange={(e) => setRemarkText(e.target.value)}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            placeholder="e.g. A diligent student, consistent and well-behaved." />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRemarkRow(null)}>Cancel</Button>
            <Button onClick={saveRemark}>Save comment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}