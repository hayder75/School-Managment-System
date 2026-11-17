import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "../../store/auth";
import { useI18n } from "../../i18n/I18nContext";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, BookPlus,
  Building2, Settings, LogOut, MessageSquare, Notebook,
  DollarSign, Wallet, TrendingDown,
  ShieldAlert, ShieldCheck, BarChart3, Upload, Megaphone, UserPlus,
  Bus, BedDouble, BookOpen as BookIcon, FileText, CalendarClock, ClipboardList,
  Package, CalendarRange, CalendarDays, UserCheck, Award,
  BadgeCheck, LockKeyhole, HardHat, Calculator, Crown, Gavel, Clock, ScanFace, Search,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { prefetchRoute } from "../../lib/prefetch";
import { useMyHomeroomClasses } from "../../hooks/useAttendance";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";

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
    { to: "/marks", label: "marks", icon: ClipboardList },
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
    { to: "/marks", label: "marks", icon: ClipboardList },
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
  'Unit Leader': [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/teachers", label: "teachers", icon: Users },
    { to: "/students", label: "students", icon: GraduationCap },
    { to: "/attendance", label: "attendance", icon: Users },
    { to: "/marks", label: "marks", icon: ClipboardList },
    { to: "/exams", label: "exams", icon: BookOpen },
    { to: "/teacher-attendance", label: "teacherAttendance", icon: UserCheck },
    { to: "/reports", label: "reports", icon: BarChart3 },
    { to: "/announcements", label: "announcements", icon: Megaphone },
    { to: "/chat", label: "chat", icon: MessageSquare },
  ],
  teacher: [
    { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
    { to: "/teacher/workspace", label: "workspace", icon: BadgeCheck },
    { to: "/attendance", label: "attendance", icon: Users },
    { to: "/marks", label: "marks", icon: ClipboardList },
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
    { to: "/attendance", label: "attendance", icon: Users },
    { to: "/marks", label: "marks", icon: ClipboardList },
    { to: "/students", label: "students", icon: GraduationCap },
    { to: "/report-cards", label: "reportCards", icon: Award },
    { to: "/reports", label: "reports", icon: BarChart3 },
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
  { to: "/marks", label: "marks", icon: ClipboardList, permission: "grades.manage" },
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
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const role = user?.role || "admin";
  // Attendance is only offered to homeroom teachers. Until we know the user's
  // homeroom classes we hide the item rather than show it and remove it.
  const { data: homeroomData, isFetched: homeroomFetched } = useMyHomeroomClasses(["teacher", "support"].includes(role));
  const homeroomCount = homeroomData?.data?.classes?.length ?? 0;

  const baseItems = navItems[role] || [{ to: "/dashboard", label: "dashboard", icon: LayoutDashboard }];
  const perms = user?.permissions || [];
  const seen = new Set(baseItems.map((i) => i.to));
  // Permission-driven menu: any page the role/permissions grant shows here, so
  // custom roles created in Roles & Permissions get exactly the pages chosen.
  const extra = permissionGated.filter((i) => perms.includes(i.permission) && !seen.has(i.to));
  let items = [...baseItems, ...extra];
  if (role === "teacher") {
    // Teachers enter marks on /marks; the legacy per-exam page is gone.
    items = items.filter((i) => i.to !== "/exams");
  }
  if (["teacher", "support"].includes(role) && !(homeroomFetched && homeroomCount > 0)) {
    items = items.filter((i) => i.to !== "/attendance");
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => {
      const en = i.label.toLowerCase();
      const am = String(t.nav[i.label] || "").toLowerCase();
      const to = i.to.toLowerCase();
      return en.includes(q) || am.includes(q) || to.includes(q);
    });
  }, [items, query, t]);

  useEffect(() => {
    setActive(0);
  }, [query, searchOpen]);

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [searchOpen]);

  function go(item) {
    if (!item) return;
    setSearchOpen(false);
    onNavigate && onNavigate();
    navigate(item.to);
  }

  function onSearchKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(filtered[active]); }
  }

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-full min-h-0">
      <div className="p-6 border-b shrink-0 space-y-3">
        <div>
          <h1 className="text-xl font-bold">SMS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {`${user?.firstName || ""} ${user?.middleName || ""} ${user?.lastName || ""}`.trim()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">{t("Search pages…")}</span>
          <kbd className="rounded border bg-muted px-1 text-[10px]">⌘K</kbd>
        </button>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-lg p-0 gap-0">
          <DialogTitle className="sr-only">{t("Search pages")}</DialogTitle>
          <div className="border-b p-3">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
              placeholder={t("Search pages, e.g. attendance, payments…")}
              className="border-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">{t("No pages found")}</p>
            ) : (
              filtered.map((item, i) => (
                <button
                  key={item.to}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${i === active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{t.nav[item.label] || item.label}</span>
                  <span className={`text-[10px] ${i === active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{item.to}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

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

      <div className="p-4 border-t shrink-0 bg-card">
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
