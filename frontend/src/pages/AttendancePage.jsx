import { fullName } from "../lib/fullName";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useClasses } from "../hooks/useClasses";
import { useAttendance, useMarkAttendance, useTeacherAttendanceOverview, useMyHomeroomClasses } from "../hooks/useAttendance";
import { useStudentsByClass } from "../hooks/useStudents";
import { Button } from "../components/ui/button";
import { EthiopianDateInput } from "../components/ui/EthiopianDateInput";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { StudentAvatar } from "../components/ui/StudentAvatar";
import { BarChart, DonutChart, LineChart, RadarChart } from "../components/ui/charts";
import AdminAttendancePage from "./AdminAttendancePage";
import { useI18n } from "../i18n/I18nContext";
import { Users, UserCheck, UserX, Clock, CheckCircle, BarChart3, AlertTriangle, TrendingUp, CalendarDays } from "lucide-react";

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

function StatusButtons({ value, onChange }) {
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
            className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold border transition-colors ${selected ? opt.active : opt.idle}`}
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

function TeacherAttendanceView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role === "teacher";
  const today = new Date().toISOString().split("T")[0];
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(today);
  const [rangeWeeks, setRangeWeeks] = useState(4);

  const fromDate = new Date(Date.now() - rangeWeeks * 7 * 86400000).toISOString().split("T")[0];
  const { data: classesData } = useClasses({ limit: 200 });
  const { data: homeroomData, isLoading: loadingHomeroom } = useMyHomeroomClasses();
  const { data: overviewData, isLoading: loadingOverview } = useTeacherAttendanceOverview({
    from_date: fromDate,
    to_date: today,
    today,
  });
  const { data: attendanceData, isLoading: loadingAttendance } = useAttendance(classId, date);
  const { data: classStudentsData } = useStudentsByClass(classId);
  const markAttendance = useMarkAttendance();

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

  useEffect(() => {
    setStatusMap({});
  }, [classId, date]);

  const displayRecords = attendanceRecords.length > 0
    ? attendanceRecords.map((r) => ({
        id: r.student_id,
        name: `${fullName(r)}`,
        number: r.student_number,
        status: r.status,
      }))
    : classStudents.map((s) => ({
        id: s.user_id,
        name: `${fullName(s)}`,
        number: s.student_number,
        status: statusMap[s.user_id] || "present",
      }));

  function handleStatusChange(studentId, status) {
    setStatusMap((prev) => ({ ...prev, [studentId]: status }));
  }

  async function handleSave() {
    if (!classId || !date) return;
    const records = displayRecords.map((r) => ({
      student_id: r.id,
      status: statusMap[r.id] || r.status || "present",
    }));
    await markAttendance.mutateAsync({ classId, date, records });
  }

  const focusClass = classId ? overviewClasses.find((c) => c.class_id === classId) : null;

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

      {classId ? (
        <>
          {/* Focused class overview */}
          {focusClass && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{focusClass.class_name} — {t("Overview")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                  <div className="bg-emerald-500" style={{ width: `${focusClass.present_rate || 0}%` }} />
                  <div className="bg-amber-500" style={{ width: `${focusClass.late_rate || 0}%` }} />
                  <div className="bg-rose-500" style={{ width: `${focusClass.absent_rate || 0}%` }} />
                  <div className="bg-blue-500" style={{ width: `${focusClass.excused_rate || 0}%` }} />
                </div>
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="text-emerald-600">{t("Present")} {focusClass.present}</span>
                  <span className="text-amber-600">{t("Late")} {focusClass.late}</span>
                  <span className="text-rose-600">{t("Absent")} {focusClass.absent}</span>
                  <span className="text-blue-600">{t("Excused")} {focusClass.excused}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Marking table */}
          <Card className="max-md:order-first">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle>{t("Mark Attendance")}</CardTitle>
              <div className="flex w-full gap-2 sm:w-auto">
                <Button variant="outline" onClick={() => navigate(`/attendance/class/${classId}/stats`)} className="gap-2 flex-1 sm:flex-none">
                  <BarChart3 className="h-4 w-4" /> {t("Class Stats")}
                </Button>
                {displayRecords.length > 0 && (
                  <Button onClick={handleSave} disabled={markAttendance.isPending} className="flex-1 sm:flex-none">
                    {markAttendance.isPending ? t("Saving...") : t("Save Attendance")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingAttendance ? (
                <p className="text-muted-foreground">{t("Loading...")}</p>
              ) : displayRecords.length === 0 ? (
                <p className="text-muted-foreground">{t("No students found")}</p>
              ) : (
                <div className="divide-y rounded-md border">
                  <div className="hidden sm:grid grid-cols-[1fr_120px_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/40">
                    <span>{t("Name")}</span>
                    <span>{t("Student #")}</span>
                    <span className="text-right">{t("Status")}</span>
                  </div>
                  {displayRecords.map((record) => (
                    <div key={record.id} className="flex flex-col gap-2 px-3 py-3 sm:grid sm:grid-cols-[1fr_120px_auto] sm:items-center sm:gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{record.name}</p>
                        <p className="text-xs text-muted-foreground sm:hidden">{record.number}</p>
                      </div>
                      <p className="hidden sm:block text-sm text-muted-foreground">{record.number}</p>
                      <div className="sm:justify-self-end">
                        <StatusButtons
                          value={statusMap[record.id] || record.status || "present"}
                          onChange={(v) => handleStatusChange(record.id, v)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
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
