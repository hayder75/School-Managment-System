import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { useI18n } from "../i18n/I18nContext";
import { useAuthStore } from "../store/auth";
import { useMarkSheetOverview } from "../hooks/useMarkSheets";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Clock, Users } from "lucide-react";
import MarkSheetGrid from "../components/marks/MarkSheetGrid";
import { levelLabel } from "../lib/levels";

const STATUS = {
  not_started: { label: "Not started", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  draft: { label: "Draft", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  submitted: { label: "Waiting for approval", cls: "bg-blue-50 text-blue-800 border-blue-200" },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  returned: { label: "Sent back", cls: "bg-rose-50 text-rose-800 border-rose-200" },
};

function StatusBadge({ status }) {
  const { t } = useI18n();
  const s = STATUS[status] || STATUS.not_started;
  return <Badge className={`border ${s.cls}`}>{t(s.label)}</Badge>;
}

export default function MarkSheetsPage() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const { data: termsRes } = useQuery({
    queryKey: ["terms-list"],
    queryFn: () => api.get("/academics/terms"),
  });
  const terms = termsRes?.data || [];
  const [searchParams] = useSearchParams();
  const [termId, setTermId] = useState(searchParams.get("term_id") || "");
  useEffect(() => {
    if (!termId && terms.length) {
      const semester = terms.find((x) => String(x.name || "").toLowerCase().includes("semester"));
      setTermId((semester || terms[0]).id);
    }
  }, [terms, termId]);

  const { data: overviewRes, isLoading } = useMarkSheetOverview(termId);
  const classes = overviewRes?.data?.classes || [];
  const [classId, setClassId] = useState(searchParams.get("class_id") || "");
  const [subjectId, setSubjectId] = useState(searchParams.get("subject_id") || "");

  const selectedClass = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);
  const selectedSubject = useMemo(
    () => (selectedClass?.subjects || []).find((s) => s.subject_id === subjectId),
    [selectedClass, subjectId]
  );

  if (classId && subjectId && termId) {
    return (
      <MarkSheetGrid
        classId={classId}
        subjectId={subjectId}
        termId={termId}
        onBack={() => setSubjectId("")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("Mark Sheets")}</h1>
          <p className="text-muted-foreground">
            {t("Enter marks for a class and subject. Reading, writing and speaking appear for language subjects.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={termId} onValueChange={(v) => { setTermId(v); setClassId(""); setSubjectId(""); }}>
            <SelectTrigger className="w-56"><SelectValue placeholder={t("Select term")} /></SelectTrigger>
            <SelectContent>
              {terms.map((tm) => (
                <SelectItem key={tm.id} value={tm.id}>
                  {tm.name}{tm.period_type ? ` · ${t(tm.period_type === "quarter" ? "Quarter" : "Semester")}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!termId ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">{t("Create a semester or quarter in Settings first.")}</CardContent></Card>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">{t("Loading classes...")}</p>
      ) : !selectedClass ? (
        <>
          {!classes.length ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              {t("No classes or subjects are assigned to you yet.")}
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {classes.map((c) => {
                const total = c.subjects.length;
                const done = c.subjects.filter((s) => s.status === "approved").length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setClassId(c.id)}
                    className="text-left rounded-lg border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {levelLabel(c.level_group, c.grade_level)}
                          {c.homeroom_teacher ? ` · ${c.homeroom_teacher}` : ""}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c.students}</span>
                      <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {total} {t("subjects")}</span>
                      {total > 0 && <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {done}/{total}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setClassId(""); setSubjectId(""); }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> {t("All classes")}
              </Button>
              <div>
                <h2 className="text-xl font-bold">{selectedClass.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {levelLabel(selectedClass.level_group, selectedClass.grade_level)}
                  {selectedClass.homeroom_teacher ? ` · ${selectedClass.homeroom_teacher}` : ""}
                  {` · ${selectedClass.students} ${t("students")}`}
                </p>
              </div>
            </div>
          </div>

          {!selectedClass.subjects.length ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              {t("No subjects are assigned to this class yet.")}
            </CardContent></Card>
          ) : (
            <div className="grid gap-2">
              {selectedClass.subjects.map((s) => (
                <button
                  key={s.subject_id}
                  type="button"
                  onClick={() => setSubjectId(s.subject_id)}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-left hover:border-primary/50 hover:shadow-sm transition"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {s.name}
                      {s.has_language_skills && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {t("Reading / Writing")}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.teacher_name ? `${t("Teacher")}: ${s.teacher_name}` : t("Unassigned teacher")}
                      {` · ${s.entered}/${s.students} ${t("started")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={s.status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {t("Draft")}</span>
        <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {t("Approved")}</span>
        <span>{t("Only you and the approved reviewers can see your draft.")}</span>
      </div>
    </div>
  );
}
