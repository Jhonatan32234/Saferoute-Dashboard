import { useState, useEffect } from 'react';
import { api } from '../../api/client';

interface EmpresaInfo {
  id: string;
  nombre_empresa: string;
  rfc: string;
  plan_actual: string;
  estado_suscripcion: string;
  max_conductores: number;
  conductores_actuales: number;
  conductores_extra: number;
  periodo_inicio: string;
  periodo_fin: string;
  created_at: string;
}

export default function EmpresaPanel() {
  const [empresa, setEmpresa] = useState<EmpresaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modales
  const [showCambiarPlan, setShowCambiarPlan] = useState(false);
  const [showAgregarConductores, setShowAgregarConductores] = useState(false);
  const [showCancelar, setShowCancelar] = useState(false);
  

  // Estados para formularios
  const [planNuevo, setPlanNuevo] = useState<string>('profesional');
  const [cantidadExtra, setCantidadExtra] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    cargarEmpresa();
  }, []);

  async function cargarEmpresa() {
    setLoading(true);
    try {
      const data = await api.get<EmpresaInfo>('/api/billing/empresa');
      setEmpresa(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos de la empresa');
    } finally {
      setLoading(false);
    }
  }

  async function handleCambiarPlan() {
    setSubmitting(true);
    setError('');
    try {
      await api.put('/api/billing/empresa/cambiar-plan', {
        plan_nuevo: planNuevo,
      });
      setSuccessMsg(`Plan cambiado a ${planNuevo === 'profesional' ? 'Profesional' : 'Basico'}`);
      setShowCambiarPlan(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      cargarEmpresa();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar plan');
    } finally {
      setSubmitting(false);
    }
  }

const handleAbrirModalConductores = () => {
    console.log("llamando aqui");
  setShowAgregarConductores(true);
};

async function handleConfirmarAgregarConductores() {
  setSubmitting(true);
  setError('');
  try {
    await api.post('/api/billing/empresa/conductores', { cantidad: cantidadExtra });
    setSuccessMsg(`${cantidadExtra} conductor(es) agregado(s)`);
    setShowAgregarConductores(false);
    setTimeout(() => setSuccessMsg(''), 3000);
    cargarEmpresa();
  } catch (err: any) {
    setError(err.message || 'Error al agregar conductores');
  } finally {
    setSubmitting(false);
  }
}

  async function handleCancelar() {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/billing/empresa/cancelar', {});
      setSuccessMsg('Suscripcion cancelada');
      setShowCancelar(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      cargarEmpresa();
    } catch (err: any) {
      setError(err.message || 'Error al cancelar');
    } finally {
      setSubmitting(false);
    }
  }

  // --- Loading --------------------------------------
  if (loading) {
    return (
      <div className="bg-[#0d1b33] border border-[#2a4070]/30 rounded-2xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // --- Sin empresa ----------------------------------
  if (!empresa) {
    return (
      <div className="bg-[#0d1b33] border border-[#2a4070]/30 rounded-2xl p-6 text-center">
        <p className="text-gray-400 mb-4">No tienes una empresa registrada</p>
        <a href="/onboarding" className="text-blue-400 hover:underline text-sm">
          Crear empresa →
        </a>
      </div>
    );
  }

  // --- Datos calculados -----------------------------
  const usados = empresa.conductores_actuales;
  const maximo = empresa.max_conductores + empresa.conductores_extra;
  const porcentaje = maximo > 0 ? Math.round((usados / maximo) * 100) : 0;

  // --- Render ---------------------------------------
  return (
    <div className="space-y-4">
      {/* Mensajes */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="hover:text-red-300">X</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm">
          {successMsg}
        </div>
      )}

      {/* Tarjeta principal */}
      <div className="bg-[#0d1b33] border border-[#2a4070]/30 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{empresa.nombre_empresa}</h3>
            <p className="text-xs text-gray-500">
              {empresa.estado_suscripcion === 'activo' ? 'Activo' : 
               empresa.estado_suscripcion === 'pendiente' ? 'Pendiente' : 'Cancelado'}
              {' · '}
              Plan <span className="capitalize text-blue-400">{empresa.plan_actual}</span>
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
            empresa.estado_suscripcion === 'activo' 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {empresa.estado_suscripcion}
          </span>
        </div>

        {/* Barra de conductores */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Conductores</span>
            <span>{usados} / {maximo}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(porcentaje, 100)}%`,
                backgroundColor: porcentaje > 80 ? '#ef4444' : porcentaje > 50 ? '#f59e0b' : '#10b981',
              }}
            />
          </div>
        </div>

        {/* Periodo */}
        {empresa.periodo_fin && (
          <p className="text-xs text-gray-500 mb-4">
            Vigencia: {new Date(empresa.periodo_inicio).toLocaleDateString()} → {new Date(empresa.periodo_fin).toLocaleDateString()}
          </p>
        )}

        {/* Botones de accion */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowCambiarPlan(true)}
            className="px-4 py-2 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-lg text-sm hover:bg-blue-600/20 transition-colors"
          >
            Cambiar plan
          </button>
          <button
            onClick={handleAbrirModalConductores}
            className="px-4 py-2 bg-purple-600/10 border border-purple-500/30 text-purple-400 rounded-lg text-sm hover:bg-purple-600/20 transition-colors"
          >
            + Conductores
          </button>
          {empresa.estado_suscripcion === 'activo' && (
            <button
              onClick={() => setShowCancelar(true)}
              className="px-4 py-2 bg-red-600/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-600/20 transition-colors"
            >
              Cancelar plan
            </button>
          )}
        </div>
      </div>

      {/* --- Modal: Cambiar Plan --- */}
{showCambiarPlan && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCambiarPlan(false)}>
    <div className="bg-[#0d1b33] border border-[#2a4070] rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
      <h3 className="text-lg font-bold text-white mb-2">Cambiar Plan</h3>
      
      {/* Advertencia si hace downgrade con mas conductores */}
      {planNuevo === 'basico' && empresa.plan_actual === 'profesional' && empresa.conductores_actuales > 15 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
          <p className="text-yellow-400 text-sm font-medium mb-2">Atencion: Downgrade con conductores extra</p>
          <p className="text-gray-300 text-xs">
            Tienes <strong className="text-white">{empresa.conductores_actuales}</strong> conductores. 
            El plan Basico solo incluye 15. Los{' '}
            <strong className="text-white">{empresa.conductores_actuales - 15}</strong> conductores 
            sobrantes se convertiran en <strong className="text-yellow-400">conductores extra</strong>.
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Cargo adicional: <strong className="text-yellow-400">${((empresa.conductores_actuales - 15) * 199).toLocaleString()} MXN/ano</strong>
          </p>
        </div>
      )}

      {/* Info si hace upgrade */}
      {planNuevo === 'profesional' && empresa.plan_actual === 'basico' && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
          <p className="text-green-400 text-sm font-medium mb-2">Upgrade a Profesional</p>
          <p className="text-gray-300 text-xs">
            Obtendras 30 conductores incluidos, predicciones IA, alertas personalizadas y mas.
          </p>
          {empresa.conductores_extra > 0 && (
            <p className="text-green-300 text-xs mt-2">
              Tus {empresa.conductores_extra} conductores extra actuales se incluiran en el nuevo plan sin cargo adicional.
            </p>
          )}
        </div>
      )}

      <p className="text-gray-400 text-sm mb-4">
        Plan actual: <span className="capitalize text-blue-400">{empresa.plan_actual}</span> · 
        {empresa.conductores_actuales} conductores
      </p>

      <div className="space-y-2 mb-6">
        <button
          onClick={() => setPlanNuevo('basico')}
          disabled={empresa.plan_actual === 'basico'}
          className={`w-full text-left p-3 rounded-xl border transition-all ${
            planNuevo === 'basico' 
              ? 'border-blue-400 bg-blue-500/10' 
              : empresa.plan_actual === 'basico'
                ? 'border-gray-600 bg-gray-700/20 opacity-50 cursor-not-allowed'
                : 'border-[#2a4070] hover:border-gray-500'
          }`}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-white font-medium text-sm">Basico</p>
              <p className="text-gray-400 text-xs">15 conductores · $2,999 MXN/ano</p>
            </div>
            {empresa.plan_actual === 'basico' && (
              <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">Actual</span>
            )}
          </div>
        </button>

        <button
          onClick={() => setPlanNuevo('profesional')}
          disabled={empresa.plan_actual === 'profesional'}
          className={`w-full text-left p-3 rounded-xl border transition-all ${
            planNuevo === 'profesional' 
              ? 'border-purple-400 bg-purple-500/10' 
              : empresa.plan_actual === 'profesional'
                ? 'border-gray-600 bg-gray-700/20 opacity-50 cursor-not-allowed'
                : 'border-[#2a4070] hover:border-gray-500'
          }`}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-white font-medium text-sm">Profesional</p>
              <p className="text-gray-400 text-xs">30 conductores · $5,999 MXN/ano</p>
            </div>
            {empresa.plan_actual === 'profesional' && (
              <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">Actual</span>
            )}
          </div>
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setShowCambiarPlan(false)} className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">
          Cancelar
        </button>
        <button 
          onClick={handleCambiarPlan} 
          disabled={submitting || planNuevo === empresa.plan_actual} 
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
        >
          {submitting ? 'Cambiando...' : 'Confirmar cambio'}
        </button>
      </div>
    </div>
  </div>
)}

      {/* --- Modal: Agregar Conductores --- */}
      {showAgregarConductores && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAgregarConductores(false)}>
          <div className="bg-[#0d1b33] border border-[#2a4070] rounded-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Agregar Conductores Extra</h3>
            <p className="text-gray-400 text-sm mb-4">
              Actual: {usados} / {maximo} · +$199 MXN/ano por conductor
            </p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <button onClick={() => setCantidadExtra(Math.max(1, cantidadExtra - 1))} className="w-10 h-10 rounded-lg bg-gray-700 text-white text-xl">-</button>
              <span className="text-3xl font-bold text-white">{cantidadExtra}</span>
              <button onClick={() => setCantidadExtra(Math.min(20, cantidadExtra + 1))} className="w-10 h-10 rounded-lg bg-gray-700 text-white text-xl">+</button>
            </div>
            <p className="text-center text-gray-400 text-sm mb-4">
              Total extra: <span className="text-yellow-400">${(cantidadExtra * 199).toLocaleString()} MXN/ano</span>
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowAgregarConductores(false)} className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleConfirmarAgregarConductores} disabled={submitting} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50">
                {submitting ? 'Agregando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Modal: Cancelar Plan --- */}
      {showCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCancelar(false)}>
          <div className="bg-[#0d1b33] border border-[#2a4070] rounded-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-400 mb-4">Cancelar Suscripcion</h3>
            <ul className="text-gray-400 text-xs space-y-1 mb-4">
              <li>• Tus conductores dejaran de ser monitoreados</li>
              <li>• No podras registrar nuevos conductores</li>
              <li>• El acceso al dashboard se restringira</li>
              <li>• No se haran mas cobros</li>
            </ul>
            <div className="flex gap-2">
              <button onClick={() => setShowCancelar(false)} className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Volver</button>
              <button onClick={handleCancelar} disabled={submitting} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50">
                {submitting ? 'Cancelando...' : 'Si, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}