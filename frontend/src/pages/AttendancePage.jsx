import { useState, useEffect } from "react";
import { useAuthStore } from "../store/auth";
import { useClasses } from "../hooks/useClasses";
import { useAttendance, useMarkAttendance, useTeacherAttendanceOverview } from "../hooks/useAttendance";
import { useStudentsByClass } from "../hooks/useStudents";
import { useTeacherAssignments } from "../hooks/useTeachers";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import AdminAttendancePage from "./AdminAttendancePage";

const STATUS_OPTIONS = [
  { value: "present", label: "Present", active: "bg-emerald-500 text-white border-emerald-500", idle: "text-emerald-700 border-emerald-300 hover:bg-emerald-50" },
  { value: "absent", label: "Absent", active: "bg-rose-500 text-white border-rose-500", idle: "text-rose-700 border-rose-300 hover:bg-rose-50" },
  { value: "late", label: "Late", active: "bg-amber-500 text-white border-amber-500", idle: "text-amber-700 border-amber-300 hover:bg-amber-50" },
  { value: "excused", label: "Excused", active: "bg-blue-500 text-white border-blue-500", idle: "text-blue-700 border-blue-300 hover:bg-blue-50" },
];

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user);

  if (user?.role === "admin" || user?.role === "owner") {
    return <AdminAttendancePage />;
  }

  return <TeacherAttendanceView />;
}

function StatusButtons({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {STATUS_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${selected ? opt.active : opt.idle}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function TeacherAttendanceView() {
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role === "teacher";
  const today = new Date().toISOString().split("T")[0];
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(today);
  const [rangeWeeks, setRangeWeeks] = useState(4);

  const fromDate = new Date(Date.now() - rangeWeeks * 7 * 86400000).toISOString().split("T")[0];
  const { data: classesData } = useClasses({ limit: 200 });
  const { data: assignmentsData } = useTeacherAssignments(isTeacher ? user?.id : null);
  const { data: overviewData } = useTeacherAttendanceOverview(
    classId ? { from_date: fromDate, to_date: today, class_id: classId } : { from_date: fromDate, to_date: today }
  );
  const { data: attendanceData, isLoading: loadingAttendance } = useAttendance(classId, date);
  const { data: classStudentsData } = useStudentsByClass(classId);
  const markAttendance = useMarkAttendance();

  const allClasses = classesData?.data || [];
  const assignments = assignmentsData?.data || [];
  const assignedClassIds = isTeacher ? assignments.map((a) => a.class_id) : [];
  const classes = isTeacher ? allClasses.filter((c) => assignedClassIds.includes(c.id)) : allClasses;
  const attendanceRecords = attendanceData?.data || [];
  const classStudents = classStudentsData?.data || [];
  const overview = overviewData?.data || { classes: [], top_absent: [], summary: {} };

  const [statusMap, setStatusMap] = useState({});

  useEffect(() => {
    setStatusMap({});
  }, [classId, date]);

  const displayRecords = attendanceRecords.length > 0
    ? attendanceRecords.map((r) => ({
        id: r.student_id,
        name: `${r.first_name} ${r.last_name}`,
        number: r.student_number,
        status: r.status,
      }))
    : classStudents.map((s) => ({
        id: s.user_id,
        name: `${s.first_name} ${s.last_name}`,
        number: s.student_number,
        status: statusMap[s.user_id] || "present",
      }));

  function handleStatusChange(studentId, status) {
    setStatusMap((prev) => ({ ...prev, [studentId]: status }));
  }

  async function handleSave() {
    if (!classId || !date) return;
    const records = displayRecords.map((r) => ({
      student_id: r.id,
      status: statusMap[r.id] || r.status || "present",
    }));
    await markAttendance.mutateAsync({ classId, date, records });
  }

  const summary = overview.summary || {};
  const focusClass = classId ? overview.classes?.[0] : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">Mark daily attendance and track your classes at a glance</p>
      </div>

      {/* Marking controls */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium">Class</label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="All my classes" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Range</label>
          <Select value={String(rangeWeeks)} onValueChange={(v) => setRangeWeeks(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 week</SelectItem>
              <SelectItem value="4">4 weeks</SelectItem>
              <SelectItem value="12">12 weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards — reflect current scope (all classes or one selected class) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs font-medium text-emerald-600 uppercase">Present</p>
            <p className="text-2xl font-bold text-emerald-600">{summary.present || 0}</p>
            <p className="text-xs text-muted-foreground">{summary.present_rate || 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs font-medium text-rose-600 uppercase">Absent</p>
            <p className="text-2xl font-bold text-rose-600">{summary.absent || 0}</p>
            <p className="text-xs text-muted-foreground">{summary.absent_rate || 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs font-medium text-amber-600 uppercase">Late</p>
            <p className="text-2xl font-bold text-amber-600">{summary.late || 0}</p>
            <p className="text-xs text-muted-foreground">{summary.late_rate || 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs font-medium text-blue-600 uppercase">Excused</p>
            <p className="text-2xl font-bold text-blue-600">{summary.excused || 0}</p>
            <p className="text-xs text-muted-foreground">{summary.excused_rate || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Class view: list of all classes by default, focused single class when selected */}
      {classId ? (
        focusClass && (
          <Card>
            <CardHeader>
              <CardTitle>{focusClass.class_name} — Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                <div className="bg-emerald-500" style={{ width: `${focusClass.present_rate || 0}%` }} />
                <div className="bg-amber-500" style={{ width: `${focusClass.late_rate || 0}%` }} />
                <div className="bg-rose-500" style={{ width: `${focusClass.absent_rate || 0}%` }} />
                <div className="bg-blue-500" style={{ width: `${(focusClass.excused_rate) || 0}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="text-emerald-600">Present {focusClass.present}</span>
                <span className="text-amber-600">Late {focusClass.late}</span>
                <span className="text-rose-600">Absent {focusClass.absent}</span>
                <span className="text-blue-600">Excused {focusClass.excused}</span>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <div>
          <h2 className="text-lg font-semibold mb-3">Your Classes</h2>
          {overview.classes?.length === 0 ? (
            <p className="text-muted-foreground text-sm">No attendance recorded for your classes yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview.classes?.map((c) => (
                <Card key={c.class_id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{c.class_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                      <div className="bg-emerald-500" style={{ width: `${c.present_rate || 0}%` }} />
                      <div className="bg-amber-500" style={{ width: `${c.late_rate || 0}%` }} />
                      <div className="bg-rose-500" style={{ width: `${c.absent_rate || 0}%` }} />
                      <div className="bg-blue-500" style={{ width: `${(c.excused_rate) || 0}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="text-emerald-600">Present {c.present}</span>
                      <span className="text-amber-600">Late {c.late}</span>
                      <span className="text-rose-600">Absent {c.absent}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Most absent students — scoped to selected class when chosen */}
      {overview.top_absent?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{classId ? `${focusClass?.class_name || "Class"} — Students Missing Most` : "Students Missing Class Most"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Absent</TableHead>
                  <TableHead>Late</TableHead>
                  <TableHead>Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.top_absent.map((s) => (
                  <TableRow key={s.student_id}>
                    <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                    <TableCell>{s.class_name}</TableCell>
                    <TableCell className="text-rose-600 font-semibold">{s.absent}</TableCell>
                    <TableCell className="text-amber-600">{s.late}</TableCell>
                    <TableCell>
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-rose-50 text-rose-700 font-semibold">
                        {s.absent_rate}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Marking table — jumps to top on mobile */}
      {classId && (
        <Card className="max-md:order-first">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Mark Attendance</CardTitle>
            {displayRecords.length > 0 && (
              <Button onClick={handleSave} disabled={markAttendance.isPending}>
                {markAttendance.isPending ? "Saving..." : "Save Attendance"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loadingAttendance ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : displayRecords.length === 0 ? (
              <p className="text-muted-foreground">No students found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Student #</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.name}</TableCell>
                      <TableCell className="text-muted-foreground">{record.number}</TableCell>
                      <TableCell>
                        <StatusButtons
                          value={statusMap[record.id] || record.status || "present"}
                          onChange={(v) => handleStatusChange(record.id, v)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
