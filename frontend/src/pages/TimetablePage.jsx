import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "../store/auth";
import { useClasses } from "../hooks/useClasses";
import { useClassTimetable, useCreateTimetableEntry, useDeleteTimetableEntry } from "../hooks/useTimetable";
import { useSubjects } from "../hooks/useSubjects";
import { useTeachers } from "../hooks/useTeachers";
import { useTeacherAssignments } from "../hooks/useTeachers";
import { useStudents } from "../hooks/useStudents";
import { useMyChildren } from "../hooks/useParents";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Plus, Trash2, Wand2 } from "lucide-react";

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const dayLabels = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat" };

export default function TimetablePage() {
  const user = useAuthStore((s) => s.user);
  const isStudent = user?.role === "student";
  const isTeacher = user?.role === "teacher";
  const isParent = user?.role === "parent";
  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const [classId, setClassId] = useState("");
  const { data: classesData } = useClasses({ limit: 200 });
  const { data: assignmentsData } = useTeacherAssignments(isTeacher ? user?.id : null);
  const { data: timetableData, isLoading } = useClassTimetable(classId);
  const { data: subjectsData } = useSubjects({ limit: 200 });
  const { data: teachersData } = useTeachers({ limit: 200 });
  const { data: myStudentData } = useStudents(
    { user_id: user?.id, limit: 1 },
    { enabled: isStudent && !!user?.id }
  );
  const { data: myChildrenData } = useMyChildren({ enabled: isParent });
  const createEntry = useCreateTimetableEntry();
  const deleteEntry = useDeleteTimetableEntry();

  useEffect(() => {
    if (isStudent && myStudentData?.data?.length > 0) {
      setClassId(myStudentData.data[0].class_id);
    }
  }, [isStudent, myStudentData]);

  const childClassIds = useMemo(
    () => (isParent ? (myChildrenData?.data || []).map((c) => c.class_id).filter(Boolean) : []),
    [isParent, myChildrenData]
  );

  useEffect(() => {
    if (isParent && childClassIds.length > 0) {
      setClassId((prev) => prev || childClassIds[0]);
    }
  }, [isParent, childClassIds]);

  const allClasses = classesData?.data || [];
  const assignments = assignmentsData?.data || [];
  const assignedClassIds = isTeacher ? assignments.map((a) => a.class_id) : [];
  const classes = isTeacher
    ? allClasses.filter((c) => assignedClassIds.includes(c.id))
    : isParent
      ? allClasses.filter((c) => childClassIds.includes(c.id))
      : allClasses;

  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({
    class_id: "", subject_id: "", teacher_id: "",
    day_of_week: "monday", start_time: "08:00", end_time: "09:00", room: "",
  });

  async function handleGenerate() {
    setGenerating(true);
    try {
      await api.post("/operations/timetable/generate");
      window.location.reload();
    } catch {} finally {
      setGenerating(false);
    }
  }

  const entries = timetableData?.data || [];
  const subjects = subjectsData?.data || [];
  const teachers = teachersData?.data || [];
  const teacherSubjectIds = isTeacher && classId
    ? assignments.filter((a) => a.class_id === classId).map((a) => a.subject_id)
    : null;
  const subjectOptions = isTeacher
    ? subjects.filter((s) => (teacherSubjectIds ?? []).includes(s.id))
    : subjects;

  const timetableByDay = {};
  days.forEach((day) => {
    timetableByDay[day] = entries.filter((e) => e.day_of_week === day);
  });

  async function handleCreate(e) {
    e.preventDefault();
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
    if (isTeacher) payload.teacher_id = user?.id;
    await createEntry.mutateAsync(payload);
    setOpen(false);
    setForm({ class_id: "", subject_id: "", teacher_id: "", day_of_week: "monday", start_time: "08:00", end_time: "09:00", room: "" });
  }

  const myClass = classes.find((c) => c.id === classId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Timetable</h1>
          <p className="text-muted-foreground">
            {isStudent && myClass
              ? `Your class schedule — ${myClass.name}`
              : isTeacher && myClass
                ? `Classes you teach — ${myClass.name}`
                : isParent && myClass
                  ? `Your child's schedule — ${myClass.name}`
                  : "Manage class schedules"
            }
          </p>
        </div>
        <div className="flex gap-4 items-center">
          {!isStudent && (
            <Select value={classId} onValueChange={(v) => { setClassId(v); setForm((f) => ({ ...f, class_id: v })); }}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {classId && isAdmin && (
            <>
              <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                <Wand2 className="h-4 w-4 mr-2" /> {generating ? "Generating..." : "Auto Generate"}
              </Button>
            </>
          )}
          {classId && (isAdmin || isTeacher) && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Entry</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Timetable Entry</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {subjectOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Teacher</Label>
                    <Select
                      value={isTeacher ? user?.id : form.teacher_id}
                      disabled={isTeacher}
                      onValueChange={(v) => setForm({ ...form, teacher_id: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Day</Label>
                    <Select value={form.day_of_week} onValueChange={(v) => setForm({ ...form, day_of_week: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {days.map((d) => <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start</Label>
                      <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>End</Label>
                      <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Room</Label>
                    <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full">Add Entry</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {classId && (
        <Card>
          <CardHeader><CardTitle>Weekly Schedule — {myClass?.name}</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {days.map((day) => (
                  <div key={day} className="border rounded-lg">
                    <div className="bg-muted p-2 text-center font-medium text-sm rounded-t-lg">
                      {dayLabels[day]}
                    </div>
                    <div className="p-2 space-y-2 min-h-[200px]">
                      {timetableByDay[day].length === 0 && (
                        <p className="text-xs text-muted-foreground text-center">—</p>
                      )}
                      {timetableByDay[day].map((entry) => (
                        <div key={entry.id} className="bg-primary/5 rounded p-2 text-xs space-y-1 group relative">
                          <p className="font-medium">{entry.subject_name}</p>
                          <p className="text-muted-foreground">
                            {entry.start_time?.slice(0, 5)}-{entry.end_time?.slice(0, 5)}
                          </p>
                          {entry.teacher_first_name && (
                            <p className="text-muted-foreground">{entry.teacher_first_name} {entry.teacher_last_name}</p>
                          )}
                          {entry.room && <p className="text-muted-foreground">Room {entry.room}</p>}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100"
                              onClick={() => deleteEntry.mutate(entry.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
