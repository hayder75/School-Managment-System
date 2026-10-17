// Route-chunk prefetch + role warm-up.
//
// The sidebar lazy-loads page chunks, so a click normally waits for
// (chunk download) + (data fetch). Prefetching the chunk on hover/focus
// removes the download from the click path; warming the role's main pages
// on idle amortises it further. Data itself is served from the persisted
// React Query cache after the first visit.

const ROUTE_CHUNKS = {
  "/dashboard": () => import("../pages/DashboardPage"),
  "/admin/tenants": () => import("../pages/super-admin/TenantsPage"),
  "/admin/tenants/:id": () => import("../pages/super-admin/TenantDetailPage"),
  "/users": () => import("../pages/school-admin/UsersPage"),
  "/classes": () => import("../pages/school-admin/ClassesPage"),
  "/subjects": () => import("../pages/school-admin/SubjectsPage"),
  "/teachers": () => import("../pages/school-admin/TeachersPage"),
  "/parents": () => import("../pages/ParentsPage"),
  "/students": () => import("../pages/StudentsPage"),
  "/students/:id": () => import("../pages/StudentDetailPage"),
  "/attendance": () => import("../pages/AttendancePage"),
  "/attendance/class/:classId/stats": () => import("../pages/ClassAttendanceStatsPage"),
  "/exams": () => import("../pages/ExamsPage"),
  "/timetable": () => import("../pages/TimetablePage"),
  "/chat": () => import("../pages/ChatPage"),
  "/fees": () => import("../pages/FeeStructuresPage"),
  "/student-fees": () => import("../pages/StudentFeesPage"),
  "/monthly-collection": () => import("../pages/MonthlyCollectionPage"),
  "/payments": () => import("../pages/PaymentsPage"),
  "/reports/fee-collection": () => import("../pages/CollectionReportPage"),
  "/expenses": () => import("../pages/ExpensesPage"),
  "/payroll": () => import("../pages/PayrollPage"),
  "/salary-register": () => import("../pages/SalaryRegisterPage"),
  "/staff/:id": () => import("../pages/StaffDetailPage"),
  "/audit-logs": () => import("../pages/AuditLogsPage"),
  "/reports": () => import("../pages/ReportsPage"),
  "/import": () => import("../pages/ImportPage"),
  "/settings": () => import("../pages/SettingsPage"),
  "/announcements": () => import("../pages/AnnouncementsPage"),
  "/operations": () => import("../pages/OperationsPage"),
  "/backup": () => import("../pages/BackupPage"),
  "/tax-settings": () => import("../pages/TaxSettingsPage"),
  "/leave-management": () => import("../pages/LeaveManagementPage"),
  "/hr/homeroom": () => import("../pages/HrHomeroomPage"),
  "/payroll-audit": () => import("../pages/PayrollAuditPage"),
  "/roles": () => import("../pages/school-admin/RolesPermissionsPage"),
  "/assets": () => import("../pages/AssetManagementPage"),
  "/teacher-attendance": () => import("../pages/TeacherAttendancePage"),
  "/teacher-kpis": () => import("../pages/TeacherKpiPage"),
  "/staff-performance": () => import("../pages/StaffPerformancePage"),
  "/quality-assurance": () => import("../pages/QualityAssurancePage"),
  "/teacher/workspace": () => import("../pages/TeacherWorkspacePage"),
  "/shift-hub": () => import("../pages/ShiftDutyHubPage"),
  "/security-hub": () => import("../pages/SecurityHubPage"),
  "/general-services": () => import("../pages/GeneralServicesPage"),
  "/accountant": () => import("../pages/AccountantReconciliationPage"),
  "/executive-dashboard": () => import("../pages/ExecutiveDashboardPage"),
  "/discipline": () => import("../pages/DisciplineManagementPage"),
  "/enroll": () => import("../pages/EnrollmentWizardPage"),
  "/change-password": () => import("../pages/ChangePasswordPage"),
};

// Top pages per role, warmed on idle after login / app load (see §10 of the
// performance plan). Only paths that exist in ROUTE_CHUNKS are used.
const ROLE_WARMUP = {
  owner: ["/dashboard", "/students", "/fees", "/monthly-collection", "/reports"],
  admin: ["/dashboard", "/students", "/fees", "/monthly-collection", "/reports"],
  general_manager: ["/executive-dashboard", "/dashboard", "/payroll", "/reports", "/students"],
  principal: ["/dashboard", "/quality-assurance", "/students", "/attendance", "/reports"],
  vice_principal: ["/dashboard", "/quality-assurance", "/students", "/attendance", "/reports"],
  quality_director: ["/dashboard", "/quality-assurance", "/students", "/attendance", "/reports"],
  hr: ["/dashboard", "/teacher-attendance", "/payroll", "/users", "/leave-management"],
  finance: ["/dashboard", "/fees", "/payments", "/reports/fee-collection", "/payroll"],
  cashier: ["/dashboard", "/enroll", "/students", "/monthly-collection"],
  accountant: ["/dashboard", "/accountant", "/fees", "/payroll"],
  teacher: ["/dashboard", "/timetable", "/attendance", "/teacher/workspace"],
  student: ["/dashboard", "/timetable", "/announcements"],
  parent: ["/dashboard", "/timetable", "/announcements", "/chat"],
  support: ["/dashboard", "/announcements", "/chat"],
  shift_coordinator: ["/shift-hub", "/timetable", "/teacher-attendance"],
  security_head: ["/security-hub", "/reports"],
  general_services: ["/dashboard", "/general-services", "/assets"],
};

const warmed = new Set();

export function prefetchRoute(path) {
  const load = ROUTE_CHUNKS[path];
  if (!load || warmed.has(path)) return;
  warmed.add(path);
  try {
    load().catch(() => warmed.delete(path));
  } catch {
    warmed.delete(path);
  }
}

function runIdle(fn) {
  if (typeof requestIdleCallback === "function") requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 400);
}

export function warmRole(role) {
  const paths = ROLE_WARMUP[role];
  if (!paths) return;
  runIdle(() => {
    // Stagger so warm-up never competes with the page the user is on.
    paths.forEach((p, i) => setTimeout(() => prefetchRoute(p), i * 250));
  });
}
