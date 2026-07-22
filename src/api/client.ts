export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
export const INTERNAL_API_KEY = import.meta.env.VITE_INTERNAL_API_KEY || 'my-key';

const MOTORES: Record<string, string> = {
  nlp: import.meta.env.VITE_NLP_URL || 'https://motor-nlp.onrender.com',
  predicciones: import.meta.env.VITE_PREDICCIONES_URL || 'https://motor-predicciones.onrender.com',
  llm: import.meta.env.VITE_LLM_URL || '',
};
let authToken = localStorage.getItem('saferoute_token') || '';

export function setToken(token: string) {
  authToken = token;
  if (token) {
    localStorage.setItem('saferoute_token', token);
  } else {
    localStorage.removeItem('saferoute_token');
  }
}

export function getToken(): string {
  return authToken;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
    console.log('🔐 Enviando token en header');
  } else {
    console.warn('⚠️ No hay token para esta petición:', url);
  }

  console.log(`📡 ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, { 
      ...options, 
      headers,
      credentials: 'omit'
    });
    console.log("resp:",response);
    

    console.log(`📥 Respuesta: ${response.status} ${response.statusText}`);

    if (response.status === 401) {
      console.error('🔒 Token inválido o expirado');
      setToken('');
      localStorage.clear();
      window.location.hash = '#login';
      throw new ApiError('Sesion expirada', 401);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('❌ Error del servidor:', error);
      throw new ApiError(error.error || `Error ${response.status}`, response.status);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error('🌐 Error de red:', error);
    throw new ApiError('No se pudo conectar con el servidor', 0);
  }
}

// API Gateway - NOTA: los endpoints YA incluyen /api en el backend
export const api = {
  get: <T = any>(endpoint: string) => 
    request<T>(`${API_URL}${endpoint}`),
  
  post: <T = any>(endpoint: string, body: unknown) => 
    request<T>(`${API_URL}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T = any>(endpoint: string, body: unknown) => 
    request<T>(`${API_URL}${endpoint}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T = any>(endpoint: string) => 
    request<T>(`${API_URL}${endpoint}`, {
      method: 'DELETE',
    }),

  postInternal: <T = any>(endpoint: string, body: unknown) =>
    request<T>(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'X-Internal-API-Key': INTERNAL_API_KEY },
      body: JSON.stringify(body),
    }),
};

export function toWebSocketURL(baseURL = API_URL): string {
  return baseURL.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
}

// Motores locales
export const motores = {
  get: <T = any>(motor: string, endpoint: string) =>
    request<T>(`${MOTORES[motor]}${endpoint}`),
  
  post: <T = any>(motor: string, endpoint: string, body: unknown) =>
    request<T>(`${MOTORES[motor]}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
