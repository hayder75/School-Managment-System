import { useAuthStore } from "../store/auth";
import { useSystemStats } from "../hooks/useTenants";
import { useStudents, useEnrollmentStats } from "../hooks/useStudents";
import { useClasses } from "../hooks/useClasses";
import { useSubjects } from "../hooks/useSubjects";
import { useTeachers, useTeacherAssignments } from "../hooks/useTeachers";
import { useMyChildren } from "../hooks/useParents";
import { useMyAnnouncements } from "../hooks/useAnnouncements";
import { usePaymentSummary, usePayments, useMyFees, useCollectionReport, usePaymentTrends } from "../hooks/useFees";
import { useExpenseTotals } from "../hooks/useExpenses";
import { usePayroll } from "../hooks/usePayroll";
import { useStudentGradeSummary, useStudentAttendanceSummary, useMyStudents, useMyClassSummary, useStaffDirectory, useEnrollmentReport, useHeadcount, usePayrollSummary, useRevenueVsExpenses, useTeacherWorkload } from "../hooks/useReports";
import { useMaintenance, useMaintenanceSummary, usePurchases } from "../hooks/useRoleModules";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { BarChart, DonutChart, GroupedBarChart } from "../components/ui/charts";
import {
  Users, GraduationCap, BookOpen, School, Megaphone, UserCheck, DollarSign,
  TrendingDown, Wallet, CheckCircle, BarChart3,
  Building2, TrendingUp, CreditCard, AlertTriangle, ShieldAlert, Globe, Award,
  Wrench, Hammer, ShoppingCart,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

function useAssetSummary() {
  return useQuery({ queryKey: ["asset-summary"], queryFn: () => api.get("/assets/summary") });
}

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
          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard title="Schools" value={stats.schools || 0} icon={Building2} sub="Registered tenants" />
            <StatCard title="Branches" value={stats.branches || 0} icon={Globe} sub="Across all schools" />
            <StatCard title="Total Users" value={stats.totalUsers || 0} icon={Users} sub={`${stats.activeUsers || 0} active`} />
            <StatCard title="Students" value={stats.students || 0} icon={GraduationCap} sub="All enrolled" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-3 gap-4">
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
  const { data: paymentSummary } = usePaymentSummary();
  const { data: expenseTotals } = useExpenseTotals();
  const { data: announcementsData } = useMyAnnouncements();
  const year = String(new Date().getFullYear());

  const { data: enrollmentData } = useEnrollmentReport();
  const { data: headcountData } = useHeadcount();
  const { data: payrollData } = usePayrollSummary({ year });
  const { data: revenueData } = useRevenueVsExpenses({ year });
  const { data: workloadData } = useTeacherWorkload();

  const totalExpenses = expenseTotals?.data?.reduce((s, e) => s + parseFloat(e.total || 0), 0) || 0;
  const totalCollected = paymentSummary?.data?.total_collected || 0;
  const totalOutstanding = paymentSummary?.data?.outstanding || 0;

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const PALETTE = ["#2c5a5e", "#7fb3a0", "#c9a86a", "#8f9bb3", "#d47a6a", "#6a8fd4", "#a0b2c6", "#e0a458"];
  const ROLE_LABELS = {
    owner: "Owner", admin: "Admin", teacher: "Teacher", finance: "Finance", cashier: "Cashier",
    hr: "HR", support: "Support", parent: "Parent", student: "Student",
  };

  const levelBars = (enrollmentData?.data?.level_breakdown || []).map((l) => ({ label: l.label, value: l.count }));
  const genderSegments = (enrollmentData?.data?.gender_breakdown || []).map((g, i) => ({
    label: g.gender === "unknown" ? "Unknown" : g.gender === "female" ? "Female" : "Male",
    value: g.count,
    color: PALETTE[i % PALETTE.length],
  }));
  const staffSegments = (headcountData?.data?.by_role || [])
    .filter((r) => r.role !== "student" && r.role !== "parent")
    .map((r, i) => ({
      label: ROLE_LABELS[r.role] || r.role,
      value: r.count,
      color: PALETTE[i % PALETTE.length],
    }));
  const staffTotal = staffSegments.reduce((s, r) => s + r.value, 0);
  const payrollBars = (payrollData?.data?.monthly || []).map((m) => ({
    label: MONTHS[m.month - 1],
    value: Math.round(parseFloat(m.total_net || 0)),
  }));
  const revenueMonths = (revenueData?.data?.months || []).map((m) => ({
    label: m.month_name,
    revenue: Math.round(parseFloat(m.revenue || 0)),
    expenses: Math.round(parseFloat(m.expenses || 0)),
  }));
  const workloadTop = (workloadData?.data?.workload || [])
    .slice()
    .sort((a, b) => (b.total_assignments || 0) - (a.total_assignments || 0))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Dashboard</h1><p className="text-muted-foreground">School overview</p></div>
      <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Students" value={studentsData?.meta?.total || "—"} icon={GraduationCap} sub={`${enrollmentData?.data?.total_enrolled ?? "—"} enrolled`} />
        <StatCard title="Teachers" value={teachersData?.meta?.total || "—"} icon={Users} sub={`${workloadData?.data?.workload?.length || 0} with assignments`} />
        <StatCard title="Classes" value={classesData?.meta?.total || "—"} icon={BookOpen} />
        <StatCard title="Subjects" value={subjectsData?.meta?.total || "—"} icon={School} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Fees Collected" value={totalCollected ? `$${totalCollected.toLocaleString()}` : "—"} icon={DollarSign} color="text-green-600" />
        <StatCard title="Total Expenses" value={totalExpenses ? `$${totalExpenses.toLocaleString()}` : "—"} icon={TrendingDown} color="text-red-600" />
        <StatCard title="Net Balance" value={totalCollected ? `$${(totalCollected - totalExpenses).toLocaleString()}` : "—"} icon={BarChart3} color={totalCollected >= totalExpenses ? "text-green-600" : "text-red-600"} />
        <StatCard title="Outstanding Fees" value={totalOutstanding ? `$${totalOutstanding.toLocaleString()}` : "$0"} icon={AlertTriangle} color={totalOutstanding > 0 ? "text-yellow-600" : "text-green-600"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Students by Level</CardTitle></CardHeader>
          <CardContent><BarChart data={levelBars} height={200} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Gender Distribution</CardTitle></CardHeader>
          <CardContent><DonutChart total={enrollmentData?.data?.total_enrolled || 0} segments={genderSegments} /></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Staff by Role</CardTitle></CardHeader>
          <CardContent><DonutChart total={staffTotal} segments={staffSegments} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payroll by Month ({year})</CardTitle></CardHeader>
          <CardContent><BarChart data={payrollBars} height={200} color="#6a8fd4" /></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Revenue vs Expenses ({year})</span>
              <span className="flex items-center gap-3 text-[11px] font-normal text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#2c5a5e" }} /> Revenue</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#d47a6a" }} /> Expenses</span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GroupedBarChart data={revenueMonths} series={[{ key: "revenue", label: "Revenue", color: "#2c5a5e" }, { key: "expenses", label: "Expenses", color: "#d47a6a" }]} height={200} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" /> Top Teacher Workload</CardTitle></CardHeader>
          <CardContent>
            {workloadTop.length === 0 ? (
              <p className="text-muted-foreground text-sm">No teaching assignments yet</p>
            ) : (
              <div className="space-y-2">
                {workloadTop.map((w) => (
                  <div key={w.teacher_id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <span className="font-medium">{w.first_name} {w.last_name}</span>
                    <span className="text-xs text-muted-foreground">{w.total_assignments} class-subject assignments</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
  const { data: classSummaryData } = useMyClassSummary();
  const myStudents = myStudentsData?.data || [];
  const assignments = assignmentsData?.data || [];
  const classSummary = classSummaryData?.data || {};
  const taughtClassCount = new Set(assignments.map((a) => a.class_id)).size;
  const taughtSubjectCount = new Set(assignments.map((a) => a.subject_id)).size;

  const classBars = (classSummary.byClass || []).map((c) => ({
    label: c.class_name.replace(/^Grade\s*/, ""),
    value: c.students,
  }));
  const subjectSegments = (classSummary.subjects || []).map((s, i) => ({
    label: s,
    value: (classSummary.byClass || []).filter((c) => (c.subjects || []).includes(s)).length,
    color: ["#2c5a5e", "#7fb3a0", "#c9a86a", "#8f9bb3", "#d47a6a", "#6a8fd4"][i % 6],
  }));

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Teacher Dashboard</h1><p className="text-muted-foreground">Welcome back, {user?.firstName} {user?.lastName}</p></div>
      <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="My Classes" value={taughtClassCount || "—"} icon={BookOpen} sub="Classes taught" />
        <StatCard title="Subjects" value={taughtSubjectCount || "—"} icon={School} sub="Assigned to teach" />
        <StatCard title="Students" value={myStudents.length || classSummary.totalStudents || "—"} icon={GraduationCap} sub="Across all classes" />
      </div>
      {assignments.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No classes or subjects assigned yet. Contact the school administrator to set up your teaching assignments.
          </CardContent>
        </Card>
      )}
      {classBars.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" /> Students by Class</CardTitle></CardHeader>
            <CardContent>
              <BarChart data={classBars} height={190} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><School className="h-4 w-4" /> Subjects Taught</CardTitle></CardHeader>
            <CardContent>
              <DonutChart total={classSummary.totalClasses || 0} segments={subjectSegments} />
            </CardContent>
          </Card>
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-4 gap-4">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
      <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Linked Children" value={children.length} icon={Users} />
        <StatCard title="Active" value={children.filter((c) => c.status === "active").length} icon={CheckCircle} color="text-green-600" />
        <StatCard title="Outstanding Fees" value={totalOutstanding ? `$${totalOutstanding.toLocaleString()}` : "$0"} icon={DollarSign} color={totalOutstanding > 0 ? "text-red-600" : "text-green-600"} />
      </div>
      {children.map((c) => <ChildAcademicCard key={c.id} child={c} />)}
      {(myFees.payments?.length > 0 || myFees.total_paid > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Fee Payments</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
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
              {(myFees.payments || []).slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <span>{p.fee_name || "Fee"} · {p.first_name} {p.last_name}</span>
                  <span className="font-medium">${parseFloat(p.amount_paid || 0).toFixed(2)}</span>
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
  const { data: paymentsData } = usePayments({ limit: 5 });

  const totalCollected = paymentSummary?.data?.total_collected || 0;
  const totalExpenses = expenseTotals?.data?.reduce((s, e) => s + parseFloat(e.total || 0), 0) || 0;
  const recentPayments = paymentsData?.data || [];

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Finance Dashboard</h1><p className="text-muted-foreground">Financial overview</p></div>
      <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <span className="font-medium">${parseFloat(p.amount_paid || 0).toFixed(2)}</span>
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

function CashierDashboard() {
  const user = useAuthStore((s) => s.user);
  const year = String(new Date().getFullYear());
  const { data: paymentSummary } = usePaymentSummary();
  const { data: paymentsData } = usePayments({ limit: 6 });
  const { data: announcementsData } = useMyAnnouncements();
  const { data: unpaidData } = useCollectionReport({
    month: String(new Date().getMonth() + 1),
    year,
  });
  const { data: trendData } = usePaymentTrends({ year });

  const summary = paymentSummary?.data || {};
  const recentPayments = paymentsData?.data || [];
  const totals = unpaidData?.data?.totals || {};
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trendBars = (trendData?.data?.months || []).map((m) => ({ label: MONTHS[m.month - 1], value: m.total }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cashier Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.firstName} {user?.lastName}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Collected Today" value={summary.today_collected ? `$${summary.today_collected.toLocaleString()}` : "$0"} icon={Wallet} color="text-green-600" sub={`${summary.today_transactions || 0} transactions`} />
        <StatCard title="This Month" value={summary.month_collected ? `$${summary.month_collected.toLocaleString()}` : "$0"} icon={TrendingUp} color="text-blue-600" sub={`${summary.month_transactions || 0} transactions`} />
        <StatCard title="Total Collected" value={summary.total_collected ? `$${summary.total_collected.toLocaleString()}` : "$0"} icon={DollarSign} color="text-green-600" />
        <StatCard title="Uncollected Students" value={totals.unpaid_count ?? "—"} icon={AlertTriangle} color="text-yellow-600" sub={totals.total_students ? `${totals.total_students} enrolled` : "this month"} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">My Recent Collections</CardTitle></CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-muted-foreground text-sm">No payments recorded yet</p>
            ) : (
              <div className="space-y-2">
                {recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <span className="font-medium">{p.first_name} {p.last_name}</span>
                    <span className="text-xs text-muted-foreground">{p.fee_name || ""}</span>
                    <span className="font-medium">${parseFloat(p.amount_paid || 0).toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">{p.paid_date ? new Date(p.paid_date).toLocaleDateString() : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Monthly Collections</CardTitle></CardHeader>
          <CardContent>
            <BarChart data={trendBars} height={190} />
          </CardContent>
        </Card>
      </div>
      <AnnouncementsList data={announcementsData} />
    </div>
  );
}

function HRDashboard() {
  const { data: staffData } = useStaffDirectory();
  const { data: payrollData } = usePayroll({ limit: 5 });

  const recentPayroll = payrollData?.data || [];

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">HR Dashboard</h1><p className="text-muted-foreground">Staff & payroll overview</p></div>
      <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Staff" value={staffData?.data?.total || "—"} icon={Users} sub="Total employees" />
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
                  <span className="font-medium">${parseFloat(p.net_pay || 0).toFixed(2)}</span>
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
  if (role === "general_manager" || role === "principal" || role === "vice_principal" || role === "quality_director") return <AdminDashboard />;
  if (role === "accountant" || role === "finance") return <FinanceDashboard />;
  if (role === "teacher") return <TeacherDashboard />;
  if (role === "student") return <StudentDashboard />;
  if (role === "parent") return <ParentDashboard />;
  if (role === "cashier") return <CashierDashboard />;
  if (role === "hr" || role === "shift_coordinator") return <HRDashboard />;
  if (role === "general_services") return <GeneralServicesDashboard />;
  if (role === "security_head" || role === "support") return <MinimalDashboard />;

  return <AdminDashboard />;
}

function GeneralServicesDashboard() {
  const { data: sumData } = useMaintenanceSummary();
  const { data: maintData } = useMaintenance({});
  const { data: purData } = usePurchases({});
  const { data: assetSum } = useAssetSummary();
  const { data: ann } = useMyAnnouncements();

  const s = sumData?.data || {};
  const recentTickets = (maintData?.data || []).slice(0, 5);
  const pendingPurchases = (purData?.data || []).filter((p) => p.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">General Services Dashboard</h1>
        <p className="text-muted-foreground">Campus facilities, maintenance and purchasing overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 sm:grid-cols-4">
        <StatCard title="Open Tickets" value={s.open ?? 0} icon={Wrench} color="text-blue-600" sub="Repairs waiting to start" />
        <StatCard title="In Progress" value={s.in_progress ?? 0} icon={Hammer} color="text-yellow-600" sub="Being fixed now" />
        <StatCard title="Completed" value={s.completed ?? 0} icon={CheckCircle} color="text-green-600" sub={`Spent ${Number(s.total_spent || 0).toLocaleString()} ETB`} />
        <StatCard title="Purchase Requests" value={pendingPurchases.length} icon={ShoppingCart} color="text-purple-600" sub="Pending approval" />
      </div>

      <div className="grid gap-6 lg:grid-cols-1 sm:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Recent maintenance tickets</CardTitle></CardHeader>
          <CardContent>
            {recentTickets.map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b py-2.5 last:border-0">
                <div>
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.location} · {m.category}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  m.status === "open" ? "bg-blue-100 text-blue-700"
                  : m.status === "in_progress" ? "bg-amber-100 text-amber-700"
                  : m.status === "completed" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"
                }`}>{m.status.replace(/_/g, " ")}</span>
              </div>
            ))}
            {!recentTickets.length && <p className="py-4 text-sm text-muted-foreground">No tickets yet — campus is running smooth.</p>}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>School assets</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total value</span><span className="font-semibold">{Number(assetSum?.totals?.total_value || 0).toLocaleString()} ETB</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total units</span><span className="font-semibold">{assetSum?.totals?.total_quantity ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Under maintenance</span><span className="font-semibold text-amber-600">{assetSum?.totals?.in_maintenance ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Broken / disposed</span><span className="font-semibold text-red-600">{(assetSum?.totals?.broken_items ?? 0) + (assetSum?.totals?.disposed_items ?? 0)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Announcements</CardTitle></CardHeader>
            <CardContent>
              {(ann?.data || []).slice(0, 3).map((a) => (
                <div key={a.id} className="border-b pb-2 mb-2 last:border-0 last:mb-0">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
                </div>
              ))}
              {!(ann?.data || []).length && <p className="text-sm text-muted-foreground">No announcements.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MinimalDashboard() {
  const { user } = useAuthStore();
  const { data: ann } = useMyAnnouncements();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user?.firstName || user?.first_name || ""}</h1>
        <p className="text-muted-foreground">School announcements and updates</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Announcements</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(ann?.data || []).map((a) => (
            <div key={a.id} className="border-b pb-3 last:border-0 last:pb-0">
              <p className="font-medium text-sm">{a.title}</p>
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{a.created_at ? new Date(a.created_at).toLocaleDateString() : ""}</p>
            </div>
          ))}
          {!(ann?.data || []).length && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
