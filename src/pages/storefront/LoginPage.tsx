import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function LoginPage() {
  const { user, signIn, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  if (user && !loading) {
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    const from = (location.state as any)?.from || '/';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      // useAuth sets the user, which triggers the redirect above on re-render
    } catch (err: any) {
      setAuthError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-bright flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-headline-lg font-bold text-text-primary">
          Inicia sesión en tu cuenta
        </h2>
        <p className="mt-2 text-center text-sm text-text-secondary">
          Accede a precios de proveedor y gestiona tus pedidos.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-divider">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {authError && (
              <div className="bg-error/10 border border-error text-error p-3 rounded text-sm flex items-start gap-2">
                <span className="material-symbols-outlined text-[20px]">error</span>
                {authError}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-text-secondary">
                Correo Electrónico
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 text-[20px]">mail</span>
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full sm:text-sm border-gray-300 rounded-md focus:ring-belia-red focus:border-belia-red"
                  placeholder="tucorreo@ejemplo.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary">
                Contraseña
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 text-[20px]">lock</span>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full sm:text-sm border-gray-300 rounded-md focus:ring-belia-red focus:border-belia-red"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-belia-red hover:bg-belia-red-deep focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-belia-red disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Iniciando...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-divider pt-6 text-center">
            <p className="text-sm text-text-secondary">
              ¿Eres un salón de belleza y quieres precios especiales?{' '}
              <a href="/proveedores" className="font-medium text-belia-red hover:text-belia-red-deep">
                Solicita una cuenta de proveedor
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
