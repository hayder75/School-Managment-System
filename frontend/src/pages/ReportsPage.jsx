import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { usePaymentSummary, usePaymentTrends, useCollectionReport } from "../hooks/useFees";
import { useI18n } from "../i18n/I18nContext";
import api from "../lib/api";
import { useSubmissionSummary, useTeacherKpis, useVisitors, useGatePasses, useIncidents, useMaintenance, usePurchases, useMaintenanceSummary } from "../hooks/useRoleModules";
import { useShiftReports, useSubstitutions } from "../hooks/useShiftHub";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { BarChart, DonutChart } from "../components/ui/charts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
        <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-4 mb-4">
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
        <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-4">
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
          <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-5">
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
          <div className="grid gap-4 sm:grid-cols-3">
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

// ── Cashier Tab ──

function CashierReports() {
  const year = String(new Date().getFullYear());
  const month = String(new Date().getMonth() + 1);
  const { data: trendData } = usePaymentTrends({ year });
  const { data: summaryData } = usePaymentSummary();
  const { data: reportData } = useCollectionReport({ month, year });

  const summary = summaryData?.data || {};
  const totals = reportData?.data?.totals || {};
  const classes = reportData?.data?.classes || [];
  const months = trendData?.data?.months || [];

  const trendBars = months.map((m) => ({ label: MONTHS[m.month - 1], value: m.total }));

  const donut = [
    { label: "Paid", value: totals.paid_count, color: "#15803d" },
    { label: "Partial", value: totals.partial_count, color: "#d97706" },
    { label: "Unpaid", value: totals.unpaid_count, color: "#ef4444" },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-4">
        <StatCard title="Total Collected" value={`$${summary.total_collected?.toLocaleString() || 0}`} color="text-green-600" />
        <StatCard title="This Month" value={`$${summary.month_collected?.toLocaleString() || 0}`} sub={`${summary.month_transactions || 0} transactions`} />
        <StatCard title="Today" value={`$${summary.today_collected?.toLocaleString() || 0}`} sub={`${summary.today_transactions || 0} transactions`} />
        <StatCard title="Uncollected" value={totals.unpaid_count ?? 0} sub={`this month · ${totals.total_students || 0} students`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Monthly Collections — {year}</CardTitle></CardHeader>
          <CardContent><BarChart data={trendBars} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Collection Status — {MONTHS[(reportData?.data?.month || 1) - 1]} {year}</CardTitle></CardHeader>
          <CardContent>
            {donut.length > 0 ? (
              <DonutChart total={totals.total_students || 0} segments={donut} />
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Collected & Uncollected by Class — {MONTHS[(reportData?.data?.month || 1) - 1]} {year}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Partial</TableHead>
                <TableHead>Unpaid</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Collected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((c) => (
                <TableRow key={c.class_id}>
                  <TableCell className="font-medium">{c.class_name}</TableCell>
                  <TableCell>{c.student_count}</TableCell>
                  <TableCell className="text-green-600">{c.collected_count}</TableCell>
                  <TableCell className="text-yellow-600">{c.partial_count}</TableCell>
                  <TableCell className="text-red-600">{c.unpaid_count}</TableCell>
                  <TableCell className="text-right">{Number(c.expected).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{Number(c.collected).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {classes.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
        <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-4 mb-4">
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
          <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-4">
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
          <div className="grid gap-4 sm:grid-cols-2">
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

function SemesterResultsTab() {
  const user = useAuthStore((s) => s.user);
  const canPublish = ["admin", "owner", "principal", "vice_principal"].includes(user?.role);
  const { data: classesData } = useClasses({ limit: 300 });
  const classes = classesData?.data || [];
  const [classId, setClassId] = useState(classes[0]?.id || "");
  const [termId, setTermId] = useState("");

  const { data: termsData } = useQuery({
    queryKey: ["terms-list"],
    queryFn: () => api.get("/academics/terms"),
  });
  const terms = termsData?.data || [];
  void termId;

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!termId || !classId) return;
    setLoading(true);
    try {
      const res = await api.get("/reports/semester-results", { params: { term_id: termId, class_id: classId } });
      // attach publish state per student
      if (res.data?.students?.length) {
        const enriched = await Promise.all(res.data.students.map(async (s) => {
          try {
            const m = await api.get("/reports/report-card-meta", { params: { student_id: s.student_id, term_id: termId } });
            return { ...s, __published: !!m.data?.published, __remarks: m.data?.remarks || "" };
          } catch {
            return { ...s, __published: false, __remarks: "" };
          }
        }));
        res.data.students = enriched;
      }
      setResults(res.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Class</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-56 mt-1"><SelectValue placeholder="Choose class…" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.section ? ` · ${c.section}` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Term</Label>
          <Select value={termId} onValueChange={setTermId}>
            <SelectTrigger className="w-48 mt-1"><SelectValue placeholder="Choose term…" /></SelectTrigger>
            <SelectContent>
              {terms.map((tm) => (
                <SelectItem key={tm.id} value={tm.id}>{tm.name}{tm.year_name ? ` (${tm.year_name})` : ""}</SelectItem>
              ))}
              {!terms.length && <div className="px-3 py-2 text-xs text-muted-foreground">No terms configured</div>}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={load} disabled={!termId || !classId || loading}>Load results</Button>
        {results && results.students?.length > 0 && (
          <p className="text-sm text-muted-foreground ml-auto">
            Weights: CA {results.weights?.ca_pct ?? 50}% + Exam {results.weights?.exam_pct ?? 50}% · Scale A≥90 B≥80 C≥60 D≥50
          </p>
        )}
      </div>

      {!results && (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
          Select a class and term to compute semester marks out of 100, with rank and printable report cards.
        </CardContent></Card>
      )}

      {loading && <p className="text-sm text-muted-foreground">Computing semester marks…</p>}

      {results && !loading && (
        <>
          {results.students.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
              No grades recorded for this class in this term yet.
            </CardContent></Card>
          ) : (
            <Card><CardContent className="p-0 overflow-x-auto">
              <div className="overflow-x-auto -mx-px"><table className="w-full text-sm min-w-[760px] table-sticky-col">
                <thead><tr className="border-b bg-muted/50 text-left">
                  <th className="p-3 font-medium">#</th>
                  <th className="p-3 font-medium">Student</th>
                  {results.students[0]?.subjects.map((s, i) => (
                    <th key={s.subject_id || i} className="p-3 font-medium text-center text-xs">{s.name}</th>
                  ))}
                  <th className="p-3 font-medium text-center">Total</th>
                  <th className="p-3 font-medium text-center">Avg /100</th>
                  <th className="p-3 font-medium text-center">Grade</th>
                  <th className="p-3 font-medium text-center">Rank</th>
                  <th className="p-3 font-medium text-right">Report Card</th>
                </tr></thead>
                <tbody>
                  {results.students.map((st) => (
                    <tr key={st.student_id} className="border-b hover:bg-muted/30">
                      <td className="p-3">{st.rank}</td>
                      <td className="p-3 font-medium">{st.student_name}<span className="block text-[11px] text-muted-foreground">{st.student_number || ""}</span></td>
                      {results.students[0].subjects.map((s, i) => {
                        const mine = st.subjects[i];
                        return (
                          <td key={i} className="p-3 text-center">
                            {mine ? (<span>{mine.mark}<span className="text-xs text-muted-foreground"> ({mine.letter})</span></span>) : "—"}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center font-semibold">{st.total}</td>
                      <td className="p-3 text-center font-bold">{st.average}</td>
                      <td className="p-3 text-center">{st.letter}</td>
                      <td className="p-3 text-center"><Badge variant="outline">{st.rank}</Badge></td>
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <a href={`/api/pdf/report-card/${st.student_id}?term_id=${termId}`} target="_blank" rel="noreferrer"
                          className="text-primary underline text-xs font-medium">Print</a>
                        {canPublish && (
                          <>
                            <button
                              className="text-xs underline text-muted-foreground hover:text-foreground"
                              onClick={async () => {
                                const remarks = window.prompt("Report card remarks:", st.__remarks || "");
                                if (remarks === null) return;
                                await api.put("/reports/report-card-meta", {
                                  student_id: st.student_id, term_id: termId, remarks,
                                });
                                setResults((r) => ({
                                  ...r,
                                  students: r.students.map((x) => (x.student_id === st.student_id ? { ...x, __remarks: remarks } : x)),
                                }));
                              }}
                            >
                              Remark
                            </button>
                            <button
                              className={`text-xs font-semibold underline ${st.__published ? "text-green-600" : "text-orange-600"}`}
                              onClick={async () => {
                                const res = await api.put("/reports/report-card-meta", {
                                  student_id: st.student_id, term_id: termId,
                                  published: !st.__published,
                                });
                                setResults((r) => ({
                                  ...r,
                                  students: r.students.map((x) => (x.student_id === st.student_id ? {
                                    ...x, __published: res.data.published,
                                    __remarks: res.data.remarks ?? x.__remarks,
                                  } : x)),
                                }));
                              }}
                            >
                              {st.__published ? "Published ✓" : "Publish"}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </CardContent></Card>
          )}
        </>
      )}
    </div>
  );
}

function QualityReportsTab() {
  const { data: sumData } = useSubmissionSummary();
  const { data: kpiData } = useTeacherKpis();

  const s = sumData?.data || {};
  const counts = s.counts || {};
  const kpis = kpiData?.data || [];

  // Merge submission stats + KPI averages per teacher
  const teachers = {};
  for (const r of s.byTeacher || []) {
    teachers[r.teacher_id] = {
      name: r.teacher_name, subs: Number(r.total), approved: Number(r.approved),
      ratingSum: 0, ratingN: 0, syllabusSum: 0, feedbackSum: 0,
    };
  }
  for (const k of kpis) {
    if (!k.teacher_id) continue;
    if (!teachers[k.teacher_id]) {
      teachers[k.teacher_id] = { name: k.teacher_name, subs: 0, approved: 0, ratingSum: 0, ratingN: 0, syllabusSum: 0, feedbackSum: 0 };
    }
    const t = teachers[k.teacher_id];
    t.ratingSum += Number(k.overall_rating || 0);
    t.ratingN += 1;
    t.syllabusSum += Number(k.syllabus_completion_rate || 0);
    t.feedbackSum += Number(k.student_feedback_score || 0);
  }
  const rows = Object.values(teachers)
    .map((t) => ({
      ...t,
      rate: t.subs ? Math.round((t.approved / t.subs) * 100) : null,
      rating: t.ratingN ? (t.ratingSum / t.ratingN) : null,
      syllabus: t.ratingN ? Math.round(t.syllabusSum / t.ratingN) : null,
      feedback: t.ratingN ? (t.feedbackSum / t.ratingN) : null,
    }))
    .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));

  const rated = rows.filter((r) => r.rating !== null);
  const avgRating = rated.length ? (rated.reduce((a, r) => a + r.rating, 0) / rated.length).toFixed(2) : "—";
  const avgSyllabus = rated.length ? Math.round(rated.reduce((a, r) => a + r.syllabus, 0) / rated.length) : "—";
  const top = rated.slice(0, 3);
  const needsSupport = [...rated].reverse().slice(0, 3);

  const totalSubs = (counts.approved || 0) + (counts.needs_revision || 0) + (counts.submitted || 0) + (counts.rejected || 0);
  const approvalRate = totalSubs ? Math.round(((counts.approved || 0) / totalSubs) * 100) : 0;
  const rubric = [
    ["rubAlignment", counts.avg_alignment], ["rubDifficulty", counts.avg_difficulty],
    ["rubClarity", counts.avg_clarity], ["rubAnswerKey", counts.avg_answer_key],
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{totalSubs}</p><p className="text-xs text-muted-foreground">Content submissions reviewed</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-green-600">{approvalRate}%</p><p className="text-xs text-muted-foreground">First-pass approval rate</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-purple-600">{avgRating}</p><p className="text-xs text-muted-foreground">Avg teacher performance rating /5</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-blue-600">{avgSyllabus}%</p><p className="text-xs text-muted-foreground">Avg syllabus completion</p></CardContent></Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base text-green-700">Top performing teachers</CardTitle></CardHeader>
          <CardContent>{top.length ? top.map((r, i) => (
            <div key={i} className="flex items-center justify-between border-b py-2 last:border-0">
              <span className="text-sm font-medium">{i + 1}. {r.name}</span>
              <Badge className="bg-green-100 text-green-700">{r.rating.toFixed(2)} / 5</Badge>
            </div>
          )) : <p className="text-sm text-muted-foreground py-2">No KPI data yet</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base text-amber-700">Needs support</CardTitle></CardHeader>
          <CardContent>{needsSupport.length ? needsSupport.map((r, i) => (
            <div key={i} className="flex items-center justify-between border-b py-2 last:border-0">
              <span className="text-sm font-medium">{r.name}</span>
              <span className="flex items-center gap-2">
                {r.syllabus !== null && <span className="text-xs text-muted-foreground">syllabus {r.syllabus}%</span>}
                <Badge className="bg-amber-100 text-amber-700">{r.rating !== null ? r.rating.toFixed(2) : "—"} / 5</Badge>
              </span>
            </div>
          )) : <p className="text-sm text-muted-foreground py-2">No KPI data yet</p>}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Teacher quality overview — content reviews & appraisals</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <div className="overflow-x-auto -mx-px"><table className="w-full text-sm min-w-[720px]">
            <thead><tr className="border-b bg-muted/50 text-left">
              <th className="p-3 font-medium">Teacher</th>
              <th className="p-3 font-medium">Submissions</th>
              <th className="p-3 font-medium">Approved</th>
              <th className="p-3 font-medium">Approval %</th>
              <th className="p-3 font-medium">Avg rating /5</th>
              <th className="p-3 font-medium">Syllabus %</th>
              <th className="p-3 font-medium">Feedback /5</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3">{r.subs}</td>
                  <td className="p-3">{r.approved}</td>
                  <td className="p-3">{r.rate === null ? "—" : `${r.rate}%`}</td>
                  <td className="p-3 font-semibold">{r.rating !== null ? r.rating.toFixed(2) : "—"}</td>
                  <td className="p-3">{r.syllabus ?? "—"}%</td>
                  <td className="p-3">{r.feedback !== null ? r.feedback.toFixed(1) : "—"}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No data</td></tr>}
            </tbody>
          </table></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Rubric quality averages</CardTitle></CardHeader>
        <CardContent className="space-y-3 max-w-xl">
          {rubric.map(([key, val]) => (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1"><span>{RUBRIC_LABELS[key]}</span><span className="font-medium">{Number(val || 0).toFixed(2)} / 5</span></div>
              <div className="h-2 rounded bg-neutral-100"><div className="h-full rounded bg-neutral-900" style={{ width: `${(Number(val || 0) / 5) * 100}%` }} /></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

const RUBRIC_LABELS = {
  rubAlignment: "Curriculum alignment",
  rubDifficulty: "Cognitive rigor balance",
  rubClarity: "Clarity & formatting",
  rubAnswerKey: "Answer key completeness",
};

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const { t } = useI18n();
  const role = user?.role || "admin";
  void role;

  const tabs = useMemo(() => {
    const list = [];
    if (role === "quality_director") list.push({ value: "quality", label: t.rep.quality });
    if (["owner", "admin", "general_manager", "principal", "vice_principal"].includes(role))
      list.push({ value: "admin", label: t.rep.school });
    if (["quality_director", "principal", "vice_principal"].includes(role) && role !== "quality_director")
      list.push({ value: "quality", label: t.rep.quality });
    if (["owner", "admin", "general_manager", "principal", "vice_principal", "teacher"].includes(role))
      list.push({ value: "semester", label: t.rep.semester });
    if (["teacher"].includes(role)) list.push({ value: "teacher", label: t.rep.myReports });
    if (["finance", "accountant", "general_manager", "owner", "admin"].includes(role)) list.push({ value: "finance", label: t.rep.finance });
    if (["cashier"].includes(role)) list.push({ value: "cashier", label: t.rep.collection });
    if (["hr", "owner", "admin", "general_manager"].includes(role)) list.push({ value: "hr", label: t.rep.hr });
    if (role === "shift_coordinator") list.push({ value: "shifts", label: t.rep.shifts });
    if (role === "security_head") list.push({ value: "security", label: t.rep.securityRep });
    if (role === "general_services") list.push({ value: "facilities", label: t.rep.facilities });
    if (["student"].includes(role)) list.push({ value: "student", label: t.rep.myReports });
    return list;
  }, [role, t]);

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
        <TabsContent value="quality"><QualityReportsTab /></TabsContent>
        <TabsContent value="semester"><SemesterResultsTab /></TabsContent>
        <TabsContent value="admin"><AdminReports /></TabsContent>
        <TabsContent value="teacher"><TeacherReports /></TabsContent>
        <TabsContent value="finance"><FinanceReports /></TabsContent>
        <TabsContent value="cashier"><CashierReports /></TabsContent>
        <TabsContent value="hr"><HRReports /></TabsContent>
        <TabsContent value="student"><StudentReports /></TabsContent>
        <TabsContent value="shifts"><ShiftReportsTab /></TabsContent>
        <TabsContent value="security"><SecurityReportsTab /></TabsContent>
        <TabsContent value="facilities"><FacilitiesReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
