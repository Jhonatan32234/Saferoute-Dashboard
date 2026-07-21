// ─── Planes y Facturación ─────────────────────────────────────

export type Plan = 'basico' | 'profesional';
export type MetodoPago = 'tarjeta' | 'oxxo' | 'spei';
export type EstadoSuscripcion = 'trial' | 'activo' | 'pendiente' | 'cancelado' | 'expirado';

export interface PlanInfo {
  nombre: Plan;
  descripcion: string;
  precio_anual: number;
  limite_conductores: number;
  precio_conductor_extra: number;
  caracteristicas: string[];
}

export interface EmpresaResponse {
  id: string;
  nombre_empresa: string;
  rfc?: string;
  email_facturacion?: string;
  plan_actual: Plan;
  estado_suscripcion: EstadoSuscripcion;
  max_conductores: number;
  conductores_actuales: number;
  conductores_extra: number;
  periodo_inicio?: string;
  periodo_fin?: string;
  created_at: string;
}

export interface CheckoutResponse {
  status: string;
  empresa_id: string;
  checkout_url: string;
  total: number;
}

export interface CalcularPrecioResponse {
  plan: Plan;
  conductores_base: number;
  conductores_extra: number;
  cargo_extra: number;
  subtotal: number;
  iva: number;
  total: number;
  precio_conductor_extra: number;
}

export interface Factura {
  id: string;
  empresa_id: string;
  subtotal: number;
  iva: number;
  total: number;
  plan: Plan;
  conductores_base: number;
  conductores_extra: number;
  cargo_conductores_extra: number;
  estado: string;
  metodo_pago: string;
  fecha_emision: string;
  fecha_pago?: string;
  periodo_inicio?: string;
  periodo_fin?: string;
}

export interface HistorialSuscripcion {
  id: number;
  empresa_id: string;
  cambio: string;
  descripcion: string;
  created_at: string;
}

export interface MetodoPagoInfo {
  id: MetodoPago;
  nombre: string;
  proveedor: string;
  comision: string;
  instrucciones?: string;
}