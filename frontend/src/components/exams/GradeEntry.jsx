import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/auth";
import { useExamClasses, useExamGrades, useEnterGrades } from "../../hooks/useGrades";
import {
  useExamSections, useSubmitResults, useExamDraft, useSaveExamDraft, useClearExamDraft,
} from "../../hooks/useExams";
import { useCreateEditRequest, useEditRequests } from "../../hooks/useResults";
import { useI18n } from "../../i18n/I18nContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { classes as sev, markSeverity, statusSeverity } from "../../lib/gradeColors";
import {
  AlertTriangle, CheckCircle2, Clock, Lock, Send, PencilLine, Save, ShieldCheck, Undo2,
} from "lucide-react";

const STATUS_LABEL = {
  draft: "Draft",
  submitted: "Waiting for approval",
  approved: "Approved",
  returned: "Sent back",
  editing: "Edit approved",
};

function lsKey(examId, classId, userId) {
  return `sms.grades.v1.${examId}.${classId}.${userId || "anon"}`;
}

export default function GradeEntry({ exam }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isReviewer = ["owner", "admin", "quality_director", "principal", "vice_principal", "general_manager"].includes(user?.role);
  const { data: classesData, isLoading: loadingClasses } = useExamClasses(exam.id);
  const { data: sectionsData } = useExamSections(exam.id);
  const classes = classesData?.data || [];
  const sections = sectionsData?.data || [];
  const sectionMap = useMemo(() => Object.fromEntries(sections.map((s) => [s.class_id, s])), [sections]);

  const [selectedClass, setSelectedClass] = useState("");
  useEffect(() => {
    if (!selectedClass && classes.length) setSelectedClass(classes[0].id);
  }, [classes, selectedClass]);

  const { data: gradesData, isLoading } = useExamGrades(exam.id, selectedClass || undefined);
  const records = gradesData?.data || [];
  const meta = gradesData?.meta || {};
  const section = sectionMap[selectedClass];
  const status = meta.status || section?.status || "draft";
  const locked = ["submitted", "approved"].includes(status);

  const enterGrades = useEnterGrades();
  const submitResults = useSubmitResults();
  const createRequest = useCreateEditRequest();
  const { data: requestsData } = useEditRequests({ exam_id: exam.id });
  const requests = (requestsData?.data || []).filter((r) => r.class_id === selectedClass);
  const { data: draftData } = useExamDraft(exam.id, selectedClass || undefined);
  const saveDraft = useSaveExamDraft();
  const clearDraft = useClearExamDraft();

  const [edits, setEdits] = useState({});
  const [restore, setRestore] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const [requestFor, setRequestFor] = useState(null); // { studentId?, name? }
  const [reason, setReason] = useState("");
  const [requestError, setRequestError] = useState("");
  const [submitError, setSubmitError] = useState("");

  // Load any local autosave when the section changes.
  useEffect(() => {
    if (!selectedClass) return;
    setSaveResult(null);
    setRestore(null);
    try {
      const raw = localStorage.getItem(lsKey(exam.id, selectedClass, user?.id));
      if (raw) {
        const parsed = JSON.parse(raw);
        const marks = parsed?.marks || {};
        if (Object.keys(marks).length) {
          setRestore({ marks, at: parsed.at });
        }
      }
      setSavedAt(null);
    } catch {
      // ignore corrupt storage
    }
  }, [exam.id, selectedClass, user?.id]);

  const activeMarks = useMemo(() => edits[selectedClass] || {}, [edits, selectedClass]);
  const pendingCount = Object.keys(activeMarks).length;

  // Debounced local autosave.
  const debounceRef = useRef(null);
  useEffect(() => {
    if (!selectedClass || pendingCount === 0) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(lsKey(exam.id, selectedClass, user?.id), JSON.stringify({
          marks: activeMarks, at: new Date().toISOString(),
        }));
        setSavedAt(new Date());
      } catch {
        // storage full / disabled
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [activeMarks, exam.id, selectedClass, user?.id, pendingCount]);

  // Server-side backup every 20s, so a shared PC or a cleared cache still recovers.
  useEffect(() => {
    if (!selectedClass || pendingCount === 0) return;
    const id = setInterval(() => {
      saveDraft.mutate({
        examId: exam.id,
        classId: selectedClass,
        payload: { marks: activeMarks },
      });
    }, 20000);
    return () => clearInterval(id);
  }, [activeMarks, exam.id, selectedClass, pendingCount, saveDraft]);

  // Warn before leaving with unsaved marks.
  useEffect(() => {
    function guard(e) {
      const any = Object.values(edits).some((m) => Object.keys(m).length > 0);
      if (!any) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [edits]);

  function handleMarksChange(studentId, val) {
    setEdits((prev) => ({
      ...prev,
      [selectedClass]: {
        ...(prev[selectedClass] || {}),
        [studentId]: val === "" ? null : Number(val),
      },
    }));
  }

  function valueFor(record) {
    const map = edits[selectedClass];
    if (map && Object.prototype.hasOwnProperty.call(map, record.student_id)) {
      return map[record.student_id] ?? "";
    }
    return record.marks_obtained ?? "";
  }

  function pendingFor(classId) {
    return Object.keys(edits[classId] || {}).length;
  }

  function totalPending() {
    return Object.values(edits).reduce((n, m) => n + Object.keys(m).length, 0);
  }

  function restoreLocal() {
    if (!restore) return;
    setEdits((prev) => ({ ...prev, [selectedClass]: { ...(restore.marks || {}) } }));
    setRestore(null);
  }

  function discardLocal() {
    try {
      localStorage.removeItem(lsKey(exam.id, selectedClass, user?.id));
    } catch {
      // ignore
    }
    setRestore(null);
  }

  async function handleSave() {
    const grades = [];
    for (const map of Object.values(edits)) {
      for (const [studentId, marks] of Object.entries(map)) {
        grades.push({ student_id: studentId, marks_obtained: marks });
      }
    }
    if (!grades.length) return;
    const res = await enterGrades.mutateAsync({ examId: exam.id, grades });
    const payload = res?.data || {};
    setSaveResult(payload);

    // Remove only the marks that were actually saved. Locked (skipped) marks
    // stay in the editor so the teacher can request an edit without retyping.
    const skippedSet = new Set((payload.skipped_details || []).map((s) => s.student_id));
    const nextEdits = {};
    for (const [classId, map] of Object.entries(edits)) {
      const remaining = Object.fromEntries(
        Object.entries(map).filter(([studentId]) => skippedSet.has(studentId))
      );
      if (Object.keys(remaining).length) nextEdits[classId] = remaining;
      if (!Object.keys(remaining).length) {
        try {
          localStorage.removeItem(lsKey(exam.id, classId, user?.id));
        } catch {
          // ignore
        }
        clearDraft.mutate({ examId: exam.id, classId });
      }
    }
    setEdits(nextEdits);
    setSavedAt(null);
    qc.invalidateQueries({ queryKey: ["exam-sections", exam.id] });
    qc.invalidateQueries({ queryKey: ["grades", "exam", exam.id] });
  }

  async function handleSubmit() {
    setSubmitError("");
    try {
      // Submitting always saves what is currently on screen first.
      if (totalPending() > 0) {
        await handleSave();
      }
      await submitResults.mutateAsync({ exam_id: exam.id, class_id: selectedClass });
      qc.invalidateQueries({ queryKey: ["exam-sections", exam.id] });
      qc.invalidateQueries({ queryKey: ["grades", "exam", exam.id] });
    } catch (err) {
      setSubmitError(err?.response?.data?.error?.message || err?.message || "Could not submit these results");
    }
  }

  async function submitRequest(e) {
    e.preventDefault();
    setRequestError("");
    try {
      await createRequest.mutateAsync({
        exam_id: exam.id,
        class_id: selectedClass,
        student_id: requestFor?.studentId || null,
        reason: reason.trim(),
      });
      setRequestFor(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["exam-sections", exam.id] });
    } catch (err) {
      setRequestError(err?.response?.data?.error?.message || "Could not send the request");
    }
  }

  const openRequest = requests.find((r) => ["pending", "partially_approved", "approved"].includes(r.status));
  const classObj = classes.find((c) => c.id === selectedClass);
  const totalMarks = exam.total_marks != null ? Number(exam.total_marks) : null;
  const passMarks = exam.pass_marks != null ? Number(exam.pass_marks) : null;
  const totalStudents = records.length;
  const graded = records.filter((r) => r.marks_obtained != null).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium">{t("Grades for {name}", { name: exam.name })}</h4>
          {classObj && (
            <p className="text-xs text-muted-foreground">
              {classObj.name} · {exam.subject_name} · /{totalMarks ?? "—"}
              {passMarks != null ? ` · ${t("pass")} ${passMarks}` : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={sev(statusSeverity(status)).badge}>{t(STATUS_LABEL[status] || status)}</Badge>
          {(!locked || isReviewer) && (
            <Button size="sm" onClick={handleSave} disabled={enterGrades.isPending || totalPending() === 0}>
              <Save className="h-4 w-4 mr-1" />
              {enterGrades.isPending ? t("Saving...") : t("Save All Grades")}
              {totalPending() > 0 ? ` (${totalPending()})` : ""}
            </Button>
          )}
          {!isReviewer && !locked && status !== "editing" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSubmit}
              disabled={submitResults.isPending || (!graded && totalPending() === 0)}
            >
              <Send className="h-4 w-4 mr-1" /> {t("Submit for approval")}
            </Button>
          )}
          {!isReviewer && status === "editing" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSubmit}
              disabled={submitResults.isPending || (!graded && totalPending() === 0)}
            >
              <Send className="h-4 w-4 mr-1" /> {t("Resubmit")}
            </Button>
          )}
          {locked && !openRequest && (
            <Button size="sm" variant="outline" onClick={() => { setRequestFor({ studentId: null }); setReason(""); }}>
              <PencilLine className="h-4 w-4 mr-1" /> {t("Request edit")}
            </Button>
          )}
        </div>
      </div>

      {/* Section status banners */}
      {status === "submitted" && (
        <div className={`flex items-center gap-2 rounded-md border p-3 text-sm ${sev("info").bg} ${sev("info").border} ${sev("info").text}`}>
          <Clock className="h-4 w-4" />
          {t("Submitted for approval — marks are locked until quality assurance decides.")}
        </div>
      )}
      {status === "approved" && (
        <div className={`flex items-center gap-2 rounded-md border p-3 text-sm ${sev("good").bg} ${sev("good").border} ${sev("good").text}`}>
          <ShieldCheck className="h-4 w-4" />
          {t("Approved")}{section?.reviewer_name ? ` ${t("by")} ${section.reviewer_name}` : ""}.
        </div>
      )}
      {status === "returned" && (
        <div className={`rounded-md border p-3 text-sm ${sev("warn").bg} ${sev("warn").border} ${sev("warn").text}`}>
          <div className="flex items-center gap-2 font-medium"><Undo2 className="h-4 w-4" /> {t("Sent back for correction")}</div>
          {section?.review_comment && <p className="mt-1 text-xs">{section.review_comment}</p>}
        </div>
      )}
      {status === "editing" && (
        <div className={`flex items-center gap-2 rounded-md border p-3 text-sm ${sev("warn").bg} ${sev("warn").border} ${sev("warn").text}`}>
          <CheckCircle2 className="h-4 w-4" />
          {t("Edit request approved — correct the mark, then resubmit.")}
        </div>
      )}

      {isReviewer && (
        <div className={`flex items-center gap-2 rounded-md border p-3 text-sm ${sev("info").bg} ${sev("info").border} ${sev("info").text}`}>
          <ShieldCheck className="h-4 w-4" />
          {t("You have review authority — your changes are saved as final and do not need a second approval.")}
        </div>
      )}

      {submitError && (
        <div className={`rounded-md border p-2 text-xs ${sev("danger").bg} ${sev("danger").border} ${sev("danger").text}`}>
          {submitError}
        </div>
      )}

      {openRequest && (
        <div className={`flex flex-wrap items-center gap-2 rounded-md border p-2 text-xs ${sev("info").bg} ${sev("info").border} ${sev("info").text}`}>
          <Clock className="h-3.5 w-3.5" />
          <span>
            {t("Edit request")}: <b>{t(STATUS_LABEL[openRequest.status] || openRequest.status)}</b>
            {openRequest.owner_approved_at && ` · ${t("owner ✓")}`}
            {openRequest.qa_approved_at && ` · ${t("QA ✓")}`}
          </span>
        </div>
      )}

      {restore && (
        <div className={`flex flex-wrap items-center gap-2 rounded-md border p-2 text-xs ${sev("warn").bg} ${sev("warn").border} ${sev("warn").text}`}>
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{t("Unsaved marks found from {time}.", { time: new Date(restore.at).toLocaleString() })}</span>
          <Button size="sm" variant="outline" className="h-7" onClick={restoreLocal}>{t("Restore")}</Button>
          <Button size="sm" variant="ghost" className="h-7" onClick={discardLocal}>{t("Discard")}</Button>
        </div>
      )}

      {!restore && draftData?.data?.payload?.marks && Object.keys(draftData.data.payload.marks).length > 0 && pendingCount === 0 && (
        <div className={`flex flex-wrap items-center gap-2 rounded-md border p-2 text-xs ${sev("info").bg} ${sev("info").border} ${sev("info").text}`}>
          <Clock className="h-3.5 w-3.5" />
          <span>{t("A backup of unsaved marks is available from {time}.", { time: new Date(draftData.data.updated_at).toLocaleString() })}</span>
          <Button size="sm" variant="outline" className="h-7" onClick={() => {
            setEdits((prev) => ({ ...prev, [selectedClass]: { ...(draftData.data.payload.marks || {}) } }));
          }}>{t("Restore")}</Button>
        </div>
      )}

      {saveResult && (saveResult.skipped > 0) && (
        <div className={`flex items-center gap-2 rounded-md border p-2 text-xs ${sev("warn").bg} ${sev("warn").border} ${sev("warn").text}`}>
          <Lock className="h-3.5 w-3.5" />
          {t("{n} mark(s) were not saved because that section is locked. Request an edit to change them.", { n: saveResult.skipped })}
        </div>
      )}
      {saveResult && saveResult.skipped === 0 && saveResult.updated > 0 && (
        <div className={`flex items-center gap-2 rounded-md border p-2 text-xs ${sev("good").bg} ${sev("good").border} ${sev("good").text}`}>
          <CheckCircle2 className="h-3.5 w-3.5" /> {t("Saved {n} mark(s).", { n: saveResult.updated })}
        </div>
      )}

      {classes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {classes.map((c) => {
            const st = sectionMap[c.id]?.status || "draft";
            const pend = pendingFor(c.id);
            return (
              <Button
                key={c.id}
                size="sm"
                variant={selectedClass === c.id ? "default" : "outline"}
                onClick={() => setSelectedClass(c.id)}
                className="gap-1"
              >
                {c.name}
                <span className={`inline-block h-2 w-2 rounded-full ${sev(statusSeverity(st)).dot}`} title={t(STATUS_LABEL[st] || st)} />
                {pend > 0 && (
                  <span className="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-amber-950">
                    {pend}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{t("Graded")} {graded}/{totalStudents}</span>
        {savedAt && <span className="text-emerald-600">{t("Saved locally")} {savedAt.toLocaleTimeString()}</span>}
        {pendingCount > 0 && <span className="text-amber-600">{pendingCount} {t("unsaved")}</span>}
      </div>

      {loadingClasses || isLoading ? (
        <p className="text-sm text-muted-foreground">{t("Loading...")}</p>
      ) : !classes.length ? (
        <p className="text-sm text-muted-foreground">{t("No sections available for you in this exam.")}</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("No students in this section.")}</p>
      ) : (
        <div className="max-h-[520px] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>{t("Student")}</TableHead>
                <TableHead className="w-28">{t("Marks")}</TableHead>
                <TableHead className="w-16">{t("Grade")}</TableHead>
                <TableHead className="w-40">{t("Status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => {
                const val = valueFor(r);
                const sevKey = markSeverity(val, totalMarks, passMarks);
                const editable = r.editable !== false || !locked;
                return (
                  <TableRow key={r.student_id} className={sevKey === "danger" ? sev("danger").bg : undefined}>
                    <TableCell className="font-medium">
                      {[r.first_name, r.middle_name, r.last_name].filter(Boolean).join(" ")}
                      <span className="block text-xs text-muted-foreground">{r.student_number}</span>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.5"
                        value={val}
                        disabled={!editable}
                        onChange={(e) => handleMarksChange(r.student_id, e.target.value)}
                        className={`h-8 ${sevKey === "danger" ? "border-rose-400 text-rose-700" : sevKey === "warn" ? "border-amber-300" : ""}`}
                      />
                    </TableCell>
                    <TableCell className={sev(sevKey === "good" ? "good" : sevKey === "danger" ? "danger" : "neutral").text}>
                      {r.grade_letter || "—"}
                    </TableCell>
                    <TableCell>
                      {editable ? (
                        <span className="text-xs text-muted-foreground">{pendingCount > 0 && Object.prototype.hasOwnProperty.call(activeMarks, r.student_id) ? t("Unsaved") : t("Editable")}</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Badge className={`${sev("warn").badge} text-[10px]`}><Lock className="h-3 w-3 mr-1" />{t("Locked")}</Badge>
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => { setRequestFor({ studentId: r.student_id, name: r.first_name }); setReason(""); }}>
                            {t("Request")}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!requestFor} onOpenChange={(o) => !o && setRequestFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {requestFor?.studentId
                ? t("Request edit for {name}", { name: requestFor?.name || "" })
                : t("Request edit for this section")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitRequest} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("Either the owner or quality assurance can approve this request.")}
            </p>
            <div className="space-y-1">
              <Label>{t("Reason")}</Label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("e.g. I entered 8 instead of 6 for this student")} required minLength={3} />
            </div>
            {requestError && <p className="text-xs text-rose-600">{requestError}</p>}
            <Button type="submit" className="w-full" disabled={createRequest.isPending || reason.trim().length < 3}>
              {createRequest.isPending ? t("Sending...") : t("Send request")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
