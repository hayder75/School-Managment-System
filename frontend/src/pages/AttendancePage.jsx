import { fullName } from "../lib/fullName";
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth";
import { useClasses } from "../hooks/useClasses";
import { useAttendance, useMarkAttendance, useTeacherAttendanceOverview, useMyHomeroomClasses } from "../hooks/useAttendance";
import { useStudentsByClass } from "../hooks/useStudents";
import { Button } from "../components/ui/button";
import { EthiopianDateInput } from "../components/ui/EthiopianDateInput";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { StudentAvatar } from "../components/ui/StudentAvatar";
import { BarChart, DonutChart, LineChart, RadarChart } from "../components/ui/charts";
import AdminAttendancePage from "./AdminAttendancePage";
import { useI18n } from "../i18n/I18nContext";
import { Users, UserCheck, UserX, Clock, CheckCircle, BarChart3, AlertTriangle, TrendingUp, CalendarDays, Search, Sun, Sunset, Pencil } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "present", label: "Present", active: "bg-emerald-500 text-white border-emerald-500", idle: "text-emerald-700 border-emerald-300 hover:bg-emerald-50" },
  { value: "absent", label: "Absent", active: "bg-rose-500 text-white border-rose-500", idle: "text-rose-700 border-rose-300 hover:bg-rose-50" },
  { value: "late", label: "Late", active: "bg-amber-500 text-white border-amber-500", idle: "text-amber-700 border-amber-300 hover:bg-amber-50" },
  { value: "excused", label: "Excused", active: "bg-blue-500 text-white border-blue-500", idle: "text-blue-700 border-blue-300 hover:bg-blue-50" },
];

const ALL_CLASSES = "__all__";

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user);

  if (user?.role === "admin" || user?.role === "owner") {
    return <AdminAttendancePage />;
  }

  return <TeacherAttendanceView />;
}

function StatusButtons({ value, onChange, disabled = false }) {
  const { t } = useI18n();
  return (
    <div className="flex w-full flex-wrap gap-1 sm:w-auto">
      {STATUS_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold border transition-colors ${selected ? opt.active : opt.idle} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            {t(opt.label)}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ title, value, sub, icon: Icon, tone = "muted", highlight = false }) {
  const tones = {
    emerald: { text: "text-emerald-600", bg: "bg-emerald-50", icon: "bg-emerald-100 text-emerald-700" },
    rose: { text: "text-rose-600", bg: "bg-rose-50", icon: "bg-rose-100 text-rose-700" },
    amber: { text: "text-amber-600", bg: "bg-amber-50", icon: "bg-amber-100 text-amber-700" },
    blue: { text: "text-blue-600", bg: "bg-blue-50", icon: "bg-blue-100 text-blue-700" },
    primary: { text: "text-primary", bg: "bg-primary/5", icon: "bg-primary/10 text-primary" },
    muted: { text: "text-foreground", bg: "bg-card", icon: "bg-muted text-muted-foreground" },
  };
  const c = tones[tone] || tones.muted;
  return (
    <Card className={highlight ? `${c.bg} border-transparent` : ""}>
      <CardContent className="p-3 pt-4 sm:p-6 sm:pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className={`text-xl sm:text-2xl font-bold ${c.text}`}>{value}</p>
            {sub && <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          {Icon && (
            <span className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center shrink-0 ${c.icon}`}>
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function shortDate(dateStr) {
  if (!dateStr) return "";
  return `${dateStr.slice(5, 7)}/${dateStr.slice(8, 10)}`;
}

function localIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function TeacherAttendanceView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role === "teacher";
  const today = localIso();
  const [classId, setClassId] = useState(() => {
    try { return localStorage.getItem("attendance.class") || ""; } catch { return ""; }
  });
  const [date, setDate] = useState(() => {
    try {
      const saved = localStorage.getItem("attendance.date");
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved) && saved === today) return saved;
    } catch {
      // ignore
    }
    return today;
  });
  const [saveError, setSaveError] = useState("");
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem("attendance.session");
      if (saved === "am" || saved === "pm") return saved;
    } catch {
      // ignore
    }
    return new Date().getHours() < 12 ? "am" : "pm";
  });
  const [rangeWeeks, setRangeWeeks] = useState(4);

  const fromDate = localIso(new Date(Date.now() - rangeWeeks * 7 * 86400000));
  const { data: classesData } = useClasses({ limit: 200 });
  const { data: homeroomData, isLoading: loadingHomeroom } = useMyHomeroomClasses();
  const { data: overviewData, isLoading: loadingOverview } = useTeacherAttendanceOverview({
    from_date: fromDate,
    to_date: today,
    today,
  });
  const { data: amAttendance, isLoading: amLoading } = useAttendance(classId, date, "am");
  const { data: pmAttendance, isLoading: pmLoading } = useAttendance(classId, date, "pm");
  const attendanceData = session === "am" ? amAttendance : pmAttendance;
  const loadingAttendance = amLoading || pmLoading;
  const amCount = amAttendance?.data?.length || 0;
  const pmCount = pmAttendance?.data?.length || 0;
  const { data: classStudentsData } = useStudentsByClass(classId);
  const markAttendance = useMarkAttendance();
  const qc = useQueryClient();

  const allClasses = classesData?.data || [];
  // Attendance is the homeroom teacher's responsibility: a teacher only sees
  // the classes they are the class teacher of.
  const homeroomClasses = homeroomData?.data?.classes || [];
  const classes = isTeacher ? homeroomClasses : allClasses;
  const attendanceRecords = attendanceData?.data || [];
  const classStudents = classStudentsData?.data || [];
  const overview = overviewData?.data || {};
  const summary = overview.summary || {};
  const todayStats = overview.today || {};
  const totals = overview.totals || { students: 0, classes: 0 };
  const overviewClasses = overview.classes || [];
  const trend = overview.trend || [];
  const byWeekday = overview.by_weekday || [];
  const topAbsent = overview.top_absent || [];
  const topAttendant = overview.top_attendant || [];

  const [statusMap, setStatusMap] = useState({});
  const [studentSearch, setStudentSearch] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const [editKey, setEditKey] = useState("");
  const loadKey = `${classId}|${date}|${session}`;

  const sessionTheme = session === "am"
    ? {
        label: t("Morning"),
        icon: Sun,
        banner: "border-amber-200 bg-amber-50 text-amber-900",
        chip: "bg-amber-200/70 text-amber-900",
        card: "border-t-4 border-t-amber-400",
        head: "bg-amber-50 text-amber-900",
        active: "bg-amber-500 hover:bg-amber-600 text-white",
      }
    : {
        label: t("Afternoon"),
        icon: Sunset,
        banner: "border-indigo-200 bg-indigo-50 text-indigo-900",
        chip: "bg-indigo-200/70 text-indigo-900",
        card: "border-t-4 border-t-indigo-400",
        head: "bg-indigo-50 text-indigo-900",
        active: "bg-indigo-500 hover:bg-indigo-600 text-white",
      };

  // Saved status comes straight from the query for THIS session. No effect
  // juggling, so switching Morning -> Afternoon -> Morning cannot wipe it.
  const savedStatusMap = useMemo(
    () => Object.fromEntries((attendanceData?.data || []).map((r) => [r.student_id, r.status])),
    [attendanceData]
  );
  const hasSaved = (attendanceData?.data || []).length > 0;
  const editing = editKey === loadKey || !hasSaved;

  useEffect(() => {
    setStatusMap({});
    setSavedAt(null);
    setEditKey("");
  }, [loadKey]);

  useEffect(() => {
    setStudentSearch("");
  }, [classId]);

  // Remember the session the teacher last used so a refresh reopens the same
  // register instead of an empty one.
  useEffect(() => {
    try { localStorage.setItem("attendance.session", session); } catch {
      // ignore
    }
  }, [session]);

  useEffect(() => {
    try {
      if (classId) localStorage.setItem("attendance.class", classId);
      else localStorage.removeItem("attendance.class");
    } catch {
      // ignore
    }
  }, [classId]);

  useEffect(() => {
    try { localStorage.setItem("attendance.date", date); } catch {
      // ignore
    }
  }, [date]);

  // If a remembered class is no longer visible to this user, clear it.
  useEffect(() => {
    if (!classId || !classes.length) return;
    if (!classes.some((c) => c.id === classId)) setClassId("");
  }, [classId, classes]);

  // On first load for a class/date, if only one session has saved records,
  // open that one.
  const autoSessionRef = useRef("");
  useEffect(() => {
    if (!classId || !amAttendance || !pmAttendance) return;
    const key = `${classId}|${date}`;
    if (autoSessionRef.current === key) return;
    autoSessionRef.current = key;
    if (amCount > 0 && pmCount === 0) setSession("am");
    else if (pmCount > 0 && amCount === 0) setSession("pm");
  }, [classId, date, amAttendance, pmAttendance, amCount, pmCount]);

  // Always list every active student in the class. Attendance rows only supply
  // the saved status — a partially marked class must not hide the rest.
  const attendanceById = new Map(attendanceRecords.map((r) => [r.student_id, r]));
  const roster = classStudents.length
    ? classStudents.map((s) => ({ id: s.user_id, ...s }))
    : attendanceRecords.map((r) => ({ id: r.student_id, ...r }));

  const displayRecords = roster
    .map((s) => {
      const saved = attendanceById.get(s.id);
      return {
        id: s.id,
        name: fullName(s),
        number: s.student_number,
        status: editing
          ? (statusMap[s.id] ?? savedStatusMap[s.id] ?? saved?.status ?? "present")
          : (savedStatusMap[s.id] ?? saved?.status ?? "present"),
        remark: saved?.remark || "",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const sessionCounts = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of displayRecords) {
      if (counts[r.status] != null) counts[r.status] += 1;
    }
    return counts;
  }, [displayRecords]);

  const filteredRecords = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return displayRecords;
    return displayRecords.filter(
      (r) => r.name.toLowerCase().includes(q) || String(r.number || "").toLowerCase().includes(q)
    );
  }, [displayRecords, studentSearch]);

  function handleStatusChange(studentId, status) {
    setStatusMap((prev) => ({ ...prev, [studentId]: status }));
  }

  async function handleSave() {
    if (!classId || !date) return;
    setSaveError("");
    const records = displayRecords.map((r) => ({
      student_id: r.id,
      status: statusMap[r.id] ?? savedStatusMap[r.id] ?? r.status ?? "present",
    }));
    try {
      await markAttendance.mutateAsync({ classId, date, session, records });

      // Put the saved rows straight into the query cache so the screen shows
      // them as saved immediately, before the refetch finishes.
      qc.setQueryData(["attendance", classId, date, session], (old) => {
        const previous = Array.isArray(old?.data) ? old.data : [];
        const byStudent = new Map(previous.map((r) => [r.student_id, r]));
        return {
          ...(old || { success: true }),
          success: true,
          data: records.map((r) => ({
            ...(byStudent.get(r.student_id) || {}),
            student_id: r.student_id,
            status: r.status,
            class_id: classId,
            date,
            session,
          })),
        };
      });
      setSavedAt(new Date());
      setStatusMap({});
      setEditKey("");
      await qc.invalidateQueries({ queryKey: ["attendance", classId, date, session] });
      await qc.invalidateQueries({ queryKey: ["attendance-teacher-overview"] });
    } catch (err) {
      setSaveError(err?.response?.data?.error?.message || err?.message || t("Could not save attendance"));
    }
  }

  const focusClass = classId ? overviewClasses.find((c) => c.class_id === classId) : null;
  const focusClassName = classes.find((c) => c.id === classId)?.name || focusClass?.class_name || "";
  const sessionTotal = displayRecords.length;
  const sessionRate = (n) => (sessionTotal ? Math.round((n / sessionTotal) * 1000) / 10 : 0);
  const sessionAttendanceRate = sessionRate(sessionCounts.present + sessionCounts.late);

  const trendPoints = trend.map((d) => ({ label: shortDate(d.date), value: d.present_rate }));
  const classBars = overviewClasses.map((c) => ({ label: c.class_name, value: c.present_rate }));
  const weekdayData = byWeekday.map((w) => ({ label: t(w.day), value: w.absent }));
  const statusSegments = [
    { label: t("Present"), value: summary.present || 0, color: "#2c5a5e" },
    { label: t("Absent"), value: summary.absent || 0, color: "#d47a6a" },
    { label: t("Late"), value: summary.late || 0, color: "#c9a86a" },
    { label: t("Excused"), value: summary.excused || 0, color: "#8f9bb3" },
  ];

  if (isTeacher && !loadingHomeroom && homeroomClasses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Users className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">{t("Attendance")}</h1>
        <p className="max-w-md text-muted-foreground">
          {t("Attendance is taken by the homeroom teacher of each class. You are not assigned as a homeroom teacher, so there is nothing to mark here.")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">{t("Attendance")}</h1>
        <p className="text-muted-foreground">{t("Mark daily attendance and track your classes at a glance")}</p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2 w-full sm:w-auto">
              <label className="text-sm font-medium">{t("Class")}</label>
              <Select value={classId || ALL_CLASSES} onValueChange={(v) => setClassId(v === ALL_CLASSES ? "" : v)}>
                <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder={t("All my classes")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CLASSES}>{t("All my classes")}</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {classId && (
              <div className="space-y-2 w-full sm:w-auto">
                <label className="text-sm font-medium">{t("Date")}</label>
                <EthiopianDateInput className="w-full sm:w-56" value={date} onChange={setDate} />
              </div>
            )}
            {classId && (
              <div className="space-y-2 w-full sm:w-auto">
                <label className="text-sm font-medium">{t("Session")}</label>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={session === "am" ? "default" : "outline"}
                    className={session === "am" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                    onClick={() => setSession("am")}
                  >
                    <Sun className="h-4 w-4 mr-1" /> {t("Morning")}
                    {amCount > 0 && (
                      <span className="ml-1.5 rounded-full bg-white/25 px-1.5 text-[10px] font-bold">{amCount}</span>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant={session === "pm" ? "default" : "outline"}
                    className={session === "pm" ? "bg-indigo-500 hover:bg-indigo-600 text-white" : ""}
                    onClick={() => setSession("pm")}
                  >
                    <Sunset className="h-4 w-4 mr-1" /> {t("Afternoon")}
                    {pmCount > 0 && (
                      <span className="ml-1.5 rounded-full bg-white/25 px-1.5 text-[10px] font-bold">{pmCount}</span>
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {t("Morning")}: {amCount ? `${t("saved")} (${amCount})` : t("not marked")} · {t("Afternoon")}: {pmCount ? `${t("saved")} (${pmCount})` : t("not marked")}
                </p>
              </div>
            )}
            {!classId && (
              <div className="space-y-2 w-full sm:w-auto">
                <label className="text-sm font-medium">{t("Range")}</label>
                <Select value={String(rangeWeeks)} onValueChange={(v) => setRangeWeeks(Number(v))}>
                  <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t("1 week")}</SelectItem>
                    <SelectItem value="4">{t("4 weeks")}</SelectItem>
                    <SelectItem value="12">{t("12 weeks")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {classId && (
        <div className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${sessionTheme.banner}`}>
          <sessionTheme.icon className="h-6 w-6 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">
              {sessionTheme.label} {t("attendance")} — {editing ? t("editing") : t("saved")}
            </p>
            <p className="text-xs opacity-90">
              {date} · {t("Present")} {sessionCounts.present} · {t("Absent")} {sessionCounts.absent} · {t("Late")} {sessionCounts.late} · {t("Excused")} {sessionCounts.excused}
            </p>
          </div>
          <span className={`ml-auto rounded-full px-3 py-1 text-xs font-bold tracking-wide ${sessionTheme.chip}`}>
            {session === "am" ? "AM" : "PM"}
          </span>
          {!editing && (
            <Button
              size="sm"
              variant="outline"
              className="bg-white/70"
              onClick={() => setEditKey(loadKey)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" /> {t("Edit")}
            </Button>
          )}
        </div>
      )}

      {saveError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {saveError}
        </div>
      )}

      {classId && !editing && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          <CheckCircle className="h-4 w-4" />
          <span className="font-medium">
            {savedAt ? `${t("Saved")} ${savedAt.toLocaleTimeString()}` : t("Saved attendance loaded")}
          </span>
          <span className="text-xs">
            {t("The register is locked — press Edit to make changes.")}
          </span>
        </div>
      )}

      {classId ? (
        <>
          {/* Focused class overview — current session + date only */}
          {classId && (
            <Card className={sessionTheme.card}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {focusClassName} — {sessionTheme.label} {t("overview")}
                  </CardTitle>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sessionTheme.chip}`}>
                    {date}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                  <div className="bg-emerald-500" style={{ width: `${sessionRate(sessionCounts.present)}%` }} />
                  <div className="bg-amber-500" style={{ width: `${sessionRate(sessionCounts.late)}%` }} />
                  <div className="bg-rose-500" style={{ width: `${sessionRate(sessionCounts.absent)}%` }} />
                  <div className="bg-blue-500" style={{ width: `${sessionRate(sessionCounts.excused)}%` }} />
                </div>
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs">
                  <span className="text-emerald-700">{t("Present")} {sessionCounts.present}</span>
                  <span className="text-amber-700">{t("Late")} {sessionCounts.late}</span>
                  <span className="text-rose-700">{t("Absent")} {sessionCounts.absent}</span>
                  <span className="text-blue-700">{t("Excused")} {sessionCounts.excused}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sessionTotal} {t("students")} · {t("Attendance rate")} {sessionAttendanceRate}% · {t("Absent")} {sessionRate(sessionCounts.absent)}%
                  {!hasSaved && ` · ${t("not marked yet")}`}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Marking table */}
          <Card className={sessionTheme.card}>
            <CardHeader className="flex flex-col gap-2">
              <div className="flex flex-row items-center justify-between gap-2 flex-wrap">
                <CardTitle>
                  {t("Mark Attendance")}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {session === "am" ? t("Morning") : t("Afternoon")}
                  </span>
                </CardTitle>
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button variant="outline" onClick={() => navigate(`/attendance/class/${classId}/stats`)} className="gap-2 flex-1 sm:flex-none">
                    <BarChart3 className="h-4 w-4" /> {t("Class Stats")}
                  </Button>
                  {displayRecords.length > 0 && (editing ? (
                    <Button onClick={handleSave} disabled={markAttendance.isPending} className="flex-1 sm:flex-none">
                      {markAttendance.isPending ? t("Saving...") : t("Save Attendance")}
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setEditKey(loadKey)} className="flex-1 sm:flex-none">
                      <Pencil className="h-4 w-4 mr-1" /> {t("Edit attendance")}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">{t("Session")}</span>
                <Button
                  size="sm"
                  variant={session === "am" ? "default" : "outline"}
                  className={session === "am" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                  onClick={() => setSession("am")}
                >
                  <Sun className="h-4 w-4 mr-1" /> {t("Morning")}
                  {amCount > 0 && <span className="ml-1.5 rounded-full bg-white/25 px-1.5 text-[10px] font-bold">{amCount}</span>}
                </Button>
                <Button
                  size="sm"
                  variant={session === "pm" ? "default" : "outline"}
                  className={session === "pm" ? "bg-indigo-500 hover:bg-indigo-600 text-white" : ""}
                  onClick={() => setSession("pm")}
                >
                  <Sunset className="h-4 w-4 mr-1" /> {t("Afternoon")}
                  {pmCount > 0 && <span className="ml-1.5 rounded-full bg-white/25 px-1.5 text-[10px] font-bold">{pmCount}</span>}
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder={t("Search student by name or number…")}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loadingAttendance ? (
                <p className="text-muted-foreground">{t("Loading...")}</p>
              ) : displayRecords.length === 0 ? (
                <p className="text-muted-foreground">{t("No students found")}</p>
              ) : (
                <>
                  {filteredRecords.length === 0 ? (
                    <p className="text-muted-foreground">{t("No students match your search")}</p>
                  ) : (
                    <div className="divide-y rounded-md border">
                      <div className={`hidden sm:grid grid-cols-[1fr_120px_auto] gap-2 px-3 py-2 text-xs font-semibold ${sessionTheme.head}`}>
                        <span>{t("Name")}</span>
                        <span>{t("Student #")}</span>
                        <span className="text-right">{t("Status")}</span>
                      </div>
                      {filteredRecords.map((record) => (
                        <div
                          key={record.id}
                          className={`flex flex-col gap-2 px-3 py-3 sm:grid sm:grid-cols-[1fr_120px_auto] sm:items-center sm:gap-2 ${!editing ? "bg-emerald-50/50" : ""}`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {!editing && <CheckCircle className="inline h-3.5 w-3.5 text-emerald-600 mr-1" />}
                              {record.name}
                            </p>
                            <p className="text-xs text-muted-foreground sm:hidden">{record.number}</p>
                          </div>
                          <p className="hidden sm:block text-sm text-muted-foreground">{record.number}</p>
                          <div className="sm:justify-self-end">
                            <StatusButtons
                              value={statusMap[record.id] || record.status || "present"}
                              onChange={(v) => handleStatusChange(record.id, v)}
                              disabled={!editing}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : loadingOverview ? (
        <p className="text-muted-foreground">{t("Loading...")}</p>
      ) : (
        <>
          {/* Today's snapshot */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard title={t("Total Students")} value={totals.students || 0} sub={`${totals.classes || 0} ${t("classes")}`} icon={Users} tone="primary" />
            <StatCard title={t("Present Today")} value={todayStats.present || 0} sub={`${todayStats.present_rate || 0}% ${t("present rate")}`} icon={UserCheck} tone="emerald" highlight />
            <StatCard title={t("Absent Today")} value={todayStats.absent || 0} sub={`${todayStats.absent_rate || 0}% ${t("absent rate")}`} icon={UserX} tone="rose" />
            <StatCard title={t("Late Today")} value={todayStats.late || 0} sub={`${todayStats.late_rate || 0}% ${t("late rate")}`} icon={Clock} tone="amber" />
          </div>

          {/* Trend + status mix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> {t("Attendance Report")}</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart data={trendPoints} height={220} color="#2c5a5e" valueSuffix="%" />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                  <span>{t("Overall")}: <span className="font-semibold text-foreground">{summary.present_rate || 0}%</span></span>
                  <span className="text-emerald-600">{t("Present")} {summary.present || 0}</span>
                  <span className="text-rose-600">{t("Absent")} {summary.absent || 0}</span>
                  <span className="text-amber-600">{t("Late")} {summary.late || 0}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> {t("Attendance Status Mix")}</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart total={summary.total || 0} segments={statusSegments} caption={t("records")} />
              </CardContent>
            </Card>
          </div>

          {/* By class + weekday */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> {t("Attendance by Class")}</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart data={classBars} height={200} color="#2c5a5e" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {t("Absences by Weekday")}</CardTitle>
              </CardHeader>
              <CardContent>
                <RadarChart data={weekdayData} height={220} color="#d47a6a" />
              </CardContent>
            </Card>
          </div>

          {/* Top attendant + most absent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4" /> {t("Top Attendants")}</CardTitle>
              </CardHeader>
              <CardContent>
                {topAttendant.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">{t("No attendance recorded yet")}</p>
                ) : (
                  <div className="space-y-2">
                    {topAttendant.map((s, i) => (
                      <div key={s.student_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-yellow-400 text-yellow-950" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                        <StudentAvatar student={s} className="w-9 h-9" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{fullName(s)}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.class_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-600">{s.present_rate}%</p>
                          <p className="text-xs text-muted-foreground">{s.present} {t("present")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {t("Students Missing Class Most")}</CardTitle>
              </CardHeader>
              <CardContent>
                {topAbsent.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">{t("No attendance recorded yet")}</p>
                ) : (
                  <div className="space-y-2">
                    {topAbsent.map((s, i) => (
                      <div key={s.student_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-muted text-muted-foreground">{i + 1}</span>
                        <StudentAvatar student={s} className="w-9 h-9" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{fullName(s)}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.class_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-rose-600">{s.absent} {t("absent")}</p>
                          <p className="text-xs text-muted-foreground">{s.absent_rate}% · {s.late} {t("late")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Class breakdown */}
          {overviewClasses.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {t("Your Classes")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {overviewClasses.map((c) => (
                    <button
                      key={c.class_id}
                      type="button"
                      onClick={() => setClassId(c.class_id)}
                      className="text-left border rounded-lg p-3 hover:border-primary/50 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{c.class_name}</p>
                        <span className="text-xs font-semibold text-emerald-600">{c.present_rate}%</span>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                        <div className="bg-emerald-500" style={{ width: `${c.present_rate || 0}%` }} />
                        <div className="bg-amber-500" style={{ width: `${c.late_rate || 0}%` }} />
                        <div className="bg-rose-500" style={{ width: `${c.absent_rate || 0}%` }} />
                        <div className="bg-blue-500" style={{ width: `${c.excused_rate || 0}%` }} />
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground mt-2">
                        <span className="text-emerald-600">{t("Present")} {c.present}</span>
                        <span className="text-rose-600">{t("Absent")} {c.absent}</span>
                        <span className="text-amber-600">{t("Late")} {c.late}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
