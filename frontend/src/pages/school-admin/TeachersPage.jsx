import { fullName } from "../../lib/fullName";
import { useState } from "react";
import { useDebouncedValue } from "../../hooks/useDebounce";
import { useTeachers, useTeacherAssignments, useAssignSubjectsBulk, useRemoveAssignment } from "../../hooks/useTeachers";
import StaffEditDialog from "../../components/staff/StaffEditDialog";
import { useClasses } from "../../hooks/useClasses";
import { useSubjects } from "../../hooks/useSubjects";
import { useToast } from "../../store/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Label } from "../../components/ui/label";
import { Plus, Trash2, BookOpen, Pencil } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

function CheckList({ title, items, labelOf, selected, setSelected, search, setSearch, placeholder }) {
  const { t } = useI18n();
  const filtered = items.filter((i) => labelOf(i).toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <div className="flex gap-1">
          <Button
            type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs"
            onClick={() => setSelected([...new Set([...selected, ...filtered.map((i) => i.id)])])}
          >{t("Select all")}</Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelected([])}>{t("Clear")}</Button>
        </div>
      </div>
      <Input className="h-8" placeholder={placeholder} value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="rounded-md border max-h-56 overflow-y-auto divide-y">
        {filtered.map((i) => (
          <label key={i.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={selected.includes(i.id)}
              onChange={() => setSelected(selected.includes(i.id) ? selected.filter((x) => x !== i.id) : [...selected, i.id])}
            />
            <span>{labelOf(i)}</span>
          </label>
        ))}
        {filtered.length === 0 && <p className="p-3 text-xs text-muted-foreground">{t("No results")}</p>}
      </div>
      <p className="text-xs text-muted-foreground">{selected.length} {t("selected")}</p>
    </div>
  );
}

function TeacherAssignments({ teacherId, teacherName }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { data: assignments, isLoading } = useTeacherAssignments(teacherId);
  const { data: classesData } = useClasses({ limit: 500 });
  const { data: subjectsData } = useSubjects({ limit: 200 });
  const bulk = useAssignSubjectsBulk();
  const removeAssignment = useRemoveAssignment();
  const [showForm, setShowForm] = useState(false);
  const [subjectIds, setSubjectIds] = useState([]);
  const [classIds, setClassIds] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [error, setError] = useState("");

  const items = assignments?.data || [];
  const classes = classesData?.data || [];
  const subjects = subjectsData?.data || [];
  const combos = subjectIds.length * classIds.length;

  async function handleAssign(e) {
    e.preventDefault();
    setError("");
    if (!combos) return;
    try {
      const res = await bulk.mutateAsync({ teacherId, subject_ids: subjectIds, class_ids: classIds });
      const inserted = res?.data?.inserted ?? combos;
      toast(t("Assigned {n} class/subject combinations", { n: inserted }), "success");
      setSubjectIds([]);
      setClassIds([]);
      setShowForm(false);
    } catch (err) {
      setError(err?.error?.message || err?.message || t("Failed to save"));
    }
  }

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{t("{name}'s Assignments", { name: teacherName })}</DialogTitle>
        <DialogDescription>{t("Subjects this teacher teaches and the classes they cover")}</DialogDescription>
      </DialogHeader>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("Loading...")}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("No assignments yet")}</p>
      ) : (
        <div className="rounded-md border max-h-64 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Subject")}</TableHead>
                <TableHead>{t("Class")}</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.subject_name}</TableCell>
                  <TableCell>{a.class_name}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAssignment.mutate({ teacherId, assignmentId: a.id })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">{combos > 0 ? `${combos} ${t("assignments")}` : t("Assign Subjects to Classes")}</h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm((s) => !s)}>
          <Plus className="h-4 w-4 mr-1" /> {showForm ? t("Hide") : t("Assign")}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAssign} className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CheckList
              title={t("Subjects")}
              items={subjects}
              labelOf={(s) => s.name}
              selected={subjectIds}
              setSelected={setSubjectIds}
              search={subjectSearch}
              setSearch={setSubjectSearch}
              placeholder={t("Search subject...")}
            />
            <CheckList
              title={t("Classes")}
              items={classes}
              labelOf={(c) => c.name}
              selected={classIds}
              setSelected={setClassIds}
              search={classSearch}
              setSearch={setClassSearch}
              placeholder={t("Search class...")}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {subjectIds.length} {t("subjects")} × {classIds.length} {t("classes")} = <span className="font-medium text-foreground">{combos}</span> {t("assignments")}
          </p>
          <Button type="submit" className="w-full" disabled={!combos || bulk.isPending}>
            {bulk.isPending ? t("Saving...") : t("Assign {n} combinations", { n: combos })}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function TeachersPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [editTeacher, setEditTeacher] = useState(null);
  const [previewTeacher, setPreviewTeacher] = useState(null);
  const { data, isLoading } = useTeachers({ page, limit: 20, search: debouncedSearch });

  const teachers = data?.data || [];
  const meta = data?.meta || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("Teachers")}</h1>
        <p className="text-muted-foreground">{t("Manage teacher details and their class/subject assignments")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{t("All Teachers")}</CardTitle>
            <Input className="w-full sm:w-64" placeholder={t("Search name, phone, or subject…")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">{t("Loading...")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Name")}</TableHead>
                  <TableHead>{t("Email")}</TableHead>
                  <TableHead>{t("Gender")}</TableHead>
                  <TableHead>{t("Job Title")}</TableHead>
                  <TableHead>{t("Qualification")}</TableHead>
                  <TableHead>{t("Field of Study")}</TableHead>
                  <TableHead>{t("Sections")}</TableHead>
                  <TableHead>{t("P/W")}</TableHead>
                  <TableHead>{t("OT")}</TableHead>
                  <TableHead>{t("Status")}</TableHead>
                  <TableHead>{t("Joined")}</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id} className="cursor-pointer" onClick={() => setPreviewTeacher(teacher)}>
                    <TableCell className="font-medium">
                      {fullName(teacher)}
                    </TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>{teacher.gender ? teacher.gender.charAt(0).toUpperCase() + teacher.gender.slice(1) : "—"}</TableCell>
                    <TableCell>{teacher.job_title || "—"}</TableCell>
                    <TableCell>{teacher.qualification || "—"}</TableCell>
                    <TableCell>{teacher.field_of_study || "—"}</TableCell>
                    <TableCell>{teacher.section_count ?? "—"}</TableCell>
                    <TableCell>{teacher.periods_per_week ?? "—"}</TableCell>
                    <TableCell>{teacher.overtime_periods ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={teacher.status === "active" ? "success" : "warning"}>{teacher.status}</Badge>
                    </TableCell>
                    <TableCell>{teacher.joined_at ? String(teacher.joined_at).slice(0, 10) : "—"}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon" title={t("Edit details")} onClick={() => setEditTeacher(teacher)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title={t("Assignments")} onClick={() => setSelectedTeacher(teacher)}>
                          <BookOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {teachers.length === 0 && (
                  <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">{t("No teachers found")}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedTeacher} onOpenChange={(open) => { if (!open) setSelectedTeacher(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedTeacher && (
            <TeacherAssignments
              teacherId={selectedTeacher.id}
              teacherName={`${fullName(selectedTeacher)}`}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewTeacher} onOpenChange={(o) => !o && setPreviewTeacher(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {previewTeacher && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{fullName(previewTeacher)}</h2>
                  <p className="text-sm text-muted-foreground">
                    {previewTeacher.email}{previewTeacher.phone ? ` · ${previewTeacher.phone}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">{t.roles?.[previewTeacher.role] || previewTeacher.role}</Badge>
                    {previewTeacher.job_title && <Badge variant="secondary">{previewTeacher.job_title}</Badge>}
                    <Badge variant={previewTeacher.status === "active" ? "success" : "warning"}>{previewTeacher.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {previewTeacher.qualification ? `${t("Qualification")}: ${previewTeacher.qualification}` : ""}
                    {previewTeacher.field_of_study ? ` · ${t("Field of Study")}: ${previewTeacher.field_of_study}` : ""}
                    {previewTeacher.joined_at ? ` · ${t("Joined")}: ${String(previewTeacher.joined_at).slice(0, 10)}` : ""}
                  </p>
                </div>
                <Button onClick={() => { setEditTeacher(previewTeacher); setPreviewTeacher(null); }}>
                  <Pencil className="h-4 w-4 mr-1" /> {t("Edit Staff Details")}
                </Button>
              </div>
              <div className="border-t pt-4">
                <TeacherAssignments
                  teacherId={previewTeacher.id}
                  teacherName={`${fullName(previewTeacher)}`}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <StaffEditDialog user={editTeacher} open={!!editTeacher} onOpenChange={(open) => { if (!open) setEditTeacher(null); }} />

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t("Page {page} of {total}", { page: meta.page, total: meta.totalPages })}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t("Previous")}</Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>{t("Next")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
