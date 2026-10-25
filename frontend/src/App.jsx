import { useEffect, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, PERSIST_OPTIONS } from "./lib/queryClient";
import { useAuthStore } from "./store/auth";
import { I18nProvider } from "./i18n/I18nContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import RoleRoute from "./components/layout/RoleRoute";
import AppLayout from "./components/layout/AppLayout";
import { Toaster } from "./components/ui/toast";

const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const PublicReportPage = lazy(() => import("./pages/PublicReportPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const TenantsPage = lazy(() => import("./pages/super-admin/TenantsPage"));
const TenantDetailPage = lazy(() => import("./pages/super-admin/TenantDetailPage"));
const UsersPage = lazy(() => import("./pages/school-admin/UsersPage"));
const ClassesPage = lazy(() => import("./pages/school-admin/ClassesPage"));
const SubjectsPage = lazy(() => import("./pages/school-admin/SubjectsPage"));
const TeachersPage = lazy(() => import("./pages/school-admin/TeachersPage"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const ClassAttendanceStatsPage = lazy(() => import("./pages/ClassAttendanceStatsPage"));
const ExamsPage = lazy(() => import("./pages/ExamsPage"));
const TimetablePage = lazy(() => import("./pages/TimetablePage"));
const TimetableConfigPage = lazy(() => import("./pages/TimetableConfigPage"));
const ExamResultsPage = lazy(() => import("./pages/ExamResultsPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const FeeStructuresPage = lazy(() => import("./pages/FeeStructuresPage"));
const StudentFeesPage = lazy(() => import("./pages/StudentFeesPage"));
const MonthlyCollectionPage = lazy(() => import("./pages/MonthlyCollectionPage"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage"));
const CollectionReportPage = lazy(() => import("./pages/CollectionReportPage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const PayrollPage = lazy(() => import("./pages/PayrollPage"));
const SalaryRegisterPage = lazy(() => import("./pages/SalaryRegisterPage"));
const StaffDetailPage = lazy(() => import("./pages/StaffDetailPage"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const ImportPage = lazy(() => import("./pages/ImportPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const StudentDetailPage = lazy(() => import("./pages/StudentDetailPage"));
const ParentsPage = lazy(() => import("./pages/ParentsPage"));
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage"));
const OperationsPage = lazy(() => import("./pages/OperationsPage"));
const BackupPage = lazy(() => import("./pages/BackupPage"));
const TaxSettingsPage = lazy(() => import("./pages/TaxSettingsPage"));
const LeaveManagementPage = lazy(() => import("./pages/LeaveManagementPage"));
const HrHomeroomPage = lazy(() => import("./pages/HrHomeroomPage"));
const PayrollAuditPage = lazy(() => import("./pages/PayrollAuditPage"));
const RolesPermissionsPage = lazy(() => import("./pages/school-admin/RolesPermissionsPage"));
const AssetManagementPage = lazy(() => import("./pages/AssetManagementPage"));
const TeacherAttendancePage = lazy(() => import("./pages/TeacherAttendancePage"));
const TeacherKpiPage = lazy(() => import("./pages/TeacherKpiPage"));
const StaffPerformancePage = lazy(() => import("./pages/StaffPerformancePage"));
const OvertimePage = lazy(() => import("./pages/OvertimePage"));
const ReportCardsPage = lazy(() => import("./pages/ReportCardsPage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const QualityAssurancePage = lazy(() => import("./pages/QualityAssurancePage"));
const TeacherWorkspacePage = lazy(() => import("./pages/TeacherWorkspacePage"));
const ShiftDutyHubPage = lazy(() => import("./pages/ShiftDutyHubPage"));
const SecurityHubPage = lazy(() => import("./pages/SecurityHubPage"));
const GeneralServicesPage = lazy(() => import("./pages/GeneralServicesPage"));
const AccountantReconciliationPage = lazy(() => import("./pages/AccountantReconciliationPage"));
const ExecutiveDashboardPage = lazy(() => import("./pages/ExecutiveDashboardPage"));
const DisciplineManagementPage = lazy(() => import("./pages/DisciplineManagementPage"));
const SmsPage = lazy(() => import("./pages/SmsPage"));
const FaceAttendancePage = lazy(() => import("./pages/FaceAttendancePage"));
const KgSchedulePage = lazy(() => import("./pages/KgSchedulePage"));
const EnrollmentWizardPage = lazy(() => import("./pages/EnrollmentWizardPage"));
const SetPasswordPage = lazy(() => import("./pages/auth/SetPasswordPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const LibraryTransactionsPage = lazy(() => import("./pages/LibraryTransactionsPage"));
const LibraryInventoryPage = lazy(() => import("./pages/LibraryInventoryPage"));
const MyLibraryPage = lazy(() => import("./pages/MyLibraryPage"));

function AppContent() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchMe();
  }, []);

  return (
    <>
    <Toaster />
    <Routes>
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/set-password" element={<SetPasswordPage />} />
      <Route path="/share/r/:token" element={<PublicReportPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />

          <Route element={<RoleRoute roles={["super_admin"]} />}>
            <Route path="/admin/tenants" element={<TenantsPage />} />
            <Route path="/admin/tenants/:id" element={<TenantDetailPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "hr"]} permissions={["users.manage"]} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "general_manager", "principal", "vice_principal", "quality_director"]} permissions={["classes.manage"]} />}>
            <Route path="/classes" element={<ClassesPage />} />
          </Route>
          <Route element={<RoleRoute roles={["admin", "owner"]} permissions={["subjects.manage"]} />}>
            <Route path="/subjects" element={<SubjectsPage />} />
          </Route>
          <Route element={<RoleRoute roles={["admin", "owner", "hr", "quality_director", "principal", "vice_principal"]} permissions={["teachers.manage"]} />}>
            <Route path="/teachers" element={<TeachersPage />} />
          </Route>
          <Route element={<RoleRoute roles={["admin", "owner"]} permissions={["parents.manage"]} />}>
            <Route path="/parents" element={<ParentsPage />} />
          </Route>
          <Route element={<RoleRoute roles={["admin", "owner"]} permissions={["import.manage"]} />}>
            <Route path="/import" element={<ImportPage />} />
          </Route>
          <Route element={<RoleRoute roles={["admin", "owner"]} permissions={["backup.manage"]} />}>
            <Route path="/backup" element={<BackupPage />} />
          </Route>
          <Route element={<RoleRoute roles={["admin", "owner", "hr", "accountant"]} permissions={["tax-settings.manage"]} />}>
            <Route path="/tax-settings" element={<TaxSettingsPage />} />
          </Route>
          <Route element={<RoleRoute roles={["admin", "owner", "general_services"]} permissions={["operations.manage"]} />}>
            <Route path="/operations" element={<OperationsPage />} />
          </Route>
          <Route element={<RoleRoute roles={["admin", "owner"]} permissions={["roles.manage"]} />}>
            <Route path="/roles" element={<RolesPermissionsPage />} />
          </Route>
          <Route element={<RoleRoute roles={["admin", "owner"]} permissions={["settings.manage"]} />}>
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "teacher", "cashier", "finance", "quality_director", "principal", "vice_principal", "general_manager", "shift_coordinator"]} permissions={["students.view", "students.manage", "attendance.manage", "exams.manage", "grades.manage"]} />}>
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/students/:id" element={<StudentDetailPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/attendance/class/:classId/stats" element={<ClassAttendanceStatsPage />} />
            <Route path="/exams" element={<ExamsPage />} />
          </Route>

          {/* Enrollment wizard — cashier registers students at the counter */}
          <Route element={<RoleRoute roles={["admin", "owner", "cashier"]} permissions={["students.manage"]} />}>
            <Route path="/enroll" element={<EnrollmentWizardPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "hr", "teacher", "student", "parent", "cashier", "quality_director", "principal", "vice_principal", "general_manager", "shift_coordinator", "accountant", "general_services", "security_head"]} permissions={["timetable.view", "announcements.view", "announcements.manage"]} />}>
            <Route path="/timetable" element={<TimetablePage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
          </Route>

          {/* Exam & results — parents and students view published exams/results */}
          <Route element={<RoleRoute roles={["parent", "student"]} />}>
            <Route path="/exam-results" element={<ExamResultsPage />} />
          </Route>

          {/* Timetable auto-setup (admins / directors / HR) */}
          <Route element={<RoleRoute roles={["admin", "owner", "hr", "quality_director"]} />}>
            <Route path="/timetable-config" element={<TimetableConfigPage />} />
          </Route>

          {/* Early years (Nursery / LKG / UKG) schedule */}
          <Route element={<RoleRoute roles={["owner", "admin", "general_manager", "principal", "vice_principal", "quality_director", "hr"]} permissions={["timetable.manage", "timetable.view"]} />}>
            <Route path="/early-years" element={<KgSchedulePage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "teacher", "parent", "quality_director", "principal", "vice_principal", "general_manager", "shift_coordinator", "security_head", "support"]} permissions={["chat.access"]} />}>
            <Route path="/chat" element={<ChatPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "finance", "cashier", "accountant"]} permissions={["fees.manage", "payments.manage"]} />}>
            <Route path="/fees" element={<FeeStructuresPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "cashier"]} permissions={["fees.manage", "payments.manage"]} />}>
            <Route path="/student-fees" element={<StudentFeesPage />} />
            <Route path="/monthly-collection" element={<MonthlyCollectionPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "finance", "accountant", "general_services"]} permissions={["expenses.manage"]} />}>
            <Route path="/expenses" element={<ExpensesPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "finance", "cashier", "accountant"]} permissions={["payments.reconcile", "payments.manage"]} />}>
            <Route path="/reports/fee-collection" element={<CollectionReportPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "finance", "hr", "general_manager", "accountant"]} permissions={["payroll.view", "reports.view"]} />}>
            <Route path="/payroll" element={<PayrollPage />} />
            <Route path="/salary-register" element={<SalaryRegisterPage />} />
            <Route path="/staff/:id" element={<StaffDetailPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "finance", "hr", "teacher", "quality_director", "principal", "vice_principal", "general_manager", "accountant", "shift_coordinator", "security_head", "general_services", "cashier", "student", "parent"]} permissions={["reports.view"]} />}>
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "hr"]} permissions={["leave-management.manage", "payroll-audit.view"]} />}>
            <Route path="/leave-management" element={<LeaveManagementPage />} />
            <Route path="/hr/homeroom" element={<HrHomeroomPage />} />
            <Route path="/payroll-audit" element={<PayrollAuditPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "hr", "teacher", "general_services"]} permissions={["operations.manage"]} />}>
            <Route path="/assets" element={<AssetManagementPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "librarian", "general_services"]} permissions={["operations.manage"]} />}>
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/library/transactions" element={<LibraryTransactionsPage />} />
            <Route path="/library/inventory" element={<LibraryInventoryPage />} />
          </Route>

          <Route element={<RoleRoute roles={["student", "parent", "teacher", "admin", "owner", "librarian"]} />}>
            <Route path="/my-library" element={<MyLibraryPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "hr", "shift_coordinator", "principal", "vice_principal", "quality_director"]} permissions={["shifts.manage", "guard-roster.view"]} />}>
            <Route path="/shift-hub" element={<ShiftDutyHubPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "hr", "teacher", "shift_coordinator", "principal", "vice_principal", "quality_director", "general_services", "face_attendance"]} permissions={["staff-attendance.manage"]} />}>
            <Route path="/teacher-attendance" element={<TeacherAttendancePage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "hr", "teacher", "shift_coordinator", "principal", "vice_principal", "quality_director", "general_services"]} permissions={["staff-attendance.manage", "quality.review"]} />}>
            <Route path="/teacher-kpis" element={<TeacherKpiPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "quality_director", "principal", "vice_principal", "hr"]} permissions={["reports.view"]} />}>
            <Route path="/staff-performance" element={<StaffPerformancePage />} />
          </Route>

          {/* Report Cards */}
          <Route element={<RoleRoute roles={["admin", "owner", "principal", "vice_principal", "quality_director", "teacher", "general_manager"]} permissions={["reports.view"]} />}>
            <Route path="/report-cards" element={<ReportCardsPage />} />
          </Route>

          {/* Overtime (HR & Finance) */}
          <Route element={<RoleRoute roles={["admin", "owner", "hr", "finance", "accountant", "general_manager", "principal", "vice_principal"]} permissions={["payroll.view", "reports.view", "staff-attendance.manage"]} />}>
            <Route path="/hr/overtime" element={<OvertimePage />} />
          </Route>

          {/* Quality Director + reviewers */}
          <Route element={<RoleRoute roles={["admin", "owner", "quality_director", "principal", "vice_principal", "general_manager"]} permissions={["quality.review"]} />}>
            <Route path="/quality-assurance" element={<QualityAssurancePage />} />
          </Route>

          {/* Teacher workspace */}
          <Route element={<RoleRoute roles={["teacher", "admin", "owner"]} permissions={["quality.submit"]} />}>
            <Route path="/teacher/workspace" element={<TeacherWorkspacePage />} />
          </Route>

          {/* Security hub */}
          <Route element={<RoleRoute roles={["admin", "owner", "security_head", "general_manager", "principal", "vice_principal"]} permissions={["security.manage"]} />}>
            <Route path="/security-hub" element={<SecurityHubPage />} />
          </Route>

          {/* General services */}
          <Route element={<RoleRoute roles={["admin", "owner", "general_services", "general_manager"]} permissions={["services.manage"]} />}>
            <Route path="/general-services" element={<GeneralServicesPage />} />
          </Route>

          {/* Accountant portal */}
          <Route element={<RoleRoute roles={["admin", "owner", "accountant", "general_manager"]} permissions={["payments.reconcile"]} />}>
            <Route path="/accountant" element={<AccountantReconciliationPage />} />
          </Route>

          {/* GM executive dashboard */}
          <Route element={<RoleRoute roles={["general_manager", "owner"]} permissions={["payroll.approve", "expenses.approve"]} />}>
            <Route path="/executive-dashboard" element={<ExecutiveDashboardPage />} />
          </Route>

          {/* Discipline management — admins/principals manage, teachers report, parents view */}
          <Route element={<RoleRoute roles={["admin", "owner", "principal", "vice_principal", "general_manager", "quality_director", "teacher", "parent"]} permissions={["discipline.manage"]} />}>
            <Route path="/discipline" element={<DisciplineManagementPage />} />
          </Route>

          {/* SMS messaging — directors / admins send announcements to parents */}
          <Route element={<RoleRoute roles={["owner", "admin", "general_manager", "principal", "vice_principal", "quality_director"]} permissions={["sms.manage"]} />}>
            <Route path="/sms" element={<SmsPage />} />
          </Route>

          {/* Face-recognition staff attendance */}
          <Route element={<RoleRoute roles={["face_attendance", "admin", "owner", "hr", "principal", "vice_principal", "quality_director"]} permissions={["staff-attendance.manage"]} />}>
            <Route path="/face-attendance" element={<FaceAttendancePage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "super_admin"]} permissions={["audit.view"]} />}>
            <Route path="/audit-logs" element={<AuditLogsPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
    </>
  );
}

export default function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={PERSIST_OPTIONS}>
      <BrowserRouter>
        <I18nProvider>
          <AppContent />
        </I18nProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  );
}
