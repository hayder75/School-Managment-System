import { useMemo, useState } from "react";
import { useClassResults } from "../../hooks/useReports";
import { useAssessmentTypes } from "../../hooks/useExams";
import { useI18n } from "../../i18n/I18nContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { classes as sev, percentSeverity } from "../../lib/gradeColors";
import Chips from "../ui/chips";
import { FileSpreadsheet, Printer, Play, RotateCcw, Award } from "lucide-react";

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function fullName(r) {
  return [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(" ");
}

export default function ClassResultsReport({ scopedClasses = [], isTeacher = false }) {
  const { t } = useI18n();
  const { data: typeData } = useAssessmentTypes();
  const types = typeData?.data || [];

  const [classIds, setClassIds] = useState(() => (scopedClasses[0] ? [scopedClasses[0].id] : []));
  const [subjectIds, setSubjectIds] = useState([]);
  const [typeCodes, setTypeCodes] = useState([]);
  const [from, setFrom] = useState(isoDaysAgo(180));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [run, setRun] = useState(false);
  const [subjectTab, setSubjectTab] = useState("all");
  const [view, setView] = useState("byTest");

  const params = useMemo(() => ({
    ...(classIds.length ? { class_id: classIds.join(",") } : {}),
    ...(subjectIds.length ? { subject_id: subjectIds.join(",") } : {}),
    ...(typeCodes.length ? { types: typeCodes.join(",") } : {}),
    from_date: from || undefined,
    to_date: to || undefined,
  }), [classIds, subjectIds, typeCodes, from, to]);

  const { data, isLoading, isFetching } = useClassResults(params, { enabled: run && classIds.length > 0 });
  const report = data?.data;

  const subjects = report?.subjects || [];
  const shownSubjects = subjectTab === "all" ? subjects : subjects.filter((s) => s.subject_id === subjectTab);

  const kpis = useMemo(() => {
    const overall = report?.overall || [];
    const graded = overall.filter((r) => r.percent != null);
    const avg = graded.length ? graded.reduce((s, r) => s + r.percent, 0) / graded.length : null;
    const pass = graded.length ? graded.filter((r) => r.passed).length : 0;
    return {
      students: overall.length,
      subjects: subjects.length,
      exams: report?.exams?.length || 0,
      average: avg == null ? null : Math.round(avg * 10) / 10,
      pass_rate: graded.length ? Math.round((pass / graded.length) * 100) : null,
    };
  }, [report]);

  const exportUrl = useMemo(() => {
    const qs = new URLSearchParams(params).toString();
    return `/api/reports/class-results/export${qs ? `?${qs}` : ""}`;
  }, [params]);

  function toggleAllClasses() {
    setClassIds(classIds.length === scopedClasses.length ? [] : scopedClasses.map((c) => c.id));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("Class result sheet")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("Every test, project, quiz, midterm and final for the classes you pick — per student, with ranks and pass/fail.")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("Classes")}</Label>
              {scopedClasses.length > 1 && (
                <button type="button" className="text-xs text-primary underline" onClick={toggleAllClasses}>
                  {classIds.length === scopedClasses.length ? t("Clear") : t("All classes")}
                </button>
              )}
            </div>
            <Chips
              options={scopedClasses.map((c) => ({ value: c.id, label: c.name }))}
              value={classIds}
              onChange={setClassIds}
              emptyLabel={t("No classes available")}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("From")}</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("To")}</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{t("Assessment types")} <span className="text-muted-foreground">({t("all if none picked")})</span></Label>
            <Chips
              options={types.map((ty) => ({ value: ty.code, label: ty.name }))}
              value={typeCodes}
              onChange={setTypeCodes}
              emptyLabel={t("No types")}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setRun(true)} disabled={!classIds.length || isFetching}>
              <Play className="h-4 w-4 mr-1" /> {isFetching ? t("Loading...") : t("Run report")}
            </Button>
            <Button variant="outline" onClick={() => { setSubjectIds([]); setTypeCodes([]); setFrom(isoDaysAgo(180)); setTo(new Date().toISOString().slice(0, 10)); setRun(true); }}>
              <RotateCcw className="h-4 w-4 mr-1" /> {t("Reset")}
            </Button>
            <Button variant="outline" disabled={!report} onClick={() => window.open(exportUrl, "_blank")}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> {t("Excel")}
            </Button>
            <Button variant="outline" disabled={!report} onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> {t("Print")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!run && (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t("Pick the classes you want and press Run report.")}
        </p>
      )}

      {run && isLoading && <p className="text-sm text-muted-foreground">{t("Loading...")}</p>}

      {run && report && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Card><CardContent className="pt-4"><p className="text-2xl font-bold">{kpis.students}</p><p className="text-xs text-muted-foreground">{t("Students")}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-2xl font-bold">{kpis.subjects}</p><p className="text-xs text-muted-foreground">{t("Subjects")}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-2xl font-bold">{kpis.exams}</p><p className="text-xs text-muted-foreground">{t("Assessments")}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className={`text-2xl font-bold ${sev(percentSeverity(kpis.average, { warn: 50, good: 75 })).text}`}>{kpis.average ?? "—"}{kpis.average != null ? "%" : ""}</p><p className="text-xs text-muted-foreground">{t("Average")}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className={`text-2xl font-bold ${sev(percentSeverity(kpis.pass_rate, { warn: 60, good: 85 })).text}`}>{kpis.pass_rate ?? "—"}{kpis.pass_rate != null ? "%" : ""}</p><p className="text-xs text-muted-foreground">{t("Pass rate")}</p></CardContent></Card>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={view === "byTest" ? "default" : "outline"} onClick={() => setView("byTest")}>{t("By test")}</Button>
            <Button size="sm" variant={view === "byStudent" ? "default" : "outline"} onClick={() => setView("byStudent")}>{t("By student")}</Button>
          </div>

          {view === "byStudent" && (<>
          {subjects.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={subjectTab === "all" ? "default" : "outline"} onClick={() => setSubjectTab("all")}>{t("All subjects")}</Button>
              {subjects.map((s) => (
                <Button key={s.subject_id} size="sm" variant={subjectTab === s.subject_id ? "default" : "outline"} onClick={() => setSubjectTab(s.subject_id)}>
                  {s.subject_name}
                </Button>
              ))}
            </div>
          )}

          {shownSubjects.map((subj) => (
            <Card key={subj.subject_id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{subj.subject_name}</CardTitle>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{subj.students.length} {t("students")}</span>
                    {subj.summary?.average != null && <span>{t("average")} {subj.summary.average}%</span>}
                    {subj.summary?.pass_rate != null && <span>{t("pass")} {subj.summary.pass_rate}%</span>}
                    <span>{subj.exams.length} {t("assessments")}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="p-2 font-medium sticky left-0 bg-muted/50">{t("Student")}</th>
                        <th className="p-2 font-medium">{t("ID")}</th>
                        {subj.exams.map((e) => (
                          <th key={e.id} className="p-2 font-medium whitespace-nowrap">
                            <span className="block">{e.name}</span>
                            <span className="block text-[10px] font-normal text-muted-foreground">
                              {e.type} · /{e.total_marks ?? "—"}
                            </span>
                          </th>
                        ))}
                        <th className="p-2 font-medium">{t("%")}</th>
                        <th className="p-2 font-medium">{t("Grade")}</th>
                        <th className="p-2 font-medium">{t("Rank")}</th>
                        <th className="p-2 font-medium">{t("Result")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subj.students.map((r) => {
                        const key = r.percent == null ? "neutral" : r.passed ? "good" : "danger";
                        return (
                          <tr key={r.student_id} className={`border-b ${key === "danger" ? sev("danger").bg : ""}`}>
                            <td className="p-2 font-medium sticky left-0 bg-background">{fullName(r)}</td>
                            <td className="p-2 text-xs text-muted-foreground">{r.student_number}</td>
                            {subj.exams.map((e) => {
                              const m = r.marks.find((x) => x.exam_id === e.id);
                              const total = Number(e.total_marks || 0);
                              const bad = m?.marks != null && total > 0 && Number(m.marks) > total;
                              return (
                                <td key={e.id} className={`p-2 ${bad ? `${sev("danger").text} font-bold` : ""}`}>
                                  {m?.marks ?? "—"}
                                </td>
                              );
                            })}
                            <td className={`p-2 font-semibold ${sev(key === "good" ? "good" : key === "danger" ? "danger" : "neutral").text}`}>
                              {r.percent != null ? `${r.percent}%` : "—"}
                            </td>
                            <td className="p-2">{r.grade_letter || "—"}</td>
                            <td className="p-2">{r.rank ?? "—"}</td>
                            <td className="p-2">
                              {r.passed == null ? "—" : (
                                <Badge className={sev(r.passed ? "good" : "danger").badge}>{r.passed ? t("Pass") : t("Fail")}</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
          </>)}

          {view === "byTest" && (
            (report.exam_breakdown || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("No assessments found for those filters.")}</p>
            ) : (report.exam_breakdown || []).map((b) => (
              <Card key={`${b.exam_id}:${b.class_id}`}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      {b.exam_name}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {b.class_name} · {b.subject_name} · /{b.total_marks ?? "—"} · {t("pass")} {b.pass_marks ?? "—"}
                      </span>
                    </CardTitle>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{b.stats.sat}/{b.stats.total_students} {t("entered")}</span>
                      <span>{t("average")} {b.stats.average ?? "—"}</span>
                      <span>{t("highest")} {b.stats.highest ?? "—"}</span>
                      <span>{t("lowest")} {b.stats.lowest ?? "—"}</span>
                      <span className={sev(percentSeverity(b.stats.pass_rate, { warn: 60, good: 85 })).text}>
                        {t("pass")} {b.stats.pass_rate ?? 0}%
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[420px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b text-left">
                          <th className="p-2 font-medium">{t("Rank")}</th>
                          <th className="p-2 font-medium">{t("Student")}</th>
                          <th className="p-2 font-medium">{t("ID")}</th>
                          <th className="p-2 font-medium">{t("Mark")}</th>
                          <th className="p-2 font-medium">{t("%")}</th>
                          <th className="p-2 font-medium">{t("Grade")}</th>
                          <th className="p-2 font-medium">{t("Result")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.students.map((st) => {
                          const danger = st.marks != null && (st.exceeded || st.passed === false);
                          const good = st.marks != null && st.passed === true;
                          return (
                            <tr key={st.student_id} className={`border-b ${danger ? sev("danger").bg : ""}`}>
                              <td className="p-2">{st.rank ?? "—"}</td>
                              <td className="p-2 font-medium">{fullName(st)}</td>
                              <td className="p-2 text-xs text-muted-foreground">{st.student_number || "—"}</td>
                              <td className={`p-2 font-semibold ${danger ? sev("danger").text : good ? sev("good").text : ""}`}>
                                {st.marks ?? "—"} <span className="text-xs font-normal text-muted-foreground">/{b.total_marks ?? "—"}</span>
                              </td>
                              <td className="p-2">{st.percent != null ? `${st.percent}%` : "—"}</td>
                              <td className="p-2">{st.grade_letter || "—"}</td>
                              <td className="p-2">
                                {st.passed == null ? "—" : (
                                  <Badge className={sev(st.passed ? "good" : "danger").badge}>{st.passed ? t("Pass") : t("Fail")}</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {report.exam_analysis?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{t("Assessment analysis")}</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="p-2 font-medium">{t("Assessment")}</th>
                        <th className="p-2 font-medium">{t("Subject")}</th>
                        <th className="p-2 font-medium">{t("Date")}</th>
                        <th className="p-2 font-medium">{t("Sat")}</th>
                        <th className="p-2 font-medium">{t("Average")}</th>
                        <th className="p-2 font-medium">{t("Highest")}</th>
                        <th className="p-2 font-medium">{t("Lowest")}</th>
                        <th className="p-2 font-medium">{t("Pass rate")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.exam_analysis.map((e) => (
                        <tr key={e.exam_id} className="border-b">
                          <td className="p-2">
                            <span className="font-medium">{e.name}</span>
                            <span className="block text-[10px] text-muted-foreground">{e.type} · /{e.total_marks ?? "—"}</span>
                          </td>
                          <td className="p-2">{e.subject_name || "—"}</td>
                          <td className="p-2 text-xs text-muted-foreground">{e.date ? String(e.date).slice(0, 10) : "—"}</td>
                          <td className="p-2">{e.sat}</td>
                          <td className="p-2">{e.average ?? "—"}{e.average_percent != null ? ` (${e.average_percent}%)` : ""}</td>
                          <td className="p-2">{e.highest ?? "—"}</td>
                          <td className="p-2">{e.lowest ?? "—"}</td>
                          <td className={`p-2 font-medium ${sev(percentSeverity(e.pass_rate, { warn: 60, good: 85 })).text}`}>
                            {e.pass_rate != null ? `${e.pass_rate}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {report.overall?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base"><Award className="inline h-4 w-4 mr-1" />{t("Overall ranking")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="p-2 font-medium">#</th>
                        <th className="p-2 font-medium">{t("Student")}</th>
                        <th className="p-2 font-medium">{t("Class")}</th>
                        <th className="p-2 font-medium">{t("Subjects")}</th>
                        <th className="p-2 font-medium">{t("Average")}</th>
                        <th className="p-2 font-medium">{t("Grade")}</th>
                        <th className="p-2 font-medium">{t("Result")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.overall.map((r, i) => {
                        const key = r.percent == null ? "neutral" : r.passed ? "good" : "danger";
                        return (
                          <tr key={r.student_id} className="border-b">
                            <td className="p-2 font-bold">{i + 1}</td>
                            <td className="p-2 font-medium">{fullName(r)}</td>
                            <td className="p-2 text-xs">{r.class_name}</td>
                            <td className="p-2">{r.subjects_count}</td>
                            <td className={`p-2 font-semibold ${sev(key).text}`}>{r.percent != null ? `${r.percent}%` : "—"}</td>
                            <td className="p-2">{r.grade_letter || "—"}</td>
                            <td className="p-2">
                              {r.passed == null ? "—" : <Badge className={sev(r.passed ? "good" : "danger").badge}>{r.passed ? t("Pass") : t("Fail")}</Badge>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {report.subjects?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("No assessments found for those filters.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
