// src/pages/SuccessPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, setToken } from '../api/client';

export default function SuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [checking, setChecking] = useState(true);
  const [reintentos, setReintentos] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('saferoute_token');
    if (token) setToken(token);

    verificarSuscripcion();
  }, []);

  async function verificarSuscripcion() {
    try {
      const empresa = await api.get('/api/billing/empresa');
      
      if (empresa.estado_suscripcion === 'activo') {
        // ✅ Suscripción activa → ir al dashboard
        navigate('/dashboard/mapa', { replace: true });
        return;
      }
      
      // Si no está activa, reintentar en 3 segundos
      if (reintentos < 10) {
        setReintentos(prev => prev + 1);
        setTimeout(() => verificarSuscripcion(), 3000);
      } else {
        // Después de 10 intentos, mostrar opción manual
        setChecking(false);
      }
    } catch {
      // Error → reintentar
      if (reintentos < 10) {
        setReintentos(prev => prev + 1);
        setTimeout(() => verificarSuscripcion(), 3000);
      } else {
        setChecking(false);
      }
    }
  }

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
          
          {checking ? (
            <>
              <p className="text-gray-400 mb-4">Verificando activación de suscripción... ({reintentos}/10)</p>
              <div className="flex justify-center mb-6">
                <svg className="animate-spin h-8 w-8 text-blue-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-400 mb-4">El pago se procesó pero la activación está tardando.</p>
              <button
                onClick={() => navigate('/dashboard/mapa', { replace: true })}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Ir al Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}