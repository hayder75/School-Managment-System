import { useState } from "react";
import { FieldError } from "../../components/ui/form-error";
import { extractApiErrors } from "../../lib/form-utils";
import { useClasses, useCreateClass, useDeleteClass } from "../../hooks/useClasses";
import { useTeachers } from "../../hooks/useTeachers";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export default function ClassesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useClasses({ page, limit: 20 });
  const { data: teachersData } = useTeachers({ limit: 200 });
  const createClass = useCreateClass();
  const deleteClass = useDeleteClass();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", grade_level: "", section: "", capacity: "", class_teacher_id: "", level_group: "primary" });
  const [fieldErrors, setFieldErrors] = useState({});

  const classes = data?.data || [];
  const meta = data?.meta || {};
  const teachers = teachersData?.data || [];

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
      setForm({ name: "", grade_level: "", section: "", capacity: "", class_teacher_id: "", level_group: "primary" });
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground">Manage classes and sections</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Class</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Class</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
              <div className="space-y-2">
                <Label>Class Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Grade 7A" />
              </div>
              <FieldError errors={fieldErrors} field="name" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Level Group</Label>
                  <Select value={form.level_group} onValueChange={(v) => setForm({ ...form, level_group: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nursery">Nursery</SelectItem>
                      <SelectItem value="kg">KG</SelectItem>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FieldError errors={fieldErrors} field="level_group" />
                <div className="space-y-2">
                  <Label>Grade Level</Label>
                  <Input type="number" value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} />
                </div>
                <FieldError errors={fieldErrors} field="grade_level" />
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="A" />
                </div>
                <FieldError errors={fieldErrors} field="section" />
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </div>
              <FieldError errors={fieldErrors} field="capacity" />
              <div className="space-y-2">
                <Label>Class Teacher</Label>
                <Select value={form.class_teacher_id} onValueChange={(v) => setForm({ ...form, class_teacher_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FieldError errors={fieldErrors} field="class_teacher_id" />
              <Button type="submit" className="w-full" disabled={createClass.isPending}>
                {createClass.isPending ? "Creating..." : "Create Class"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>All Classes</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell><span className="capitalize">{cls.level_group || "primary"}</span></TableCell>
                      <TableCell>{cls.grade_level}</TableCell>
                      <TableCell>{cls.section || "—"}</TableCell>
                      <TableCell>{cls.teacher_first_name ? `${cls.teacher_first_name} ${cls.teacher_last_name}` : "—"}</TableCell>
                      <TableCell>{cls.capacity || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteClass.mutate(cls.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {classes.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No classes yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>

              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
