import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClassAttendanceStats } from "../hooks/useAttendance";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { StudentAvatar } from "../components/ui/StudentAvatar";
import { LineChart, BarChart, RadarChart } from "../components/ui/charts";
import { useI18n } from "../i18n/I18nContext";
import { ArrowLeft, UserCheck, UserX, Clock, CheckCircle, Users, TrendingUp, AlertTriangle } from "lucide-react";

function shortDate(dateStr) {
  if (!dateStr) return "";
  return `${dateStr.slice(5, 7)}/${dateStr.slice(8, 10)}`;
}

function StatCard({ title, value, sub, icon: Icon, color }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color || ""}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          {Icon && (
            <span className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
              <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RateBadge({ value }) {
  const cls = value >= 90 ? "bg-emerald-100 text-emerald-700" : value >= 75 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{value}%</span>;
}

function RankedList({ title, items, tone, emptyText }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyText}</p>
        ) : (
          <div className="space-y-2">
            {items.map((s, i) => (
              <div key={s.student_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-yellow-400 text-yellow-950" : "bg-muted text-muted-foreground"}`}>
                  {i + 1}
                </span>
                <StudentAvatar student={s} className="w-9 h-9" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.first_name} {s.last_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.present} {tone === "best" ? "attended" : "missed"} · {s.absent} {tone === "best" ? "absent" : "absences"}
                  </p>
                </div>
                <RateBadge value={tone === "best" ? s.present_rate : s.absent_rate} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClassAttendanceStatsPage() {
  const { t } = useI18n();
  const { classId } = useParams();
  const navigate = useNavigate();
  const [period, setPeriod] = useState("monthly");
  const today = new Date().toISOString().split("T")[0];
  const { data: statsData, isLoading } = useClassAttendanceStats(classId, { period, today });
  const stats = statsData?.data;

  if (isLoading) {
    return <p className="text-muted-foreground">{t("Loading...")}</p>;
  }
  if (!stats) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> {t("Back")}
        </Button>
        <p className="text-muted-foreground">{t("No data available for this class.")}</p>
      </div>
    );
  }

  const summary = stats.summary || {};
  const students = stats.students || [];
  const best = stats.best || [];
  const worst = stats.worst || [];
  const trend = stats.trend || [];
  const byWeekday = stats.by_weekday || [];

  const trendPoints = trend.map((d) => ({ label: shortDate(d.date), value: d.present_rate }));
  const attendanceBars = students.slice(0, 12).map((s) => ({
    label: `${s.first_name?.[0] || ""}${s.last_name?.[0] || ""}`,
    value: s.present_rate,
    color: s.present_rate >= 90 ? "#2c5a5e" : s.present_rate >= 75 ? "#c9a86a" : "#d47a6a",
  }));
  const weekdayData = byWeekday.map((w) => ({ label: t(w.day), value: w.absent }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{stats.class?.name}</h1>
            <p className="text-sm text-muted-foreground">
              {t("Attendance statistics")} · {stats.from ? `${stats.from} → ${stats.to}` : `${t("All time")} → ${stats.to}`}
            </p>
          </div>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">{t("This Week")}</SelectItem>
            <SelectItem value="monthly">{t("This Month")}</SelectItem>
            <SelectItem value="all">{t("All Time")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t("Attendance Rate")} value={`${summary.present_rate ?? 0}%`} sub={`${summary.present ?? 0} ${t("present")}`} icon={UserCheck} color="text-emerald-600" />
        <StatCard title={t("Absent")} value={summary.absent ?? 0} sub={`${summary.absent_rate ?? 0}%`} icon={UserX} color="text-rose-600" />
        <StatCard title={t("Late")} value={summary.late ?? 0} sub={`${summary.late_rate ?? 0}%`} icon={Clock} color="text-amber-600" />
        <StatCard title={t("Excused")} value={summary.excused ?? 0} sub={`${summary.excused_rate ?? 0}%`} icon={CheckCircle} color="text-blue-600" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t("Students")} value={students.length} icon={Users} color="text-primary" />
        <StatCard title={t("Total Records")} value={(summary.total ?? 0).toLocaleString()} sub={`${summary.total ? Math.round(summary.total / Math.max(students.length, 1)) : 0} ${t("avg per student")}`} icon={TrendingUp} color="text-muted-foreground" />
        <StatCard title={t("Best Attendance")} value={best[0] ? `${best[0].present_rate}%` : "—"} sub={best[0] ? `${best[0].first_name} ${best[0].last_name}` : t("No records")} icon={TrendingUp} color="text-emerald-600" />
        <StatCard title={t("Most Absences")} value={worst[0] ? worst[0].absent : "—"} sub={worst[0] ? `${worst[0].first_name} ${worst[0].last_name}` : t("No records")} icon={AlertTriangle} color="text-rose-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> {t("Attendance Trend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={trendPoints} height={220} color="#2c5a5e" valueSuffix="%" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankedList title={t("Best Attendance")} items={best} tone="best" emptyText={t("No attendance recorded yet")} />
        <RankedList title={t("Students Missing Most")} items={worst} tone="worst" emptyText={t("No attendance recorded yet")} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> {t("Attendance by Student")}</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={attendanceBars} height={180} color="#2c5a5e" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("Student Breakdown")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Student")}</TableHead>
                <TableHead className="text-right">{t("Present")}</TableHead>
                <TableHead className="text-right">{t("Absent")}</TableHead>
                <TableHead className="text-right">{t("Late")}</TableHead>
                <TableHead className="text-right">{t("Excused")}</TableHead>
                <TableHead className="text-right">{t("Attendance")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.student_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StudentAvatar student={s} className="w-8 h-8" />
                      <span className="font-medium">{s.first_name} {s.last_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-emerald-700">{s.present}</TableCell>
                  <TableCell className="text-right text-rose-600">{s.absent}</TableCell>
                  <TableCell className="text-right text-amber-600">{s.late}</TableCell>
                  <TableCell className="text-right text-blue-600">{s.excused}</TableCell>
                  <TableCell className="text-right"><RateBadge value={s.present_rate} /></TableCell>
                </TableRow>
              ))}
              {students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">{t("No students in this class")}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
