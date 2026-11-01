import { useEffect, useMemo, useState } from "react";
import { useHomeroomAttendance } from "../../hooks/useReports";
import { useMyHomeroomClasses } from "../../hooks/useAttendance";
import { useI18n } from "../../i18n/I18nContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { classes as sev, percentSeverity } from "../../lib/gradeColors";
import { FileSpreadsheet, Printer, Users, UserX, CalendarDays, AlertTriangle } from "lucide-react";

const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x;
}

function rangeFor(preset) {
  const now = new Date();
  if (preset === "this_week") return [isoLocal(startOfWeek(now)), isoLocal(now)];
  if (preset === "last_week") {
    const thisStart = startOfWeek(now);
    const end = new Date(thisStart); end.setDate(end.getDate() - 1);
    const start = new Date(thisStart); start.setDate(start.getDate() - 7);
    return [isoLocal(start), isoLocal(end)];
  }
  if (preset === "this_month") {
    return [isoLocal(new Date(now.getFullYear(), now.getMonth(), 1)), isoLocal(now)];
  }
  if (preset === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return [isoLocal(start), isoLocal(end)];
  }
  return null;
}

const PRESETS = [
  { key: "this_week", label: "This week" },
  { key: "last_week", label: "Last week" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
];

const STATUS_CELL = {
  present: { letter: "P", cls: "bg-emerald-100 text-emerald-800" },
  absent: { letter: "A", cls: "bg-rose-100 text-rose-800" },
  late: { letter: "L", cls: "bg-amber-100 text-amber-800" },
  excused: { letter: "E", cls: "bg-blue-100 text-blue-800" },
};

export default function HomeroomAttendanceReport({ isTeacher = false, classes = [] }) {
  const { t } = useI18n();
  const { data: homeroomData, isLoading: loadingHomeroom } = useMyHomeroomClasses(isTeacher);
  const homeroomClasses = homeroomData?.data?.classes || [];
  const available = isTeacher ? homeroomClasses : classes;

  const [classId, setClassId] = useState("");
  const [preset, setPreset] = useState("this_month");
  const [from, setFrom] = useState(() => rangeFor("this_month")[0]);
  const [to, setTo] = useState(() => rangeFor("this_month")[1]);

  useEffect(() => {
    if (!classId && available.length) setClassId(available[0].id);
  }, [available, classId]);

  useEffect(() => {
    const range = rangeFor(preset);
    if (range) { setFrom(range[0]); setTo(range[1]); }
  }, [preset]);

  const params = useMemo(() => ({
    class_id: classId || undefined,
    from_date: from,
    to_date: to,
  }), [classId, from, to]);

  const { data, isLoading } = useHomeroomAttendance(params, { enabled: !!classId && !!from && !!to });
  const report = data?.data;
  const cls = report?.classes?.[0];

  const exportUrl = `/api/reports/homeroom-attendance/export?${new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString()}`;

  if (isTeacher && loadingHomeroom) {
    return <p className="text-sm text-muted-foreground">{t("Loading...")}</p>;
  }
  if (isTeacher && !homeroomClasses.length && !loadingHomeroom) {
    return (
      <Card><CardContent className="py-10 text-center text-muted-foreground">
        {t("You are not a homeroom teacher, so there is no class register for you.")}
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("Homeroom attendance")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("Weekly or monthly register for your class: present, absent, late and excused rates for every student.")}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("Class")}</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder={t("Select class")} /></SelectTrigger>
                <SelectContent>
                  {available.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("Period")}</Label>
              <div className="flex flex-wrap gap-1">
                {PRESETS.map((p) => (
                  <Button key={p.key} size="sm" variant={preset === p.key ? "default" : "outline"} onClick={() => setPreset(p.key)}>
                    {t(p.label)}
                  </Button>
                ))}
                <Button size="sm" variant={preset === "custom" ? "default" : "outline"} onClick={() => setPreset("custom")}>
                  {t("Custom")}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("From")} / {t("To")}</Label>
              <div className="flex gap-2">
                <Input type="date" value={from} onChange={(e) => { setPreset("custom"); setFrom(e.target.value); }} />
                <Input type="date" value={to} onChange={(e) => { setPreset("custom"); setTo(e.target.value); }} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" disabled={!cls} onClick={() => window.open(exportUrl, "_blank")}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> {t("Excel")}
            </Button>
            <Button variant="outline" disabled={!cls} onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> {t("Print")}
            </Button>
            <span className="text-xs text-muted-foreground">{from} → {to}</span>
          </div>
        </CardContent>
      </Card>

      {isLoading && <p className="text-sm text-muted-foreground">{t("Loading...")}</p>}

      {!isLoading && report && !cls && (
        <p className="text-sm text-muted-foreground text-center py-8">{t("No attendance records for this period.")}</p>
      )}

      {cls && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Users className="h-6 w-6 text-blue-500" /><div><p className="text-2xl font-bold">{cls.summary.students}</p><p className="text-xs text-muted-foreground">{t("Students")}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><CalendarDays className="h-6 w-6 text-emerald-500" /><div><p className="text-2xl font-bold">{cls.summary.days_recorded}</p><p className="text-xs text-muted-foreground">{t("Days recorded")}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-4"><p className={`text-2xl font-bold ${sev(percentSeverity(cls.summary.present_rate, { warn: 85, good: 95 })).text}`}>{cls.summary.present_rate ?? "—"}%</p><p className="text-xs text-muted-foreground">{t("Present rate")}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-amber-500" /><div><p className="text-2xl font-bold">{cls.summary.at_risk}</p><p className="text-xs text-muted-foreground">{t("At-risk students")}</p></div></div></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{cls.class_name} — {t("student summary")}</CardTitle>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{t("Present")} {cls.summary.present_rate ?? "—"}%</span>
                  <span>{t("Absent")} {cls.summary.absent_rate ?? "—"}%</span>
                  <span>{t("Late")} {cls.summary.late_rate ?? "—"}%</span>
                  <span>{t("Excused")} {cls.summary.excused_rate ?? "—"}%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="p-2 font-medium">{t("Student")}</th>
                      <th className="p-2 font-medium">{t("ID")}</th>
                      <th className="p-2 font-medium">{t("Recorded")}</th>
                      <th className="p-2 font-medium">{t("Present")}</th>
                      <th className="p-2 font-medium">{t("Absent")}</th>
                      <th className="p-2 font-medium">{t("Late")}</th>
                      <th className="p-2 font-medium">{t("Excused")}</th>
                      <th className="p-2 font-medium">{t("Present %")}</th>
                      <th className="p-2 font-medium">{t("Absent %")}</th>
                      <th className="p-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cls.students.map((st) => (
                      <tr key={st.student_id} className={`border-b ${st.at_risk ? sev("danger").bg : ""}`}>
                        <td className="p-2 font-medium">{[st.first_name, st.middle_name, st.last_name].filter(Boolean).join(" ")}</td>
                        <td className="p-2 text-xs text-muted-foreground">{st.student_number || "—"}</td>
                        <td className="p-2">{st.recorded}</td>
                        <td className="p-2 text-emerald-700">{st.present}</td>
                        <td className="p-2 text-rose-700">{st.absent}</td>
                        <td className="p-2 text-amber-700">{st.late}</td>
                        <td className="p-2 text-blue-700">{st.excused}</td>
                        <td className={`p-2 font-semibold ${sev(percentSeverity(st.present_rate, { warn: 85, good: 95 })).text}`}>
                          {st.present_rate == null ? "—" : `${st.present_rate}%`}
                        </td>
                        <td className={`p-2 font-semibold ${st.absent_rate == null ? "" : st.absent_rate > 10 ? sev("danger").text : st.absent_rate > 5 ? sev("warn").text : sev("good").text}`}>
                          {st.absent_rate == null ? "—" : `${st.absent_rate}%`}
                        </td>
                        <td className="p-2">
                          {st.at_risk && <Badge className={sev("danger").badge}>{t("At risk")}</Badge>}
                        </td>
                      </tr>
                    ))}
                    {!cls.students.length && (
                      <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">{t("No students in this class.")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{cls.class_name} — {t("daily register")}</CardTitle>
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span><span className="inline-block h-3 w-3 rounded bg-emerald-200 mr-1" />{t("Present")}</span>
                <span><span className="inline-block h-3 w-3 rounded bg-rose-200 mr-1" />{t("Absent")}</span>
                <span><span className="inline-block h-3 w-3 rounded bg-amber-200 mr-1" />{t("Late")}</span>
                <span><span className="inline-block h-3 w-3 rounded bg-blue-200 mr-1" />{t("Excused")}</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="p-2 font-medium sticky left-0 bg-muted/50">{t("Student")}</th>
                      {cls.days.map((d) => <th key={d} className="p-2 font-medium whitespace-nowrap">{d.slice(5)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {cls.students.map((st) => (
                      <tr key={st.student_id} className="border-b">
                        <td className="p-2 font-medium whitespace-nowrap sticky left-0 bg-background">
                          {[st.first_name, st.last_name].filter(Boolean).join(" ")}
                        </td>
                        {cls.days.map((d) => {
                          const status = st.days?.[d];
                          const cell = STATUS_CELL[status];
                          return (
                            <td key={d} className="p-1 text-center">
                              {cell ? (
                                <span className={`inline-flex h-6 w-6 items-center justify-center rounded text-[11px] font-semibold ${cell.cls}`} title={status}>
                                  {cell.letter}
                                </span>
                              ) : <span className="text-muted-foreground">·</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!cls.days.length && (
                <p className="p-4 text-sm text-muted-foreground">{t("No attendance was marked in this period.")}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
