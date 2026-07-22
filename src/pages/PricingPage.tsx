// src/pages/PricingPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const planes = [
  {
    nombre: 'basico',
    titulo: 'Basico',
    precio: 2999,
    limite_conductores: 15,
    descripcion: 'Para flotas pequenas que inician',
    caracteristicas: [
      '15 conductores incluidos',
      'Monitoreo en tiempo real',
      'Reportes basicos de incidentes',
      'Soporte por email',
      '1 administrador',
      'Sin predicciones IA',
      'Sin alertas personalizadas',
    ],
  },
  {
    nombre: 'profesional',
    titulo: 'Profesional',
    precio: 5999,
    limite_conductores: 30,
    descripcion: 'Para empresas con flotas en crecimiento',
    destacado: true,
    caracteristicas: [
      '30 conductores incluidos',
      'Monitoreo en tiempo real',
      'Reportes avanzados con IA',
      'Predicciones de zonas de riesgo',
      'Alertas personalizables',
      'Hasta 3 administradores',
      'Acceso API',
      'Soporte prioritario',
    ],
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [planSeleccionado, setPlanSeleccionado] = useState<'basico' | 'profesional'>('profesional');

  const currentIndex = planes.findIndex(p => p.nombre === planSeleccionado);
  const currentPlan = planes[currentIndex];
  const isPro = currentPlan?.nombre === 'profesional';

  function prevPlan() {
    const idx = planes.findIndex(p => p.nombre === planSeleccionado);
    if (idx > 0) setPlanSeleccionado(planes[idx - 1].nombre as 'basico' | 'profesional');
  }

  function nextPlan() {
    const idx = planes.findIndex(p => p.nombre === planSeleccionado);
    if (idx < planes.length - 1) setPlanSeleccionado(planes[idx + 1].nombre as 'basico' | 'profesional');
  }

  return (
    <div className="min-h-screen p-4 py-8 flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 50%, #0d1b33 100%)' }}>
      
      <div className="max-w-lg mx-auto pt-8 pb-8">  {/* Envolver en contenedor */}

      <div className="w-full max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Planes y Precios</h1>
          <p className="text-gray-400">Elige el plan que mejor se adapte a tu flota</p>
        </div>

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
                  onClick={() => setPlanSeleccionado(p.nombre as 'basico' | 'profesional')}
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
                {currentPlan?.titulo}
              </h3>
              <p className="text-4xl font-bold text-white mb-1">
                ${currentPlan?.precio.toLocaleString()}
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
            onClick={() => navigate(`/onboarding?step=configuracion&plan=${planSeleccionado}`)}
            className="px-12 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl text-lg transition-all shadow-lg shadow-blue-600/20"
          >
            Elegir {planSeleccionado === 'profesional' ? 'Profesional' : 'Basico'}
          </button>
        </div>

        <p className="text-gray-500 text-xs text-center mt-4">+$199 MXN/ano por conductor extra en cualquier plan</p>
      </div>
    </div>
    </div>
  );
}