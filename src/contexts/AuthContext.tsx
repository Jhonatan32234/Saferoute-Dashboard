import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setToken, getToken } from '../api/client';
import type { User, LoginCredentials } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<User>;  // ← Cambiado a Promise<User>
  register: (credentials: LoginCredentials & { nombre: string }) => Promise<User>;  // ← Cambiado
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
      validateToken();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function validateToken() {
    try {
      const data = await api.get('/api/user/profile');

      setUser({
        id: data.id || '1',
        nombre: data.nombre || 'Administrador',
        email: data.email || '',
        tipo: data.tipo || 'admin',
      });

      localStorage.setItem('user_name', data.nombre || 'Administrador');
      localStorage.setItem('user_email', data.email || '');
      localStorage.setItem('user_tipo', data.tipo || 'admin');
    } catch (err) {
      console.warn('No se pudo validar token con el servidor');

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

  // ✅ Ahora retorna User
  async function login(credentials: LoginCredentials): Promise<User> {
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
          email: data.email || credentials.email,
          tipo: data.tipo || 'admin',
        };

        console.log('👤 Usuario guardado:', userData);

        localStorage.setItem('user_name', userData.nombre);
        localStorage.setItem('user_email', userData.email);
        localStorage.setItem('user_tipo', userData.tipo);

        setUser(userData);
        return userData;  // ✅ Retornar datos
      } else {
        throw new Error(data.error || 'Credenciales inválidas');
      }
    } catch (err) {
      console.error('❌ Error en login:', err);
      const message = err instanceof Error ? err.message : 'Error de conexión';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  // ✅ Ahora retorna User
  async function register(credentials: LoginCredentials & { nombre: string }): Promise<User> {
    setError(null);
    setIsLoading(true);

    try {
      // ✅ Usar el endpoint de registro de admin
      const data = await api.post('/api/auth/register-admin', {
        email: credentials.email,
        password: credentials.password,
        nombre: credentials.nombre,
      });

      if (data.token) {
        setToken(data.token);

        const userData: User = {
          id: data.id || data.user_id || '1',
          nombre: credentials.nombre,
          email: credentials.email,
          tipo: 'admin',
        };

        localStorage.setItem('user_name', userData.nombre);
        localStorage.setItem('user_email', userData.email);
        localStorage.setItem('user_tipo', userData.tipo);

        setUser(userData);
        return userData;  // ✅ Retornar datos
      } else {
        throw new Error(data.error || 'Error al registrarse');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de conexión';
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
    localStorage.removeItem('cached_email');
    setUser(null);
    setError(null);
  }

  function clearError() {
    setError(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, register, logout, clearError }}>
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