import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client'; 


export default function LoginPage() {
  const { login, register, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Si ya está autenticado, redirigir
  useEffect(() => {
    if (user) {
      // Si es admin, verificar suscripción (lo hará SubscriptionGuard)
      if (user.tipo === 'admin') {
        navigate('/dashboard/mapa', { replace: true });
      }
    }
  }, [user, navigate]);

  // Cargar email recordado
  useEffect(() => {
    const cachedEmail = localStorage.getItem('cached_email');
    if (cachedEmail) {
      setEmail(cachedEmail);
    }
  }, []);

async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (modo === 'register') {
        if (!nombre.trim()) {
          throw new Error('El nombre es requerido');
        }
        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden');
        }
        if (password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }

        // ✅ Usar el cliente api en lugar de fetch directo
        const data = await api.post('/api/auth/register-admin', {
          email: email.trim().toLowerCase(),
          password,
          nombre: nombre.trim(),
        });

        // Guardar token
        localStorage.setItem('saferoute_token', data.token);
        localStorage.setItem('saferoute_user', JSON.stringify({
          id: data.user_id || data.id,
          nombre: data.nombre,
          email: data.email,
          tipo: data.tipo || 'admin',
        }));

        // Redirigir a onboarding para elegir plan
        navigate('/onboarding', { replace: true });
      } else {
        // ─── LOGIN ───
        const userData = await login({ email: email.trim().toLowerCase(), password });

        if (userData.tipo !== 'admin') {
          throw new Error('Solo administradores pueden acceder al panel web.');
        }

        if (remember) {
          localStorage.setItem('cached_email', email);
        } else {
          localStorage.removeItem('cached_email');
        }

        navigate('/dashboard/mapa', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Loading mientras verifica sesión ───
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 50%, #0d1b33 100%)' }}>
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-400 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400 text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // ─── Si ya está autenticado, no mostrar nada ───
  if (user) return null;

  // ─── Render ──────────────────────────────────
  return (
    <div className="min-h-screen flex items-start justify-center p-4 py-8 relative"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 50%, #0d1b33 100%)' }}>

      {/* Elementos decorativos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#0ea5e9]/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#3b82f6]/5 rounded-full blur-3xl"></div>
      </div>

      {/* Card */}
      <div className="w-full max-w-[420px] relative z-10 animate-fade-in">
        <div className="bg-[#0d1b33] border border-[#2a4070]/50 rounded-2xl p-8 lg:p-10 shadow-2xl shadow-black/40 backdrop-blur-sm">

          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-[#0f1f3a] border border-[#2a4070]/50 mb-4 shadow-lg overflow-hidden">
              <img
                src="/saferoute_blue.png"
                alt="SafeRoute"
                className="w-10 h-10 object-contain"
              />
            </div>
            <h1 className="text-[1.8rem] font-bold text-[#e8eef5] mb-1">SafeRoute</h1>
            <p className="text-[#94a3b8] text-sm">Panel de Administración de Flotas</p>
          </div>

          {/* Alerta: Solo admin */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-6 text-xs text-blue-400 text-center">
            Este panel es exclusivo para <strong>administradores</strong>.
            <br />Los conductores deben usar la aplicación móvil.
          </div>

          {/* Tabs: Login / Registro */}
          <div className="flex gap-1 mb-6 bg-[#0f1f3a] rounded-lg p-1 border border-[#2a4070]/30">
            <button
              type="button"
              onClick={() => { setModo('login'); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                modo === 'login'
                  ? 'bg-[#0ea5e9] text-white shadow-lg'
                  : 'text-[#627d98] hover:text-[#94a3b8]'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setModo('register'); setError(''); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                modo === 'register'
                  ? 'bg-[#0ea5e9] text-white shadow-lg'
                  : 'text-[#627d98] hover:text-[#94a3b8]'
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre (solo registro) */}
            {modo === 'register' && (
              <div className="form-group">
                <label htmlFor="reg-nombre">Nombre completo</label>
                <input
                  id="reg-nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="login-email">Correo electrónico</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@empresa.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Contraseña</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={modo === 'register' ? 'new-password' : 'current-password'}
              />
            </div>

            {/* Confirmar contraseña (solo registro) */}
            {modo === 'register' && (
              <div className="form-group">
                <label htmlFor="reg-confirm">Confirmar contraseña</label>
                <input
                  id="reg-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            {/* Recordar usuario (solo login) */}
            {modo === 'login' && (
              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>Recordar usuario</span>
                </label>
              </div>
            )}

            {error && (
              <div className="bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] text-[#ef4444] px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#0ea5e9]/20 hover:shadow-xl hover:shadow-[#0ea5e9]/30"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{modo === 'register' ? 'Creando cuenta...' : 'Iniciando sesión...'}</span>
                </>
              ) : (
                modo === 'register' ? 'Crear Cuenta de Admin' : 'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Info registro */}
          {modo === 'register' && (
            <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
              <p className="text-[#627d98] text-xs text-center">
                Al crear tu cuenta, podrás elegir un plan empresarial y gestionar tu flota de conductores.
              </p>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-[#2a4070]/30 text-center">
            <p className="text-[#627d98] text-sm">
              {modo === 'login' ? (
                <>¿No tienes cuenta? <button type="button" onClick={() => setModo('register')} className="text-[#0ea5e9] hover:underline">Crear cuenta de admin</button></>
              ) : (
                <>¿Ya tienes cuenta? <button type="button" onClick={() => setModo('login')} className="text-[#0ea5e9] hover:underline">Iniciar sesión</button></>
              )}
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-[#627d98] text-xs">
              SafeRoute · Sistema de Gestión de Flotas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}