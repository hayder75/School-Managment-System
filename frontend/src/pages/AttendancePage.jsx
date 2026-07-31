import { useState, useEffect } from "react";
import { useAuthStore } from "../store/auth";
import { useClasses } from "../hooks/useClasses";
import { useAttendance, useMarkAttendance } from "../hooks/useAttendance";
import { useStudentsByClass } from "../hooks/useStudents";
import { useTeacherAssignments } from "../hooks/useTeachers";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role === "teacher";
  const today = new Date().toISOString().split("T")[0];
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(today);
  const { data: classesData } = useClasses({ limit: 200 });
  const { data: assignmentsData } = useTeacherAssignments(isTeacher ? user?.id : null);
  const { data: attendanceData, isLoading: loadingAttendance } = useAttendance(classId, date);
  const { data: classStudentsData } = useStudentsByClass(classId);
  const markAttendance = useMarkAttendance();

  const allClasses = classesData?.data || [];
  const assignments = assignmentsData?.data || [];
  const assignedClassIds = isTeacher ? assignments.map((a) => a.class_id) : [];
  const classes = isTeacher ? allClasses.filter((c) => assignedClassIds.includes(c.id)) : allClasses;
  const attendanceRecords = attendanceData?.data || [];
  const classStudents = classStudentsData?.data || [];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">Mark and view daily attendance</p>
      </div>

      <div className="flex gap-4 items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium">Class</label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select class" /></SelectTrigger>
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
      </div>

      {classId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Students</CardTitle>
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
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.name}</TableCell>
                      <TableCell>
                        <Select
                          value={statusMap[record.id] || record.status || "present"}
                          onValueChange={(v) => handleStatusChange(record.id, v)}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="excused">Excused</SelectItem>
                          </SelectContent>
                        </Select>
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
