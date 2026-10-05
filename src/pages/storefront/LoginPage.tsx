import { useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

type LoginView = 'options' | 'login' | 'register';

export function LoginPage() {
  const { user, signIn, signUp, signInWithOAuth, loading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Destination after login: router state (normal redirect) or ?next= (survives the OAuth round trip)
  const nextParam = searchParams.get('next');
  const requestedFrom = (location.state as { from?: string })?.from
    ?? (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null);
  const [view, setView] = useState<LoginView>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  if (user && !loading) {
    if (user.role === 'admin') return <Navigate to={requestedFrom ?? '/admin'} replace />;
    // Non-admins asking for /admin still go there: AdminRoute explains why they can't enter
    return <Navigate to={requestedFrom ?? '/'} replace />;
  }

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setAuthError('');
    setIsSubmitting(true);
    // Come back to /login so the redirect above sends the user to the right page
    const { error } = await signInWithOAuth(provider, `/login${requestedFrom ? `?next=${encodeURIComponent(requestedFrom)}` : ''}`);
    if (error) { setAuthError(error); setIsSubmitting(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) { setAuthError(error); setIsSubmitting(false); }
    // On success, user state updates and redirect triggers above
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (password !== confirmPassword) {
      setAuthError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setAuthError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setIsSubmitting(true);
    const { error } = await signUp(email, password);
    if (error) {
      setAuthError(error);
      setIsSubmitting(false);
    } else {
      setSuccessMsg('¡Cuenta creada! Revisa tu correo para confirmar tu registro.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-belia-cream flex flex-col justify-center items-center py-12 px-4">

      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <img src="/logo.png" alt="Belia" className="h-14 w-auto object-contain" />
        <h1 className="text-2xl font-extrabold text-belia-charcoal text-center">
          {view === 'options'  && 'Accede con tu cuenta y gestiona tus pedidos.'}
          {view === 'login'    && 'Inicia sesión en Belia'}
          {view === 'register' && 'Crea tu cuenta en Belia'}
        </h1>
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.10)] border border-divider overflow-hidden">
          <div className="p-7 space-y-4">

            {/* Error */}
            {authError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-px">error</span>
                {authError}
              </div>
            )}

            {/* Success */}
            {successMsg && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
                <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-px">check_circle</span>
                {successMsg}
              </div>
            )}

            {/* ── VIEW: options ── */}
            {view === 'options' && !successMsg && (
              <div className="space-y-3">
                {/* Google */}
                <button
                  onClick={() => void handleOAuth('google')}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-divider bg-white hover:bg-surface-container-low font-semibold text-sm text-belia-charcoal transition-all hover:border-belia-coral hover:shadow-belia-sm disabled:opacity-50"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuar con Google
                </button>

                {/* Facebook */}
                <button
                  onClick={() => void handleOAuth('facebook')}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-divider bg-white hover:bg-surface-container-low font-semibold text-sm text-belia-charcoal transition-all hover:border-belia-coral hover:shadow-belia-sm disabled:opacity-50"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Continuar con Facebook
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-divider" />
                  <span className="text-[11px] text-text-meta font-medium">o</span>
                  <div className="flex-1 h-px bg-divider" />
                </div>

                {/* Email/password */}
                <button
                  onClick={() => { setAuthError(''); setView('login'); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-belia-red text-white font-semibold text-sm hover:bg-[#D9302A] transition-colors shadow-belia-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                  Entrar con e-mail y contraseña
                </button>

                {/* Crear cuenta */}
                <button
                  onClick={() => { setAuthError(''); setView('register'); }}
                  className="w-full text-center text-sm text-text-secondary hover:text-belia-red font-semibold transition-colors py-1"
                >
                  ¿No tienes cuenta?{' '}
                  <span className="text-belia-red underline underline-offset-2">Crear cuenta</span>
                </button>
              </div>
            )}

            {/* ── VIEW: login form ── */}
            {view === 'login' && !successMsg && (
              <form onSubmit={(e) => void handleLogin(e)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Correo electrónico</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-meta text-[18px]">mail</span>
                    <input
                      type="email" required value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tucorreo@ejemplo.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-divider focus:border-belia-red focus:ring-2 focus:ring-belia-red/20 outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-text-secondary">Contraseña</label>
                    <a href="/recuperar-contrasena" className="text-xs text-belia-red hover:underline">¿Olvidaste tu contraseña?</a>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-meta text-[18px]">lock</span>
                    <input
                      type="password" required value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-divider focus:border-belia-red focus:ring-2 focus:ring-belia-red/20 outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit" disabled={isSubmitting || loading}
                  className="w-full py-3 rounded-xl bg-belia-red text-white font-bold text-sm hover:bg-[#D9302A] transition-colors shadow-belia-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
                </button>

                <div className="flex items-center justify-between text-sm pt-1">
                  <button type="button" onClick={() => { setAuthError(''); setView('options'); }} className="text-text-meta hover:text-belia-red transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Volver
                  </button>
                  <button type="button" onClick={() => { setAuthError(''); setView('register'); }} className="text-belia-red font-semibold hover:underline">
                    Crear cuenta
                  </button>
                </div>
              </form>
            )}

            {/* ── VIEW: register form ── */}
            {view === 'register' && !successMsg && (
              <form onSubmit={(e) => void handleRegister(e)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Correo electrónico</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-meta text-[18px]">mail</span>
                    <input
                      type="email" required value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tucorreo@ejemplo.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-divider focus:border-belia-red focus:ring-2 focus:ring-belia-red/20 outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Contraseña</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-meta text-[18px]">lock</span>
                    <input
                      type="password" required value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-divider focus:border-belia-red focus:ring-2 focus:ring-belia-red/20 outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Confirmar contraseña</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-meta text-[18px]">lock</span>
                    <input
                      type="password" required value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-divider focus:border-belia-red focus:ring-2 focus:ring-belia-red/20 outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit" disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-belia-red text-white font-bold text-sm hover:bg-[#D9302A] transition-colors shadow-belia-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
                </button>

                <button type="button" onClick={() => { setAuthError(''); setView('options'); }} className="w-full text-sm text-text-meta hover:text-belia-red transition-colors flex items-center justify-center gap-1 pt-1">
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Volver
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Volver al inicio */}
        <p className="text-center text-xs text-text-meta mt-6">
          <a href="/" className="hover:text-belia-red transition-colors">← Volver a la tienda</a>
        </p>
      </div>
    </div>
  );
}
