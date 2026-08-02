import { useAuthStore } from "../store/auth";
import { useSystemStats } from "../hooks/useTenants";
import { useStudents, useEnrollmentStats } from "../hooks/useStudents";
import { useClasses } from "../hooks/useClasses";
import { useSubjects } from "../hooks/useSubjects";
import { useTeachers, useTeacherAssignments } from "../hooks/useTeachers";
import { useMyChildren } from "../hooks/useParents";
import { useMyAnnouncements } from "../hooks/useAnnouncements";
import { usePaymentSummary, usePayments, useMyFees } from "../hooks/useFees";
import { useExpenseTotals } from "../hooks/useExpenses";
import { usePayrollSummary, usePayroll } from "../hooks/usePayroll";
import { useStudentGradeSummary, useStudentAttendanceSummary, useStudentReport, useMyStudents } from "../hooks/useReports";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Users, GraduationCap, BookOpen, School, Megaphone, UserCheck, DollarSign,
  TrendingDown, Wallet, Calendar, CheckCircle, XCircle, Clock, BarChart3,
  Building2, TrendingUp, CreditCard, AlertTriangle, ShieldAlert, Globe, Award,
} from "lucide-react";

function StatCard({ title, value, icon: Icon, sub, color }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value ?? "—"}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function AnnouncementsList({ data }) {
  const items = data?.data || [];
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-4 w-4" /> Recent Announcements</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? <p className="text-muted-foreground text-sm">No recent announcements</p> : (
          <div className="space-y-2">
            {items.slice(0, 5).map((a) => (
              <div key={a.id} className="p-3 border rounded-lg">
                <p className="font-medium text-sm">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SuperAdminDashboard() {
  const { data: statsData, isLoading } = useSystemStats();
  const stats = statsData?.data || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Overview</h1>
        <p className="text-muted-foreground">Monitor all schools across the platform</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading system stats...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Schools" value={stats.schools || 0} icon={Building2} sub="Registered tenants" />
            <StatCard title="Branches" value={stats.branches || 0} icon={Globe} sub="Across all schools" />
            <StatCard title="Total Users" value={stats.totalUsers || 0} icon={Users} sub={`${stats.activeUsers || 0} active`} />
            <StatCard title="Students" value={stats.students || 0} icon={GraduationCap} sub="All enrolled" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Teachers" value={stats.teachers || 0} icon={BookOpen} color="text-blue-600" />
            <StatCard title="System Admins" value={stats.superAdmins || 0} icon={ShieldAlert} color="text-purple-600" />
            <StatCard title="System Status" value="Online" icon={CheckCircle} color="text-green-600" sub="All systems operational" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4" /> Subscription Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.planBreakdown?.length > 0 ? (
                <div className="space-y-2">
                  {stats.planBreakdown.map((p) => (
                    <div key={p.subscription_plan} className="flex items-center justify-between p-2 border rounded text-sm">
                      <span className="capitalize font-medium">{p.subscription_plan}</span>
                      <span className="text-muted-foreground">{p.count} school{p.count !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No schools registered</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function AdminDashboard() {
  const { data: studentsData } = useStudents({ limit: 1 });
  const { data: classesData } = useClasses({ limit: 1 });
  const { data: subjectsData } = useSubjects({ limit: 1 });
  const { data: teachersData } = useTeachers({ limit: 1 });
  const { data: enrollmentStats } = useEnrollmentStats();
  const { data: paymentSummary } = usePaymentSummary();
  const { data: expenseTotals } = useExpenseTotals();
  const { data: announcementsData } = useMyAnnouncements();

  const totalExpenses = expenseTotals?.data?.reduce((s, e) => s + parseFloat(e.total || 0), 0) || 0;
  const totalCollected = paymentSummary?.data?.total_collected || 0;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Dashboard</h1><p className="text-muted-foreground">School overview</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Students" value={studentsData?.meta?.total || "—"} icon={GraduationCap} sub={`${enrollmentStats?.data?.byClass?.length || 0} classes`} />
        <StatCard title="Teachers" value={teachersData?.meta?.total || "—"} icon={Users} />
        <StatCard title="Classes" value={classesData?.meta?.total || "—"} icon={BookOpen} />
        <StatCard title="Subjects" value={subjectsData?.meta?.total || "—"} icon={School} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Fees Collected" value={totalCollected ? `$${totalCollected.toLocaleString()}` : "—"} icon={DollarSign} color="text-green-600" />
        <StatCard title="Total Expenses" value={totalExpenses ? `$${totalExpenses.toLocaleString()}` : "—"} icon={TrendingDown} color="text-red-600" />
        <StatCard title="Net Balance" value={totalCollected ? `$${(totalCollected - totalExpenses).toLocaleString()}` : "—"} icon={BarChart3} color={totalCollected >= totalExpenses ? "text-green-600" : "text-red-600"} />
      </div>
      <AnnouncementsList data={announcementsData} />
    </div>
  );
}

function TeacherDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: myStudentsData } = useMyStudents();
  const { data: announcementsData } = useMyAnnouncements();
  const { data: assignmentsData } = useTeacherAssignments(user?.id);
  const myStudents = myStudentsData?.data || [];
  const assignments = assignmentsData?.data || [];
  const taughtClassCount = new Set(assignments.map((a) => a.class_id)).size;
  const taughtSubjectCount = new Set(assignments.map((a) => a.subject_id)).size;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Teacher Dashboard</h1><p className="text-muted-foreground">Welcome back, {user?.firstName} {user?.lastName}</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="My Classes" value={taughtClassCount || "—"} icon={BookOpen} sub="Classes taught" />
        <StatCard title="Subjects" value={taughtSubjectCount || "—"} icon={School} sub="Assigned to teach" />
        <StatCard title="Students" value={myStudents.length || "—"} icon={GraduationCap} sub="Across all classes" />
      </div>
      {myStudents.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">My Students</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myStudents.slice(0, 10).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <span className="font-medium">{s.first_name} {s.last_name}</span>
                  <span className="text-muted-foreground">{s.class_name || "—"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <AnnouncementsList data={announcementsData} />
    </div>
  );
}

function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: gradeData } = useStudentGradeSummary(user?.id);
  const { data: attendanceData } = useStudentAttendanceSummary(user?.id);
  const { data: announcementsData } = useMyAnnouncements();

  const grades = gradeData?.data || {};
  const attendance = attendanceData?.data || {};
  const presentPct = attendance.present_percentage;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Student Dashboard</h1><p className="text-muted-foreground">Welcome back, {user?.firstName} {user?.lastName}</p></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Overall Average" value={grades.overall_average ? `${grades.overall_average}%` : "—"} icon={BarChart3} color="text-blue-600" />
        <StatCard title="GPA" value={grades.gpa != null ? grades.gpa.toFixed(1) : "—"} icon={Award} color="text-indigo-600" />
        <StatCard title="Attendance" value={presentPct ? `${presentPct}%` : "—"} icon={UserCheck} sub={`${attendance.total || 0} days recorded`} color={presentPct >= 80 ? "text-green-600" : "text-yellow-600"} />
        <StatCard title="Subjects" value={grades.by_subject?.length || "—"} icon={BookOpen} sub="With recorded grades" />
      </div>
      {grades.by_subject?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Subject Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {grades.by_subject.map((s) => (
                <div key={s.subject_name} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm font-medium">{s.subject_name}</span>
                  <span className="text-sm">{s.average}% ({s.exam_count} exams)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <AnnouncementsList data={announcementsData} />
    </div>
  );
}

function ChildAcademicCard({ child }) {
  const { data: gradeData } = useStudentGradeSummary(child.user_id);
  const { data: attendanceData } = useStudentAttendanceSummary(child.user_id);
  const grades = gradeData?.data || {};
  const attendance = attendanceData?.data || {};

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{child.first_name} {child.last_name}</CardTitle>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            child.status === "active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
          }`}>{child.status}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Class: {child.class_name || "N/A"} · Student #: {child.student_number || "N/A"}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-3">
          <div className="p-2 border rounded">
            <p className="text-xs text-muted-foreground">Overall Average</p>
            <p className="text-lg font-bold">{grades.overall_average != null ? `${grades.overall_average}%` : "—"}</p>
          </div>
          <div className="p-2 border rounded">
            <p className="text-xs text-muted-foreground">GPA</p>
            <p className="text-lg font-bold">{grades.gpa != null ? grades.gpa.toFixed(1) : "—"}</p>
          </div>
          <div className="p-2 border rounded">
            <p className="text-xs text-muted-foreground">Attendance</p>
            <p className="text-lg font-bold">{attendance.present_percentage != null ? `${attendance.present_percentage}%` : "—"}</p>
          </div>
          <div className="p-2 border rounded">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-lg font-bold">{child.outstanding_balance ? `$${Number(child.outstanding_balance).toLocaleString()}` : "$0"}</p>
          </div>
        </div>
        {grades.by_subject?.length > 0 && (
          <div className="space-y-1">
            {grades.by_subject.map((s) => (
              <div key={s.subject_name} className="flex items-center justify-between text-sm">
                <span>{s.subject_name}</span>
                <span className="text-muted-foreground">{s.average}% · {s.exam_count} exam{s.exam_count !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ParentDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data: myChildrenData } = useMyChildren();
  const { data: announcementsData } = useMyAnnouncements();
  const { data: myFeesData } = useMyFees();
  const children = myChildrenData?.data || [];
  const myFees = myFeesData?.data || {};
  const totalOutstanding = children.reduce((s, c) => s + (parseFloat(c.outstanding_balance) || 0), 0);

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Parent Dashboard</h1><p className="text-muted-foreground">Welcome back, {user?.firstName} {user?.lastName}</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Linked Children" value={children.length} icon={Users} />
        <StatCard title="Active" value={children.filter((c) => c.status === "active").length} icon={CheckCircle} color="text-green-600" />
        <StatCard title="Outstanding Fees" value={totalOutstanding ? `$${totalOutstanding.toLocaleString()}` : "$0"} icon={DollarSign} color={totalOutstanding > 0 ? "text-red-600" : "text-green-600"} />
      </div>
      {children.map((c) => <ChildAcademicCard key={c.id} child={c} />)}
      {(myFees.payments?.length > 0 || myFees.total_paid > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Fee Payments</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-2 border rounded">
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-lg font-bold">${Number(myFees.total_paid || 0).toLocaleString()}</p>
              </div>
              <div className="p-2 border rounded">
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-lg font-bold">${Number(myFees.outstanding || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="space-y-2">
              {myFees.payments.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <span>{p.fee_name || "Fee"} · {p.first_name} {p.last_name}</span>
                  <span className="font-medium">${parseFloat(p.amount_paid).toFixed(2)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    p.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}>{p.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <AnnouncementsList data={announcementsData} />
    </div>
  );
}

function FinanceDashboard() {
  const { data: paymentSummary } = usePaymentSummary();
  const { data: expenseTotals } = useExpenseTotals();
  const { data: payrollSummary } = usePayrollSummary();
  const { data: paymentsData } = usePayments({ limit: 5 });

  const totalCollected = paymentSummary?.data?.total_collected || 0;
  const totalExpenses = expenseTotals?.data?.reduce((s, e) => s + parseFloat(e.total || 0), 0) || 0;
  const recentPayments = paymentsData?.data || [];

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Finance Dashboard</h1><p className="text-muted-foreground">Financial overview</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Fees Collected" value={`$${totalCollected.toLocaleString()}`} icon={DollarSign} color="text-green-600" />
        <StatCard title="Total Expenses" value={`$${totalExpenses.toLocaleString()}`} icon={TrendingDown} color="text-red-600" />
        <StatCard title="Net" value={`$${(totalCollected - totalExpenses).toLocaleString()}`} icon={TrendingUp} color={totalCollected >= totalExpenses ? "text-green-600" : "text-red-600"} />
      </div>
      {recentPayments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Payments</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <span>{p.student_name || "Student"}</span>
                  <span className="font-medium">${parseFloat(p.amount_paid).toFixed(2)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    p.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}>{p.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HRDashboard() {
  const { data: payrollSummary } = usePayrollSummary();
  const { data: payrollData } = usePayroll({ limit: 5 });

  const recentPayroll = payrollData?.data || [];

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">HR Dashboard</h1><p className="text-muted-foreground">Staff & payroll overview</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Staff" value={"—"} icon={Users} sub="HR module" />
        <StatCard title="Payroll Entries" value={payrollData?.meta?.total || "—"} icon={CreditCard} color="text-blue-600" />
        <StatCard title="Pending Payroll" value={recentPayroll.filter((p) => p.status === "pending").length} icon={AlertTriangle} color="text-yellow-600" />
      </div>
      {recentPayroll.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Payroll</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentPayroll.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <span>{p.employee_name || `Staff #${p.user_id?.slice(0, 8)}`}</span>
                  <span className="font-medium">${parseFloat(p.net_pay).toFixed(2)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    p.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}>{p.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const role = user?.role;

  if (role === "super_admin") return <SuperAdminDashboard />;
  if (role === "admin" || role === "owner") return <AdminDashboard />;
  if (role === "teacher") return <TeacherDashboard />;
  if (role === "student") return <StudentDashboard />;
  if (role === "parent") return <ParentDashboard />;
  if (role === "finance") return <FinanceDashboard />;
  if (role === "hr") return <HRDashboard />;

  return <AdminDashboard />;
}
