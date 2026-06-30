import { createContext, useContext, useState, ReactNode } from 'react';

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

  // Wrapper que acepta función o array
  const setPuntos = (puntos: PuntoMapa[] | ((prev: PuntoMapa[]) => PuntoMapa[])) => {
    setPuntosState(prev => {
      const result = typeof puntos === 'function' ? puntos(prev) : puntos;
      return result;
    });
  };

  const agregarPuntos = (nuevosPuntos: PuntoMapa[]) => {
    setPuntosState(prev => [...prev, ...nuevosPuntos]);
  };

  const limpiarPuntos = () => {
    setPuntosState([]);
  };

  const limpiarPuntosPorTipo = (tipo: 'reporte' | 'prediccion' | 'conductor') => {
    setPuntosState(prev => {
      const nuevos = prev.filter(p => p.tipo !== tipo);
      if (nuevos.length !== prev.length) return nuevos;
      return prev;
    });
  };

  return (
    <MapContext.Provider value={{ 
      puntos, setPuntos, agregarPuntos, limpiarPuntos,
      limpiarPuntosPorTipo, centroMapa, setCentroMapa, zoomMapa, setZoomMapa
    }}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const context = useContext(MapContext);
  if (!context) throw new Error('useMapContext debe usarse dentro de MapProvider');
  return context;
}