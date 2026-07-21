// src/pages/CancelPage.tsx
import { useNavigate } from 'react-router-dom';

export default function CancelPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 50%, #0d1b33 100%)' }}>
      
      <div className="w-full max-w-md text-center">
        <div className="bg-[#0d1b33] border border-[#2a4070]/50 rounded-2xl p-10 shadow-2xl">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/20 mb-6">
            <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Pago Cancelado</h1>
          <p className="text-gray-400 mb-6">No se realizó ningún cargo. Puedes intentarlo de nuevo cuando quieras.</p>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/precios')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
            >
              Intentar de nuevo
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold rounded-xl transition-colors"
            >
              Ir al dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}