import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardPrincipal from '../components/mapa/DashboardPrincipal';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const AnaliticaView = lazy(() => import('../components/analitica/AnaliticaView'));
const FlotaView = lazy(() => import('../components/flota/FlotaView'));

function LazyFallback() {
  return <LoadingSpinner message="Cargando modulo..." />;
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) navigate('/login', { replace: true });
  }, [user, isLoading, navigate]);

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
          <Route path="*" element={<Navigate to="mapa" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}