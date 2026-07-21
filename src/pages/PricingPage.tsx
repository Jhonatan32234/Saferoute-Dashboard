// src/pages/PricingPage.tsx
import { useNavigate } from 'react-router-dom';

const planes = [
  {
    nombre: 'basico',
    titulo: 'Basico',
    precio: 2999,
    conductores: 15,
    color: 'blue',
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
    conductores: 30,
    color: 'purple',
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

  return (
    <div className="min-h-screen p-4 py-8"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 50%, #0d1b33 100%)' }}>
      
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Planes y Precios</h1>
        <p className="text-gray-400 mb-8">Elige el plan que mejor se adapte a tu flota</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {planes.map(plan => (
            <div
              key={plan.nombre}
              className={`relative bg-[#0d1b33] border-2 rounded-2xl p-8 text-left ${
                plan.destacado
                  ? 'border-purple-500 shadow-lg shadow-purple-500/10'
                  : 'border-[#2a4070]'
              }`}
            >
              {plan.destacado && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-xs font-bold text-white">
                  RECOMENDADO
                </div>
              )}

              <h2 className={`text-xl font-bold mb-2 ${plan.destacado ? 'text-purple-400' : 'text-blue-400'}`}>
                {plan.titulo}
              </h2>
              <p className="text-4xl font-bold text-white mb-1">
                ${plan.precio.toLocaleString()}
                <span className="text-sm text-gray-400 font-normal"> MXN/ano</span>
              </p>
              <p className="text-gray-400 text-sm mb-4">{plan.conductores} conductores incluidos</p>

              <ul className="text-sm text-gray-300 space-y-2 mb-8">
                {plan.caracteristicas.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* ✅ Cambiado: Va directo a configuración con el plan seleccionado */}
              <button
                onClick={() => navigate(`/onboarding?step=configuracion&plan=${plan.nombre}`)}
                className={`w-full py-3 font-bold rounded-xl transition-colors ${
                  plan.destacado
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Elegir {plan.titulo}
              </button>
            </div>
          ))}
        </div>

        <p className="text-gray-500 text-xs">+$199 MXN/ano por conductor extra en cualquier plan</p>
      </div>
    </div>
  );
}