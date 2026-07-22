// src/guards/SubscriptionGuard.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export default function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    verificarSuscripcion();
  }, []);

  async function verificarSuscripcion() {
    const token = localStorage.getItem('saferoute_token');

    // 1. Sin token → login
    if (!token) {
      navigate('/login', { replace: true });
      setChecking(false);
      return;
    }

    try {
      // 2. Verificar perfil
      const perfil = await api.get('/api/user/profile');

      // 3. Si no es admin, acceso directo (conductores no necesitan suscripción)
      if (perfil.tipo !== 'admin') {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      // 4. Admin: verificar suscripción
      try {
        const empresa = await api.get('/api/billing/empresa');

        // Sin empresa → onboarding
        if (!empresa || !empresa.id) {
          navigate('/onboarding', { replace: true });
          setChecking(false);
          return;
        }

        // Empresa no activa → redirigir a facturacion (no a precios)
        if (empresa.estado_suscripcion !== 'activo') {
          // Si ya está en facturación, permitir acceso
          if (location.pathname.includes('/dashboard/facturacion') ||
              location.pathname.includes('/billing')) {
            setAuthorized(true);
            setChecking(false);
            return;
          }
          // Redirigir a facturacion para que pueda ver su suscripción pendiente y pagar
          navigate('/dashboard/facturacion', { replace: true });
          setChecking(false);
          return;
        }

        // Todo OK
        setAuthorized(true);
      } catch (err: any) {
        // Si el endpoint de billing falla (ej: 404 sin empresa)
        navigate('/onboarding', { replace: true });
      }
    } catch (err: any) {
      // Token inválido
      localStorage.removeItem('saferoute_token');
      localStorage.removeItem('saferoute_user');
      navigate('/login', { replace: true });
    } finally {
      setChecking(false);
    }
  }

  // Loading mientras verifica
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-y-auto"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 50%, #0d1b33 100%)' }}>
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-400 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400 text-sm">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // No autorizado → no renderizar nada
  if (!authorized) {
    return null;
  }

  // Autorizado → mostrar dashboard
  return <>{children}</>;
}