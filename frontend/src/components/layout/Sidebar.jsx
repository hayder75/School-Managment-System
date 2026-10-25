import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { useI18n } from "../../i18n/I18nContext";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, BookPlus,
  Building2, Settings, LogOut, MessageSquare, Notebook,
  DollarSign, Wallet, TrendingDown,
  ShieldAlert, ShieldCheck, BarChart3, Upload, Megaphone, UserPlus,
  Bus, BedDouble, BookOpen as BookIcon, FileText, CalendarClock, ClipboardList,
  Package, CalendarRange, CalendarDays, UserCheck, Award,
  BadgeCheck, LockKeyhole, HardHat, Calculator, Crown, Gavel, Clock, ScanFace,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { prefetchRoute } from "../../lib/prefetch";
import { useMyHomeroomClasses } from "../../hooks/useAttendance";
import { Button } from "../ui/button";

const navItems = {
  super_admin: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/admin/tenants", label: "schools", icon: Building2 },
    { to: "/audit-logs", label: "auditLogs", icon: ShieldAlert },
  ],
  owner: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/users", label: "users", icon: Users },
    { to: "/teachers", label: "teachers", icon: Users },
    { to: "/students", label: "students", icon: GraduationCap },
    { to: "/parents", label: "parents", icon: UserPlus },
    { to: "/classes", label: "classes", icon: Notebook },
    { to: "/subjects", label: "subjects", icon: BookOpen },
    { to: "/attendance", label: "attendance", icon: Users },
    { to: "/exams", label: "exams", icon: BookOpen },
    { to: "/report-cards", label: "reportCards", icon: Award },
    { to: "/timetable", label: "timetable", icon: Notebook },
    { to: "/fees", label: "fees", icon: DollarSign },
    { to: "/payments", label: "payments", icon: Wallet },
    { to: "/reports/fee-collection", label: "collectionReport", icon: BarChart3 },
    { to: "/expenses", label: "expenses", icon: TrendingDown },
    { to: "/payroll", label: "payroll", icon: Users },
    { to: "/salary-register", label: "salaryRegister", icon: FileText },
    { to: "/operations", label: "operations", icon: Bus },
    { to: "/assets", label: "assetManagement", icon: Package },
    { to: "/teacher-attendance", label: "teacherAttendance", icon: UserCheck },
    { to: "/face-attendance", label: "faceAttendance", icon: ScanFace },
    { to: "/teacher-kpis", label: "teacherKpi", icon: Award },
    { to: "/tax-settings", label: "taxBrackets", icon: FileText },
    { to: "/leave-management", label: "leaveManagement", icon: CalendarClock },
    { to: "/hr/homeroom", label: "homeroomAssign", icon: ClipboardList },
    { to: "/payroll-audit", label: "payrollAudit", icon: ClipboardList },
    { to: "/hr/overtime", label: "overtime", icon: Clock },
    { to: "/roles", label: "rolesPermissions", icon: ShieldCheck },
    { to: "/backup", label: "backup", icon: FileText },
    { to: "/announcements", label: "announcements", icon: Megaphone },
    { to: "/chat", label: "chat", icon: MessageSquare },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/audit-logs", label: "auditLogs", icon: ShieldAlert },
    { to: "/import", label: "import", icon: Upload },
    { to: "/settings", label: "settings", icon: Settings },
    { to: "/timetable-config", label: "timetableConfig", icon: Notebook },
    { to: "/sms", label: "sms", icon: MessageSquare },
    { to: "/early-years", label: "earlyYears", icon: CalendarDays },
  ],
  admin: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/users", label: "users", icon: Users },
    { to: "/teachers", label: "teachers", icon: Users },
    { to: "/students", label: "students", icon: GraduationCap },
    { to: "/parents", label: "parents", icon: UserPlus },
    { to: "/classes", label: "classes", icon: Notebook },
    { to: "/subjects", label: "subjects", icon: BookPlus },
    { to: "/attendance", label: "attendance", icon: Users },
    { to: "/exams", label: "exams", icon: BookOpen },
    { to: "/report-cards", label: "reportCards", icon: Award },
    { to: "/timetable", label: "timetable", icon: Notebook },
    { to: "/fees", label: "fees", icon: DollarSign },
    { to: "/payments", label: "payments", icon: Wallet },
    { to: "/reports/fee-collection", label: "collectionReport", icon: BarChart3 },
    { to: "/expenses", label: "expenses", icon: TrendingDown },
    { to: "/payroll", label: "payroll", icon: Users },
    { to: "/salary-register", label: "salaryRegister", icon: FileText },
    { to: "/operations", label: "operations", icon: Bus },
    { to: "/assets", label: "assetManagement", icon: Package },
    { to: "/teacher-attendance", label: "teacherAttendance", icon: UserCheck },
    { to: "/face-attendance", label: "faceAttendance", icon: ScanFace },
    { to: "/teacher-kpis", label: "teacherKpi", icon: Award },
    { to: "/tax-settings", label: "taxBrackets", icon: FileText },
    { to: "/leave-management", label: "leaveManagement", icon: CalendarClock },
    { to: "/hr/homeroom", label: "homeroomAssign", icon: ClipboardList },
    { to: "/payroll-audit", label: "payrollAudit", icon: ClipboardList },
    { to: "/hr/overtime", label: "overtime", icon: Clock },
    { to: "/roles", label: "rolesPermissions", icon: ShieldCheck },
    { to: "/announcements", label: "announcements", icon: Megaphone },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/audit-logs", label: "auditLogs", icon: ShieldAlert },
    { to: "/import", label: "import", icon: Upload },
    { to: "/timetable-config", label: "timetableConfig", icon: Notebook },
    { to: "/sms", label: "sms", icon: MessageSquare },
    { to: "/early-years", label: "earlyYears", icon: CalendarDays },
  ],
  teacher: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/teacher/workspace", label: "workspace", icon: BadgeCheck },
    { to: "/attendance", label: "attendance", icon: Users },
    { to: "/exams", label: "exams", icon: BookOpen },
    { to: "/report-cards", label: "reportCards", icon: Award },
    { to: "/timetable", label: "myTimetable", icon: Notebook },
    { to: "/discipline", label: "discipline", icon: Gavel, permission: "discipline.manage" },
    { to: "/teacher-kpis", label: "teacherKpi", icon: Award },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/announcements", label: "announcements", icon: Megaphone },
    { to: "/chat", label: "chat", icon: MessageSquare },
  ],
  face_attendance: [
    { to: "/face-attendance", label: "faceAttendance", icon: ScanFace },
    { to: "/teacher-attendance", label: "staffAttendance", icon: UserCheck },
  ],
  general_manager: [
    { to: "/executive-dashboard", label: "executiveDashboard", icon: Crown },
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/students", label: "students", icon: GraduationCap },
    { to: "/classes", label: "classes", icon: Notebook },
    { to: "/payroll", label: "payroll", icon: Users },
    { to: "/salary-register", label: "salaryRegister", icon: FileText },
    { to: "/hr/overtime", label: "overtime", icon: Clock },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/report-cards", label: "reportCards", icon: Award },
    { to: "/audit-logs", label: "auditLogs", icon: ShieldAlert },
    { to: "/announcements", label: "announcements", icon: Megaphone },
    { to: "/chat", label: "chat", icon: MessageSquare },
    { to: "/sms", label: "sms", icon: MessageSquare },
    { to: "/early-years", label: "earlyYears", icon: CalendarDays },
  ],
  principal: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/quality-assurance", label: "qualityAssurance", icon: BadgeCheck },
    { to: "/discipline", label: "discipline", icon: Gavel },
    { to: "/students", label: "students", icon: GraduationCap },
    { to: "/classes", label: "classes", icon: Notebook },
    { to: "/teachers", label: "teachers", icon: Users },
    { to: "/attendance", label: "attendance", icon: Users },
    { to: "/exams", label: "exams", icon: BookOpen },
    { to: "/report-cards", label: "reportCards", icon: Award },
    { to: "/timetable", label: "timetable", icon: Notebook },
    { to: "/teacher-attendance", label: "teacherAttendance", icon: UserCheck },
    { to: "/face-attendance", label: "faceAttendance", icon: ScanFace },
    { to: "/announcements", label: "announcements", icon: Megaphone },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/chat", label: "chat", icon: MessageSquare },
    { to: "/sms", label: "sms", icon: MessageSquare },
    { to: "/early-years", label: "earlyYears", icon: CalendarDays },
  ],
  vice_principal: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/quality-assurance", label: "qualityAssurance", icon: BadgeCheck },
    { to: "/discipline", label: "discipline", icon: Gavel },
    { to: "/students", label: "students", icon: GraduationCap },
    { to: "/classes", label: "classes", icon: Notebook },
    { to: "/teachers", label: "teachers", icon: Users },
    { to: "/attendance", label: "attendance", icon: Users },
    { to: "/exams", label: "exams", icon: BookOpen },
    { to: "/report-cards", label: "reportCards", icon: Award },
    { to: "/shift-hub", label: "shiftHub", icon: CalendarRange },
    { to: "/teacher-attendance", label: "teacherAttendance", icon: UserCheck },
    { to: "/face-attendance", label: "faceAttendance", icon: ScanFace },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/announcements", label: "announcements", icon: Megaphone },
    { to: "/sms", label: "sms", icon: MessageSquare },
    { to: "/early-years", label: "earlyYears", icon: CalendarDays },
  ],
  quality_director: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/quality-assurance", label: "qualityAssurance", icon: BadgeCheck },
    { to: "/students", label: "students", icon: GraduationCap },
    { to: "/classes", label: "classes", icon: Notebook },
    { to: "/teachers", label: "teachers", icon: Users },
    { to: "/attendance", label: "attendance", icon: Users },
    { to: "/exams", label: "exams", icon: BookOpen },
    { to: "/report-cards", label: "reportCards", icon: Award },
    { to: "/timetable", label: "timetable", icon: Notebook },
    { to: "/teacher-kpis", label: "teacherKpi", icon: Award },
    { to: "/teacher-attendance", label: "teacherAttendance", icon: UserCheck },
    { to: "/face-attendance", label: "faceAttendance", icon: ScanFace },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/chat", label: "chat", icon: MessageSquare },
    { to: "/timetable-config", label: "timetableConfig", icon: Notebook },
    { to: "/sms", label: "sms", icon: MessageSquare },
    { to: "/early-years", label: "earlyYears", icon: CalendarDays },
  ],
  shift_coordinator: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/shift-hub", label: "shiftHub", icon: CalendarRange },
    { to: "/timetable", label: "timetable", icon: Notebook },
    { to: "/teacher-attendance", label: "teacherAttendance", icon: UserCheck },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/announcements", label: "announcements", icon: Megaphone },
    { to: "/chat", label: "chat", icon: MessageSquare },
  ],
  security_head: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/security-hub", label: "securityHub", icon: LockKeyhole },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/announcements", label: "announcements", icon: Megaphone },
    { to: "/chat", label: "chat", icon: MessageSquare },
  ],
  general_services: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/general-services", label: "generalServices", icon: HardHat },
    { to: "/operations", label: "operations", icon: Bus },
    { to: "/library", label: "library", icon: BookOpen },
    { to: "/library/transactions", label: "libraryTransactions", icon: ClipboardList },
    { to: "/library/inventory", label: "bookAssessment", icon: ClipboardList },
    { to: "/assets", label: "assetManagement", icon: Package },
    { to: "/expenses", label: "expenses", icon: TrendingDown },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/announcements", label: "announcements", icon: Megaphone },
  ],
  librarian: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/library", label: "library", icon: BookOpen },
    { to: "/library/transactions", label: "libraryTransactions", icon: ClipboardList },
    { to: "/library/inventory", label: "bookAssessment", icon: ClipboardList },
    { to: "/announcements", label: "announcements", icon: Megaphone },
  ],
  accountant: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/accountant", label: "accountantPortal", icon: Calculator },
    { to: "/fees", label: "fees", icon: DollarSign },
    { to: "/payments", label: "payments", icon: Wallet },
    { to: "/expenses", label: "expenses", icon: TrendingDown },
    { to: "/payroll", label: "payroll", icon: Users },
    { to: "/hr/overtime", label: "overtime", icon: Clock },
    { to: "/reports", label: "reports", icon: BarChart3 },
  ],
  student: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/timetable", label: "timetable", icon: Notebook },
    { to: "/exam-results", label: "examResults", icon: Award },
    { to: "/my-library", label: "library", icon: BookOpen },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/announcements", label: "announcements", icon: Megaphone },
  ],
  finance: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/fees", label: "fees", icon: DollarSign },
    { to: "/payments", label: "payments", icon: Wallet },
    { to: "/reports/fee-collection", label: "collectionReport", icon: BarChart3 },
    { to: "/expenses", label: "expenses", icon: TrendingDown },
    { to: "/payroll", label: "payroll", icon: Users },
    { to: "/salary-register", label: "salaryRegister", icon: FileText },
    { to: "/hr/overtime", label: "overtime", icon: Clock },
    { to: "/reports", label: "reports", icon: BarChart3 },
  ],
  cashier: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/enroll", label: "enrollStudent", icon: UserPlus },
    { to: "/students", label: "students", icon: GraduationCap },
    { to: "/fees", label: "fees", icon: DollarSign },
    { to: "/payments", label: "payments", icon: Wallet },
    { to: "/reports/fee-collection", label: "collectionReport", icon: BarChart3 },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/announcements", label: "announcements", icon: Megaphone },
  ],
  hr: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/teacher-attendance", label: "teacherAttendance", icon: UserCheck },
    { to: "/face-attendance", label: "faceAttendance", icon: ScanFace },
    { to: "/teachers", label: "teachers", icon: Users },
    { to: "/timetable", label: "timetable", icon: Notebook },
    { to: "/teacher-kpis", label: "teacherKpi", icon: Award },
    { to: "/assets", label: "assetManagement", icon: Package },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/payroll", label: "payroll", icon: Users },
    { to: "/salary-register", label: "salaryRegister", icon: FileText },
    { to: "/tax-settings", label: "taxBrackets", icon: FileText },
    { to: "/leave-management", label: "leaveManagement", icon: CalendarClock },
    { to: "/hr/homeroom", label: "homeroomAssign", icon: ClipboardList },
    { to: "/hr/overtime", label: "overtime", icon: Clock },
    { to: "/payroll-audit", label: "payrollAudit", icon: ClipboardList },
    { to: "/users", label: "staff", icon: Users },
    { to: "/timetable-config", label: "timetableConfig", icon: Notebook },
    { to: "/early-years", label: "earlyYears", icon: CalendarDays },
  ],
  parent: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/timetable", label: "timetable", icon: Notebook },
    { to: "/exam-results", label: "examResults", icon: Award },
    { to: "/my-library", label: "library", icon: BookOpen },
    { to: "/discipline", label: "myCases", icon: Gavel, permission: "discipline.manage" },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/announcements", label: "announcements", icon: Megaphone },
    { to: "/chat", label: "chat", icon: MessageSquare },
  ],
  support: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/announcements", label: "announcements", icon: Megaphone },
    { to: "/chat", label: "chat", icon: MessageSquare },
  ],
};

const permissionGated = [
  { to: "/dashboard", label: "dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { to: "/students", label: "students", icon: GraduationCap, permission: "students.view" },
  { to: "/users", label: "users", icon: Users, permission: "users.manage" },
  { to: "/teachers", label: "teachers", icon: Users, permission: "teachers.manage" },
  { to: "/parents", label: "parents", icon: UserPlus, permission: "parents.manage" },
  { to: "/classes", label: "classes", icon: Notebook, permission: "classes.manage" },
  { to: "/subjects", label: "subjects", icon: BookOpen, permission: "subjects.manage" },
  { to: "/attendance", label: "attendance", icon: Users, permission: "attendance.manage" },
  { to: "/exams", label: "exams", icon: BookOpen, permission: "exams.manage" },
  { to: "/timetable", label: "timetable", icon: Notebook, permission: "timetable.view" },
  { to: "/fees", label: "fees", icon: DollarSign, permission: "fees.manage" },
  { to: "/payments", label: "payments", icon: Wallet, permission: "payments.manage" },
  { to: "/student-fees", label: "studentFees", icon: Wallet, permission: "fees.manage" },
  { to: "/monthly-collection", label: "monthlyCollection", icon: Wallet, permission: "fees.manage" },
  { to: "/reports/fee-collection", label: "collectionReport", icon: BarChart3, permission: "payments.manage" },
  { to: "/expenses", label: "expenses", icon: TrendingDown, permission: "expenses.manage" },
  { to: "/payroll", label: "payroll", icon: Users, permission: "payroll.view" },
  { to: "/salary-register", label: "salaryRegister", icon: FileText, permission: "payroll.view" },
  { to: "/hr/overtime", label: "overtime", icon: Clock, permission: "payroll.view" },
  { to: "/payroll-audit", label: "payrollAudit", icon: ClipboardList, permission: "payroll-audit.view" },
  { to: "/tax-settings", label: "taxBrackets", icon: FileText, permission: "tax-settings.manage" },
  { to: "/leave-management", label: "leaveManagement", icon: CalendarClock, permission: "leave-management.manage" },
  { to: "/hr/homeroom", label: "homeroomAssign", icon: ClipboardList, permission: "classes.manage" },
  { to: "/operations", label: "operations", icon: Bus, permission: "operations.manage" },
  { to: "/assets", label: "assetManagement", icon: Package, permission: "operations.manage" },
  { to: "/library", label: "library", icon: BookOpen, permission: "operations.manage" },
  { to: "/library/transactions", label: "libraryTransactions", icon: ClipboardList, permission: "operations.manage" },
  { to: "/library/inventory", label: "bookAssessment", icon: ClipboardList, permission: "operations.manage" },
  { to: "/teacher-attendance", label: "teacherAttendance", icon: UserCheck, permission: "staff-attendance.manage" },
  { to: "/teacher-kpis", label: "teacherKpi", icon: Award, permission: "quality.review" },
  { to: "/staff-performance", label: "staffPerformance", icon: Award, permission: "reports.view" },
  { to: "/report-cards", label: "reportCards", icon: Award, permission: "reports.view" },
  { to: "/reports", label: "reports", icon: BarChart3, permission: "reports.view" },
  { to: "/quality-assurance", label: "qualityAssurance", icon: BadgeCheck, permission: "quality.review" },
  { to: "/discipline", label: "discipline", icon: Gavel, permission: "discipline.manage" },
  { to: "/security-hub", label: "securityHub", icon: LockKeyhole, permission: "security.manage" },
  { to: "/shift-hub", label: "shiftHub", icon: CalendarRange, permission: "shifts.manage" },
  { to: "/general-services", label: "generalServices", icon: HardHat, permission: "services.manage" },
  { to: "/accountant", label: "accountantPortal", icon: Calculator, permission: "payments.reconcile" },
  { to: "/announcements", label: "announcements", icon: Megaphone, permission: "announcements.view" },
  { to: "/chat", label: "chat", icon: MessageSquare, permission: "chat.access" },
  { to: "/audit-logs", label: "auditLogs", icon: ShieldAlert, permission: "audit.view" },
  { to: "/import", label: "import", icon: Upload, permission: "import.manage" },
  { to: "/backup", label: "backup", icon: FileText, permission: "backup.manage" },
  { to: "/roles", label: "rolesPermissions", icon: ShieldCheck, permission: "roles.manage" },
  { to: "/settings", label: "settings", icon: Settings, permission: "settings.manage" },
];

export default function Sidebar({ onNavigate }) {
  const { user, logout } = useAuthStore();
  const { t } = useI18n();

  const role = user?.role || "admin";
  // Attendance is only offered to homeroom teachers. Until we know the user's
  // homeroom classes we hide the item rather than show it and remove it.
  const { data: homeroomData, isFetched: homeroomFetched } = useMyHomeroomClasses(role === "teacher");
  const homeroomCount = homeroomData?.data?.classes?.length ?? 0;

  const baseItems = navItems[role] || [{ to: "/dashboard", label: "dashboard", icon: LayoutDashboard }];
  const perms = user?.permissions || [];
  const seen = new Set(baseItems.map((i) => i.to));
  // Permission-driven menu: any page the role/permissions grant shows here, so
  // custom roles created in Roles & Permissions get exactly the pages chosen.
  const extra = permissionGated.filter((i) => perms.includes(i.permission) && !seen.has(i.to));
  let items = [...baseItems, ...extra];
  if (role === "teacher" && !(homeroomFetched && homeroomCount > 0)) {
    items = items.filter((i) => i.to !== "/attendance");
  }

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-screen">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold">SMS</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {`${user?.firstName || ""} ${user?.middleName || ""} ${user?.lastName || ""}`.trim()}
        </p>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/reports"}
            onMouseEnter={() => prefetchRoute(item.to)}
            onFocus={() => prefetchRoute(item.to)}
            onClick={() => onNavigate && onNavigate()}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {t.nav[item.label] || item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t">
        <a
          href="/help"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-start w-full mb-2 rounded-md px-3 py-2 text-[12.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <BookOpen className="h-4 w-4 mr-2" />
          User Manual
        </a>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t.common.signOut}
        </Button>
      </div>
    </aside>
  );
}
