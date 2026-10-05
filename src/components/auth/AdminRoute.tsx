import type { ReactNode } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * AdminRoute — Protects the /admin panel.
 * Not logged in → /login (remembering the requested page).
 * Logged in without the admin role → explains why instead of silently redirecting.
 * Per FR-012 and Belia Constitution: no admin content is loaded for unauthorized users.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-belia-red" />
      </div>
    );
  }

  if (!user) {
    // Remember where the admin was going so login can send them back
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-bright px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-divider shadow-sm p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-belia-red mb-3">lock</span>
          <h1 className="text-xl font-bold text-text-primary mb-2">Sin acceso al administrador</h1>
          <p className="text-sm text-text-secondary mb-1">Iniciaste sesión como</p>
          <p className="font-mono text-sm font-bold text-text-primary mb-4 break-all">{user.email}</p>
          <p className="text-sm text-text-secondary mb-6">
            Esta cuenta tiene el rol <strong>{user.role}</strong>. Si debería ser administrador, pide que le asignen el rol
            en Supabase y vuelve a iniciar sesión. Si entraste con otra cuenta, cierra sesión y usa la correcta.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={async () => { await signOut(); }}
              className="px-5 py-2.5 rounded-lg bg-belia-red text-white font-bold text-sm hover:bg-belia-red-deep"
            >
              Cerrar sesión
            </button>
            <Link to="/" className="px-5 py-2.5 rounded-lg border border-divider font-bold text-sm text-text-secondary hover:bg-gray-50">
              Ir a la tienda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
