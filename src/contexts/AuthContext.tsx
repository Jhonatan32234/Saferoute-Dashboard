import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setToken, getToken } from '../api/client';
import type { User, LoginCredentials } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      // Intentar validar token con el perfil
      validateToken();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function validateToken() {
    try {
      // El endpoint correcto es /api/user/profile
      const data = await api.get('/api/user/profile');
      
      setUser({
        id: data.id || '1',
        nombre: data.nombre || 'Administrador',
        email: data.email || '',
        tipo: data.tipo || 'admin',
      });
      
      // Guardar en localStorage para respaldo
      localStorage.setItem('user_name', data.nombre || 'Administrador');
      localStorage.setItem('user_email', data.email || '');
      localStorage.setItem('user_tipo', data.tipo || 'admin');
      
    } catch (err) {
      console.warn('No se pudo validar token con el servidor');
      
      // Si hay token guardado, usar datos locales
      if (getToken()) {
        setUser({
          id: '1',
          nombre: localStorage.getItem('user_name') || 'Administrador',
          email: localStorage.getItem('user_email') || '',
          tipo: (localStorage.getItem('user_tipo') as 'admin' | 'conductor') || 'admin',
        });
      } else {
        setToken('');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function login(credentials: LoginCredentials) {
  setError(null);
  setIsLoading(true);
  
  try {
    console.log('🔑 Intentando login con:', credentials.email);
    
    const data = await api.post('/api/auth/login', credentials);
    
    console.log('✅ Respuesta del servidor:', data);
    
    if (data.token) {
      console.log('🔐 Token recibido:', data.token.substring(0, 20) + '...');
      setToken(data.token);
      
      const userData: User = {
        id: data.user_id || '1',
        nombre: data.nombre || 'Administrador',
        email: credentials.email,
        tipo: data.tipo || 'admin',
      };
      
      console.log('👤 Usuario guardado:', userData);
      
      localStorage.setItem('user_name', userData.nombre);
      localStorage.setItem('user_email', userData.email);
      localStorage.setItem('user_tipo', userData.tipo);
      
      setUser(userData);
    } else {
      throw new Error(data.error || 'Credenciales invalidas');
    }
  } catch (err) {
    console.error('❌ Error en login:', err);
    const message = err instanceof Error ? err.message : 'Error de conexion';
    setError(message);
    throw err;
  } finally {
    setIsLoading(false);
  }
}

  function logout() {
    setToken('');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_tipo');
    setUser(null);
    setError(null);
  }

  function clearError() {
    setError(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}