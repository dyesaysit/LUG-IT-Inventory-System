import { Navigate } from 'react-router-dom';

/**
 * Root redirect — sends unauthenticated users to login.
 */
export function HomePage() {
  return <Navigate to="/" replace />;
}