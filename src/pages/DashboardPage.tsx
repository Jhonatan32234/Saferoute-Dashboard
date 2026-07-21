import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardPrincipal from '../components/mapa/DashboardPrincipal';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const AnaliticaView = lazy(() => import('../components/analitica/AnaliticaView'));
const FlotaView = lazy(() => import('../components/flota/FlotaView'));
const PricingPlans = lazy(() => import('../components/billing/PricingPlans'));

function LazyFallback() {
  return <LoadingSpinner message="Cargando modulo..." />;
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!isLoading && user) {
      // Verificar si el usuario ya tiene empresa (onboarding completado)
      verificarOnboarding();
    }
  }, [user, isLoading, navigate]);

  async function verificarOnboarding() {
    try {
      // Intentar obtener la empresa - si falla, no tiene empresa
      await api.get('/api/billing/empresa');
      // Tiene empresa, puede pasar al dashboard
      //return true
    } catch {
      // No tiene empresa → redirigir al onboarding
      navigate('/onboarding', { replace: true });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <LoadingSpinner message="Verificando sesion..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <Suspense fallback={<LazyFallback />}>
        <Routes>
          <Route index element={<Navigate to="mapa" replace />} />
          <Route path="mapa" element={<DashboardPrincipal />} />
          <Route path="analitica" element={<AnaliticaView />} />
          <Route path="flota" element={<FlotaView />} />
          <Route path="facturacion" element={<PricingPlans />} />
          <Route path="*" element={<Navigate to="mapa" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}