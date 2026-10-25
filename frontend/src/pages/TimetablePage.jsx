import { fullName } from "../lib/fullName";
import KgScheduleEditor from "../components/kg/KgScheduleEditor";
import { useState, useEffect, useMemo, Fragment } from "react";
import { useAuthStore } from "../store/auth";
import { useClasses } from "../hooks/useClasses";
import { useClassTimetable, useCreateTimetableEntry, useUpdateTimetableEntry, useDeleteTimetableEntry } from "../hooks/useTimetable";
import { useSubjects } from "../hooks/useSubjects";
import { useTeachers } from "../hooks/useTeachers";
import { useTeacherAssignments } from "../hooks/useTeachers";
import { useStudents } from "../hooks/useStudents";
import { useMyChildren } from "../hooks/useParents";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Plus, Trash2, Wand2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const dayLabels = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat" };

// Bell schedule from the school's "School Time Schedule.xlsx" (Ethiopian time +6h).
const PERIODS = [
  { n: 1, start: "08:30", end: "09:15" },
  { n: 2, start: "09:16", end: "10:00" },
  { n: 3, start: "10:01", end: "10:45" },
  { n: 4, start: "11:00", end: "11:45" },
  { n: 5, start: "11:46", end: "12:30" },
  { n: 6, start: "14:00", end: "14:45" },
  { n: 7, start: "14:46", end: "15:30" },
];
const DEFAULT_PERIOD = PERIODS[0];

function toMonday(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0];
}

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

function shortDate(iso) {
  const [, m, d] = String(iso || "").split("-");
  return m && d ? `${m}/${d}` : "";
}

const UNAVAIL_LABEL = { leave: "On leave", emergency: "Emergency" };

function SearchSelect({ value, onChange, options, getLabel, placeholder, searchPlaceholder, emptyText, disabled }) {
  const [query, setQuery] = useState("");
  const filtered = query
    ? options.filter((o) => getLabel(o).toLowerCase().includes(query.trim().toLowerCase()))
    : options;
  return (
    <div className="space-y-2">
      <Input
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
        placeholder={searchPlaceholder || placeholder}
      />
      <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground p-2 text-center">{emptyText || "—"}</p>
        ) : (
          filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(o.id)}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-muted ${value === o.id ? "bg-muted font-medium" : ""}`}
            >
              {getLabel(o)}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default function TimetablePage() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const isStudent = user?.role === "student";
  const isTeacher = user?.role === "teacher";
  const isParent = user?.role === "parent";
  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const canManageTimetable = isAdmin || ["hr", "quality_director"].includes(user?.role) || (user?.permissions || []).includes("timetable.manage");
  const [classId, setClassId] = useState("");
  const { data: classesData } = useClasses({ limit: 200 });
  const { data: assignmentsData } = useTeacherAssignments(isTeacher ? user?.id : null);
  const { data: timetableData, isLoading } = useClassTimetable(classId);
  const { data: subjectsData } = useSubjects({ limit: 200 });
  const { data: teachersData } = useTeachers({ limit: 200 });
  const { data: myStudentData } = useStudents(
    { user_id: user?.id, limit: 1 },
    { enabled: isStudent && !!user?.id }
  );
  const { data: myChildrenData } = useMyChildren({ enabled: isParent });
  const createEntry = useCreateTimetableEntry();
  const updateEntry = useUpdateTimetableEntry();
  const deleteEntry = useDeleteTimetableEntry();

  const [weekStart, setWeekStart] = useState(() => toMonday(new Date().toISOString().split("T")[0]));
  const [unavailability, setUnavailability] = useState({});
  const [subMap, setSubMap] = useState({});
  const [subDialog, setSubDialog] = useState(null);
  const [subTeacherId, setSubTeacherId] = useState("");
  const [subReason, setSubReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subTeachers, setSubTeachers] = useState([]);

  useEffect(() => {
    if (!canManageTimetable) return;
    api.get("/shifts/teachers").then((res) => setSubTeachers(res.data || [])).catch(() => {});
  }, [canManageTimetable]);

  async function assignSubstitute() {
    if (!subDialog || !subTeacherId) return;
    setSubmitting(true);
    try {
      await api.post("/shifts/substitutions", {
        originalTeacherId: subDialog.entry.teacher_id,
        substituteTeacherId: subTeacherId,
        date: subDialog.date,
        periodName: `${subDialog.entry.subject_name} (${subDialog.entry.start_time?.slice(0, 5)})`,
        reason: subReason || "Leave / Emergency coverage",
      });
      setSubDialog(null);
      setSubTeacherId("");
      setSubReason("");
      const from = weekDates[0];
      const to = weekDates[weekDates.length - 1];
      const res = await api.get("/shifts/substitutions", { params: { from, to } });
      const map = {};
      for (const s of res.data || []) {
        const d = String(s.date).slice(0, 10);
        map[`${s.original_teacher_id}|${d}`] = s.substitute_teacher_name;
      }
      setSubMap(map);
    } finally {
      setSubmitting(false);
    }
  }

  const weekDates = useMemo(() => {
    const base = new Date(`${weekStart}T00:00:00Z`);
    return Array.from({ length: 6 }, (_, i) => {
      const x = new Date(base);
      x.setUTCDate(x.getUTCDate() + i);
      return x.toISOString().split("T")[0];
    });
  }, [weekStart]);

  useEffect(() => {
    const from = weekDates[0];
    const to = weekDates[weekDates.length - 1];
    api.get("/hr-enhancements/staff-attendance/unavailability", { params: { from, to } })
      .then((res) => {
        const map = {};
        for (const it of res.data?.items || []) map[`${it.staff_id}|${it.date}`] = it.status;
        setUnavailability(map);
      })
      .catch(() => setUnavailability({}));
    if (!isStudent && !isParent) {
      api.get("/shifts/substitutions", { params: { from, to } })
        .then((res) => {
          const map = {};
          for (const s of res.data || []) {
            const d = String(s.date).slice(0, 10);
            map[`${s.original_teacher_id}|${d}`] = s.substitute_teacher_name;
          }
          setSubMap(map);
        })
        .catch(() => setSubMap({}));
    }
  }, [weekDates, isStudent, isParent]);

  useEffect(() => {
    if (isStudent && myStudentData?.data?.length > 0) {
      setClassId(myStudentData.data[0].class_id);
    }
  }, [isStudent, myStudentData]);

  const childClassIds = useMemo(
    () => (isParent ? (myChildrenData?.data || []).map((c) => c.class_id).filter(Boolean) : []),
    [isParent, myChildrenData]
  );

  useEffect(() => {
    if (isParent && childClassIds.length > 0) {
      setClassId((prev) => prev || childClassIds[0]);
    }
  }, [isParent, childClassIds]);

  const allClasses = classesData?.data || [];
  const assignments = assignmentsData?.data || [];
  const assignedClassIds = isTeacher ? assignments.map((a) => a.class_id) : [];
  const classes = isTeacher
    ? allClasses.filter((c) => assignedClassIds.includes(c.id))
    : isParent
      ? allClasses.filter((c) => childClassIds.includes(c.id))
      : allClasses;

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [dialogEntries, setDialogEntries] = useState([]);
  const [form, setForm] = useState({
    class_id: "", subject_id: "", teacher_id: "",
    day_of_week: "monday", start_time: DEFAULT_PERIOD.start, end_time: DEFAULT_PERIOD.end, room: "",
  });

  useEffect(() => {
    const cid = form.class_id || classId;
    if (!open || !cid) {
      setDialogEntries([]);
      return;
    }
    api.get(`/timetable/classes/${cid}`)
      .then((res) => setDialogEntries(res.data || []))
      .catch(() => setDialogEntries([]));
  }, [open, form.class_id, classId]);

  const toMin = (t) => {
    const [h, m] = String(t).slice(0, 5).split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const slotConflict = useMemo(() => {
    if (!open || !form.day_of_week || !form.start_time || !form.end_time) return null;
    const s = toMin(form.start_time);
    const e = toMin(form.end_time);
    return dialogEntries.find(
      (x) => (editingId ? x.id !== editingId : true) &&
        x.day_of_week === form.day_of_week && toMin(x.start_time) < e && toMin(x.end_time) > s
    ) || null;
  }, [open, dialogEntries, form.day_of_week, form.start_time, form.end_time, editingId]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await api.post("/operations/timetable/generate");
      window.location.reload();
    } catch {} finally {
      setGenerating(false);
    }
  }

  const entries = timetableData?.data || [];
  const subjects = subjectsData?.data || [];
  const teachers = teachersData?.data || [];
  const teacherSubjectIds = isTeacher && classId
    ? assignments.filter((a) => a.class_id === classId).map((a) => a.subject_id)
    : null;
  const subjectOptions = isTeacher
    ? subjects.filter((s) => (teacherSubjectIds ?? []).includes(s.id))
    : subjects;

  const timetableByDay = {};
  days.forEach((day) => {
    timetableByDay[day] = entries.filter((e) => e.day_of_week === day);
  });

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError("");
    const classIdFinal = form.class_id || classId;
    try {
      if (editingId) {
        const payload = { ...Object.fromEntries(Object.entries(form).filter(([, v]) => v !== "")) };
        delete payload.class_id; delete payload.day_of_week;
        await updateEntry.mutateAsync({ id: editingId, ...payload });
      } else {
        const payload = { ...Object.fromEntries(Object.entries(form).filter(([, v]) => v !== "")) };
        payload.class_id = classIdFinal;
        await createEntry.mutateAsync(payload);
      }
      setOpen(false);
      setEditingId(null);
      setForm({ class_id: classIdFinal, subject_id: "", teacher_id: "", day_of_week: "monday", start_time: DEFAULT_PERIOD.start, end_time: DEFAULT_PERIOD.end, room: "" });
    } catch (err) {
      setCreateError(err?.error?.message || err?.message || t("Could not save the entry"));
    }
  }

  function openAdd() {
    setEditingId(null);
    setCreateError("");
    setForm({ class_id: classId, subject_id: "", teacher_id: "", day_of_week: "monday", start_time: DEFAULT_PERIOD.start, end_time: DEFAULT_PERIOD.end, room: "" });
    setOpen(true);
  }

  function openEdit(entry) {
    setEditingId(entry.id);
    setCreateError("");
    setForm({
      class_id: entry.class_id || classId,
      subject_id: entry.subject_id || "",
      teacher_id: entry.teacher_id || "",
      day_of_week: entry.day_of_week || "monday",
      start_time: String(entry.start_time || DEFAULT_PERIOD.start).slice(0, 5),
      end_time: String(entry.end_time || DEFAULT_PERIOD.end).slice(0, 5),
      room: entry.room || "",
    });
    setOpen(true);
  }

  const myClass = classes.find((c) => c.id === classId);
  let earlyLevel = null;
  if (myClass?.level_group === "nursery") earlyLevel = "nursery";
  else if (myClass?.level_group === "kg") {
    const n = String(myClass.name || "").toUpperCase();
    earlyLevel = (Number(myClass.grade_level) === 2 || n.includes("UKG")) ? "ukg" : "lkg";
  }
  const isEarlyYears = !!earlyLevel;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isEarlyYears ? t("Early Years Schedule") : t("Timetable")}</h1>
          <p className="text-muted-foreground">
            {isEarlyYears && myClass
              ? t("Manage the {level} schedule — {name}", { level: earlyLevel.toUpperCase(), name: myClass.name })
              : isStudent && myClass
              ? t("Your class schedule — {name}", { name: myClass.name })
              : isTeacher && myClass
                ? t("Classes you teach — {name}", { name: myClass.name })
                : isParent && myClass
                  ? t("Your child's schedule — {name}", { name: myClass.name })
                  : t("Manage class schedules")
            }
          </p>
        </div>
        <div className="flex gap-4 items-center">
          {!isStudent && (
            <Select value={classId} onValueChange={(v) => { setClassId(v); setForm((f) => ({ ...f, class_id: v })); }}>
              <SelectTrigger className="w-64"><SelectValue placeholder={t("Select class")} /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {classId && !isEarlyYears && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-10 w-9" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label={t("Previous week")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="space-y-1">
                <Label className="text-xs">{t("Week of")}</Label>
                <Input type="date" className="w-44" value={weekStart} onChange={(e) => setWeekStart(toMonday(e.target.value || weekStart))} />
              </div>
              <Button variant="outline" size="icon" className="h-10 w-9" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label={t("Next week")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="hidden md:block text-sm text-muted-foreground whitespace-nowrap">
                {shortDate(weekDates[0])} – {shortDate(weekDates[weekDates.length - 1])}
              </div>
            </div>
          )}
          {classId && canManageTimetable && !isEarlyYears && entries.length === 0 && (
            <Button variant="outline" onClick={handleGenerate} disabled={generating}>
              <Wand2 className="h-4 w-4 mr-2" /> {generating ? t("Generating...") : t("Auto Generate")}
            </Button>
          )}
          {classId && canManageTimetable && !isEarlyYears && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); setCreateError(""); if (v && !editingId) setForm((f) => ({ ...f, class_id: classId })); }}>
              <DialogTrigger asChild>
                <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> {t("Add Entry")}</Button>
              </DialogTrigger>
              <DialogContent className="h-[calc(92vh-1rem)] sm:max-w-[calc(100vw-2rem)] flex flex-col overflow-hidden p-0">
                <form onSubmit={handleCreate} className="flex flex-col h-full overflow-hidden p-6">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle>{editingId ? t("Edit Timetable Entry") : t("Add Timetable Entry")}</DialogTitle>
                  </DialogHeader>

                  <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
                    <div className="space-y-1 sm:max-w-xs">
                      <Label className="text-xs">{t("Class")}</Label>
                      <Select value={form.class_id || classId} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                        <SelectTrigger className="w-full"><SelectValue placeholder={t("Select class")} /></SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground sm:ml-2">
                      {t("Click an empty cell to pick the day and period, then choose the subject and teacher.")}
                    </p>
                  </div>

                  <div className="flex-1 overflow-auto mt-4">
                    <div className="grid gap-1 min-w-[720px]" style={{ gridTemplateColumns: "104px repeat(6, minmax(0, 1fr))" }}>
                      <div />
                      {days.map((day) => (
                        <div key={day} className="rounded-md bg-muted px-1 py-2 text-center text-xs font-semibold">
                          {t(day.charAt(0).toUpperCase() + day.slice(1))}
                        </div>
                      ))}
                      {PERIODS.map((p) => (
                        <Fragment key={p.n}>
                          <div className="flex flex-col items-center justify-center rounded-md bg-primary/5 px-1 py-2 text-center text-[11px] leading-tight">
                            <span className="font-semibold">{t("Period {n}", { n: p.n })}</span>
                            <span className="text-muted-foreground">{p.start}-{p.end}</span>
                          </div>
                          {days.map((day) => {
                            const s = toMin(p.start);
                            const e = toMin(p.end);
                            const occupied = dialogEntries.find(
                              (x) => x.day_of_week === day && toMin(x.start_time) < e && toMin(x.end_time) > s
                            );
                            const selected = form.day_of_week === day && form.start_time === p.start && form.end_time === p.end;
                            const isEditingThis = editingId && occupied && occupied.id === editingId;
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => occupied ? openEdit(occupied) : setForm({ ...form, day_of_week: day, start_time: p.start, end_time: p.end })}
                                title={occupied ? t("Click to edit") : t("Add here")}
                                className={`rounded-md px-1 py-2 min-h-[38px] text-xs flex items-center justify-center border transition-colors ${
                                  occupied
                                    ? isEditingThis
                                      ? "cursor-pointer bg-primary/15 border-primary font-medium ring-1 ring-primary"
                                      : "cursor-pointer bg-muted/50 border-transparent line-clamp-2 overflow-hidden text-muted-foreground text-[11px] hover:border-primary hover:bg-primary/10"
                                    : selected
                                      ? "bg-primary text-primary-foreground border-primary font-medium"
                                      : "cursor-pointer bg-background border-dashed border-muted-foreground/40 hover:border-primary hover:bg-primary/10"
                                }`}
                              >
                                {occupied ? occupied.subject_name : selected ? (<span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" /> {t("Selected")}</span>) : (<Plus className="h-4 w-4 text-muted-foreground" />)}
                              </button>
                            );
                          })}
                        </Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="flex-shrink-0 grid gap-4 mt-4 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("Selected slot")}</Label>
                      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm min-h-[38px] flex items-center">
                        {form.day_of_week
                          ? <span>{t(form.day_of_week.charAt(0).toUpperCase() + form.day_of_week.slice(1))} · {form.start_time}-{form.end_time}</span>
                          : <span className="text-muted-foreground text-xs">{t("None selected yet")}</span>}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("Subject")}</Label>
                      <SearchSelect
                        value={form.subject_id}
                        onChange={(v) => setForm({ ...form, subject_id: v })}
                        options={subjectOptions}
                        getLabel={(s) => s.name}
                        searchPlaceholder={t("Search subject...")}
                        emptyText={t("No subjects found")}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("Teacher")}</Label>
                      <SearchSelect
                        value={isTeacher ? user?.id : form.teacher_id}
                        onChange={(v) => setForm({ ...form, teacher_id: v })}
                        options={teachers}
                        getLabel={(teacher) => `${fullName(teacher)}`}
                        searchPlaceholder={t("Search teacher...")}
                        emptyText={t("No teachers found")}
                        disabled={isTeacher}
                      />
                    </div>
                  </div>

                  {createError && (
                    <div className="flex-shrink-0 bg-red-50 border border-red-100 text-red-600 text-xs p-2.5 rounded-lg mt-3">{createError}</div>
                  )}
                  {slotConflict && !createError && (
                    <div className="flex-shrink-0 bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2.5 rounded-lg mt-3">
                      {t("This slot is already occupied by")} {slotConflict.subject_name} ({String(slotConflict.start_time).slice(0, 5)}-{String(slotConflict.end_time).slice(0, 5)})
                    </div>
                  )}
                  <Button type="submit" className="flex-shrink-0 w-full mt-4" disabled={!!slotConflict}>{editingId ? t("Save Changes") : t("Add Entry")}</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isEarlyYears && <KgScheduleEditor level={earlyLevel} />}

      {classId && !isEarlyYears && (
        <Card>
          <CardHeader><CardTitle>{t("Weekly Schedule — {name}", { name: myClass?.name })}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">{t("Loading...")}</p>
            ) : (
              <div>
                <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground flex-wrap">
                  {isTeacher && (
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded bg-yellow-100 border border-yellow-400" />
                      {t("Your classes")}
                    </span>
                  )}
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded bg-rose-100 border border-rose-500" />
                    {t("On leave / emergency — needs substitute")}
                  </span>
                </div>
              <div className="overflow-x-auto -mx-4 px-4">
                <div className="grid grid-cols-6 gap-2 min-w-[640px]">
                {days.map((day) => (
                  <div key={day} className="border rounded-lg">
                    <div className="bg-muted p-2 text-center font-medium text-sm rounded-t-lg">
                      <div>{t(dayLabels[day])}</div>
                      <div className="text-[11px] font-normal text-muted-foreground">{shortDate(weekDates[days.indexOf(day)])}</div>
                    </div>
                    <div className="p-2 space-y-2 min-h-[200px]">
                      {timetableByDay[day].length === 0 && (
                        <p className="text-xs text-muted-foreground text-center">—</p>
                      )}
                       {timetableByDay[day].map((entry) => {
                         const entryDate = weekDates[days.indexOf(day)];
                         const unavail = unavailability[`${entry.teacher_id}|${entryDate}`];
                         const subName = subMap[`${entry.teacher_id}|${entryDate}`];
                         const isMine = isTeacher && (
                           entry.teacher_id === user?.id ||
                           (teacherSubjectIds || []).includes(entry.subject_id)
                         );
                         const cardCls = unavail
                           ? "bg-rose-100 border border-rose-500"
                           : entry.is_test
                             ? "bg-rose-50 border border-rose-200"
                             : isMine
                               ? "bg-yellow-100 border border-yellow-400"
                               : "bg-primary/5";
                         return (
                         <div key={entry.id} className={`rounded p-2 text-xs space-y-1 group relative ${cardCls}`}>
                           <div className="flex items-center justify-between">
                             <p className={`font-medium ${unavail ? "text-rose-700" : ""}`}>{entry.subject_name}</p>
                             <div className="flex items-center gap-1">
                               {unavail && <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold">{t(UNAVAIL_LABEL[unavail] || "Unavailable")}</span>}
                               {!unavail && isMine && <span className="px-1.5 py-0.5 rounded bg-yellow-400 text-yellow-950 text-[10px] font-bold">{t("You")}</span>}
                               {!unavail && entry.is_test && <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[10px] font-bold">{t("TEST")}</span>}
                             </div>
                           </div>
                           <p className="text-muted-foreground">
                             {entry.start_time?.slice(0, 5)}-{entry.end_time?.slice(0, 5)}
                           </p>
                           {entry.teacher_first_name && (
                             <p className={unavail ? "text-rose-700 line-through" : "text-muted-foreground"}>{entry.teacher_first_name} {entry.teacher_last_name}</p>
                           )}
                           {subName && <p className="text-emerald-700 font-medium">{t("Sub")}: {subName}</p>}
                           {unavail && !subName && <p className="text-rose-700 font-medium">{t("Needs substitute")}</p>}
                           {unavail && canManageTimetable && (
                             <Button
                               variant="outline"
                               size="sm"
                               className="h-6 px-2 text-[10px] w-full"
                               onClick={() => { setSubDialog({ entry, date: entryDate }); setSubTeacherId(""); setSubReason(""); }}
                             >
                               {subName ? t("Change substitute") : t("Assign substitute")}
                             </Button>
                           )}
                           {entry.room && <p className="text-muted-foreground">{t("Room {room}", { room: entry.room })}</p>}
                           {canManageTimetable && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100"
                              onClick={() => deleteEntry.mutate(entry.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                           )}
                         </div>
                       );
                       })}
                    </div>
                  </div>
                ))}
                </div>
              </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {subDialog && (
        <Dialog open={!!subDialog} onOpenChange={(v) => { if (!v) setSubDialog(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("Assign Substitute")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground rounded-md border bg-muted/30 p-3">
                <p>{t("Teacher on leave / emergency")}: <span className="font-medium text-foreground">{subDialog.entry.teacher_first_name} {subDialog.entry.teacher_last_name}</span></p>
                <p>{subDialog.date} · {subDialog.entry.subject_name} ({subDialog.entry.start_time?.slice(0, 5)}-{subDialog.entry.end_time?.slice(0, 5)})</p>
              </div>
              <div className="space-y-2">
                <Label>{t("Substitute teacher")}</Label>
                <Select value={subTeacherId} onValueChange={setSubTeacherId}>
                  <SelectTrigger><SelectValue placeholder={t("Select teacher")} /></SelectTrigger>
                  <SelectContent>
                    {subTeachers.map((tt) => <SelectItem key={tt.id} value={tt.id}>{fullName(tt)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("Reason")}</Label>
                <Input value={subReason} onChange={(e) => setSubReason(e.target.value)} placeholder={t("Leave / Emergency coverage")} />
              </div>
              <Button className="w-full" onClick={assignSubstitute} disabled={!subTeacherId || submitting}>
                {submitting ? t("Saving...") : t("Assign Substitute")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
