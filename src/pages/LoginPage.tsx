import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate('/dashboard/mapa', { replace: true });
  }, [user, navigate]);

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
      await login({ email, password });
      if (remember) localStorage.setItem('cached_email', email);
      else localStorage.removeItem('cached_email');
      navigate('/dashboard/mapa', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center">
        <div className="text-center">
          <div className="loader mb-4"></div>
          <p className="text-[#8b9db5] text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    // En LoginPage.tsx, cambia el fondo:
<div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
     style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 50%, #0d1b33 100%)' }}>
  
  {/* Elementos decorativos */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#0ea5e9]/5 rounded-full blur-3xl"></div>
    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#3b82f6]/5 rounded-full blur-3xl"></div>
  </div>

  {/* Card */}
  <div className="w-full max-w-[420px] relative z-10 animate-fade-in">
    <div className="bg-[#0d1b33] border border-[#2a4070]/50 rounded-2xl p-8 lg:p-10 shadow-2xl shadow-black/40 backdrop-blur-sm">
      {/* En LoginPage.tsx, corrige el logo */}
<div className="text-center mb-8">
  <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-[#0f1f3a] border border-[#2a4070]/50 mb-6 shadow-lg overflow-hidden">
    <img 
      src="/saferoute_blue.png" 
      alt="SafeRoute" 
      className="w-10 h-10 object-contain"
    />
  </div>
  <h1 className="text-[1.8rem] font-bold text-[#e8eef5] mb-1">SafeRoute</h1>
  <p className="text-[#94a3b8] text-sm">Panel de Administración de Flotas</p>
</div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label htmlFor="login-email">Correo electrónico</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@test.mx"
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
            autoComplete="current-password"
          />
        </div>

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
              <span className="loader !w-4 !h-4"></span>
              <span>Iniciando...</span>
            </>
          ) : (
            'Iniciar Sesión'
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-[#2a4070]/30 text-center">
        <p className="text-[#627d98] text-sm">
          SafeRoute · Sistema de Gestión de Flotas
        </p>
      </div>
    </div>
  </div>
</div>
  );
}