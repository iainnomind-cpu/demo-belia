import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';

type AuthView = 'options' | 'login' | 'register';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * AuthModal — Modal de autenticación emergente.
 * Aparece al hacer clic en "Mi cuenta" en el Header o en el MobileMenu.
 * Flujos: Google OAuth · Facebook OAuth · Email + contraseña · Crear cuenta
 * Nota: Google y Facebook requieren configuración en Supabase Dashboard.
 */
export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp, signInWithOAuth } = useAuth();
  const [view, setView] = useState<AuthView>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = () => {
    setView('options');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccessMsg('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setError('');
    setIsSubmitting(true);
    const { error: err } = await signInWithOAuth(provider);
    if (err) {
      setError(err);
      setIsSubmitting(false);
    }
    // Si no hay error, Supabase redirige al proveedor OAuth — el modal se cierra solo.
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err);
      setIsSubmitting(false);
    } else {
      handleClose();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setIsSubmitting(true);
    const { error: err } = await signUp(email, password);
    if (err) {
      setError(err);
      setIsSubmitting(false);
    } else {
      setSuccessMsg('¡Cuenta creada! Revisa tu correo para confirmar tu registro.');
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="auth-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            onClick={handleClose}
          />

          {/* ── Modal panel ── */}
          <motion.div
            key="auth-modal"
            initial={{ opacity: 0, scale: 0.95, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -12 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-full max-w-sm mx-4"
          >
            <div className="bg-white rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] border border-divider overflow-hidden">

              {/* ── Header ── */}
              <div className="relative p-6 pb-4 border-b border-divider bg-belia-cream/40">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface-container transition-colors text-text-meta hover:text-text-secondary"
                  aria-label="Cerrar"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>

                {/* Logo */}
                <div className="flex justify-center mb-3">
                  <img src="/logo.png" alt="Belia" className="h-10 w-auto object-contain" />
                </div>

                <h2 className="text-center text-lg font-bold text-belia-charcoal">
                  {view === 'options' && 'Accede con tu cuenta'}
                  {view === 'login'   && 'Inicia sesión'}
                  {view === 'register' && 'Crear cuenta'}
                </h2>
                <p className="text-center text-xs text-text-secondary mt-1">
                  {view === 'options'  && 'Accede con tu cuenta y gestiona tus pedidos.'}
                  {view === 'login'    && 'Ingresa tus datos para continuar.'}
                  {view === 'register' && 'Regístrate para empezar a comprar.'}
                </p>
              </div>

              {/* ── Content ── */}
              <div className="p-6 space-y-4">

                {/* Error banner */}
                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-px">error</span>
                    {error}
                  </div>
                )}

                {/* Success banner */}
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
                      {/* Google icon SVG */}
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
                      {/* Facebook icon SVG */}
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

                    {/* Email login */}
                    <button
                      onClick={() => { setError(''); setView('login'); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-belia-red text-white font-semibold text-sm hover:bg-[#D9302A] transition-colors shadow-belia-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">mail</span>
                      Entrar con e-mail y contraseña
                    </button>

                    {/* Crear cuenta */}
                    <button
                      onClick={() => { setError(''); setView('register'); }}
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
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Correo electrónico
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-meta text-[18px]">mail</span>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tucorreo@ejemplo.com"
                          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-divider focus:border-belia-red focus:ring-2 focus:ring-belia-red/20 outline-none text-sm transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-text-secondary">Contraseña</label>
                        <a href="/recuperar-contrasena" className="text-xs text-belia-red hover:underline">
                          ¿Olvidaste tu contraseña?
                        </a>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-meta text-[18px]">lock</span>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-divider focus:border-belia-red focus:ring-2 focus:ring-belia-red/20 outline-none text-sm transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-xl bg-belia-red text-white font-bold text-sm hover:bg-[#D9302A] transition-colors shadow-belia-sm disabled:opacity-50"
                    >
                      {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
                    </button>

                    <div className="flex items-center justify-between text-sm pt-1">
                      <button type="button" onClick={() => { setError(''); setView('options'); }} className="text-text-meta hover:text-belia-red transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                        Volver
                      </button>
                      <button type="button" onClick={() => { setError(''); setView('register'); }} className="text-belia-red font-semibold hover:underline">
                        Crear cuenta
                      </button>
                    </div>
                  </form>
                )}

                {/* ── VIEW: register form ── */}
                {view === 'register' && !successMsg && (
                  <form onSubmit={(e) => void handleRegister(e)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">
                        Correo electrónico
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-meta text-[18px]">mail</span>
                        <input
                          type="email"
                          required
                          value={email}
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
                          type="password"
                          required
                          value={password}
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
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-divider focus:border-belia-red focus:ring-2 focus:ring-belia-red/20 outline-none text-sm transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-xl bg-belia-red text-white font-bold text-sm hover:bg-[#D9302A] transition-colors shadow-belia-sm disabled:opacity-50"
                    >
                      {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
                    </button>

                    <button type="button" onClick={() => { setError(''); setView('options'); }} className="w-full text-sm text-text-meta hover:text-belia-red transition-colors flex items-center justify-center gap-1 pt-1">
                      <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                      Volver
                    </button>
                  </form>
                )}

                {/* After success — cerrar */}
                {successMsg && (
                  <button
                    onClick={handleClose}
                    className="w-full py-3 rounded-xl bg-belia-red text-white font-bold text-sm hover:bg-[#D9302A] transition-colors"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
