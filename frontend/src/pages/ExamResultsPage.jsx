import { useState } from "react";
import { useAuthStore } from "../store/auth";
import { useMyChildren } from "../hooks/useParents";
import { useStudents } from "../hooks/useStudents";
import { useExams } from "../hooks/useExams";
import { useStudentGrades } from "../hooks/useGrades";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { StudentAvatar } from "../components/ui/StudentAvatar";
import { useI18n } from "../i18n/I18nContext";
import { CalendarDays, GraduationCap, TrendingUp, BookOpen } from "lucide-react";

function gradeLetter(pct) {
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

function pctOf(g) {
  const total = parseFloat(g.total_marks) || 0;
  const marks = parseFloat(g.marks ?? g.score) || 0;
  return total > 0 ? Math.round((marks / total) * 1000) / 10 : 0;
}

function toneFor(pct) {
  if (pct >= 80) return "bg-emerald-100 text-emerald-700";
  if (pct >= 60) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export default function ExamResultsPage() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const isParent = user?.role === "parent";
  const isStudent = user?.role === "student";

  const { data: childrenData } = useMyChildren({ enabled: isParent });
  const children = childrenData?.data || [];
  const [childId, setChildId] = useState("");
  const selectedChild = children.find((c) => c.id === childId) || children[0];

  const { data: myStudentData } = useStudents(
    { user_id: user?.id, limit: 1 },
    { enabled: isStudent && !!user?.id }
  );
  const myStudent = myStudentData?.data?.[0];

  const studentId = isParent ? selectedChild?.id : myStudent?.id;
  const classId = isParent ? selectedChild?.class_id : myStudent?.class_id;
  const studentName = isParent
    ? `${selectedChild?.first_name || ""} ${selectedChild?.last_name || ""}`.trim()
    : `${myStudent?.first_name || ""} ${myStudent?.last_name || ""}`.trim();

  const { data: examsData } = useExams({ limit: 100, class_id: classId });
  const { data: gradesData } = useStudentGrades(studentId);

  const allExams = examsData?.data || [];
  const grades = gradesData?.data || [];

  const today = new Date().toISOString().slice(0, 10);
  const dateOf = (e) => String(e.date || "").slice(0, 10);
  const upcoming = allExams
    .filter((e) => dateOf(e) && dateOf(e) >= today)
    .sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
  const past = allExams
    .filter((e) => dateOf(e) && dateOf(e) < today)
    .sort((a, b) => dateOf(b).localeCompare(dateOf(a)));

  const recorded = grades.filter((g) => g.marks != null || g.score != null);
  const avg = recorded.length
    ? Math.round((recorded.reduce((s, g) => s + pctOf(g), 0) / recorded.length) * 10) / 10
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" /> {t("Exam & Results")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("Exam schedules and results appear here as soon as they are published.")}</p>
        </div>
        {isParent && children.length > 0 && (
          <div className="flex items-center gap-3">
            {selectedChild && (
              <div className="flex items-center gap-2">
                <StudentAvatar student={selectedChild} className="w-9 h-9" />
                <div className="text-sm">
                  <p className="font-medium">{studentName}</p>
                  <p className="text-xs text-muted-foreground">{selectedChild.class_name}</p>
                </div>
              </div>
            )}
            <Select value={childId || selectedChild?.id || ""} onValueChange={setChildId}>
              <SelectTrigger className="w-52"><SelectValue placeholder={t("Select child")} /></SelectTrigger>
              <SelectContent>
                {children.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card><CardContent className="pt-5 flex items-center justify-between">
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{t("Upcoming Exams")}</p><p className="text-2xl font-bold">{upcoming.length}</p></div>
          <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><CalendarDays className="h-4 w-4" /></span>
        </CardContent></Card>
        <Card><CardContent className="pt-5 flex items-center justify-between">
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{t("Results Recorded")}</p><p className="text-2xl font-bold">{recorded.length}</p></div>
          <span className="h-9 w-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><BookOpen className="h-4 w-4" /></span>
        </CardContent></Card>
        <Card><CardContent className="pt-5 flex items-center justify-between">
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{t("Average Score")}</p><p className="text-2xl font-bold">{avg}%</p></div>
          <span className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><TrendingUp className="h-4 w-4" /></span>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {t("Exam Schedule")}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Exam")}</TableHead>
                <TableHead>{t("Subject")}</TableHead>
                <TableHead>{t("Date")}</TableHead>
                <TableHead>{t("Type")}</TableHead>
                <TableHead className="text-right">{t("Total")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcoming.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell>{e.subject_name || "—"}</TableCell>
                  <TableCell>{dateOf(e)}</TableCell>
                  <TableCell className="capitalize">{e.type || "—"}</TableCell>
                  <TableCell className="text-right">{e.total_marks ?? "—"}</TableCell>
                </TableRow>
              ))}
              {upcoming.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">{t("No upcoming exams")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4" /> {t("Results")}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Exam")}</TableHead>
                <TableHead>{t("Subject")}</TableHead>
                <TableHead>{t("Date")}</TableHead>
                <TableHead className="text-right">{t("Marks")}</TableHead>
                <TableHead className="text-right">{t("Percent")}</TableHead>
                <TableHead className="text-right">{t("Grade")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recorded.map((g) => {
                const pct = pctOf(g);
                const letter = g.grade_letter || gradeLetter(pct);
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.exam_name || g.name || "—"}</TableCell>
                    <TableCell>{g.subject_name || "—"}</TableCell>
                    <TableCell>{String(g.exam_date || "").slice(0, 10) || "—"}</TableCell>
                    <TableCell className="text-right">{g.marks ?? g.score} / {g.total_marks ?? "—"}</TableCell>
                    <TableCell className="text-right">{pct}%</TableCell>
                    <TableCell className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${toneFor(pct)}`}>{letter}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {recorded.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">{t("No results published yet")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {past.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("Past exams")}: {past.length}
        </p>
      )}
    </div>
  );
}
