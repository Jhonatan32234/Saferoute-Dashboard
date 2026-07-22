// src/pages/SuccessPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, setToken } from '../api/client';

export default function SuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    // Restaurar token
    const token = localStorage.getItem('saferoute_token');
    if (token) setToken(token);

    // Verificar suscripción cada 2 segundos (máximo 30 segundos)
    let intentos = 0;
    const maxIntentos = 15;

    const interval = setInterval(async () => {
      intentos++;
      try {
        const empresa = await api.get('/api/billing/empresa');
        if (empresa.estado_suscripcion === 'activo') {
          clearInterval(interval);
          setVerificando(false);
          navigate('/dashboard/mapa', { replace: true });
        }
      } catch {
        // Si falla, seguir intentando
      }
      
      if (intentos >= maxIntentos) {
        clearInterval(interval);
        setVerificando(false);
        // Si después de 30s no se activó, ir al dashboard de todos modos
        navigate('/dashboard/mapa', { replace: true });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 50%, #0d1b33 100%)' }}>
      
      <div className="w-full max-w-md text-center">
        <div className="bg-[#0d1b33] border border-[#2a4070]/50 rounded-2xl p-10 shadow-2xl">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">¡Pago Exitoso!</h1>
          <p className="text-gray-400 mb-4">Tu suscripción ha sido activada correctamente.</p>
          
          {sessionId && (
            <p className="text-gray-500 text-xs mb-6 font-mono">Sesión: {sessionId.substring(0, 20)}...</p>
          )}

          {verificando ? (
            <>
              <p className="text-gray-400 text-sm mb-4">Verificando activación de suscripción...</p>
              <div className="flex justify-center mb-6">
                <svg className="animate-spin h-8 w-8 text-blue-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            </>
          ) : (
            <button
              onClick={() => navigate('/dashboard/mapa', { replace: true })}
              className="text-blue-400 hover:text-blue-300 text-sm underline"
            >
              Ir al dashboard ahora
            </button>
          )}
        </div>
      </div>
    </div>
  );
}