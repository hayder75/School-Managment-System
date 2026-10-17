import { fullName } from "../../lib/fullName";
import { useState } from "react";
import { FieldError } from "../../components/ui/form-error";
import { extractApiErrors } from "../../lib/form-utils";
import { useClasses, useCreateClass, useDeleteClass, useSetHomeroom } from "../../hooks/useClasses";
import { useStudentsByClass } from "../../hooks/useStudents";
import { useToast } from "../../store/toast";
import api from "../../lib/api";
import EntitySearch from "../../components/ui/EntitySearch";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

async function searchTeachers(q) {
  const r = await api.get("/teachers", { params: { search: q || undefined, limit: 20 } });
  return (r.data || []).map((x) => ({ value: x.id, label: `${fullName(x)}`.trim(), sub: x.job_title || "" }));
}

function ClassRoster({ cls }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { data, isLoading } = useStudentsByClass(cls.id);
  const setHomeroom = useSetHomeroom();
  const [teacherId, setTeacherId] = useState(cls.class_teacher_id || "");
  const [teacherLabel, setTeacherLabel] = useState(cls.teacher_first_name ? fullName({ first_name: cls.teacher_first_name, middle_name: cls.teacher_middle_name, last_name: cls.teacher_last_name }) : "");
  const students = data?.data || [];

  async function saveHomeroom() {
    try {
      await setHomeroom.mutateAsync({ id: cls.id, class_teacher_id: teacherId || null });
      toast(t("Saved successfully"), "success");
    } catch (err) {
      toast(err?.error?.message || err?.message || t("Failed to save"), "error");
    }
  }

  return (
    <div>
      <DialogHeader>
        <DialogTitle>{cls.name} — {t("Students")} ({students.length})</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm my-3">
        <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">{t("Level")}</p><p className="font-medium capitalize">{cls.level_group || "primary"} · {t("Grade")} {cls.grade_level}{cls.section ? ` · ${cls.section}` : ""}</p></div>
        <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">{t("Enrolled / Capacity")}</p><p className="font-medium">{students.length}{cls.capacity ? ` / ${cls.capacity}` : ""}</p></div>
      </div>

      <div className="space-y-2 mb-4">
        <Label>{t("Homeroom Teacher")}</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <EntitySearch
              value={teacherId}
              valueLabel={teacherLabel}
              onChange={(id, o) => { setTeacherId(id); setTeacherLabel(o.label); }}
              fetchOptions={searchTeachers}
              placeholder={t("Assign homeroom teacher…")}
              searchPlaceholder={t("Type a teacher name…")}
            />
          </div>
          <Button onClick={saveHomeroom} disabled={setHomeroom.isPending}>{t("Save")}</Button>
        </div>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground text-sm py-4 text-center">{t("Loading...")}</p>
      ) : students.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">{t("No students in this class yet.")}</p>
      ) : (
        <div className="rounded-md border max-h-80 overflow-y-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>#</TableHead><TableHead>{t("Student")}</TableHead>
              <TableHead>{t("Student ID")}</TableHead><TableHead>{t("Gender")}</TableHead><TableHead>{t("Status")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {students.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{fullName(s)}</TableCell>
                  <TableCell>{s.student_number || "—"}</TableCell>
                  <TableCell className="capitalize">{s.gender || "—"}</TableCell>
                  <TableCell><Badge variant={s.status === "active" ? "success" : "secondary"}>{s.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function ClassesPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useClasses({ page, limit: 50 });
  const createClass = useCreateClass();
  const deleteClass = useDeleteClass();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", grade_level: "", section: "", capacity: "", class_teacher_id: "", teacherLabel: "", level_group: "primary" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [selected, setSelected] = useState(null);

  const classes = data?.data || [];
  const meta = data?.meta || {};

  async function handleCreate(e) {
    e.preventDefault();
    setFieldErrors({});
    try {
      await createClass.mutateAsync({
        name: form.name,
        grade_level: form.grade_level ? parseInt(form.grade_level) : undefined,
        section: form.section || undefined,
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
        class_teacher_id: form.class_teacher_id || undefined,
        level_group: form.level_group || "primary",
      });
      setOpen(false);
      setForm({ name: "", grade_level: "", section: "", capacity: "", class_teacher_id: "", teacherLabel: "", level_group: "primary" });
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  const totalStudents = classes.reduce((s, c) => s + Number(c.student_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("Classes")}</h1>
          <p className="text-muted-foreground">{t("Classes, homeroom teachers and their students")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> {t("Add Class")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("Create Class")}</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
              <div className="space-y-2">
                <Label>{t("Class Name")}</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("Grade 7A")} />
              </div>
              <FieldError errors={fieldErrors} field="name" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("Level Group")}</Label>
                  <Select value={form.level_group} onValueChange={(v) => setForm({ ...form, level_group: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nursery">{t("Nursery")}</SelectItem>
                      <SelectItem value="kg">{t("KG")}</SelectItem>
                      <SelectItem value="primary">{t("Primary")}</SelectItem>
                      <SelectItem value="secondary">{t("Secondary")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("Grade Level")}</Label>
                  <Input type="number" value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t("Section")}</Label>
                  <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="A" />
                </div>
                <div className="space-y-2">
                  <Label>{t("Capacity")}</Label>
                  <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("Homeroom Teacher")}</Label>
                <EntitySearch
                  value={form.class_teacher_id}
                  valueLabel={form.teacherLabel}
                  onChange={(id, o) => setForm({ ...form, class_teacher_id: id, teacherLabel: o.label })}
                  fetchOptions={searchTeachers}
                  placeholder={t("Search teacher by name…")}
                  searchPlaceholder={t("Type a teacher name…")}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createClass.isPending}>
                {createClass.isPending ? t("Creating...") : t("Create Class")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("Classes")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{meta.total ?? classes.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("Students (page)")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalStudents}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("With homeroom")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{classes.filter((c) => c.teacher_first_name).length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("Empty classes")}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{classes.filter((c) => !Number(c.student_count)).length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">{t("All Classes")}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">{t("Loading...")}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Class")}</TableHead>
                    <TableHead>{t("Level")}</TableHead>
                    <TableHead>{t("Homeroom Teacher")}</TableHead>
                    <TableHead className="text-center">{t("Students")}</TableHead>
                    <TableHead className="text-center">{t("Capacity")}</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls.id} className="cursor-pointer" onClick={() => setSelected(cls)}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell className="capitalize">{cls.level_group || "primary"} · {t("Grade")} {cls.grade_level}{cls.section ? ` · ${cls.section}` : ""}</TableCell>
                      <TableCell>{cls.teacher_first_name ? fullName({ first_name: cls.teacher_first_name, middle_name: cls.teacher_middle_name, last_name: cls.teacher_last_name }) : <span className="text-muted-foreground">{t("Unassigned")}</span>}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={Number(cls.student_count) ? "secondary" : "outline"}>{cls.student_count ?? 0}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{cls.capacity || "—"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => deleteClass.mutate(cls.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {classes.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground p-6">{t("No classes yet")}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>

              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">{t("Page {page} of {total}", { page: meta.page, total: meta.totalPages })}</p>
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

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selected && <ClassRoster cls={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
