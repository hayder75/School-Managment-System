import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FieldError } from "../../components/ui/form-error";
import { extractApiErrors } from "../../lib/form-utils";
import { useTeachers, useTeacherAssignments, useAssignSubject, useRemoveAssignment } from "../../hooks/useTeachers";
import { useClasses } from "../../hooks/useClasses";
import { useSubjects } from "../../hooks/useSubjects";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Label } from "../../components/ui/label";
import { Plus, Trash2, BookOpen } from "lucide-react";

function TeacherAssignments({ teacherId, teacherName }) {
  const { data: assignments, isLoading } = useTeacherAssignments(teacherId);
  const { data: classesData } = useClasses({ limit: 200 });
  const { data: subjectsData } = useSubjects({ limit: 200 });
  const assignSubject = useAssignSubject();
  const removeAssignment = useRemoveAssignment();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject_id: "", class_id: "", is_primary: false });
  const [fieldErrors, setFieldErrors] = useState({});

  const items = assignments?.data || [];
  const classes = classesData?.data || [];
  const subjects = subjectsData?.data || [];

  async function handleAssign(e) {
    e.preventDefault();
    setFieldErrors({});
    try {
      await assignSubject.mutateAsync({ teacherId, ...form });
      setOpen(false);
      setForm({ subject_id: "", class_id: "", is_primary: false });
    } catch (err) {
      setFieldErrors(extractApiErrors(err));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">{teacherName}'s Assignments</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Assign</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Subject to Class</DialogTitle></DialogHeader>
            <form onSubmit={handleAssign} className="space-y-4">
              {fieldErrors.form && <p className="text-sm text-red-500 mb-2">{fieldErrors.form}</p>}
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FieldError errors={fieldErrors} field="subject_id" />
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FieldError errors={fieldErrors} field="class_id" />
              <Button type="submit" className="w-full">Assign</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assignments yet</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Class</TableHead>
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
      )}
    </div>
  );
}

export default function TeachersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const { data, isLoading } = useTeachers({ page, limit: 20, search });

  const teachers = data?.data || [];
  const meta = data?.meta || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teachers</h1>
        <p className="text-muted-foreground">Manage teachers and their class/subject assignments</p>
      </div>

      <Card>
        <CardHeader><CardTitle>All Teachers</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Field of Study</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">
                      <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/staff/${teacher.id}`)}>
                        {teacher.first_name} {teacher.last_name}
                      </Button>
                    </TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>{teacher.gender ? teacher.gender.charAt(0).toUpperCase() + teacher.gender.slice(1) : "—"}</TableCell>
                    <TableCell>{teacher.job_title || "—"}</TableCell>
                    <TableCell>{teacher.qualification || "—"}</TableCell>
                    <TableCell>{teacher.field_of_study || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={teacher.status === "active" ? "success" : "warning"}>{teacher.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedTeacher(selectedTeacher?.id === teacher.id ? null : teacher)}>
                        <BookOpen className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {teachers.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No teachers found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedTeacher && (
        <Card>
          <CardContent className="pt-6">
            <TeacherAssignments
              teacherId={selectedTeacher.id}
              teacherName={`${selectedTeacher.first_name} ${selectedTeacher.last_name}`}
            />
          </CardContent>
        </Card>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
