import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FieldError } from "../components/ui/form-error";
import { extractApiErrors } from "../lib/form-utils";
import { useStudents, useCreateStudent, useUpdateStudent, useDeleteStudent, usePromoteStudents, useEnrollmentStats } from "../hooks/useStudents";
import { useClasses } from "../hooks/useClasses";
import { useUsers } from "../hooks/useUsers";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { TableSkeleton, CardSkeleton } from "../components/ui/skeleton";
import { Plus, Search, GraduationCap, Users, BookOpen, ExternalLink } from "lucide-react";

export default function StudentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteForm, setPromoteForm] = useState({ from_class_id: "", to_class_id: "" });
  const [form, setForm] = useState({ user_id: "", class_id: "", student_number: "", emergency_contact: "" });
  const [fieldErrors, setFieldErrors] = useState({});

  const { data, isLoading } = useStudents({ page, limit: 20, search: search || undefined, class_id: classFilter || undefined, status: statusFilter || undefined });
  const { data: classesData } = useClasses({ limit: 200 });
  const { data: usersData } = useUsers({ role: "student", limit: 200 });
  const { data: statsData } = useEnrollmentStats();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const promoteStudents = usePromoteStudents();
  const students = data?.data || [];
  const navigate = useNavigate();
  const meta = data?.meta || {};
  const classes = classesData?.data || [];
  const users = usersData?.data || [];
  const stats = statsData?.data || {};

  function resetForm() {
    setForm({ user_id: "", class_id: "", student_number: "", emergency_contact: "" });
    setEditing(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldErrors({});
    try {
      if (editing) {
        await updateStudent.mutateAsync({ id: editing.id, data: form });
      } else {
        await createStudent.mutateAsync(form);
      }
      setOpen(false);
      resetForm();
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  function handleEdit(student) {
    setEditing(student);
    setForm({ user_id: student.user_id, class_id: student.class_id, student_number: student.student_number || "", emergency_contact: student.emergency_contact || "" });
    setOpen(true);
  }

  async function handlePromote(e) {
    e.preventDefault();
    setFieldErrors({});
    try {
      await promoteStudents.mutateAsync(promoteForm);
      setPromoteOpen(false);
      setPromoteForm({ from_class_id: "", to_class_id: "" });
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  if (isLoading) return <div className="space-y-4 p-8"><CardSkeleton /><TableSkeleton rows={8} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground">Manage student records</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Promote Students</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Promote Students</DialogTitle></DialogHeader>
              <form onSubmit={handlePromote} className="space-y-4">
                {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
                <div className="space-y-2">
                  <Label>From Class</Label>
                  <Select value={promoteForm.from_class_id} onValueChange={(v) => setPromoteForm({ ...promoteForm, from_class_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <FieldError errors={fieldErrors} field="from_class_id" />
                <div className="space-y-2">
                  <Label>To Class</Label>
                  <Select value={promoteForm.to_class_id} onValueChange={(v) => setPromoteForm({ ...promoteForm, to_class_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <FieldError errors={fieldErrors} field="to_class_id" />
                <Button type="submit" className="w-full">Promote</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit Student" : "Add Student"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
                <div className="space-y-2">
                  <Label>User (Student Account)</Label>
                  <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <FieldError errors={fieldErrors} field="user_id" />
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <FieldError errors={fieldErrors} field="class_id" />
                <div className="space-y-2">
                  <Label>Student Number</Label>
                  <Input value={form.student_number} onChange={(e) => setForm({ ...form, student_number: e.target.value })} />
                </div>
                <FieldError errors={fieldErrors} field="student_number" />
                <div className="space-y-2">
                  <Label>Emergency Contact</Label>
                  <Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
                </div>
                <FieldError errors={fieldErrors} field="emergency_contact" />
                <Button type="submit" className="w-full">{editing ? "Update" : "Create"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Students</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.total || meta.total || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Classes</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{(stats.byClass || []).length || classes.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{students.filter(s => s.status === "active").length || 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search students..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All classes</SelectItem>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
                <SelectItem value="dropped">Dropped</SelectItem>
                <SelectItem value="graduated">Graduated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Student #</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Class</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 && <tr><td colSpan={6} className="text-center p-6 text-muted-foreground">No students found</td></tr>}
                {students.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="p-3">{s.student_number || "—"}</td>
                    <td className="p-3 font-medium">
                      <button className="hover:text-primary hover:underline text-left" onClick={() => navigate(`/students/${s.id}`)}>
                        {s.first_name} {s.last_name}
                      </button>
                    </td>
                    <td className="p-3">{s.email}</td>
                    <td className="p-3">{s.class_name || "—"}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${s.status === "active" ? "bg-green-100 text-green-800" : s.status === "graduated" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}>{s.status}</span></td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/students/${s.id}`)}><ExternalLink className="h-3 w-3 mr-1" />View</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm("Delete this student?")) deleteStudent.mutate(s.id); }}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
