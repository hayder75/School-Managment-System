import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, BookPlus,
  Building2, Settings, LogOut, MessageSquare, Notebook,
  DollarSign, Wallet, TrendingDown,
  ShieldAlert, BarChart3, Upload, Megaphone, UserPlus,
  Bus, BedDouble, BookOpen as BookIcon, FileText, CalendarClock, ClipboardList,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

const navItems = {
  super_admin: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/tenants", label: "Schools", icon: Building2 },
    { to: "/audit-logs", label: "Audit Logs", icon: ShieldAlert },
  ],
  owner: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/users", label: "Users", icon: Users },
    { to: "/teachers", label: "Teachers", icon: Users },
    { to: "/students", label: "Students", icon: GraduationCap },
    { to: "/parents", label: "Parents", icon: UserPlus },
    { to: "/classes", label: "Classes", icon: Notebook },
    { to: "/subjects", label: "Subjects", icon: BookOpen },
    { to: "/attendance", label: "Attendance", icon: Users },
    { to: "/exams", label: "Exams & Grades", icon: BookOpen },
    { to: "/timetable", label: "Timetable", icon: Notebook },
    { to: "/fees", label: "Fee Structures", icon: DollarSign },
    { to: "/payments", label: "Payments", icon: Wallet },
    { to: "/expenses", label: "Expenses", icon: TrendingDown },
    { to: "/payroll", label: "Payroll", icon: Users },
    { to: "/operations", label: "Operations", icon: Bus },
    { to: "/tax-settings", label: "Tax Brackets", icon: FileText },
    { to: "/leave-management", label: "Leave Mgmt", icon: CalendarClock },
    { to: "/payroll-audit", label: "Payroll Audit", icon: ClipboardList },
    { to: "/backup", label: "Backup", icon: FileText },
    { to: "/announcements", label: "Announcements", icon: Megaphone },
    { to: "/chat", label: "Chat", icon: MessageSquare },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/audit-logs", label: "Audit Logs", icon: ShieldAlert },
    { to: "/import", label: "Import", icon: Upload },
    { to: "/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/users", label: "Users", icon: Users },
    { to: "/teachers", label: "Teachers", icon: Users },
    { to: "/students", label: "Students", icon: GraduationCap },
    { to: "/parents", label: "Parents", icon: UserPlus },
    { to: "/classes", label: "Classes", icon: Notebook },
    { to: "/subjects", label: "Subjects", icon: BookPlus },
    { to: "/attendance", label: "Attendance", icon: Users },
    { to: "/exams", label: "Exams & Grades", icon: BookOpen },
    { to: "/timetable", label: "Timetable", icon: Notebook },
    { to: "/fees", label: "Fee Structures", icon: DollarSign },
    { to: "/payments", label: "Payments", icon: Wallet },
    { to: "/expenses", label: "Expenses", icon: TrendingDown },
    { to: "/payroll", label: "Payroll", icon: Users },
    { to: "/operations", label: "Operations", icon: Bus },
    { to: "/tax-settings", label: "Tax Brackets", icon: FileText },
    { to: "/leave-management", label: "Leave Mgmt", icon: CalendarClock },
    { to: "/payroll-audit", label: "Payroll Audit", icon: ClipboardList },
    { to: "/announcements", label: "Announcements", icon: Megaphone },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/audit-logs", label: "Audit Logs", icon: ShieldAlert },
    { to: "/import", label: "Import", icon: Upload },
  ],
  teacher: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/attendance", label: "Attendance", icon: Users },
    { to: "/exams", label: "Exams & Grades", icon: BookOpen },
    { to: "/timetable", label: "My Timetable", icon: Notebook },
    { to: "/announcements", label: "Announcements", icon: Megaphone },
    { to: "/chat", label: "Chat", icon: MessageSquare },
  ],
  student: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/timetable", label: "Timetable", icon: Notebook },
    { to: "/announcements", label: "Announcements", icon: Megaphone },
  ],
  finance: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/fees", label: "Fee Structures", icon: DollarSign },
    { to: "/payments", label: "Payments", icon: Wallet },
    { to: "/expenses", label: "Expenses", icon: TrendingDown },
    { to: "/payroll", label: "Payroll", icon: Users },
    { to: "/reports", label: "Reports", icon: BarChart3 },
  ],
  hr: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/payroll", label: "Payroll", icon: Users },
    { to: "/tax-settings", label: "Tax Brackets", icon: FileText },
    { to: "/leave-management", label: "Leave Mgmt", icon: CalendarClock },
    { to: "/payroll-audit", label: "Payroll Audit", icon: ClipboardList },
    { to: "/users", label: "Staff", icon: Users },
  ],
  parent: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/timetable", label: "Timetable", icon: Notebook },
    { to: "/announcements", label: "Announcements", icon: Megaphone },
    { to: "/chat", label: "Chat", icon: MessageSquare },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuthStore();

  const role = user?.role || "admin";
  const items = navItems[role] || navItems.admin;

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-screen">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold">SMS</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {user?.firstName} {user?.lastName}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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
            {item.label}
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
          Logout
        </Button>
      </div>
    </aside>
  );
}
