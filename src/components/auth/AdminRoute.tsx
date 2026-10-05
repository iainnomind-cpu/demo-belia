import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * AdminRoute — Protects the /admin panel.
 * Redirects to /login immediately if user is not authenticated or lacks 'admin' role.
 * Per FR-012 and Belia Constitution: no admin content is loaded for unauthorized users.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-belia-red" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    // Remember where the admin was going so login can send them back
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
}
