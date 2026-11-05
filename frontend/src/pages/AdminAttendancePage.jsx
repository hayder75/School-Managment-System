import { fullName } from "../lib/fullName";
import { useState, useMemo } from "react";
import { useClasses } from "../hooks/useClasses";
import { useAdminAttendanceOverview, useAdminClassAttendance } from "../hooks/useAttendance";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { BarChart, DonutChart, GroupedBarChart } from "../components/ui/charts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { EthiopianDateInput } from "../components/ui/EthiopianDateInput";
import { Button } from "../components/ui/button";
import { UserCheck, AlertTriangle, Clock, CheckCircle, CalendarDays, BarChart3, Users, GraduationCap, TrendingDown, Search, X } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";
import ExcelButton from "../components/reports/ExcelButton";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LEVEL_ORDER = ["Nursery", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8"];
function localIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function presetRange(preset) {
  const now = new Date();
  if (preset === "today") return [localIso(now), localIso(now)];
  if (preset === "yesterday") {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return [localIso(y), localIso(y)];
  }
  if (preset === "this_week") return [localIso(startOfWeek(now)), localIso(now)];
  if (preset === "last_week") {
    const start = startOfWeek(now);
    const end = new Date(start); end.setDate(end.getDate() - 1);
    const prev = new Date(start); prev.setDate(prev.getDate() - 7);
    return [localIso(prev), localIso(end)];
  }
  if (preset === "this_month") return [localIso(new Date(now.getFullYear(), now.getMonth(), 1)), localIso(now)];
  if (preset === "last_month") {
    return [localIso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), localIso(new Date(now.getFullYear(), now.getMonth(), 0))];
  }
  return null;
}

const PALETTE = ["#2c5a5e", "#7fb3a0", "#c9a86a", "#8f9bb3", "#d47a6a", "#6a8fd4", "#a0b2c6", "#e0a458"];

function levelLabel(c) {
  if (c.level_group === "nursery") return "Nursery";
  if (c.level_group === "kg") return c.grade_level === 2 ? "UKG" : "LKG";
  return `Grade ${c.grade_level}`;
}

function StatCard({ title, value, icon: Icon, sub, color }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium">{t(title)}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value ?? "—"}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function RankBadge({ rank }) {
  const styles = {
    1: "bg-yellow-400 text-yellow-950",
    2: "bg-neutral-300 text-neutral-800",
    3: "bg-orange-300 text-orange-900",
  };
  return (
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${styles[rank] || "bg-neutral-100 text-neutral-500"}`}>
      {rank}
    </span>
  );
}

export default function AdminAttendancePage() {
  const { t } = useI18n();
  const today = localIso();
  const monthStart = localIso(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [draftFrom, setDraftFrom] = useState(monthStart);
  const [draftTo, setDraftTo] = useState(today);
  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(today);
  const [classId, setClassId] = useState("");
  const { data: classesData } = useClasses({ limit: 200 });

  const params = { from_date: fromDate, to_date: toDate };
  const overviewParams = classId ? { ...params, class_id: classId } : params;
  const { data: overviewData, isLoading } = useAdminAttendanceOverview(overviewParams);
  const { data: classData } = useAdminClassAttendance(classId, params);

  const overview = overviewData?.data || {};
  const summary = overview.summary || {};
  const byClass = overview.by_class || [];
  const trend = overview.trend || [];
  const topAbsent = overview.top_absent || [];
  const classDetail = classData?.data || null;
  const allClasses = classesData?.data || [];
  const dailyByClass = overview.daily_by_class || [];
  const selectedClass = allClasses.find((c) => c.id === classId);

  const levelAgg = {};
  for (const c of byClass) {
    const label = levelLabel(c);
    levelAgg[label] = (levelAgg[label] || 0) + c.absent;
  }
  const levelBars = LEVEL_ORDER.filter((l) => levelAgg[l] != null).map((l) => ({ label: t(l), value: levelAgg[l] }));

  const monthAgg = {};
  for (const d of trend) {
    const m = Number(d.date.slice(5, 7)) - 1;
    if (!monthAgg[m]) monthAgg[m] = { present: 0, absent: 0, late: 0 };
    monthAgg[m].present += d.present;
    monthAgg[m].absent += d.absent;
    monthAgg[m].late += d.late;
  }
  const trendBars = Object.keys(monthAgg)
    .sort((a, b) => Number(a) - Number(b))
    .map((m) => ({ label: MONTHS[Number(m)], present: monthAgg[m].present, absent: monthAgg[m].absent }));

  const statusSegments = [
    { label: t("Present"), value: summary.present || 0, color: "#2c5a5e" },
    { label: t("Absent"), value: summary.absent || 0, color: "#d47a6a" },
    { label: t("Late"), value: summary.late || 0, color: "#c9a86a" },
    { label: t("Excused"), value: summary.excused || 0, color: "#8f9bb3" },
  ];

  const exportSheets = useMemo(() => {
    const sessionTotalsMap = {};
    for (const r of dailyByClass) {
      const key = `${r.class_id}|${r.session}`;
      if (!sessionTotalsMap[key]) {
        sessionTotalsMap[key] = {
          class_name: r.class_name,
          session: r.session,
          present: 0, absent: 0, late: 0, excused: 0, total: 0,
        };
      }
      const t = sessionTotalsMap[key];
      t.present += Number(r.present || 0);
      t.absent += Number(r.absent || 0);
      t.late += Number(r.late || 0);
      t.excused += Number(r.excused || 0);
      t.total += Number(r.total || 0);
    }
    const sessionTotals = Object.values(sessionTotalsMap).map((r) => ({
      ...r,
      present_rate: r.total ? Math.round(((r.present + r.late) / r.total) * 1000) / 10 : 0,
      absent_rate: r.total ? Math.round((r.absent / r.total) * 1000) / 10 : 0,
    }));

    const dailyRows = dailyByClass.length
      ? dailyByClass
      : [{
          date: `${fromDate} → ${toDate}`,
          class_name: selectedClass?.name || "All classes",
          session: "",
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          total: 0,
          present_rate: 0,
          absent_rate: 0,
        }];

    return [
      {
        name: "Report",
        columns: [{ key: "field", label: "Field" }, { key: "value", label: "Value" }],
        rows: [
          { field: "From", value: fromDate },
          { field: "To", value: toDate },
          { field: "Class", value: selectedClass?.name || "All classes" },
          { field: "Generated", value: new Date().toLocaleString() },
        ],
      },
      {
        name: "Daily by class",
        columns: [
          { key: "date", label: "Date" },
          { key: "session_label", label: "Session", value: (r) => (r.session === "pm" ? "Afternoon" : r.session === "am" ? "Morning" : "") },
          { key: "class_name", label: "Class" },
          { key: "present", label: "Present" },
          { key: "absent", label: "Absent" },
          { key: "late", label: "Late" },
          { key: "excused", label: "Excused" },
          { key: "total", label: "Total" },
          { key: "present_rate", label: "Present %" },
          { key: "absent_rate", label: "Absent %" },
        ],
        rows: dailyRows,
      },
      {
        name: "Session totals",
        columns: [
          { key: "class_name", label: "Class" },
          { key: "session_label", label: "Session", value: (r) => (r.session === "pm" ? "Afternoon" : "Morning") },
          { key: "present", label: "Present" },
          { key: "absent", label: "Absent" },
          { key: "late", label: "Late" },
          { key: "excused", label: "Excused" },
          { key: "total", label: "Total" },
          { key: "present_rate", label: "Present %" },
          { key: "absent_rate", label: "Absent %" },
        ],
        rows: sessionTotals,
      },
      {
        name: "Class totals",
        columns: [
          { key: "class_name", label: "Class" },
          { key: "level", label: "Level" },
          { key: "present", label: "Present" },
          { key: "absent", label: "Absent" },
          { key: "late", label: "Late" },
          { key: "excused", label: "Excused" },
          { key: "total", label: "Total" },
          { key: "absent_rate", label: "Absent %" },
        ],
        rows: byClass.map((c) => ({ ...c, level: levelLabel(c) })),
      },
      {
        name: "Daily school totals",
        columns: [
          { key: "date", label: "Date" },
          { key: "present", label: "Present" },
          { key: "absent", label: "Absent" },
          { key: "late", label: "Late" },
          { key: "total", label: "Total" },
        ],
        rows: (trend || []).map((x) => ({ ...x, date: String(x.date || "").slice(0, 10) })),
      },
      ...(classDetail ? [{
        name: "Student breakdown",
        columns: [
          { key: "name", label: "Student" },
          { key: "present", label: "Present" },
          { key: "absent", label: "Absent" },
          { key: "late", label: "Late" },
          { key: "excused", label: "Excused" },
          { key: "absent_rate", label: "Absent %" },
        ],
        rows: (classDetail.students || []).map((x) => ({ ...x, name: fullName(x) })),
      }] : []),
    ];
  }, [dailyByClass, byClass, trend, classDetail, fromDate, toDate, selectedClass]);

  function applyFilters() {
    setFromDate(draftFrom);
    setToDate(draftTo);
  }

  function selectClass(id) {
    setClassId(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("Attendance Analytics")}</h1>
          <p className="text-muted-foreground">{t("School-wide attendance overview, absence hotspots and student-level breakdown")}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {fromDate} → {toDate} · {selectedClass?.name || t("All classes")}
          </p>
        </div>
        <ExcelButton
          filename={`attendance-${fromDate}-to-${toDate}${selectedClass ? "-" + selectedClass.name.replace(/[^a-z0-9]+/gi, "-") : ""}`}
          sheets={exportSheets}
          label={t("Download Excel")}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("From")}</label>
              <EthiopianDateInput className="w-56" value={draftFrom} onChange={setDraftFrom} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("To")}</label>
              <EthiopianDateInput className="w-56" value={draftTo} onChange={setDraftTo} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("Class")}</label>
              <Select value={classId || "__all__"} onValueChange={(v) => selectClass(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-56"><SelectValue placeholder={t("All classes")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("All classes")}</SelectItem>
                  {allClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={applyFilters} className="gap-2"><Search className="h-4 w-4" /> {t("Apply")}</Button>
            {classId && (
              <Button variant="outline" onClick={() => selectClass("")} className="gap-2"><X className="h-4 w-4" /> {t("Clear class")}</Button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[
              ["today", "Today"],
              ["yesterday", "Yesterday"],
              ["this_week", "This week"],
              ["last_week", "Last week"],
              ["this_month", "This month"],
              ["last_month", "Last month"],
            ].map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant="outline"
                onClick={() => {
                  const range = presetRange(key);
                  if (!range) return;
                  setDraftFrom(range[0]);
                  setDraftTo(range[1]);
                  setFromDate(range[0]);
                  setToDate(range[1]);
                }}
              >
                {t(label)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">{t("Loading attendance analytics...")}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 sm:grid-cols-5 gap-4">
            <StatCard title="Attendance Rate" value={summary.present_rate != null ? `${summary.present_rate}%` : "—"} icon={UserCheck} color="text-green-600" sub={`${summary.present || 0} ${t("Present")}`} />
            <StatCard title="Absent" value={summary.absent || "—"} icon={AlertTriangle} color="text-red-600" sub={`${summary.absent_rate}% ${t("absent rate")}`} />
            <StatCard title="Late" value={summary.late || "—"} icon={Clock} color="text-yellow-600" sub={`${summary.late_rate}% ${t("late rate")}`} />
            <StatCard title="Excused" value={summary.excused || "—"} icon={CheckCircle} color="text-blue-600" sub={`${summary.excused_rate}% ${t("excused rate")}`} />
            <StatCard title="Total Records" value={summary.total?.toLocaleString() || "—"} icon={CalendarDays} color="text-neutral-600" sub={`${byClass.length} ${t("classes tracked")}`} />
          </div>

          <p className="text-xs text-muted-foreground">
            {byClass.filter((c) => Number(c.total) > 0).length} {t("of")} {byClass.length} {t("classes have attendance in this range.")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> {t("Attendance Status Mix")}</CardTitle></CardHeader>
              <CardContent><DonutChart total={summary.students || 0} segments={statusSegments} /></CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2"><TrendingDown className="h-4 w-4" /> {t("Monthly Present vs Absent")}</span>
                  <span className="flex items-center gap-3 text-[11px] font-normal text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#2c5a5e" }} /> {t("Present")}</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#d47a6a" }} /> {t("Absent")}</span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GroupedBarChart data={trendBars} series={[{ key: "present", label: t("Present"), color: "#2c5a5e" }, { key: "absent", label: t("Absent"), color: "#d47a6a" }]} height={200} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4" /> {t("Absence by Level")}</CardTitle></CardHeader>
              <CardContent><BarChart data={levelBars} height={200} color="#d47a6a" /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> {t("Most Absent Students")}</CardTitle></CardHeader>
              <CardContent>
                {topAbsent.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t("No attendance records in this range")}</p>
                ) : (
                  <div className="space-y-2">
                    {topAbsent.map((s, i) => (
                      <div key={s.student_id} className="flex items-center gap-3 p-2 border rounded">
                        <RankBadge rank={i + 1} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{fullName(s)}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.class_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-red-600">{s.absent} {t("Absent")}</p>
                          <p className="text-xs text-muted-foreground">{s.absent_rate}% · {s.late} {t("Late")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {t("Absence by Class (highest first)")}</CardTitle></CardHeader>
            <CardContent>
              {byClass.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("No attendance records in this range")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>{t("Class")}</TableHead>
                      <TableHead>{t("Level")}</TableHead>
                      <TableHead className="text-right">{t("Total")}</TableHead>
                      <TableHead className="text-right">{t("Absent")}</TableHead>
                      <TableHead className="text-right">{t("Late")}</TableHead>
                      <TableHead className="text-right">{t("Absent %")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byClass.map((c, i) => (
                      <TableRow key={c.class_id} className="cursor-pointer hover:bg-neutral-50" onClick={() => selectClass(c.class_id)}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className="font-medium">{c.class_name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{t(levelLabel(c))}</TableCell>
                        <TableCell className="text-right">{c.total}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">{c.absent}</TableCell>
                        <TableCell className="text-right">{c.late}</TableCell>
                        <TableCell className="text-right">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${c.absent_rate >= 10 ? "bg-red-100 text-red-700" : c.absent_rate >= 7 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                            {c.absent_rate}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {classDetail && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> {classDetail.class.name} — {t("Student Breakdown")}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => selectClass("")} className="gap-1"><X className="h-3 w-3" /> {t("Clear")}</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="p-2 border rounded">
                    <p className="text-xs text-muted-foreground">{t("Attendance Rate")}</p>
                    <p className="text-lg font-bold text-green-600">{classDetail.summary.present_rate}%</p>
                  </div>
                  <div className="p-2 border rounded">
                    <p className="text-xs text-muted-foreground">{t("Absent")}</p>
                    <p className="text-lg font-bold text-red-600">{classDetail.summary.absent} ({classDetail.summary.absent_rate}%)</p>
                  </div>
                  <div className="p-2 border rounded">
                    <p className="text-xs text-muted-foreground">{t("Late")}</p>
                    <p className="text-lg font-bold text-yellow-600">{classDetail.summary.late} ({classDetail.summary.late_rate}%)</p>
                  </div>
                  <div className="p-2 border rounded">
                    <p className="text-xs text-muted-foreground">{t("Records")}</p>
                    <p className="text-lg font-bold">{classDetail.summary.total?.toLocaleString()}</p>
                  </div>
                </div>
                {classDetail.students.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t("No attendance was marked for this class between")} {fromDate} {t("and")} {toDate}.
                  </p>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Student")}</TableHead>
                      <TableHead className="text-right">{t("Present")}</TableHead>
                      <TableHead className="text-right">{t("Absent")}</TableHead>
                      <TableHead className="text-right">{t("Late")}</TableHead>
                      <TableHead className="text-right">{t("Excused")}</TableHead>
                      <TableHead className="text-right">{t("Absent %")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classDetail.students.map((s) => (
                      <TableRow key={s.student_id}>
                        <TableCell className="font-medium">{fullName(s)}</TableCell>
                        <TableCell className="text-right text-green-700">{s.present}</TableCell>
                        <TableCell className="text-right text-red-600">{s.absent}</TableCell>
                        <TableCell className="text-right text-yellow-600">{s.late}</TableCell>
                        <TableCell className="text-right">{s.excused}</TableCell>
                        <TableCell className="text-right">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${s.absent_rate >= 10 ? "bg-red-100 text-red-700" : s.absent_rate >= 7 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                            {s.absent_rate}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
