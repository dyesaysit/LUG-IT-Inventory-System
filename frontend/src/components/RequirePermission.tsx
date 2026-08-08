import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RequirePermissionProps {
  permission: string;
}

/** Gates nested routes behind a specific permission, redirecting to /forbidden otherwise. */
export function RequirePermission({ permission }: RequirePermissionProps) {
  const { permissions } = useAuth();

  if (!permissions.includes(permission)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
