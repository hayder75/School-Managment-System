import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import {
  useExams, useCreateExam, useUpdateExam, useAssessmentTypes, useGradingScheme, useExamSections,
} from "../hooks/useExams";
import { useResultList, useEditRequests } from "../hooks/useResults";
import { useClasses } from "../hooks/useClasses";
import { useSubjects } from "../hooks/useSubjects";
import { useTeacherAssignments } from "../hooks/useTeachers";
import { useI18n } from "../i18n/I18nContext";
import { EthiopianDate } from "../components/ui/EthiopianDate";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import GradeEntry from "../components/exams/GradeEntry";
import ExamDialog from "../components/exams/ExamDialog";
import AssessmentTypesDialog from "../components/exams/AssessmentTypesDialog";
import EditRequestsDialog from "../components/exams/EditRequestsDialog";
import DeleteExamDialog from "../components/exams/DeleteExamDialog";
import ExcelButton from "../components/reports/ExcelButton";
import { classes as sev, statusSeverity } from "../lib/gradeColors";
import { Plus, Trash2, Edit3, Settings2, ClipboardCheck, Search, Archive, Download } from "lucide-react";

const STATUS_LABEL = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  returned: "Returned",
  editing: "Editing",
};

function aggregateStatus(rows) {
  if (!rows?.length) return "draft";
  const statuses = rows.map((r) => r.status);
  if (statuses.every((s) => s === "approved")) return "approved";
  if (statuses.some((s) => s === "submitted")) return "submitted";
  if (statuses.some((s) => s === "returned")) return "returned";
  if (statuses.some((s) => s === "editing")) return "editing";
  return "draft";
}

export default function ExamsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isTeacher = role === "teacher";
  const isUnitLeader = role === "Unit Leader";
  const isOwner = role === "owner";
  const isAdmin = ["owner", "admin"].includes(role);
  const canReview = ["owner", "admin", "quality_director", "principal", "vice_principal", "general_manager"].includes(role);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [editExam, setEditExam] = useState(null);
  const [deleteExam, setDeleteExam] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [downloadExam, setDownloadExam] = useState(null);

  const { data, isLoading } = useExams({
    page,
    limit: 20,
    type: typeFilter || undefined,
    class_id: classFilter || undefined,
    include_archived: showArchived ? "true" : undefined,
  });
  const { data: classesData } = useClasses({ limit: 200 });
  const { data: subjectsData } = useSubjects({ limit: 200 });
  const { data: assignmentsData } = useTeacherAssignments(isTeacher ? user?.id : null);
  const { data: typesData } = useAssessmentTypes({ include_inactive: false });
  const { data: schemeData } = useGradingScheme();
  const { data: resultsData } = useResultList({ status: "all" }, { enabled: !["student", "parent"].includes(role) });
  const { data: pendingRequests } = useEditRequests({ status: "pending" }, { enabled: canReview });

  const createExam = useCreateExam();
  const updateExam = useUpdateExam();

  const exams = data?.data || [];
  const meta = data?.meta || {};
  const allClasses = classesData?.data || [];
  const allSubjects = subjectsData?.data || [];
  const assignments = assignmentsData?.data || [];
  const types = typesData?.data || [];
  const scheme = schemeData?.data?.scheme || null;
  const mode = scheme?.mode || "raw";
  const typeMap = useMemo(() => Object.fromEntries(types.map((ty) => [ty.code, ty])), [types]);

  const resultsByExam = useMemo(() => {
    const map = {};
    for (const r of resultsData?.data || []) {
      (map[r.exam_id] = map[r.exam_id] || []).push(r);
    }
    return map;
  }, [resultsData]);

  const pendingCount = (pendingRequests?.data || []).length;
  const selectedExam = exams.find((e) => e.id === selectedExamId) || null;
  const { data: selectedSections } = useExamSections(selectedExamId, { enabled: !!selectedExamId });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exams;
    return exams.filter((e) =>
      String(e.name || "").toLowerCase().includes(q)
      || String(e.subject_name || "").toLowerCase().includes(q)
      || String(e.type || "").toLowerCase().includes(q)
      || String(e.class_name || "").toLowerCase().includes(q)
    );
  }, [exams, search]);

  function classNames(exam) {
    const ids = Array.isArray(exam.class_ids) && exam.class_ids.length ? exam.class_ids : (exam.class_id ? [exam.class_id] : []);
    const names = ids.map((cid) => allClasses.find((c) => c.id === cid)?.name).filter(Boolean);
    return names.length ? names.join(", ") : (exam.class_name || "—");
  }

  async function handleCreate(payload) {
    await createExam.mutateAsync(payload);
  }

  async function handleUpdate(payload) {
    await updateExam.mutateAsync({ id: editExam.id, ...payload });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("Exams & Grades")}</h1>
          <p className="text-muted-foreground">{t("Create exams, enter marks and send them for approval")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExcelButton
            filename="exams"
            disabled={!filtered.length}
            sheets={[{
              name: "Exams",
              columns: [
                { key: "name", label: "Exam" },
                { key: "type", label: "Type", value: (r) => typeMap[r.type]?.name || r.type },
                { key: "class_names", label: "Classes", value: (r) => classNames(r) },
                { key: "subject_name", label: "Subject" },
                { key: "date", label: "Date", value: (r) => (r.date ? String(r.date).slice(0, 10) : "") },
                { key: "total_marks", label: "Total" },
                { key: "pass_marks", label: "Pass" },
                { key: "approval", label: "Approval", value: (r) => STATUS_LABEL[aggregateStatus(resultsByExam[r.id])] || "Draft" },
              ],
              rows: filtered,
            }]}
          />
          {canReview && (
            <Button variant="outline" onClick={() => setRequestsOpen(true)} className="relative">
              <ClipboardCheck className="h-4 w-4 mr-2" /> {t("Edit requests")}
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-amber-950">
                  {pendingCount}
                </span>
              )}
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" onClick={() => setTypesOpen(true)}>
              <Settings2 className="h-4 w-4 mr-2" /> {t("Assessment types")}
            </Button>
          )}
          {!isUnitLeader && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> {t("New Exam")}
            </Button>
          )}
        </div>
      </div>

      {mode === "weighted" && scheme?.components?.length > 0 && (
        <div className={`rounded-md border p-3 text-xs ${sev("info").bg} ${sev("info").border} ${sev("info").text}`}>
          {t("Term mark scheme")}: {scheme.components.map((c) => {
            const ty = typeMap[c.type_code];
            return `${ty?.name || c.type_code} ${c.weight_pct}%`;
          }).join(" · ")}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{showArchived ? t("Archived exams") : t("Exams")}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search exams...")}
                name="exam-search"
                autoComplete="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                className="pl-9 w-full sm:w-56"
              />
            </div>
            <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder={t("All types")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All types")}</SelectItem>
                {types.map((ty) => <SelectItem key={ty.code} value={ty.code}>{ty.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={classFilter || "all"} onValueChange={(v) => setClassFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder={t("All classes")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All classes")}</SelectItem>
                {allClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {isOwner && (
              <Button variant={showArchived ? "default" : "outline"} size="sm" onClick={() => setShowArchived((v) => !v)}>
                <Archive className="h-4 w-4 mr-1" /> {t("Archived")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">{t("Loading...")}</p>
          ) : (
            <>
              <div className="overflow-x-auto -mx-px">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Name")}</TableHead>
                      <TableHead>{t("Type")}</TableHead>
                      <TableHead>{t("Class")}</TableHead>
                      <TableHead>{t("Subject")}</TableHead>
                      <TableHead>{t("Date")}</TableHead>
                      <TableHead>{t("Marks")}</TableHead>
                      <TableHead>{t("Approval")}</TableHead>
                      <TableHead className="w-28"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((exam) => {
                      const aggregate = aggregateStatus(resultsByExam[exam.id]);
                      const ty = typeMap[exam.type];
                      return (
                        <TableRow key={exam.id} className={exam.archived_at ? "opacity-60" : undefined}>
                          <TableCell className="font-medium">
                            {exam.name}
                            {exam.archived_at && <Badge variant="outline" className="ml-2 text-[10px]">{t("Archived")}</Badge>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{ty?.name || exam.type}</Badge>
                          </TableCell>
                          <TableCell>{classNames(exam)}</TableCell>
                          <TableCell>{exam.subject_name}</TableCell>
                          <TableCell><EthiopianDate date={exam.date} /></TableCell>
                          <TableCell>
                            <span className="text-sm">{exam.total_marks ?? "—"}</span>
                            {exam.pass_marks != null && (
                              <span className="block text-[11px] text-muted-foreground">{t("pass")} {exam.pass_marks}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={sev(statusSeverity(aggregate)).badge}>
                              {t(STATUS_LABEL[aggregate] || aggregate)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title={isUnitLeader ? t("View details") : t("Enter grades")}
                                onClick={() => {
                                  if (isUnitLeader) navigate(`/exams/${exam.id}`);
                                  else setSelectedExamId(selectedExam?.id === exam.id ? null : exam.id);
                                }}
                              >
                                {isUnitLeader ? <Search className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                              </Button>
                              {(isAdmin || isTeacher) && !exam.archived_at && (
                                <Button variant="ghost" size="icon" title={t("Edit exam")} onClick={() => setEditExam(exam)}>
                                  <Settings2 className="h-4 w-4" />
                                </Button>
                              )}
                              {isOwner && (
                                <Button variant="ghost" size="icon" title={t("Archive or delete")} onClick={() => setDeleteExam(exam)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                              {isUnitLeader && (
                                <Button variant="ghost" size="icon" title={t("Download class report")} onClick={() => setDownloadExam(exam)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">{t("No exams found")}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">{t("Page")} {meta.page} {t("of")} {meta.totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t("Previous")}</Button>
                    <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>{t("Next")}</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedExam && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {selectedExam.name}
              {selectedSections?.data?.length > 1 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {selectedSections.data.length} {t("sections")}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GradeEntry exam={selectedExam} readOnly={isUnitLeader} />
          </CardContent>
        </Card>
      )}

      <ExamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        types={types}
        allClasses={allClasses}
        subjects={allSubjects}
        assignments={assignments}
        isTeacher={isTeacher}
        mode={mode}
        scheme={scheme}
        onSubmit={handleCreate}
        saving={createExam.isPending}
      />

      <ExamDialog
        open={!!editExam}
        onOpenChange={(o) => !o && setEditExam(null)}
        exam={editExam}
        types={types}
        allClasses={allClasses}
        subjects={allSubjects}
        assignments={assignments}
        isTeacher={isTeacher}
        mode={mode}
        scheme={scheme}
        onSubmit={handleUpdate}
        saving={updateExam.isPending}
      />

      <AssessmentTypesDialog open={typesOpen} onOpenChange={setTypesOpen} />
      <EditRequestsDialog open={requestsOpen} onOpenChange={setRequestsOpen} />
      <DeleteExamDialog
        open={!!deleteExam}
        onOpenChange={(o) => !o && setDeleteExam(null)}
        exam={deleteExam}
        onDone={() => setDeleteExam(null)}
      />

      <Dialog open={!!downloadExam} onOpenChange={(o) => !o && setDownloadExam(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("Download report")}</DialogTitle></DialogHeader>
          {downloadExam && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {downloadExam.name} · {downloadExam.subject_name}
              </p>
              {(() => {
                const ids = Array.isArray(downloadExam.class_ids) && downloadExam.class_ids.length
                  ? downloadExam.class_ids
                  : (downloadExam.class_id ? [downloadExam.class_id] : []);
                if (!ids.length) {
                  return <p className="text-sm text-muted-foreground">{t("No class attached to this exam.")}</p>;
                }
                return ids.map((cid) => {
                  const cls = allClasses.find((c) => c.id === cid);
                  return (
                    <Button
                      key={cid}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        window.open(`/api/reports/class-results/export?exam_id=${downloadExam.id}&class_id=${cid}`, "_blank");
                        setDownloadExam(null);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" /> {cls?.name || cid}
                    </Button>
                  );
                });
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
