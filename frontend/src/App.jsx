import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/auth";
import { I18nProvider } from "./i18n/I18nContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import RoleRoute from "./components/layout/RoleRoute";
import AppLayout from "./components/layout/AppLayout";

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
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
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

          <Route element={<RoleRoute roles={["admin", "owner", "teacher", "cashier"]} />}>
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/students/:id" element={<StudentDetailPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/exams" element={<ExamsPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "teacher", "student", "parent"]} />}>
            <Route path="/timetable" element={<TimetablePage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "teacher", "parent"]} />}>
            <Route path="/chat" element={<ChatPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "finance", "cashier"]} permissions={["fees.manage", "payments.manage"]} />}>
            <Route path="/fees" element={<FeeStructuresPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "finance", "cashier"]} permissions={["fees.manage", "payments.manage", "reports.view"]} />}>
            <Route path="/reports/fee-collection" element={<CollectionReportPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "finance", "hr"]} permissions={["payroll.view", "reports.view"]} />}>
            <Route path="/payroll" element={<PayrollPage />} />
            <Route path="/salary-register" element={<SalaryRegisterPage />} />
            <Route path="/staff/:id" element={<StaffDetailPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "finance", "hr", "teacher"]} permissions={["reports.view"]} />}>
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          <Route element={<RoleRoute roles={["admin", "owner", "hr"]} permissions={["leave-management.manage", "payroll-audit.view"]} />}>
            <Route path="/leave-management" element={<LeaveManagementPage />} />
            <Route path="/payroll-audit" element={<PayrollAuditPage />} />
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
