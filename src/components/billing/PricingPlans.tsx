import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import type { Plan, MetodoPago, PlanInfo, EmpresaResponse, CheckoutResponse, CalcularPrecioResponse, Factura, HistorialSuscripcion } from '../../types/billing';

type Step = 'planes' | 'configuracion' | 'exito';

export default function PricingPlans() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('planes');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoadingEmpresa, setIsLoadingEmpresa] = useState(true);

  // Datos de la empresa
  const [empresa, setEmpresa] = useState<EmpresaResponse | null>(null);
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [rfc, setRfc] = useState('');
  const [emailFacturacion, setEmailFacturacion] = useState('');

  // Planes
  const [planes, setPlanes] = useState<PlanInfo[]>([]);
  const [planSeleccionado, setPlanSeleccionado] = useState<Plan>('profesional');
  const [conductoresExtra, setConductoresExtra] = useState(0);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('tarjeta');

  // Precios
  const [precios, setPrecios] = useState<CalcularPrecioResponse | null>(null);

  // Facturas e historial
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [historial, setHistorial] = useState<HistorialSuscripcion[]>([]);
  const [tabActiva, setTabActiva] = useState<'suscripcion' | 'facturas' | 'historial'>('suscripcion');

  // Modal: Agregar conductores
  const [showAgregarConductores, setShowAgregarConductores] = useState(false);
  const [cantidadExtraModal, setCantidadExtraModal] = useState(1);

  // Modal: Cancelar suscripción
  const [showCancelar, setShowCancelar] = useState(false);

  useEffect(() => {
    cargarPlanes();
    verificarEmpresa();
  }, []);

  useEffect(() => {
    if (planSeleccionado) {
      calcularPrecios(planSeleccionado, conductoresExtra);
    }
  }, [planSeleccionado, conductoresExtra]);

  async function cargarPlanes() {
    try {
      const data = await api.get<PlanInfo[]>('/api/billing/plans');
      setPlanes(data);
    } catch (err) {
      console.error('Error cargando planes:', err);
    }
  }

  async function verificarEmpresa() {
    try {
      const data = await api.get<EmpresaResponse>('/api/billing/empresa');
      setEmpresa(data);
      setNombreEmpresa(data.nombre_empresa);
      setRfc(data.rfc || '');
      setEmailFacturacion(data.email_facturacion || '');
      setPlanSeleccionado(data.plan_actual);
      setConductoresExtra(data.conductores_extra);
      cargarFacturas();
      cargarHistorial();
    } catch {
      setEmpresa(null);
    } finally {
      setIsLoadingEmpresa(false);
    }
  }

  async function calcularPrecios(plan: Plan, extra: number) {
    try {
      const data = await api.get<CalcularPrecioResponse>(
        `/api/billing/precios/calcular?plan=${plan}&extra=${extra}`
      );
      setPrecios(data);
    } catch {
      const preciosBase = { basico: 2999, profesional: 5999 };
      const precioBase = preciosBase[plan];
      const cargoExtra = extra * 199;
      const subtotal = precioBase + cargoExtra;
      const iva = subtotal * 0.16;
      setPrecios({
        plan,
        conductores_base: plan === 'profesional' ? 30 : 15,
        conductores_extra: extra,
        cargo_extra: cargoExtra,
        subtotal,
        iva,
        total: subtotal + iva,
        precio_conductor_extra: 199,
      });
    }
  }

  async function cargarFacturas() {
    try {
      const data = await api.get<{ facturas: Factura[] }>('/api/billing/facturas?page=1&limit=10');
      setFacturas(data.facturas || []);
    } catch {
      setFacturas([]);
    }
  }

  async function cargarHistorial() {
    try {
      const data = await api.get<HistorialSuscripcion[]>('/api/billing/historial?limit=20');
      setHistorial(data || []);
    } catch {
      setHistorial([]);
    }
  }

  async function handleContratar() {
    if (!nombreEmpresa.trim()) {
      setError('El nombre de la empresa es requerido');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<CheckoutResponse>('/api/billing/empresa/crear', {
        nombre_empresa: nombreEmpresa,
        rfc: rfc || undefined,
        email_facturacion: emailFacturacion || undefined,
        plan: planSeleccionado,
        metodo_pago: metodoPago,
      });
      setStep('exito');
      if (response.checkout_url) {
        setTimeout(() => { window.location.href = response.checkout_url; }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear la suscripción');
    } finally {
      setLoading(false);
    }
  }

  async function handleCambiarPlan(planNuevo: Plan) {
    setLoading(true);
    setError(null);
    try {
      await api.put('/api/billing/empresa/cambiar-plan', {
        plan_nuevo: planNuevo,
        conductores_extra: conductoresExtra,
      });
      setPlanSeleccionado(planNuevo);
      setSuccessMsg(`✅ Plan cambiado a ${planNuevo === 'profesional' ? 'Profesional' : 'Básico'}`);
      setTimeout(() => setSuccessMsg(''), 3000);
      await verificarEmpresa();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar plan');
    } finally {
      setLoading(false);
    }
  }

  async function handleAgregarConductoresConfirmar() {
    setLoading(true);
    setError(null);
    try {
      await api.post('/api/billing/empresa/conductores', { cantidad: cantidadExtraModal });
      setSuccessMsg(`✅ ${cantidadExtraModal} conductor(es) agregado(s)`);
      setShowAgregarConductores(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      await verificarEmpresa();
    } catch (err: any) {
      setError(err.message || 'Error al agregar conductores');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelarSuscripcion() {
    setLoading(true);
    setError(null);
    try {
      await api.post('/api/billing/empresa/cancelar', {});
      setSuccessMsg('✅ Suscripción cancelada');
      setShowCancelar(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      await verificarEmpresa();
    } catch (err: any) {
      setError(err.message || 'Error al cancelar suscripción');
    } finally {
      setLoading(false);
    }
  }

  // ─── Loading ────────────────────────────────────
  if (isLoadingEmpresa) {
    return (
      <div className="p-6 max-w-5xl mx-auto h-full overflow-y-auto flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-400 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400 text-sm">Verificando suscripción...</p>
        </div>
      </div>
    );
  }

  // ─── Panel de gestión (empresa existente) ──────
  if (empresa) {
    return (
      <div className="p-6 max-w-5xl mx-auto h-full overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-6">💰 Facturación y Plan</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="hover:text-red-300">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
            {successMsg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-800/50 rounded-lg p-1">
          {(['suscripcion', 'facturas', 'historial'] as const).map(tab => (
            <button key={tab} onClick={() => setTabActiva(tab)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                tabActiva === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}>
              {tab === 'suscripcion' && '📋 Mi Suscripción'}
              {tab === 'facturas' && '🧾 Facturas'}
              {tab === 'historial' && '📜 Historial'}
            </button>
          ))}
        </div>

        {/* Tab: Suscripción */}
        {tabActiva === 'suscripcion' && (
          <div className="space-y-6">
            <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{empresa.nombre_empresa}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  empresa.estado_suscripcion === 'activo' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  empresa.estado_suscripcion === 'pendiente' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                  'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {empresa.estado_suscripcion === 'activo' ? '● Activo' : empresa.estado_suscripcion === 'pendiente' ? '● Pendiente' : '● Cancelado'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Plan actual</p>
                  <p className="text-white font-bold text-lg capitalize">{empresa.plan_actual}</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Conductores</p>
                  <p className="text-white font-bold text-lg">
                    {empresa.conductores_actuales} / {empresa.max_conductores}
                    {empresa.conductores_extra > 0 && <span className="text-yellow-400 text-sm ml-1">+{empresa.conductores_extra} extra</span>}
                  </p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Inicio</p>
                  <p className="text-white text-sm">{empresa.periodo_inicio ? new Date(empresa.periodo_inicio).toLocaleDateString() : '—'}</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Vencimiento</p>
                  <p className="text-white text-sm">{empresa.periodo_fin ? new Date(empresa.periodo_fin).toLocaleDateString() : '—'}</p>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button onClick={() => handleCambiarPlan(planSeleccionado === 'basico' ? 'profesional' : 'basico')}
                disabled={loading}
                className="p-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-left transition-all disabled:opacity-50">
                <p className="text-blue-400 font-bold text-sm">🔄 Cambiar Plan</p>
                <p className="text-gray-400 text-xs mt-1">{planSeleccionado === 'basico' ? 'Actualizar a Profesional' : 'Cambiar a Básico'}</p>
              </button>
              <button onClick={() => setShowAgregarConductores(true)}
                disabled={loading}
                className="p-4 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-xl text-left transition-all disabled:opacity-50">
                <p className="text-green-400 font-bold text-sm">👥 + Conductores</p>
                <p className="text-gray-400 text-xs mt-1">Agregar conductores extra ($199/año c/u)</p>
              </button>
              <button onClick={() => setShowCancelar(true)}
                disabled={loading}
                className="p-4 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-xl text-left transition-all disabled:opacity-50">
                <p className="text-red-400 font-bold text-sm">⛔ Cancelar</p>
                <p className="text-gray-400 text-xs mt-1">Cancelar suscripción</p>
              </button>
            </div>
          </div>
        )}

        {/* Tab: Facturas */}
        {tabActiva === 'facturas' && (
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 overflow-hidden">
            {facturas.length === 0 ? (
              <div className="p-8 text-center text-gray-500"><p className="text-4xl mb-2">🧾</p><p>No hay facturas aún</p></div>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-gray-700/50 text-gray-400 text-xs uppercase">
                  <th className="text-left p-4">Fecha</th><th className="text-left p-4">Plan</th><th className="text-left p-4">Método</th><th className="text-right p-4">Total</th><th className="text-right p-4">Estado</th>
                </tr></thead>
                <tbody>
                  {facturas.map(f => (
                    <tr key={f.id} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                      <td className="p-4 text-white text-sm">{new Date(f.fecha_emision).toLocaleDateString()}</td>
                      <td className="p-4 text-white text-sm capitalize">{f.plan}</td>
                      <td className="p-4 text-gray-400 text-sm capitalize">{f.metodo_pago || '—'}</td>
                      <td className="p-4 text-white text-sm text-right">${f.total.toLocaleString()}</td>
                      <td className="p-4 text-right"><span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        f.estado === 'pagado' ? 'bg-green-500/20 text-green-400' : f.estado === 'pendiente' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                      }`}>{f.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab: Historial */}
        {tabActiva === 'historial' && (
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/50">
            {historial.length === 0 ? (
              <div className="p-8 text-center text-gray-500"><p className="text-4xl mb-2">📜</p><p>No hay historial aún</p></div>
            ) : (
              <div className="divide-y divide-gray-700/30">
                {historial.map(h => (
                  <div key={h.id} className="p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center text-sm flex-shrink-0">
                      {h.cambio === 'creacion' && '🏢'}{h.cambio === 'activacion' && '✅'}{h.cambio === 'cambio_plan' && '🔄'}
                      {h.cambio === 'agregar_conductor' && '👥'}{h.cambio === 'pago_recibido' && '💰'}{h.cambio === 'cancelacion' && '⛔'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{h.descripcion}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{new Date(h.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
              {/* ─── Modal: Agregar Conductores ─── */}
      {showAgregarConductores && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAgregarConductores(false)}>
          <div className="bg-[#0d1b33] border border-[#2a4070] rounded-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Agregar Conductores Extra</h3>
            <p className="text-gray-400 text-sm mb-4">
              +$199 MXN/año por conductor
            </p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <button onClick={() => setCantidadExtraModal(Math.max(1, cantidadExtraModal - 1))} className="w-10 h-10 rounded-lg bg-gray-700 text-white text-xl">−</button>
              <span className="text-3xl font-bold text-white">{cantidadExtraModal}</span>
              <button onClick={() => setCantidadExtraModal(Math.min(20, cantidadExtraModal + 1))} className="w-10 h-10 rounded-lg bg-gray-700 text-white text-xl">+</button>
            </div>
            <p className="text-center text-gray-400 text-sm mb-4">
              Total extra: <span className="text-yellow-400">${(cantidadExtraModal * 199).toLocaleString()} MXN/año</span>
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowAgregarConductores(false)} className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleAgregarConductoresConfirmar} disabled={loading} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50">
                {loading ? 'Agregando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Cancelar Suscripción ─── */}
      {showCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCancelar(false)}>
          <div className="bg-[#0d1b33] border border-[#2a4070] rounded-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-400 mb-4">⚠️ Cancelar Suscripción</h3>
            <ul className="text-gray-400 text-xs space-y-1 mb-4">
              <li>• Tus conductores dejarán de ser monitoreados</li>
              <li>• No podrás registrar nuevos conductores</li>
              <li>• El acceso al dashboard se restringirá</li>
              <li>• No se harán más cobros</li>
            </ul>
            <div className="flex gap-2">
              <button onClick={() => setShowCancelar(false)} className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Volver</button>
              <button onClick={handleCancelarSuscripcion} disabled={loading} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">
                {loading ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  }

  

  // ─── Paso 1: Selección de Planes ──────────────
  if (step === 'planes') {
    return (
      <div className="p-6 max-w-5xl mx-auto h-full overflow-y-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Elige tu Plan Empresarial</h2>
          <p className="text-gray-400">Protege a tu flota con monitoreo en tiempo real y alertas inteligentes</p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}<button onClick={() => setError(null)} className="float-right hover:text-red-300">✕</button></div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {planes.map(plan => {
            const isSelected = planSeleccionado === plan.nombre;
            const isPro = plan.nombre === 'profesional';
            return (
              <div key={plan.nombre} onClick={() => setPlanSeleccionado(plan.nombre)}
                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                  isSelected ? isPro ? 'border-purple-500 bg-purple-500/10' : 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700/50 bg-gray-800/40 hover:border-gray-600'
                }`}>
                {isPro && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-xs font-bold text-white">RECOMENDADO</div>}
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-bold ${isPro ? 'text-purple-400' : 'text-blue-400'}`}>{plan.nombre === 'basico' ? '🚛 Básico' : '⭐ Profesional'}</h3>
                  {isSelected && <div className={`w-6 h-6 rounded-full ${isPro ? 'bg-purple-500' : 'bg-blue-500'} flex items-center justify-center`}><svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>}
                </div>
                <p className="text-3xl font-bold text-white mb-1">${plan.precio_anual.toLocaleString()}<span className="text-sm text-gray-400 font-normal"> MXN/año</span></p>
                <p className="text-gray-400 text-sm mb-4">{plan.descripcion}</p>
                <div className="space-y-2.5">
                  {plan.caracteristicas.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {feat.startsWith('❌') ? <span className="text-red-400">{feat}</span> :
                        <><svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="text-gray-300">{feat.replace('✅ ', '')}</span></>
                      }
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => setStep('configuracion')}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl text-lg transition-all">
          Continuar con {planSeleccionado === 'profesional' ? 'Profesional' : 'Básico'}
        </button>
      </div>
    );
  }

  // ─── Paso 2: Configuración ────────────────────
  if (step === 'configuracion') {
    return (
      <div className="p-6 max-w-3xl mx-auto h-full overflow-y-auto">
        <button onClick={() => setStep('planes')} className="text-gray-400 hover:text-white mb-4 flex items-center gap-1 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Volver a planes
        </button>
        <h2 className="text-2xl font-bold text-white mb-6">Configura tu Suscripción</h2>
        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}<button onClick={() => setError(null)} className="float-right hover:text-red-300">✕</button></div>}

        <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/50 mb-6">
          <h3 className="text-white font-bold mb-4">🏢 Datos de la Empresa</h3>
          <div className="space-y-4">
            <div><label className="text-gray-400 text-sm block mb-1">Nombre *</label><input type="text" value={nombreEmpresa} onChange={e => setNombreEmpresa(e.target.value)} className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2.5 text-white" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-gray-400 text-sm block mb-1">RFC</label><input type="text" value={rfc} onChange={e => setRfc(e.target.value.toUpperCase())} maxLength={13} className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2.5 text-white uppercase" /></div>
              <div><label className="text-gray-400 text-sm block mb-1">Email facturación</label><input type="email" value={emailFacturacion} onChange={e => setEmailFacturacion(e.target.value)} className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2.5 text-white" /></div>
            </div>
          </div>
        </div>

        <button onClick={handleContratar} disabled={loading || !nombreEmpresa.trim()}
          className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl text-lg transition-all disabled:opacity-50">
          {loading ? 'Procesando...' : `Pagar $${precios?.total.toLocaleString() || '0'} MXN`}
        </button>
      </div>
    );
  }

  // ─── Paso 3: Éxito ────────────────────────────
  return (
    <div className="p-6 max-w-3xl mx-auto h-full overflow-y-auto">
      <div className="bg-gray-800/60 rounded-xl p-8 border border-gray-700/50 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-white mb-2">¡Suscripción Creada!</h2>
        <p className="text-gray-400 mb-6">Tu empresa <strong className="text-white">{nombreEmpresa}</strong> ha sido registrada con el plan <strong className="text-blue-400 capitalize">{planSeleccionado}</strong>.</p>
        <p className="text-gray-500 text-sm mb-6">Serás redirigido para completar el pago...</p>
        <div className="animate-pulse flex justify-center">
          <svg className="w-8 h-8 text-blue-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    </div>
  );
}