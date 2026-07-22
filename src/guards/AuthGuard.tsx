// src/guards/AuthGuard.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'conductor';
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    console.log("llamada");
    
    verificarAcceso();
  }, []);

  async function verificarAcceso() {
    console.log("llamada");
    
    const token = localStorage.getItem('saferoute_token');
    
    // 1. Sin token → redirigir a login
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    try {
      // 2. Verificar que el token sea válido
      const perfil = await api.get('/api/user/profile');
      
      // 3. Verificar rol si es necesario
      if (requiredRole && perfil.tipo !== requiredRole) {
        navigate('/login', { replace: true });
        return;
      }

      // 4. Si es admin, verificar suscripción ANTES de mostrar dashboard
      if (perfil.tipo === 'admin') {
        try {
          const empresa = await api.get('/api/billing/empresa');
          console.log(empresa);
          
          
          // Si no tiene empresa → onboarding
          if (!empresa || !empresa.id) {
            navigate('/onboarding', { replace: true });
            return;
          }
          
          // Si tiene empresa pero no está activa → facturacion (para pagar)
          if (empresa.estado_suscripcion !== 'activo') {
            navigate('/dashboard/facturacion', { replace: true });
            return;
          }
        } catch {
          // Si falla billing → onboarding
          navigate('/onboarding', { replace: true });
          return;
        }
      }

      // 5. Todo OK
      setAuthorized(true);
    } catch {
      // Token inválido → login
      localStorage.removeItem('saferoute_token');
      navigate('/login', { replace: true });
    } finally {
      setChecking(false);
    }
  }

  // Mostrar loading mientras verifica
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-y-auto"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 50%, #0d1b33 100%)' }}>
        <LoadingSpinner message="Verificando acceso..." />
      </div>
    );
  }

  // No autorizado → no renderizar nada (ya redirigió)
  if (!authorized) {
    return null;
  }

  // Autorizado → mostrar contenido
  return <>{children}</>;
}