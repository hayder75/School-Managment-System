import { useMemo, useState } from "react";
import { useClasses } from "../../hooks/useClasses";
import { useAttendance } from "../../hooks/useAttendance";
import { useStudentsByClass } from "../../hooks/useStudents";
import { useI18n } from "../../i18n/I18nContext";
import { fullName } from "../../lib/fullName";
import { localIso } from "../../lib/date";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { EthiopianDateInput } from "../ui/EthiopianDateInput";
import { Badge } from "../ui/badge";
import ExcelButton from "../reports/ExcelButton";
import { classes as sev, statusSeverity } from "../../lib/gradeColors";
import { Sun, Sunset, ShieldCheck, AlertTriangle, Users } from "lucide-react";

const STATUS_LABEL = { present: "Present", absent: "Absent", late: "Late", excused: "Excused" };

export default function UnitLeaderAttendanceView() {
  const { t } = useI18n();
  const today = localIso();
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(today);
  const [session, setSession] = useState("am");

  const { data: classesData } = useClasses({ limit: 300 });
  const classes = classesData?.data || [];
  const { data: amData } = useAttendance(classId, date, "am");
  const { data: pmData } = useAttendance(classId, date, "pm");
  const { data: rosterData } = useStudentsByClass(classId);

  const amCount = amData?.data?.length || 0;
  const pmCount = pmData?.data?.length || 0;
  const current = session === "am" ? amData : pmData;
  const records = current?.data || [];
  const meta = current?.meta || {};
  const teacher = meta.homeroom_teacher_name || "";
  const students = rosterData?.data || [];
  const saved = records.length > 0;
  const isToday = date === today;
  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const sessionLabel = session === "am" ? t("Morning") : t("Afternoon");

  const byStudent = useMemo(
    () => Object.fromEntries(records.map((r) => [r.student_id, r.status])),
    [records]
  );

  const rows = useMemo(
    () => students
      .map((s) => ({ ...s, status: byStudent[s.user_id] || "" }))
      .sort((a, b) => fullName(a).localeCompare(fullName(b), undefined, { sensitivity: "base" })),
    [students, byStudent]
  );

  const exportRows = rows.map((s) => ({
    date,
    session: sessionLabel,
    student: fullName(s),
    student_number: s.student_number || "",
    status: s.status ? t(STATUS_LABEL[s.status] || s.status) : t("Not saved"),
  }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-bold">{t("Attendance")}</h1>
        <p className="text-muted-foreground">
          {t("View-only attendance. You can see what each homeroom teacher has saved.")}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2 w-full sm:w-auto">
              <label className="text-sm font-medium">{t("Class")}</label>
              <Select value={classId || "__all__"} onValueChange={(v) => setClassId(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder={t("Select class")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("Select class")}</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full sm:w-auto">
              <label className="text-sm font-medium">{t("Date")}</label>
              <EthiopianDateInput className="w-full sm:w-56" value={date} onChange={setDate} />
            </div>
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
            </div>
            <div className="flex-1" />
            <ExcelButton
              filename={`attendance-${meta.class_name || "class"}-${date}-${session}`}
              disabled={!classId || !rows.length}
              sheets={[{
                name: "Attendance",
                columns: [
                  { key: "date", label: "Date" },
                  { key: "session", label: "Session" },
                  { key: "student", label: "Student" },
                  { key: "student_number", label: "Student ID" },
                  { key: "status", label: "Status" },
                ],
                rows: exportRows,
              }]}
            />
          </div>
        </CardContent>
      </Card>

      {!classId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t("Select a class to see its attendance.")}</CardContent></Card>
      ) : isWeekend ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold">{t("Weekend — no attendance")}</p>
            <p className="text-sm text-muted-foreground">
              {t("Saturday and Sunday are not school days, so there is no attendance to show.")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${saved ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
            {saved ? <ShieldCheck className="h-6 w-6 shrink-0" /> : <AlertTriangle className="h-6 w-6 shrink-0" />}
            <div className="min-w-0">
              <p className="font-semibold">
                {meta.class_name || classes.find((c) => c.id === classId)?.name} · {sessionLabel} · {date}
              </p>
              {saved ? (
                <p className="text-xs">
                  {t("Saved by the homeroom teacher")}{teacher ? `: ${teacher}` : ""} · {records.length} {t("students recorded")}
                </p>
              ) : (
                <p className="text-xs">
                  {isToday
                    ? `${t("Today's")} ${sessionLabel} ${t("attendance has not been saved yet. Contact the homeroom teacher")}${teacher ? `: ${teacher}` : ""}.`
                    : `${t("No attendance was saved for this date.")}${teacher ? ` ${t("Homeroom teacher")}: ${teacher}` : ""}`}
                </p>
              )}
            </div>
            {teacher && (
              <Badge className={`ml-auto ${sev("info").badge}`}>
                <Users className="h-3 w-3 mr-1" /> {teacher}
              </Badge>
            )}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("Students")} ({rows.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y rounded-md border">
                <div className="hidden sm:grid grid-cols-[1fr_140px_140px] gap-2 bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
                  <span>{t("Name")}</span>
                  <span>{t("Student #")}</span>
                  <span className="text-right">{t("Status")}</span>
                </div>
                {rows.map((s) => (
                  <div key={s.user_id} className="flex flex-col gap-2 px-3 py-3 sm:grid sm:grid-cols-[1fr_140px_140px] sm:items-center sm:gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{fullName(s)}</p>
                      <p className="text-xs text-muted-foreground sm:hidden">{s.student_number}</p>
                    </div>
                    <p className="hidden sm:block text-sm text-muted-foreground">{s.student_number || "—"}</p>
                    <div className="sm:justify-self-end">
                      {s.status ? (
                        <Badge className={sev(statusSeverity(s.status)).badge}>{t(STATUS_LABEL[s.status] || s.status)}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("Not saved")}</span>
                      )}
                    </div>
                  </div>
                ))}
                {!rows.length && <p className="p-6 text-center text-sm text-muted-foreground">{t("No students in this class.")}</p>}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
