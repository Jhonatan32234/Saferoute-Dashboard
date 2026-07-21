import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';

export interface PuntoMapa {
  id: string;
  lat: number;
  lon: number;
  color: string;
  radius: number;
  tipo: 'reporte' | 'prediccion' | 'conductor';
  label: string;
  popupContent: string;
  timestamp?: string;
}

interface MapContextType {
  puntos: PuntoMapa[];
  setPuntos: (puntos: PuntoMapa[] | ((prev: PuntoMapa[]) => PuntoMapa[])) => void;
  agregarPuntos: (puntos: PuntoMapa[]) => void;
  limpiarPuntos: () => void;
  limpiarPuntosPorTipo: (tipo: 'reporte' | 'prediccion' | 'conductor') => void;
  centroMapa: [number, number];
  setCentroMapa: (centro: [number, number]) => void;
  zoomMapa: number;
  setZoomMapa: (zoom: number) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export function MapProvider({ children }: { children: ReactNode }) {
  const [puntos, setPuntosState] = useState<PuntoMapa[]>([]);
  const [centroMapa, setCentroMapa] = useState<[number, number]>([16.753, -93.115]);
  const [zoomMapa, setZoomMapa] = useState(8);

  // Estabilizar funciones con useCallback para evitar recreaciones innecesarias
  const setPuntos = useCallback((nuevosPuntos: PuntoMapa[] | ((prev: PuntoMapa[]) => PuntoMapa[])) => {
    setPuntosState(prev => {
      const result = typeof nuevosPuntos === 'function' ? nuevosPuntos(prev) : nuevosPuntos;
      // Solo actualizar si realmente hay cambios
      return JSON.stringify(result) !== JSON.stringify(prev) ? result : prev;
    });
  }, []);

  const agregarPuntos = useCallback((nuevosPuntos: PuntoMapa[]) => {
    setPuntosState(prev => {
      // Evitar duplicados por ID
      const existingIds = new Set(prev.map(p => p.id));
      const puntosUnicos = nuevosPuntos.filter(p => !existingIds.has(p.id));
      return puntosUnicos.length > 0 ? [...prev, ...puntosUnicos] : prev;
    });
  }, []);

  const limpiarPuntos = useCallback(() => {
    setPuntosState(prev => prev.length > 0 ? [] : prev);
  }, []);

  const limpiarPuntosPorTipo = useCallback((tipo: 'reporte' | 'prediccion' | 'conductor') => {
    setPuntosState(prev => {
      const nuevos = prev.filter(p => p.tipo !== tipo);
      return nuevos.length !== prev.length ? nuevos : prev;
    });
  }, []);

  // Memorizar el valor del contexto para evitar renders innecesarios
  const value = useMemo(
    () => ({
      puntos,
      setPuntos,
      agregarPuntos,
      limpiarPuntos,
      limpiarPuntosPorTipo,
      centroMapa,
      setCentroMapa,
      zoomMapa,
      setZoomMapa,
    }),
    [puntos, centroMapa, zoomMapa, setPuntos, agregarPuntos, limpiarPuntos, limpiarPuntosPorTipo, setCentroMapa, setZoomMapa],
  );

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const context = useContext(MapContext);
  if (!context) throw new Error('useMapContext debe usarse dentro de MapProvider');
  return context;
}