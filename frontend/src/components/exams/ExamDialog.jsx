import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import { useI18n } from "../../i18n/I18nContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { EthiopianDateInput } from "../ui/EthiopianDateInput";
import { classes as sev } from "../../lib/gradeColors";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

const BLANK = {
  name: "",
  type: "exam",
  class_id: "",
  class_ids: [],
  subject_id: "",
  total_marks: "100",
  pass_marks: "50",
  date: "",
  description: "",
  mark_test_day: false,
};

export default function ExamDialog({
  open,
  onOpenChange,
  exam = null,
  types = [],
  allClasses = [],
  subjects = [],
  assignments = [],
  isTeacher = false,
  mode = "raw",
  scheme = null,
  onSubmit,
  saving = false,
}) {
  const { t } = useI18n();
  const [form, setForm] = useState(BLANK);
  const [usedTotal, setUsedTotal] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (exam) {
      const ids = Array.isArray(exam.class_ids) && exam.class_ids.length
        ? exam.class_ids
        : (exam.class_id ? [exam.class_id] : []);
      setForm({
        name: exam.name || "",
        type: exam.type || "exam",
        class_id: exam.class_id || "",
        class_ids: ids,
        subject_id: exam.subject_id || "",
        total_marks: exam.total_marks != null ? String(exam.total_marks) : "",
        pass_marks: exam.pass_marks != null ? String(exam.pass_marks) : "",
        date: exam.date ? String(exam.date).slice(0, 10) : "",
        description: exam.description || "",
        mark_test_day: false,
      });
    } else {
      setForm(BLANK);
    }
  }, [open, exam]);

  const typeMap = useMemo(() => Object.fromEntries(types.map((ty) => [ty.code, ty])), [types]);
  const selectedType = typeMap[form.type];

  // When the type changes on a new exam, adopt its default marks.
  function changeType(code) {
    const ty = typeMap[code];
    setForm((f) => {
      if (exam) return { ...f, type: code };
      return {
        ...f,
        type: code,
        total_marks: ty?.default_total_marks != null ? String(Number(ty.default_total_marks)) : f.total_marks,
        pass_marks: ty?.default_pass_marks != null ? String(Number(ty.default_pass_marks)) : f.pass_marks,
      };
    });
  }

  const assignedClassIds = useMemo(
    () => (isTeacher ? assignments.map((a) => a.class_id) : []),
    [isTeacher, assignments]
  );
  const assignedSubjectIds = useMemo(
    () => (isTeacher ? assignments.map((a) => a.subject_id) : []),
    [isTeacher, assignments]
  );
  const subjectClassIds = useMemo(() => {
    if (!isTeacher || !form.subject_id) return null;
    return new Set(assignments.filter((a) => a.subject_id === form.subject_id).map((a) => a.class_id));
  }, [isTeacher, assignments, form.subject_id]);

  const classes = useMemo(
    () => (isTeacher
      ? allClasses.filter((c) => assignedClassIds.includes(c.id) && (!subjectClassIds || subjectClassIds.has(c.id)))
      : allClasses),
    [isTeacher, allClasses, assignedClassIds, subjectClassIds]
  );
  const availableSubjects = useMemo(
    () => (isTeacher ? subjects.filter((s) => assignedSubjectIds.includes(s.id)) : subjects),
    [isTeacher, subjects, assignedSubjectIds]
  );

  // Existing total for the first class + subject (raw mode only).
  useEffect(() => {
    let active = true;
    const cid = form.class_ids[0];
    if (!cid || !form.subject_id || mode === "weighted") { setUsedTotal(null); return; }
    api.get("/exams", { params: { class_id: cid, subject_id: form.subject_id, limit: 200 } })
      .then((res) => {
        if (!active) return;
        const used = (res.data || [])
          .filter((e) => !exam || e.id !== exam.id)
          .reduce((sum, e) => sum + (parseFloat(e.total_marks) || 0), 0);
        setUsedTotal(used);
      })
      .catch(() => active && setUsedTotal(null));
    return () => { active = false; };
  }, [form.class_ids, form.subject_id, exam, mode]);

  function toggleClass(id) {
    setForm((f) => {
      const has = f.class_ids.includes(id);
      const class_ids = has ? f.class_ids.filter((x) => x !== id) : [...f.class_ids, id];
      return { ...f, class_ids, class_id: class_ids[0] || "" };
    });
  }

  const total = form.total_marks === "" ? null : Number(form.total_marks);
  const pass = form.pass_marks === "" ? null : Number(form.pass_marks);
  const passAboveTotal = total != null && pass != null && pass > total;
  const totalAboveBudget = mode !== "weighted" && total != null && usedTotal != null && usedTotal + total > 100;
  const missingTypeWeight = mode === "weighted" && selectedType
    && !(scheme?.components || []).some((c) => c.type_code === form.type);

  const canSubmit = form.name.trim() && form.subject_id && form.class_ids.length > 0
    && !passAboveTotal && !totalAboveBudget && !saving;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await onSubmit({
        name: form.name.trim(),
        type: form.type,
        class_id: form.class_ids[0] || undefined,
        class_ids: form.class_ids,
        subject_id: form.subject_id,
        total_marks: total != null ? total : undefined,
        pass_marks: pass != null ? pass : undefined,
        date: form.date || undefined,
        description: form.description || undefined,
        mark_test_day: form.mark_test_day,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || "Could not save the exam");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exam ? t("Edit Exam") : t("Create Exam")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("Name")}</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("Type")}</Label>
              <Select value={form.type} onValueChange={changeType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {types.map((ty) => (
                    <SelectItem key={ty.code} value={ty.code}>
                      {ty.name}{ty.default_total_marks != null ? ` · /${Number(ty.default_total_marks)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mode === "weighted" && (
                <p className="text-[11px] text-muted-foreground">
                  {t("Term weight is configured under Settings → Grading.")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("Date")}</Label>
              <EthiopianDateInput value={form.date} onChange={(iso) => setForm({ ...form, date: iso })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("Subject")} <span className="text-rose-500">*</span></Label>
            <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v, class_ids: [], class_id: "" })}>
              <SelectTrigger><SelectValue placeholder={t("Select subject")} /></SelectTrigger>
              <SelectContent>
                {availableSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("Classes (select one or more)")} <span className="text-rose-500">*</span></Label>
            <div className="flex flex-wrap gap-2">
              {classes.map((c) => {
                const active = form.class_ids.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleClass(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${active ? "bg-neutral-900 text-white border-neutral-900" : "text-neutral-700 border-neutral-300 hover:bg-neutral-100"}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
            {isTeacher && !form.subject_id && (
              <p className="text-xs text-muted-foreground">{t("Select the subject first to see the classes you teach.")}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("Total Marks")}</Label>
              <Input
                type="number"
                value={form.total_marks}
                onChange={(e) => setForm({ ...form, total_marks: e.target.value })}
                className={totalAboveBudget ? "border-rose-400 focus-visible:ring-rose-300" : ""}
              />
              {usedTotal != null && mode !== "weighted" && (
                <p className={`text-[11px] ${totalAboveBudget ? "text-rose-600 font-medium" : "text-muted-foreground"}`}>
                  {totalAboveBudget
                    ? t("Used {used} of 100 for this class + subject — this would exceed the limit.", { used: usedTotal })
                    : t("Used {used} of 100 for this class + subject — remaining {left}", { used: usedTotal, left: Math.max(100 - usedTotal, 0) })}
                </p>
              )}
              {mode === "weighted" && (
                <p className="text-[11px] text-muted-foreground">{t("Raw total — it is normalised to the type weight at report time.")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("Pass Marks")}</Label>
              <Input
                type="number"
                value={form.pass_marks}
                onChange={(e) => setForm({ ...form, pass_marks: e.target.value })}
                className={passAboveTotal ? "border-rose-400 focus-visible:ring-rose-300" : ""}
              />
              {passAboveTotal && (
                <p className="text-[11px] text-rose-600 font-medium">
                  {t("Pass marks cannot be higher than the total ({total}).", { total })}
                </p>
              )}
            </div>
          </div>

          {(passAboveTotal || totalAboveBudget) && (
            <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${sev("danger").bg} ${sev("danger").border} ${sev("danger").text}`}>
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {passAboveTotal ? t("Fix the marks above before saving.") : t("The subject would go over 100 for that class.")}
              </span>
            </div>
          )}

          {!passAboveTotal && total != null && pass != null && (
            <div className={`flex items-center gap-2 rounded-md border p-2 text-xs ${sev("good").bg} ${sev("good").border} ${sev("good").text}`}>
              <CheckCircle2 className="h-4 w-4" />
              {t("Pass mark is {pct}% of the total.", { pct: Math.round((pass / total) * 100) })}
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("Description")}</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          {!exam && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.mark_test_day} onChange={(e) => setForm({ ...form, mark_test_day: e.target.checked })} />
              {t("Mark this day as a test class in the timetable")}
            </label>
          )}

          {missingTypeWeight && (
            <p className="text-xs text-amber-700">{t("This type has no term weight — its marks count only if you add a weight in Settings → Grading.")}</p>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {saving ? t("Saving...") : exam ? t("Save Changes") : t("Create Exam")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
