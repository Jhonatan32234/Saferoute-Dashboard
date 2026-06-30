const API_URL = 'https://saferoute-api-m4i5.onrender.com';

const MOTORES: Record<string, string> = {
  nlp: "https://cca9-189-150-33-249.ngrok-free.app",
  predicciones: "https://f732-189-150-33-249.ngrok-free.app",
  llm: import.meta.env.PROD ? 'https://saferoute-api-m4i5.onrender.com/api' : 'http://localhost:8002',
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

  // 💡 CRÍTICO: Si la URL va hacia ngrok, saltarse la pantalla de advertencia del navegador
  if (url.includes('ngrok-free.app')) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, { 
      ...options, 
      headers,
      credentials: 'omit'
    });

    if (response.status === 401) {
      setToken('');
      localStorage.clear();
      window.location.hash = '#login';
      throw new ApiError('Sesion expirada', 401);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(error.error || `Error ${response.status}`, response.status);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('No se pudo conectar con el servidor', 0);
  }
}

// API Gateway (Render)
export const api = {
  get: <T = any>(endpoint: string) => 
    request<T>(`${API_URL}${endpoint}`),
  
  post: <T = any>(endpoint: string, body: unknown) => 
    request<T>(`${API_URL}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// Motores externos (Directo a tus túneles de ngrok)
export const motores = {
  get: <T = any>(motor: string, endpoint: string) =>
    request<T>(`${MOTORES[motor]}${endpoint}`),
  
  post: <T = any>(motor: string, endpoint: string, body: unknown) =>
    request<T>(`${MOTORES[motor]}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};