import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/auth";

export default function RoleRoute({ roles, permissions = [] }) {
  const user = useAuthStore((s) => s.user);
  const perms = user?.permissions || [];

  const allowed =
    roles.includes(user?.role) || permissions.some((p) => perms.includes(p));

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
