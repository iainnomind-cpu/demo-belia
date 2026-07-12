import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-belia-red" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
