import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/auth";
import { I18nProvider } from "./i18n/I18nContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import RoleRoute from "./components/layout/RoleRoute";
import AppLayout from "./components/layout/AppLayout";
import { Toaster } from "./components/ui/toast";

const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const TenantsPage = lazy(() => import("./pages/super-admin/TenantsPage"));
const TenantDetailPage = lazy(() => import("./pages/super-admin/TenantDetailPage"));
const UsersPage = lazy(() => import("./pages/school-admin/UsersPage"));
const ClassesPage = lazy(() => import("./pages/school-admin/ClassesPage"));
const SubjectsPage = lazy(() => import("./pages/school-admin/SubjectsPage"));
const TeachersPage = lazy(() => import("./pages/school-admin/TeachersPage"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const ExamsPage = lazy(() => import("./pages/ExamsPage"));
const TimetablePage = lazy(() => import("./pages/TimetablePage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const FeeStructuresPage = lazy(() => import("./pages/FeeStructuresPage"));
const StudentFeesPage = lazy(() => import("./pages/StudentFeesPage"));
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
const PayrollAuditPage = lazy(() => import("./pages/PayrollAuditPage"));
const RolesPermissionsPage = lazy(() => import("./pages/school-admin/RolesPermissionsPage"));
const AssetManagementPage = lazy(() => import("./pages/AssetManagementPage"));
const TeacherAttendancePage = lazy(() => import("./pages/TeacherAttendancePage"));
const TeacherKpiPage = lazy(() => import("./pages/TeacherKpiPage"));
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
const EnrollmentWizardPage = lazy(() => import("./pages/EnrollmentWizardPage"));
const SetPasswordPage = lazy(() => import("./pages/auth/SetPasswordPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchMe();
  }, []);

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><p>Loading...</p></div>}>
    <Toaster />
    <Routes>
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/set-password" element={<SetPasswordPage />} />
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

          <Route
            element={
              <RoleRoute
                roles={["admin", "owner"]}
                permissions={["classes.manage", "subjects.manage", "teachers.manage", "parents.manage", "import.manage", "backup.manage", "tax-settings.manage", "operations.manage", "roles.manage", "settings.manage"]}
              />
            }
          >
            <Route path="/classes" element={<ClassesPage />} />
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/teachers" element={<TeachersPage />} />
            <Route path="/parents" element={<ParentsPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="/tax-settings" element={<TaxSettingsPage />} />
            <Route path="/operations" element={<OperationsPage />} />
            <Route path="/roles" element={<RolesPermissionsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "teacher", "cashier", "finance", "quality_director", "principal", "vice_principal", "general_manager", "shift_coordinator"]} />}>
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/students/:id" element={<StudentDetailPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/exams" element={<ExamsPage />} />
          </Route>

          {/* Enrollment wizard — cashier registers students at the counter */}
          <Route element={<RoleRoute roles={["admin", "owner", "cashier"]} />}>
            <Route path="/enroll" element={<EnrollmentWizardPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "teacher", "student", "parent", "cashier", "quality_director", "principal", "vice_principal", "general_manager", "shift_coordinator", "accountant", "general_services", "security_head"]} />}>
            <Route path="/timetable" element={<TimetablePage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "teacher", "parent", "quality_director", "principal", "vice_principal", "general_manager", "shift_coordinator", "security_head", "support"]} />}>
            <Route path="/chat" element={<ChatPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "finance", "cashier", "accountant"]} permissions={["fees.manage", "payments.manage"]} />}>
            <Route path="/fees" element={<FeeStructuresPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "cashier"]} permissions={[]} />}>
            <Route path="/student-fees" element={<StudentFeesPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "finance", "cashier", "accountant", "general_services"]} permissions={["expenses.manage"]} />}>
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

          <Route element={<RoleRoute roles={["admin", "owner", "finance", "hr", "teacher", "quality_director", "principal", "vice_principal", "general_manager", "accountant", "shift_coordinator", "security_head", "general_services"]} permissions={["reports.view"]} />}>
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "hr"]} permissions={["leave-management.manage", "payroll-audit.view"]} />}>
            <Route path="/leave-management" element={<LeaveManagementPage />} />
            <Route path="/payroll-audit" element={<PayrollAuditPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "hr", "teacher", "shift_coordinator", "principal", "vice_principal", "quality_director", "general_services"]} />}>
            <Route path="/assets" element={<AssetManagementPage />} />
            <Route path="/shift-hub" element={<ShiftDutyHubPage />} />
            <Route path="/teacher-attendance" element={<TeacherAttendancePage />} />
            <Route path="/teacher-kpis" element={<TeacherKpiPage />} />
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

          {/* Discipline management */}
          <Route element={<RoleRoute roles={["admin", "owner", "principal", "vice_principal"]} permissions={["discipline.manage"]} />}>
            <Route path="/discipline" element={<DisciplineManagementPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "super_admin"]} permissions={["audit.view"]} />}>
            <Route path="/audit-logs" element={<AuditLogsPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <I18nProvider>
          <AppContent />
        </I18nProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
