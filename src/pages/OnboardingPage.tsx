import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, getToken } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Plan, MetodoPago, PlanInfo, CalcularPrecioResponse, CheckoutResponse } from '../types/billing';

type Step = 'bienvenida' | 'planes' | 'configuracion' | 'exito';

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('bienvenida');
  const [loading, setLoading] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Datos empresa
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [rfc, setRfc] = useState('');
  const [emailFacturacion, setEmailFacturacion] = useState('');

  // Planes
  const [planes, setPlanes] = useState<PlanInfo[]>([]);
  const [planSeleccionado, setPlanSeleccionado] = useState<Plan>('profesional');
  const [conductoresExtra, setConductoresExtra] = useState(0);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('tarjeta');
  const [precios, setPrecios] = useState<CalcularPrecioResponse | null>(null);

   useEffect(() => {
    const token = localStorage.getItem('saferoute_token');
    if (token) {
      setToken(token);
    }
  }, []); 

  // Verificar si el usuario ya completo onboarding
  useEffect(() => {
    async function checkOnboarding() {

      try {
        await api.get('/api/billing/empresa');
        navigate('/dashboard/mapa', { replace: true });
      } catch {
        cargarPlanes();
      } finally {
        setCheckingOnboarding(false);
      }
    }
    checkOnboarding();
  }, [navigate]);

  useEffect(() => {
    if (planSeleccionado) {
      const token = localStorage.getItem('saferoute_token');
      if (token) setToken(token);
      
      calcularPrecios(planSeleccionado, conductoresExtra);
    }
  }, [planSeleccionado, conductoresExtra]);

  async function cargarPlanes() {
    try {
      const data = await api.get<PlanInfo[]>('/api/billing/plans');
      setPlanes(data);
    } catch {
      // Fallback si la API no responde
      setPlanes([
        {
          nombre: 'basico',
          descripcion: 'Para flotas pequenas que inician',
          precio_anual: 2999,
          limite_conductores: 15,
          precio_conductor_extra: 199,
          caracteristicas: [
            '15 conductores incluidos',
            'Monitoreo en tiempo real',
            'Reportes basicos',
            'Soporte por email',
            '1 administrador',
            'Sin predicciones IA',
            'Sin alertas personalizadas',
          ],
        },
        {
          nombre: 'profesional',
          descripcion: 'Para empresas con flotas en crecimiento',
          precio_anual: 5999,
          limite_conductores: 30,
          precio_conductor_extra: 199,
          caracteristicas: [
            '30 conductores incluidos',
            'Monitoreo en tiempo real',
            'Reportes avanzados',
            'Predicciones con IA',
            'Alertas personalizadas',
            '3 administradores',
            'API de acceso',
            'Soporte prioritario',
          ],
        },
      ]);
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

  async function handleContratar() {
    if (!nombreEmpresa.trim()) {
      setError('El nombre de la empresa es requerido');
      return;
    }

     const token = localStorage.getItem('saferoute_token');
    if (!token) {
      setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
      return;
    }
    setToken(token);  // ← Actualizar el token en el cliente api

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

      // Marcar en localStorage que ya completo onboarding
      localStorage.setItem('onboarding_completado', 'true');

      // Si hay URL de checkout, redirigir despues de 2 segundos
      if (response.checkout_url) {
        setTimeout(() => {
          window.location.href = response.checkout_url;
        }, 2000);
      } else {
        // Si no hay checkout (modo offline), ir al dashboard
        setTimeout(() => {
          navigate('/dashboard/mapa', { replace: true });
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear la suscripcion');
    } finally {
      setLoading(false);
    }
  }

  // ✅ AGREGAR ESTO justo después de los useEffect y antes de los if (step === ...)
if (checkingOnboarding) {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 50%, #0d1b33 100%)' }}>
      <div className="text-center">
        <svg className="animate-spin h-10 w-10 text-blue-400 mx-auto mb-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-gray-400 text-sm">Verificando suscripción...</p>
      </div>
    </div>
  );
}

  // --- Paso 0: Bienvenida -------------------------------------------------
  if (step === 'bienvenida') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 50%, #0d1b33 100%)' }}>
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#0ea5e9]/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#3b82f6]/5 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-lg relative z-10 text-center">
          <div className="bg-[#0d1b33] border border-[#2a4070]/50 rounded-2xl p-10 shadow-2xl shadow-black/40">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#0f1f3a] border border-[#2a4070]/50 mb-6 shadow-lg overflow-hidden">
              <img src="/saferoute_blue.png" alt="SafeRoute" className="w-12 h-12 object-contain" />
            </div>

            <h1 className="text-3xl font-bold text-white mb-2">
              Bienvenido, {user?.nombre || 'Administrador'}!
            </h1>
            <p className="text-gray-400 mb-2">
              Estas a un paso de proteger tu flota.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Antes de acceder al panel, necesitas elegir un plan empresarial.
            </p>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-8 text-left">
              <p className="text-blue-400 text-sm font-medium mb-2">Que necesitas para empezar?</p>
              <ul className="text-gray-400 text-xs space-y-1.5">
                <li>1. Elige el plan que mejor se adapte a tu flota</li>
                <li>2. Configura los conductores adicionales (si los necesitas)</li>
                <li>3. Selecciona tu metodo de pago</li>
                <li>4. Completa el pago y empieza a monitorear!</li>
              </ul>
            </div>

            <button
              onClick={() => setStep('planes')}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl text-lg transition-all shadow-lg shadow-blue-600/20"
            >
              Comenzar
            </button>

            <p className="text-gray-600 text-xs mt-4">
              Puedes cambiar de plan o cancelar en cualquier momento
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Paso 1: Planes (con slider/carousel) --------------------------------
  if (step === 'planes') {
    const currentIndex = planes.findIndex(p => p.nombre === planSeleccionado);
    const currentPlan = planes[currentIndex];
    const isPro = currentPlan?.nombre === 'profesional';

    function prevPlan() {
      const idx = planes.findIndex(p => p.nombre === planSeleccionado);
      if (idx > 0) setPlanSeleccionado(planes[idx - 1].nombre);
    }

    function nextPlan() {
      const idx = planes.findIndex(p => p.nombre === planSeleccionado);
      if (idx < planes.length - 1) setPlanSeleccionado(planes[idx + 1].nombre);
    }

    return (
      <div className="min-h-screen p-4 py-8 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 50%, #0d1b33 100%)' }}>
        
        <div className="w-full max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Elige tu Plan Empresarial</h2>
            <p className="text-gray-400">Desliza para comparar los planes</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Slider / Carousel */}
          <div className="relative">
            {/* Tarjeta del plan actual */}
            <div
              key={currentPlan?.nombre}
              className="relative p-6 rounded-2xl border-2 transition-all duration-500 animate-fade-in"
              style={{
                borderColor: isPro ? 'rgb(168, 85, 247)' : 'rgb(59, 130, 246)',
                background: isPro
                  ? 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(59,130,246,0.05))'
                  : 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(14,165,233,0.05))',
                boxShadow: isPro
                  ? '0 0 40px rgba(168,85,247,0.15)'
                  : '0 0 40px rgba(59,130,246,0.15)',
              }}
            >
              {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-xs font-bold text-white shadow-lg whitespace-nowrap">
                  RECOMENDADO
                </div>
              )}

              {/* Indicador de slide */}
              <div className="flex justify-center gap-2 mb-6">
                {planes.map((p, i) => (
                  <button
                    key={p.nombre}
                    onClick={() => setPlanSeleccionado(p.nombre)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      p.nombre === planSeleccionado
                        ? isPro ? 'w-8 bg-purple-500' : 'w-8 bg-blue-500'
                        : 'w-2 bg-gray-600 hover:bg-gray-500'
                    }`}
                  />
                ))}
              </div>

              {/* Nombre y precio */}
              <div className="text-center mb-6">
                <h3 className={`text-2xl font-bold mb-2 ${isPro ? 'text-purple-400' : 'text-blue-400'}`}>
                  {currentPlan?.nombre === 'basico' ? 'Basico' : 'Profesional'}
                </h3>
                <p className="text-4xl font-bold text-white mb-1">
                  ${currentPlan?.precio_anual.toLocaleString()}
                  <span className="text-base text-gray-400 font-normal"> MXN/ano</span>
                </p>
                <p className="text-gray-400 text-sm">{currentPlan?.descripcion}</p>
              </div>

              {/* Caracteristicas */}
              <div className="space-y-3 mb-8">
                {currentPlan?.caracteristicas.map((feat, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isPro ? 'bg-purple-500/20' : 'bg-blue-500/20'
                    }`}>
                      <svg className={`w-3 h-3 ${isPro ? 'text-purple-400' : 'text-blue-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-300">{feat}</span>
                  </div>
                ))}
              </div>

              {/* Limite de conductores destacado */}
              <div className={`rounded-xl p-4 mb-6 text-center ${
                isPro ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-blue-500/10 border border-blue-500/20'
              }`}>
                <p className={`text-3xl font-bold ${isPro ? 'text-purple-400' : 'text-blue-400'}`}>
                  {currentPlan?.limite_conductores}
                </p>
                <p className="text-gray-400 text-xs">conductores incluidos</p>
                <p className="text-gray-500 text-xs mt-1">
                  +$199 MXN/ano por conductor extra
                </p>
              </div>
            </div>

            {/* Flechas de navegacion */}
            <button
              onClick={prevPlan}
              disabled={currentIndex === 0}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextPlan}
              disabled={currentIndex === planes.length - 1}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Boton continuar */}
          <div className="text-center mt-8">
            <button
              onClick={() => setStep('configuracion')}
              className="px-12 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl text-lg transition-all shadow-lg shadow-blue-600/20"
            >
              Continuar con {planSeleccionado === 'profesional' ? 'Profesional' : 'Basico'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Paso 2: Configuracion -----------------------------------------------
  if (step === 'configuracion') {
    return (
      <div className="min-h-screen p-4 py-8"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 50%, #0d1b33 100%)' }}>
        
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Configura tu Suscripcion</h2>
            <p className="text-gray-400">Completa los datos para finalizar la contratacion</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
              <button onClick={() => setError(null)} className="float-right hover:text-red-300">X</button>
            </div>
          )}

          {/* Progreso */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">1</div>
            <div className="w-16 h-0.5 bg-blue-600"></div>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">2</div>
            <div className="w-16 h-0.5 bg-gray-700"></div>
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-xs font-bold">3</div>
          </div>

          {/* Datos empresa */}
          <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/50 mb-6">
            <h3 className="text-white font-bold mb-4">Datos de la Empresa</h3>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Nombre de la empresa *</label>
                <input
                  type="text"
                  value={nombreEmpresa}
                  onChange={e => setNombreEmpresa(e.target.value)}
                  placeholder="Ej: Transportes Seguros S.A. de C.V."
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">RFC (opcional)</label>
                  <input
                    type="text"
                    value={rfc}
                    onChange={e => setRfc(e.target.value.toUpperCase())}
                    placeholder="XXXX000000XXX"
                    maxLength={13}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors uppercase"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Email de facturacion</label>
                  <input
                    type="email"
                    value={emailFacturacion}
                    onChange={e => setEmailFacturacion(e.target.value)}
                    placeholder="facturacion@empresa.com"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Conductores extra */}
          <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/50 mb-6">
            <h3 className="text-white font-bold mb-4">Conductores Adicionales</h3>
            <p className="text-gray-400 text-sm mb-4">
              Tu plan incluye <strong className="text-white">{planSeleccionado === 'profesional' ? '30' : '15'} conductores</strong>.
              Si necesitas mas, agregalos aqui.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setConductoresExtra(Math.max(0, conductoresExtra - 1))}
                className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{conductoresExtra}</p>
                <p className="text-gray-400 text-xs">conductores extra</p>
              </div>
              <button
                onClick={() => setConductoresExtra(Math.min(100, conductoresExtra + 1))}
                className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <span className="text-gray-400 text-sm">+$199 MXN/ano c/u</span>
            </div>
          </div>

          {/* Metodo de pago */}
          <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/50 mb-6">
            <h3 className="text-white font-bold mb-4">Metodo de Pago</h3>
            <div className="grid grid-cols-3 gap-3">
              {([
                { id: 'tarjeta' as MetodoPago, label: 'Tarjeta', desc: 'Credito o debito' },
                { id: 'oxxo' as MetodoPago, label: 'OXXO', desc: 'Pago en efectivo' },
                { id: 'spei' as MetodoPago, label: 'SPEI', desc: 'Transferencia' },
              ]).map(m => (
                <button
                  key={m.id}
                  onClick={() => setMetodoPago(m.id)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    metodoPago === m.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-700/30 hover:border-gray-600'
                  }`}
                >
                  <p className="text-white font-medium text-sm">{m.label}</p>
                  <p className="text-gray-400 text-xs">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/50 mb-6">
            <h3 className="text-white font-bold mb-4">Resumen de Pago</h3>
            {precios && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Plan {planSeleccionado === 'profesional' ? 'Profesional' : 'Basico'}</span>
                  <span className="text-white">${precios.subtotal.toLocaleString()} MXN</span>
                </div>
                {conductoresExtra > 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>{conductoresExtra} conductor(es) extra</span>
                    <span className="text-yellow-400">+${precios.cargo_extra.toLocaleString()} MXN</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400">
                  <span>IVA (16%)</span>
                  <span className="text-white">${precios.iva.toLocaleString()} MXN</span>
                </div>
                <hr className="border-gray-700 my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-white">Total anual</span>
                  <span className="text-green-400">${precios.total.toLocaleString()} MXN</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleContratar}
            disabled={loading || !nombreEmpresa.trim()}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-600/20"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Procesando...
              </span>
            ) : (
              `Pagar $${precios?.total.toLocaleString() || '0'} MXN`
            )}
          </button>
        </div>
      </div>
    );
  }

  // --- Paso 3: Exito -------------------------------------------------------
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 50%, #0d1b33 100%)' }}>
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#0ea5e9]/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#3b82f6]/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-gray-800/60 rounded-xl p-8 border border-gray-700/50 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Suscripcion Creada!</h2>
          <p className="text-gray-400 mb-4">
            Tu empresa <strong className="text-white">{nombreEmpresa}</strong> ha sido registrada con el plan{' '}
            <strong className="text-blue-400 capitalize">{planSeleccionado}</strong>.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            {metodoPago === 'tarjeta' && 'Seras redirigido a Stripe para completar el pago con tarjeta...'}
            {metodoPago === 'oxxo' && 'Seras redirigido a Stripe para generar tu codigo de pago OXXO...'}
            {metodoPago === 'spei' && 'Seras redirigido a Stripe para realizar la transferencia SPEI...'}
          </p>
          <div className="animate-pulse flex justify-center">
            <svg className="w-8 h-8 text-blue-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}