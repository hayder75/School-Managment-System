import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { useI18n } from "../../i18n/I18nContext";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, BookPlus,
  Building2, Settings, LogOut, MessageSquare, Notebook,
  DollarSign, Wallet, TrendingDown,
  ShieldAlert, ShieldCheck, BarChart3, Upload, Megaphone, UserPlus,
  Bus, BedDouble, BookOpen as BookIcon, FileText, CalendarClock, ClipboardList,
  Package, CalendarRange, UserCheck, Award,
  BadgeCheck, LockKeyhole, HardHat, Calculator, Crown, Gavel,
} from "lucide-react";
import { cn } from "../../lib/utils";
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
    { to: "/teacher-kpis", label: "teacherKpi", icon: Award },
    { to: "/tax-settings", label: "taxBrackets", icon: FileText },
    { to: "/leave-management", label: "leaveManagement", icon: CalendarClock },
    { to: "/hr/homeroom", label: "homeroomAssign", icon: ClipboardList },
    { to: "/payroll-audit", label: "payrollAudit", icon: ClipboardList },
    { to: "/roles", label: "rolesPermissions", icon: ShieldCheck },
    { to: "/backup", label: "backup", icon: FileText },
    { to: "/announcements", label: "announcements", icon: Megaphone },
    { to: "/chat", label: "chat", icon: MessageSquare },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/audit-logs", label: "auditLogs", icon: ShieldAlert },
    { to: "/import", label: "import", icon: Upload },
    { to: "/settings", label: "settings", icon: Settings },
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
    { to: "/teacher-kpis", label: "teacherKpi", icon: Award },
    { to: "/tax-settings", label: "taxBrackets", icon: FileText },
    { to: "/leave-management", label: "leaveManagement", icon: CalendarClock },
    { to: "/hr/homeroom", label: "homeroomAssign", icon: ClipboardList },
    { to: "/payroll-audit", label: "payrollAudit", icon: ClipboardList },
    { to: "/roles", label: "rolesPermissions", icon: ShieldCheck },
    { to: "/announcements", label: "announcements", icon: Megaphone },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/audit-logs", label: "auditLogs", icon: ShieldAlert },
    { to: "/import", label: "import", icon: Upload },
  ],
  teacher: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/teacher/workspace", label: "workspace", icon: BadgeCheck },
    { to: "/attendance", label: "attendance", icon: Users },
    { to: "/exams", label: "exams", icon: BookOpen },
    { to: "/timetable", label: "myTimetable", icon: Notebook },
    { to: "/teacher-kpis", label: "teacherKpi", icon: Award },
    { to: "/announcements", label: "announcements", icon: Megaphone },
    { to: "/chat", label: "chat", icon: MessageSquare },
  ],
  general_manager: [
    { to: "/executive-dashboard", label: "executiveDashboard", icon: Crown },
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/students", label: "students", icon: GraduationCap },
    { to: "/payroll", label: "payroll", icon: Users },
    { to: "/salary-register", label: "salaryRegister", icon: FileText },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/audit-logs", label: "auditLogs", icon: ShieldAlert },
    { to: "/announcements", label: "announcements", icon: Megaphone },
    { to: "/chat", label: "chat", icon: MessageSquare },
  ],
  principal: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/quality-assurance", label: "qualityAssurance", icon: BadgeCheck },
    { to: "/discipline", label: "discipline", icon: Gavel },
    { to: "/students", label: "students", icon: GraduationCap },
    { to: "/attendance", label: "attendance", icon: Users },
    { to: "/exams", label: "exams", icon: BookOpen },
    { to: "/timetable", label: "timetable", icon: Notebook },
    { to: "/teacher-attendance", label: "teacherAttendance", icon: UserCheck },
    { to: "/announcements", label: "announcements", icon: Megaphone },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/chat", label: "chat", icon: MessageSquare },
  ],
  vice_principal: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/quality-assurance", label: "qualityAssurance", icon: BadgeCheck },
    { to: "/discipline", label: "discipline", icon: Gavel },
    { to: "/students", label: "students", icon: GraduationCap },
    { to: "/attendance", label: "attendance", icon: Users },
    { to: "/exams", label: "exams", icon: BookOpen },
    { to: "/shift-hub", label: "shiftHub", icon: CalendarRange },
    { to: "/teacher-attendance", label: "teacherAttendance", icon: UserCheck },
    { to: "/announcements", label: "announcements", icon: Megaphone },
  ],
  quality_director: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/quality-assurance", label: "qualityAssurance", icon: BadgeCheck },
    { to: "/students", label: "students", icon: GraduationCap },
    { to: "/attendance", label: "attendance", icon: Users },
    { to: "/exams", label: "exams", icon: BookOpen },
    { to: "/timetable", label: "timetable", icon: Notebook },
    { to: "/teacher-kpis", label: "teacherKpi", icon: Award },
    { to: "/teacher-attendance", label: "teacherAttendance", icon: UserCheck },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/chat", label: "chat", icon: MessageSquare },
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
    { to: "/assets", label: "assetManagement", icon: Package },
    { to: "/expenses", label: "expenses", icon: TrendingDown },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/announcements", label: "announcements", icon: Megaphone },
  ],
  accountant: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/accountant", label: "accountantPortal", icon: Calculator },
    { to: "/fees", label: "fees", icon: DollarSign },
    { to: "/payments", label: "payments", icon: Wallet },
    { to: "/expenses", label: "expenses", icon: TrendingDown },
    { to: "/payroll", label: "payroll", icon: Users },
    { to: "/reports", label: "reports", icon: BarChart3 },
  ],
  student: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/timetable", label: "timetable", icon: Notebook },
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
    { to: "/timetable", label: "timetable", icon: Notebook },
    { to: "/teacher-kpis", label: "teacherKpi", icon: Award },
    { to: "/assets", label: "assetManagement", icon: Package },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/payroll", label: "payroll", icon: Users },
    { to: "/salary-register", label: "salaryRegister", icon: FileText },
    { to: "/tax-settings", label: "taxBrackets", icon: FileText },
    { to: "/leave-management", label: "leaveManagement", icon: CalendarClock },
    { to: "/hr/homeroom", label: "homeroomAssign", icon: ClipboardList },
    { to: "/payroll-audit", label: "payrollAudit", icon: ClipboardList },
    { to: "/users", label: "staff", icon: Users },
  ],
  parent: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/timetable", label: "timetable", icon: Notebook },
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
  { to: "/users", label: "users", icon: Users, permission: "users.manage" },
  { to: "/teachers", label: "teachers", icon: Users, permission: "teachers.manage" },
  { to: "/parents", label: "parents", icon: UserPlus, permission: "parents.manage" },
  { to: "/classes", label: "classes", icon: Notebook, permission: "classes.manage" },
  { to: "/subjects", label: "subjects", icon: BookOpen, permission: "subjects.manage" },
  { to: "/fees", label: "fees", icon: DollarSign, permission: "fees.manage" },
  { to: "/payments", label: "payments", icon: Wallet, permission: "payments.manage" },
  { to: "/student-fees", label: "studentFees", icon: Wallet, permission: "fees.manage", roles: ["admin", "owner", "cashier"] },
  { to: "/monthly-collection", label: "monthlyCollection", icon: Wallet, permission: "fees.manage", roles: ["admin", "owner", "cashier"] },
  { to: "/expenses", label: "expenses", icon: TrendingDown, permission: "expenses.manage" },
  { to: "/payroll", label: "payroll", icon: Users, permission: "payroll.view" },
  { to: "/operations", label: "operations", icon: Bus, permission: "operations.manage" },
  { to: "/tax-settings", label: "taxBrackets", icon: FileText, permission: "tax-settings.manage" },
  { to: "/leave-management", label: "leaveManagement", icon: CalendarClock, permission: "leave-management.manage" },
  { to: "/payroll-audit", label: "payrollAudit", icon: ClipboardList, permission: "payroll-audit.view" },
  { to: "/reports", label: "reports", icon: BarChart3, permission: "reports.view" },
  { to: "/audit-logs", label: "auditLogs", icon: ShieldAlert, permission: "audit.view" },
  { to: "/import", label: "import", icon: Upload, permission: "import.manage" },
  { to: "/backup", label: "backup", icon: FileText, permission: "backup.manage" },
  { to: "/roles", label: "rolesPermissions", icon: ShieldCheck, permission: "roles.manage" },
  { to: "/settings", label: "settings", icon: Settings, permission: "settings.manage" },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { t } = useI18n();

  const role = user?.role || "admin";
  const baseItems = navItems[role] || navItems.admin;
  const perms = user?.permissions || [];
  const seen = new Set(baseItems.map((i) => i.to));
  const extra = permissionGated.filter((i) => perms.includes(i.permission) && !seen.has(i.to) && (!i.roles || i.roles.includes(role)));
  const items = [...baseItems, ...extra];

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-screen">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold">SMS</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {user?.firstName} {user?.lastName}
        </p>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/reports"}
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
