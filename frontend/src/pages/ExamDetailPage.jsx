import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useExam } from "../hooks/useExams";
import { useExamClasses, useExamGrades } from "../hooks/useGrades";
import { useExamSections } from "../hooks/useExams";
import { useAuthStore } from "../store/auth";
import { useI18n } from "../i18n/I18nContext";
import { EthiopianDate } from "../components/ui/EthiopianDate";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { classes as sev, markSeverity, statusSeverity } from "../lib/gradeColors";
import { ArrowLeft, Download, ShieldCheck, Lock, Users } from "lucide-react";

const STATUS_LABEL = {
  draft: "Draft",
  submitted: "Waiting",
  approved: "Approved",
  returned: "Sent back",
  editing: "Editing",
};

export default function ExamDetailPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { examId } = useParams();
  const user = useAuthStore((s) => s.user);
  const { data: examData, isLoading: loadingExam } = useExam(examId);
  const exam = examData?.data;
  const { data: classesData, isLoading: loadingClasses } = useExamClasses(examId);
  const { data: sectionsData } = useExamSections(examId);
  const classes = classesData?.data || [];
  const sections = sectionsData?.data || [];
  const sectionMap = useMemo(
    () => Object.fromEntries(sections.map((s) => [s.class_id, s])),
    [sections]
  );

  const [classId, setClassId] = useState("");
  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id);
  }, [classes, classId]);

  const { data: gradesData, isLoading: loadingGrades } = useExamGrades(examId, classId || undefined);
  const records = gradesData?.data || [];
  const meta = gradesData?.meta || {};
  const section = sectionMap[classId];
  const status = meta.status || section?.status || "draft";
  const totalMarks = exam?.total_marks != null ? Number(exam.total_marks) : null;
  const passMarks = exam?.pass_marks != null ? Number(exam.pass_marks) : null;
  const selectedClass = classes.find((c) => c.id === classId);

  if (loadingExam) {
    return <p className="text-muted-foreground">{t("Loading...")}</p>;
  }
  if (!exam) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("Exam not found.")}
        </CardContent>
      </Card>
    );
  }

  const graded = records.filter((r) => r.marks_obtained != null).length;
  const readOnly = ["Unit Leader"].includes(user?.role);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/exams")} className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("Back to exams")}
          </Button>
          <h1 className="text-2xl font-bold">{exam.name}</h1>
          <p className="text-sm text-muted-foreground">
            {exam.subject_name} · {exam.type} · <EthiopianDate date={exam.date} /> · /{totalMarks ?? "—"}
            {passMarks != null ? ` · ${t("pass")} ${passMarks}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {readOnly && (
            <Badge className={sev("info").badge}>
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> {t("View only")}
            </Badge>
          )}
          {classId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/reports/class-results/export?exam_id=${exam.id}&class_id=${classId}`, "_blank")}
            >
              <Download className="h-4 w-4 mr-1" /> {t("Download class report")}
            </Button>
          )}
        </div>
      </div>

      {classes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {classes.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={classId === c.id ? "default" : "outline"}
              onClick={() => setClassId(c.id)}
              className="gap-1"
            >
              {c.name}
              <span
                className={`inline-block h-2 w-2 rounded-full ${sev(statusSeverity(sectionMap[c.id]?.status || "draft")).dot}`}
              />
            </Button>
          ))}
        </div>
      )}

      {selectedClass && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium">{selectedClass.name}</span>
          <Badge className={sev(statusSeverity(status)).badge}>{t(STATUS_LABEL[status] || status)}</Badge>
          {section?.reviewer_name && (
            <span className="text-muted-foreground">{t("Reviewed by")} {section.reviewer_name}</span>
          )}
          <span className="text-muted-foreground inline-flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" />
            {readOnly ? t("Read-only") : t("Marks are managed by the teacher / QA")}
          </span>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> {t("Student marks")}
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {t("Graded")} {graded}/{records.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingClasses || loadingGrades ? (
            <p className="p-6 text-sm text-muted-foreground">{t("Loading...")}</p>
          ) : !classes.length ? (
            <p className="p-6 text-sm text-muted-foreground">{t("No sections available.")}</p>
          ) : records.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("No students in this section.")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t("Student")}</TableHead>
                    <TableHead>{t("Student #")}</TableHead>
                    <TableHead className="text-right">{t("Marks")}</TableHead>
                    <TableHead className="text-right">{t("%")}</TableHead>
                    <TableHead>{t("Grade")}</TableHead>
                    <TableHead>{t("Result")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r, i) => {
                    const marks = r.marks_obtained == null ? null : Number(r.marks_obtained);
                    const percent = marks != null && totalMarks ? Math.round((marks / totalMarks) * 1000) / 10 : null;
                    const sevKey = markSeverity(marks, totalMarks, passMarks);
                    const passed = marks == null || passMarks == null ? null : marks >= passMarks;
                    return (
                      <TableRow key={r.student_id} className={sevKey === "danger" ? sev("danger").bg : ""}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">
                          {[r.first_name, r.middle_name, r.last_name].filter(Boolean).join(" ")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.student_number || "—"}</TableCell>
                        <TableCell className={`text-right font-semibold ${sev(sevKey === "danger" ? "danger" : sevKey === "good" ? "good" : "neutral").text}`}>
                          {marks ?? "—"}{marks != null ? ` / ${totalMarks ?? "—"}` : ""}
                        </TableCell>
                        <TableCell className="text-right">{percent == null ? "—" : `${percent}%`}</TableCell>
                        <TableCell>{r.grade_letter || "—"}</TableCell>
                        <TableCell>
                          {passed == null ? "—" : (
                            <Badge className={sev(passed ? "good" : "danger").badge}>
                              {passed ? t("Pass") : t("Fail")}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
