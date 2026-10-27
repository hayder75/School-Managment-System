import { useState, useEffect, Suspense } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Menu, KeyRound } from "lucide-react";
import Sidebar from "./Sidebar";
import PageSkeleton from "./PageSkeleton";
import NotificationBell from "./NotificationBell";
import LanguageToggle from "./LanguageToggle";
import { Sheet, SheetContent } from "../ui/sheet";
import { Button } from "../ui/button";
import { useCalendarStore } from "../../store/calendar";
import { useAuthStore } from "../../store/auth";
import { warmRole } from "../../lib/prefetch";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const loadCalendar = useCalendarStore((s) => s.load);
  const role = useAuthStore((s) => s.user?.role);
  const location = useLocation();

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    if (role) warmRole(role);
  }, [role]);

  // Close the mobile drawer whenever the route changes (i.e. after tapping a
  // menu item) so it never stays open over the page.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <div className="hidden lg:block h-[100dvh] shrink-0">
        <Sidebar />
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[280px] max-w-[85vw] p-0 h-[100dvh]">
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center justify-between px-4 lg:px-6 bg-background">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1 lg:hidden" />
          <div className="flex items-center">
            <Link to="/change-password" title="Change password" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mr-1.5">
              <KeyRound className="h-4 w-4" /><span className="hidden sm:inline">Change Password</span>
            </Link>
            <NotificationBell />
            <LanguageToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-8 min-w-0 max-w-full">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
