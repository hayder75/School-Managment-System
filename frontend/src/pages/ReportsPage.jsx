import { useState, useMemo } from "react";
import { useAuthStore } from "../store/auth";
import { useClasses } from "../hooks/useClasses";
import { useExams } from "../hooks/useExams";
import { useUsers } from "../hooks/useUsers";
import {
  useEnrollmentReport, useGradeDistribution, useClassPerformance,
  useAttendanceOverview, useTeacherWorkload, useMyStudents, useMyAttendance, useMyGrades,
  useFeeCollection, useOutstandingBalances, useRevenueVsExpenses,
  useStaffDirectory, usePayrollSummary, useHeadcount,
  useStudentGradeSummary, useStudentAttendanceSummary,
} from "../hooks/useReports";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";

function StatCard({ title, value, sub, color }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color || ""}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Admin/Owner Tab ──

function EnrollmentReport() {
  const { data, isLoading } = useEnrollmentReport();
  const report = data?.data;
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Student Enrollment</h3>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : report && (
        <div className="grid gap-4 md:grid-cols-4 mb-4">
          <StatCard title="Total Enrolled" value={report.total_enrolled} />
          <StatCard title="Classes" value={report.by_class?.length || 0} />
        </div>
      )}
      {report?.by_class?.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Class</TableHead><TableHead>Grade</TableHead><TableHead>Students</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {report.by_class.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.grade_level}</TableCell>
                    <TableCell>{c.student_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GradeDistributionReport() {
  const { data, isLoading } = useGradeDistribution();
  const dist = data?.data?.distribution || [];
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Grade Distribution</h3>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : dist.length === 0 ? (
        <p className="text-muted-foreground">No grade data yet</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          {dist.map((d) => (
            <StatCard key={d.grade_letter} title={`Grade ${d.grade_letter}`} value={d.count} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassPerformanceReport() {
  const { data: classesData } = useClasses({ limit: 200 });
  const [classId, setClassId] = useState("");
  const { data, isLoading } = useClassPerformance({ class_id: classId || undefined });
  const perf = data?.data?.performance || [];
  const classes = classesData?.data || [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Class Performance</h3>
      <div className="w-72">
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Classes</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : perf.length === 0 ? (
        <p className="text-muted-foreground">No performance data yet</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Class</TableHead><TableHead>Subject</TableHead><TableHead>Avg</TableHead><TableHead>Max</TableHead><TableHead>Min</TableHead><TableHead>Students</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {perf.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{p.class_name}</TableCell>
                    <TableCell>{p.subject_name}</TableCell>
                    <TableCell className="font-semibold">{p.avg_marks}</TableCell>
                    <TableCell>{p.max_marks}</TableCell>
                    <TableCell>{p.min_marks}</TableCell>
                    <TableCell>{p.student_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AttendanceOverviewReport() {
  const { data, isLoading } = useAttendanceOverview();
  const report = data?.data;
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Attendance Overview</h3>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : report && (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard title="Total Records" value={report.summary?.total || 0} />
            <StatCard title="Present" value={report.summary?.present || 0} color="text-green-600" />
            <StatCard title="Absent" value={report.summary?.absent || 0} color="text-red-600" />
            <StatCard title="Late" value={report.summary?.late || 0} color="text-yellow-600" />
            <StatCard title="Excused" value={report.summary?.excused || 0} color="text-blue-600" />
          </div>
          {report.by_class?.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Class</TableHead><TableHead>Present</TableHead><TableHead>Absent</TableHead><TableHead>Late</TableHead><TableHead>Excused</TableHead><TableHead>Total</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.by_class.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{c.class_name}</TableCell>
                        <TableCell>{c.present}</TableCell><TableCell>{c.absent}</TableCell>
                        <TableCell>{c.late}</TableCell><TableCell>{c.excused}</TableCell>
                        <TableCell>{c.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function TeacherWorkloadReport() {
  const { data, isLoading } = useTeacherWorkload();
  const workload = data?.data?.workload || [];
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Teacher Workload</h3>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : workload.length === 0 ? (
        <p className="text-muted-foreground">No assignments yet</p>
      ) : (
        <div className="grid gap-4">
          {workload.map((t) => (
            <Card key={t.teacher_id}>
              <CardHeader className="py-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm">{t.first_name} {t.last_name}</CardTitle>
                  <Badge>{t.total_assignments} assignments</Badge>
                </div>
              </CardHeader>
              <CardContent className="py-2">
                <div className="flex flex-wrap gap-2">
                  {(t.assignments || []).map((a, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {a.subject} — {a.class}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminReports() {
  return (
    <div className="space-y-8">
      <EnrollmentReport />
      <GradeDistributionReport />
      <ClassPerformanceReport />
      <AttendanceOverviewReport />
      <TeacherWorkloadReport />
    </div>
  );
}

// ── Teacher Tab ──

function MyStudentsReport() {
  const { data: classesData } = useClasses({ limit: 200 });
  const [classId, setClassId] = useState("");
  const { data, isLoading } = useMyStudents({ class_id: classId || undefined });
  const students = data?.data?.students || [];
  const classes = classesData?.data || [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">My Students</h3>
      <div className="w-72">
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
          <SelectContent>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : students.length === 0 ? (
        <p className="text-muted-foreground">No students found for this class</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Student #</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>{s.student_number || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MyAttendanceReport() {
  const { data, isLoading } = useMyAttendance();
  const records = data?.data?.records || [];
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">My Attendance Records</h3>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : records.length === 0 ? (
        <p className="text-muted-foreground">No attendance records yet</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Class</TableHead><TableHead>Date</TableHead><TableHead>Present</TableHead><TableHead>Absent</TableHead><TableHead>Total</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.class_name}</TableCell>
                    <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-green-600">{r.present}</TableCell>
                    <TableCell className="text-red-600">{r.absent}</TableCell>
                    <TableCell>{r.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MyGradesReport() {
  const { data: examsData } = useExams({ limit: 200 });
  const [examId, setExamId] = useState("");
  const { data, isLoading } = useMyGrades({ exam_id: examId || undefined });
  const grades = data?.data?.grades || [];
  const exams = examsData?.data || [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Grades I Entered</h3>
      <div className="w-72">
        <Select value={examId} onValueChange={setExamId}>
          <SelectTrigger><SelectValue placeholder="All exams" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Exams</SelectItem>
            {exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : grades.length === 0 ? (
        <p className="text-muted-foreground">No grades entered yet</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Student</TableHead><TableHead>Exam</TableHead><TableHead>Subject</TableHead><TableHead>Marks</TableHead><TableHead>Grade</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((g, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{g.first_name} {g.last_name}</TableCell>
                    <TableCell>{g.exam_name}</TableCell>
                    <TableCell>{g.subject_name}</TableCell>
                    <TableCell>{g.marks_obtained}</TableCell>
                    <TableCell><Badge variant="outline">{g.grade_letter || "—"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TeacherReports() {
  return (
    <div className="space-y-8">
      <MyStudentsReport />
      <MyAttendanceReport />
      <MyGradesReport />
    </div>
  );
}

// ── Finance Tab ──

function FeeCollectionReport() {
  const { data: classesData } = useClasses({ limit: 200 });
  const [classId, setClassId] = useState("");
  const { data, isLoading } = useFeeCollection({ class_id: classId || undefined });
  const collection = data?.data?.collection || [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Fee Collection</h3>
      <div className="w-72">
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Classes</SelectItem>
            {classesData?.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : collection.length === 0 ? (
        <p className="text-muted-foreground">No collection data</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Class</TableHead><TableHead>Method</TableHead><TableHead>Total</TableHead><TableHead>Transactions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {collection.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{c.class_name}</TableCell>
                    <TableCell className="capitalize">{c.payment_method}</TableCell>
                    <TableCell className="font-semibold">{parseFloat(c.total).toLocaleString()}</TableCell>
                    <TableCell>{c.transaction_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OutstandingReport() {
  const { data: classesData } = useClasses({ limit: 200 });
  const [classId, setClassId] = useState("");
  const { data, isLoading } = useOutstandingBalances({ class_id: classId || undefined });
  const report = data?.data;
  const students = report?.students || [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Outstanding Balances</h3>
      <div className="w-72">
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Classes</SelectItem>
            {classesData?.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {report && <StatCard title="Total Outstanding" value={report.total_outstanding?.toLocaleString()} color="text-red-600" />}
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : students.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Balance</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                    <TableCell>{s.class_name}</TableCell>
                    <TableCell className="font-semibold text-red-600">{parseFloat(s.total_balance).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RevenueExpensesReport() {
  const year = new Date().getFullYear();
  const { data, isLoading } = useRevenueVsExpenses({ year });
  const report = data?.data;
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Revenue vs Expenses — {year}</h3>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : report && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Total Revenue" value={report.total_revenue?.toLocaleString()} color="text-green-600" />
            <StatCard title="Total Expenses" value={report.total_expenses?.toLocaleString()} color="text-red-600" />
            <StatCard title="Net" value={report.net?.toLocaleString()} color={report.net >= 0 ? "text-green-600" : "text-red-600"} />
          </div>
          {report.months?.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Month</TableHead><TableHead>Revenue</TableHead><TableHead>Expenses</TableHead><TableHead>Net</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.months.filter((m) => m.revenue || m.expenses).map((m) => (
                      <TableRow key={m.month}>
                        <TableCell className="font-medium">{m.month_name}</TableCell>
                        <TableCell className="text-green-600">{m.revenue.toLocaleString()}</TableCell>
                        <TableCell className="text-red-600">{m.expenses.toLocaleString()}</TableCell>
                        <TableCell className={m.revenue - m.expenses >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                          {(m.revenue - m.expenses).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function FinanceReports() {
  return (
    <div className="space-y-8">
      <FeeCollectionReport />
      <OutstandingReport />
      <RevenueExpensesReport />
    </div>
  );
}

// ── HR Tab ──

function StaffDirectoryReport() {
  const [roleFilter, setRoleFilter] = useState("");
  const { data, isLoading } = useStaffDirectory({ role: roleFilter || undefined });
  const report = data?.data;
  const staff = report?.staff || [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Staff Directory</h3>
      <div className="flex gap-4">
        <div className="w-48">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger><SelectValue placeholder="All roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {report && (
        <div className="grid gap-4 md:grid-cols-4 mb-4">
          <StatCard title="Total Staff" value={report.total} />
          {Object.entries(report.by_role || {}).map(([role, count]) => (
            <StatCard key={role} title={role.charAt(0).toUpperCase() + role.slice(1)} value={count} />
          ))}
        </div>
      )}
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : staff.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell className="capitalize"><Badge variant="outline">{s.role}</Badge></TableCell>
                    <TableCell><Badge variant={s.status === "active" ? "success" : "secondary"}>{s.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PayrollSummaryReport() {
  const year = new Date().getFullYear();
  const { data, isLoading } = usePayrollSummary({ year });
  const report = data?.data;
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Payroll Summary — {year}</h3>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : report && (
        <>
          <StatCard title="Yearly Total" value={report.yearly_total?.toLocaleString()} />
          {report.monthly?.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Month</TableHead><TableHead>Employees</TableHead><TableHead>Basic Pay</TableHead><TableHead>Allowances</TableHead><TableHead>Deductions</TableHead><TableHead>Net Pay</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.monthly.map((m) => (
                      <TableRow key={m.month}>
                        <TableCell className="font-medium">{new Date(2000, m.month - 1).toLocaleString("default", { month: "long" })}</TableCell>
                        <TableCell>{m.employee_count}</TableCell>
                        <TableCell>{parseFloat(m.total_basic).toLocaleString()}</TableCell>
                        <TableCell>{parseFloat(m.total_allowances).toLocaleString()}</TableCell>
                        <TableCell>{parseFloat(m.total_deductions).toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">{parseFloat(m.total_net).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function HeadcountReport() {
  const { data, isLoading } = useHeadcount();
  const report = data?.data;
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Headcount</h3>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : report && (
        <>
          <StatCard title="Total Users" value={report.total} />
          <div className="grid gap-4 md:grid-cols-4">
            {(report.by_role || []).map((r) => (
              <StatCard key={r.role} title={r.role.charAt(0).toUpperCase() + r.role.slice(1)} value={r.count} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HRReports() {
  return (
    <div className="space-y-8">
      <StaffDirectoryReport />
      <PayrollSummaryReport />
      <HeadcountReport />
    </div>
  );
}

// ── Student Tab ──

function StudentGradesReport() {
  const user = useAuthStore((s) => s.user);
  const studentId = user?.id;
  const { data, isLoading } = useStudentGradeSummary(studentId);
  const report = data?.data;
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">My Grades</h3>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : report ? (
        <>
          <StatCard title="Overall Average" value={report.overall_average != null ? `${report.overall_average}%` : "—"} />
          {report.by_subject?.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Subject</TableHead><TableHead>Average</TableHead><TableHead>Exams</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.by_subject.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.subject_name}</TableCell>
                        <TableCell className="font-semibold">{s.average != null ? `${s.average}%` : "—"}</TableCell>
                        <TableCell>{s.exam_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      ) : <p className="text-muted-foreground">No grade data</p>}
    </div>
  );
}

function StudentAttendanceReport() {
  const user = useAuthStore((s) => s.user);
  const studentId = user?.id;
  const { data, isLoading } = useStudentAttendanceSummary(studentId);
  const report = data?.data;
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">My Attendance</h3>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : report ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard title="Total Days" value={report.total} />
            <StatCard title="Attendance Rate" value={report.present_percentage ? `${report.present_percentage}%` : "—"} color="text-green-600" />
          </div>
          {report.records?.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Status</TableHead><TableHead>Count</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.records.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="capitalize"><Badge>{r.status}</Badge></TableCell>
                        <TableCell className="font-semibold">{r.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      ) : <p className="text-muted-foreground">No attendance data</p>}
    </div>
  );
}

function StudentReports() {
  return (
    <div className="space-y-8">
      <StudentGradesReport />
      <StudentAttendanceReport />
    </div>
  );
}

// ── Main Page ──

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role || "admin";

  const tabs = useMemo(() => {
    const t = [];
    if (["owner", "admin"].includes(role)) t.push({ value: "admin", label: "Admin Reports" });
    if (["teacher"].includes(role)) t.push({ value: "teacher", label: "My Reports" });
    if (["finance"].includes(role)) t.push({ value: "finance", label: "Finance Reports" });
    if (["hr", "owner", "admin"].includes(role)) t.push({ value: "hr", label: "HR Reports" });
    if (["student"].includes(role)) t.push({ value: "student", label: "My Reports" });
    if (role === "owner" || role === "admin") {
      if (!t.find((x) => x.value === "finance")) t.push({ value: "finance", label: "Finance Reports" });
    }
    return t;
  }, [role]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Comprehensive reports and analytics for your school</p>
      </div>
      <Tabs defaultValue={tabs[0]?.value}>
        <TabsList>
          {tabs.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="admin"><AdminReports /></TabsContent>
        <TabsContent value="teacher"><TeacherReports /></TabsContent>
        <TabsContent value="finance"><FinanceReports /></TabsContent>
        <TabsContent value="hr"><HRReports /></TabsContent>
        <TabsContent value="student"><StudentReports /></TabsContent>
      </Tabs>
    </div>
  );
}
