import { useState } from "react";
import { useAuthStore } from "../store/auth";
import { useExams, useCreateExam, useDeleteExam } from "../hooks/useExams";
import { useClasses } from "../hooks/useClasses";
import { useSubjects } from "../hooks/useSubjects";
import { useTeacherAssignments } from "../hooks/useTeachers";
import { useExamGrades, useEnterGrades } from "../hooks/useGrades";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Plus, Trash2, Edit3 } from "lucide-react";

function GradeEntry({ exam }) {
  const { data: gradesData, isLoading } = useExamGrades(exam.id);
  const enterGrades = useEnterGrades();
  const [grades, setGrades] = useState({});

  const records = gradesData?.data || [];

  function handleMarksChange(studentId, val) {
    setGrades((prev) => ({ ...prev, [studentId]: { ...prev[studentId], marks_obtained: val ? parseFloat(val) : null } }));
  }

  async function handleSave() {
    const gradeList = Object.entries(grades).map(([studentId, g]) => ({
      student_id: studentId,
      marks_obtained: g.marks_obtained,
    }));
    if (gradeList.length === 0) return;
    await enterGrades.mutateAsync({ examId: exam.id, grades: gradeList });
    setGrades({});
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">Grades for {exam.name}</h4>
        <Button size="sm" onClick={handleSave} disabled={enterGrades.isPending || Object.keys(grades).length === 0}>
          Save Grades
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-muted-foreground">No students in this class. Add students to {exam.class_name || "the class"} first.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.first_name} {r.last_name}</TableCell>
                <TableCell className="w-32">
                  <Input
                    type="number"
                    defaultValue={r.marks_obtained || ""}
                    onChange={(e) => handleMarksChange(r.student_id || r.id, e.target.value)}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>{r.marks_obtained !== null ? r.grade_letter || "—" : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function ExamsPage() {
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role === "teacher";
  const [page, setPage] = useState(1);
  const [selectedExam, setSelectedExam] = useState(null);
  const { data, isLoading } = useExams({ page, limit: 20 });
  const { data: classesData } = useClasses({ limit: 200 });
  const { data: subjectsData } = useSubjects({ limit: 200 });
  const { data: assignmentsData } = useTeacherAssignments(isTeacher ? user?.id : null);
  const createExam = useCreateExam();
  const deleteExam = useDeleteExam();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "exam", class_id: "", class_ids: [], subject_id: "", total_marks: "", pass_marks: "", date: "", mark_test_day: false });

  const exams = data?.data || [];
  const meta = data?.meta || {};
  const allClasses = classesData?.data || [];
  const allSubjects = subjectsData?.data || [];
  const assignments = assignmentsData?.data || [];

  const assignedClassIds = isTeacher ? assignments.map((a) => a.class_id) : [];
  const assignedSubjectIds = isTeacher ? assignments.map((a) => a.subject_id) : [];
  const classes = isTeacher ? allClasses.filter((c) => assignedClassIds.includes(c.id)) : allClasses;
  const subjects = isTeacher ? allSubjects.filter((s) => assignedSubjectIds.includes(s.id)) : allSubjects;

  function toggleClass(id) {
    setForm((f) => {
      const has = f.class_ids.includes(id);
      const class_ids = has ? f.class_ids.filter((x) => x !== id) : [...f.class_ids, id];
      return { ...f, class_ids, class_id: class_ids[0] || "" };
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    await createExam.mutateAsync({
      ...form,
      class_ids: form.class_ids,
      total_marks: form.total_marks ? parseFloat(form.total_marks) : undefined,
      pass_marks: form.pass_marks ? parseFloat(form.pass_marks) : undefined,
    });
    setOpen(false);
    setForm({ name: "", type: "exam", class_id: "", class_ids: [], subject_id: "", total_marks: "", pass_marks: "", date: "", mark_test_day: false });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exams & Grades</h1>
          <p className="text-muted-foreground">Create exams and enter grades</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Exam</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Exam</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="midterm">Midterm</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Classes (select one or more)</Label>
                <div className="flex flex-wrap gap-2">
                  {classes.map((c) => {
                    const active = form.class_ids.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleClass(c.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${active ? "bg-neutral-900 text-white border-neutral-900" : "text-neutral-700 border-neutral-300 hover:bg-neutral-100"}`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
                {form.class_ids.length > 1 && (
                  <p className="text-xs text-muted-foreground">Exam will be created for {form.class_ids.length} classes and notify all their students.</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Marks</Label>
                  <Input type="number" value={form.total_marks} onChange={(e) => setForm({ ...form, total_marks: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Pass Marks</Label>
                  <Input type="number" value={form.pass_marks} onChange={(e) => setForm({ ...form, pass_marks: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.mark_test_day} onChange={(e) => setForm({ ...form, mark_test_day: e.target.checked })} />
                Mark this day as a <span className="font-semibold">test class</span> in the timetable
              </label>
              <Button type="submit" className="w-full" disabled={form.class_ids.length === 0}>Create Exam</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Exams</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.name}</TableCell>
                      <TableCell><Badge variant="outline">{exam.type}</Badge></TableCell>
                      <TableCell>
                        {exam.class_name}
                        {exam.class_ids && exam.class_ids.length > 1 ? (
                          <span className="ml-1 text-xs text-muted-foreground">+{exam.class_ids.length - 1} more</span>
                        ) : null}
                      </TableCell>
                      <TableCell>{exam.subject_name}</TableCell>
                      <TableCell>{exam.date ? (!isNaN(new Date(exam.date).getTime()) ? new Date(exam.date).toLocaleDateString() : "—") : "—"}</TableCell>
                      <TableCell>{exam.total_marks || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedExam(selectedExam?.id === exam.id ? null : exam)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          {!isTeacher && (
                            <Button variant="ghost" size="icon" onClick={() => deleteExam.mutate(exam.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {exams.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No exams yet</TableCell></TableRow>
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

      {selectedExam && (
        <Card>
          <CardContent className="pt-6">
            <GradeEntry exam={selectedExam} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
