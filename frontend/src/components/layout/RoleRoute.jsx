import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/auth";

export default function RoleRoute({ roles }) {
  const user = useAuthStore((s) => s.user);

  if (!roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
