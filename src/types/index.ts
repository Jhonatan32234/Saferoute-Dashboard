// Tipos de autenticación
export interface User {
  id: string;
  nombre: string;
  email: string;
  tipo: 'admin' | 'conductor';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token?: string;
  nombre?: string;
  tipo?: 'admin' | 'conductor';
  error?: string;
}

// Tipos de reportes
export type TipoReporte = 
  | 'inundacion' 
  | 'accidente' 
  | 'bache' 
  | 'derrumbe' 
  | 'sin_luz' 
  | 'niebla' 
  | 'bloqueo' 
  | 'otro';

export interface Reporte {
  id: string;
  tipo: TipoReporte;
  texto: string;
  nota_voz?: string;
  timestamp: string;
  confirmaciones: number;
  ruta_id: string;
  score?: number;
}

// Tipos de clusters y mapa
export interface Cluster {
  cluster_id: number;
  lat: number;
  lon: number;
  riesgo_combinado: number;
  num_inundaciones: number;
  total_muertos: number;
  total_heridos: number;
}

// Tipos de predicciones
export interface ZonaPredicha {
  nombre_zona: string;
  nivel: 'critico' | 'alto' | 'medio' | 'bajo';
  probabilidad_incidente: number;
  tipo_riesgo_predominante: string;
  factores_contribuyentes: string[];
  recomendacion: string;
}

export interface Conductor {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  nivel_riesgo?: string;
  probabilidad_incidente?: number;
  factores_riesgo?: string[];
  fortalezas?: string[];
  recomendaciones?: string[];
}

// Tipos de analítica
export interface Topico {
  nombre: string;
  porcentaje: number;
  frecuencia: number;
  palabras_clave: string[];
  tendencia: string;
  accion_sugerida: string;
}

export interface Reporte {
  id: string;
  tipo: TipoReporte;
  texto?: string;
  nota_voz?: string;
  timestamp: string;
  confirmaciones: number;
  ruta_id: string;
  score?: number;
  latitud?: number;
  longitud?: number;
  lat?: number;  // Por si la API usa 'lat' en lugar de 'latitud'
  lon?: number;  // Por si la API usa 'lon' en lugar de 'longitud'
  vigente?: boolean;
}