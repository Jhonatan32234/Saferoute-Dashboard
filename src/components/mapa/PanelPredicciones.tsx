import { useState } from 'react';
import Button from '../ui/Button';

interface PanelPrediccionesProps {
  onPredecir: (vehiculo: string, horario: string) => void;
  onLimpiar: () => void;
  onCerrar: () => void;
  isLoading: boolean;
  hasPredicciones: boolean;
}

export default function PanelPredicciones({ onPredecir, onLimpiar, onCerrar, isLoading, hasPredicciones }: PanelPrediccionesProps) {
  const [vehiculo, setVehiculo] = useState('carga');
  const [horario, setHorario] = useState('diurno');

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#e8eef5]">Prediccion de Zonas</h3>
        <button onClick={onCerrar} className="text-[#627d98] hover:text-[#e8eef5]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-[#94a3b8] mb-1.5">Tipo de Vehiculo</label>
          <select
            value={vehiculo}
            onChange={(e) => setVehiculo(e.target.value)}
            className="w-full bg-[#0a1628] border border-[#2a4070] rounded-lg px-3 py-2 text-sm text-[#e8eef5] outline-none focus:border-[#0ea5e9]"
          >
            <option value="carga">Carga</option>
            <option value="publico">Transporte publico</option>
            <option value="particular">Particular</option>
            <option value="emergencia">Emergencia</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-[#94a3b8] mb-1.5">Horario</label>
          <select
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            className="w-full bg-[#0a1628] border border-[#2a4070] rounded-lg px-3 py-2 text-sm text-[#e8eef5] outline-none focus:border-[#0ea5e9]"
          >
            <option value="diurno">Diurno</option>
            <option value="nocturno">Nocturno</option>
            <option value="mixto">Mixto</option>
          </select>
        </div>

        <Button onClick={() => onPredecir(vehiculo, horario)} fullWidth loading={isLoading} size="sm">
          Generar Prediccion
        </Button>

        {hasPredicciones && (
          <Button onClick={onLimpiar} variant="outline" fullWidth size="sm">
            Limpiar Predicciones
          </Button>
        )}
      </div>
    </div>
  );
}