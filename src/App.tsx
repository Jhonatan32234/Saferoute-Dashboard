import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MapProvider } from './contexts/MapContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OnboardingPage from './pages/OnboardingPage';
import SuccessPage from './pages/SuccessPage';
import CancelPage from './pages/CancelPage';
import PricingPage from './pages/PricingPage';
import SubscriptionGuard from './guards/SubscriptionGuard';

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#627d98] mb-4">404</h1>
        <p className="text-[#94a3b8] mb-6">Página no encontrada</p>
        <a href="/dashboard/mapa" className="text-[#0ea5e9] hover:text-[#0284c7]">
          Volver al Dashboard
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MapProvider>
          <Routes>
            {/* Públicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/precios" element={<PricingPage />} />
            <Route path="/pago-exitoso" element={<SuccessPage />} />
            <Route path="/pago-cancelado" element={<CancelPage />} />

            {/* Onboarding (requiere auth pero no suscripción) */}
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Dashboard protegido por suscripción */}
            <Route path="/dashboard/*" element={
              <SubscriptionGuard>
                <DashboardPage />
              </SubscriptionGuard>
            } />

            {/* Default */}
            <Route path="/" element={<Navigate to="/dashboard/mapa" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </MapProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}