import { useState, useEffect, FormEvent } from 'react';
import { api, motores } from '../../api/client';
import type { Conductor } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function FlotaView() {
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Formulario
  const [showForm, setShowForm] = useState(false);
  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formResult, setFormResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    cargarDatosFlota();
  }, []);

  async function cargarDatosFlota() {
  setIsLoading(true);
  setError('');
  
  try {
    console.log('📡 Cargando conductores...');
    
    // Intentar con API primero
    let conductoresList: Conductor[] = [];
    
    try {
      const data = await api.get('/api/predicciones/conductores');
      conductoresList = data.conductores || [];
      console.log(`✅ API: ${conductoresList.length} conductores`);
    } catch {
      console.warn('⚠️ API no disponible, intentando motor local...');
      const data = await motores.get('predicciones', '/predicciones/conductores');
      conductoresList = data.conductores || [];
      console.log(`✅ Motor local: ${conductoresList.length} conductores`);
    }
    
    setConductores(conductoresList);
    
    if (conductoresList.length > 0) {
      // Cargar perfiles uno por uno
      const perfilesData: any[] = [];
      
      for (const c of conductoresList) {
        try {
          const perfil = await motores.post('predicciones', '/predicciones/perfil', { 
            conductor_id: c.id 
          });
          perfilesData.push(perfil);
        } catch {
          // Si no hay perfil, crear uno básico
          perfilesData.push({
            nombre: c.nombre || c.email,
            nivel_riesgo: 'bajo',
            probabilidad_incidente: 0.1,
            factores_riesgo: [],
            fortalezas: [],
            recomendaciones: []
          });
        }
      }
      
      setPerfiles(perfilesData);
      console.log(`✅ ${perfilesData.length} perfiles cargados`);
    }
  } catch (err) {
    console.error('❌ Error:', err);
    setError(err instanceof Error ? err.message : 'Error al cargar datos');
  } finally {
    setIsLoading(false);
  }
}

  async function registrarConductor(e: FormEvent) {
  e.preventDefault();
  setIsSubmitting(true);
  setFormResult(null);
  
  try {
    const data = {
      nombre: formNombre.trim(),
      email: formEmail.trim(),
      password: formPassword,
      telefono: formTelefono.trim(),
    };
    
    // 1. Registrar en la API
    const result = await api.post('/api/admin/registrar-conductor', data);
    console.log('✅ Conductor registrado:', result);
    
    // 2. Intentar recargar conductores en el motor de predicciones
    try {
      await motores.post('predicciones', '/predicciones/recargar-conductores', {});
      console.log('✅ Motor de predicciones recargado');
    } catch (e) {
      console.warn('⚠️ No se pudo recargar el motor de predicciones');
    }
    
    // 3. También intentar recargar en el motor NLP
    try {
      await motores.post('nlp', '/nlp/recargar', [{
        id: result.id || result.user_id,
        texto: `Conductor ${formNombre.trim()} registrado`,
        tipo: 'otro',
        ruta_id: 'sin-ruta',
        timestamp: new Date().toISOString()
      }]);
    } catch (e) {
      // No es crítico si falla
    }
    
    setFormResult({
      type: 'success',
      message: 'Conductor registrado correctamente',
    });
    
    // Limpiar formulario
    setFormNombre('');
    setFormEmail('');
    setFormPassword('');
    setFormTelefono('');
    
    // 4. Esperar un momento y recargar la lista
    setTimeout(async () => {
      await cargarDatosFlota();
    }, 1000);
    
  } catch (err) {
    setFormResult({
      type: 'error',
      message: `${err instanceof Error ? err.message : 'Error al registrar'}`,
    });
  } finally {
    setIsSubmitting(false);
  }
}


  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'critico': return '#e94560';
      case 'alto': return '#f0a500';
      default: return '#4caf50';
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Conductores */}
        
        <Card
          title="Conductores de la Flota"
          headerRight={
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={cargarDatosFlota} loading={isLoading}>
                Actualizar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
                + Agregar
              </Button>
            </div>
          }
        >
          {isLoading ? (
            <LoadingSpinner message="Cargando conductores..." />
          ) : error ? (
            <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          ) : perfiles.length > 0 ? (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {perfiles.map((perfil, index) => {
                if (!perfil) return null;
                
                const nivelColor = getNivelColor(perfil.nivel_riesgo);
                const iniciales = (perfil.nombre || 'C')
                  .substring(0, 2)
                  .toUpperCase();
                
                return (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                  >
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: nivelColor }}
                    >
                      {iniciales}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {perfil.nombre || 'Conductor'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Riesgo: {(perfil.probabilidad_incidente * 100).toFixed(0)}% ·{' '}
                        {perfil.nivel_riesgo || 'N/A'}
                      </p>
                    </div>
                    
                    {/* Nivel de riesgo */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold" style={{ color: nivelColor }}>
                        {(perfil.probabilidad_incidente * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-500">
                        {(perfil.nivel_riesgo || 'N/A').toUpperCase()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">
              Sin conductores registrados
            </p>
          )}
        </Card>

        {/* Formulario de Registro */}
        {showForm && (
          <Card title="Registrar Nuevo Conductor">
            <form onSubmit={registrarConductor} className="space-y-4">
              <Input
                label="Nombre"
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                placeholder="Nombre completo"
                required
              />
              
              <Input
                label="Email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
              />
              
              <Input
                label="Contraseña"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              {/* Agregar campo de teléfono */}
              <Input
                label="Teléfono (opcional)"
                type="tel"
                value={formTelefono}
                onChange={(e) => setFormTelefono(e.target.value)}
                placeholder="+52 961 123 4567"
              />
              
              {formResult && (
                <div
                  className={`px-4 py-3 rounded-lg text-sm ${
                    formResult.type === 'success'
                      ? 'bg-green-900/30 border border-green-500/50 text-green-300'
                      : 'bg-red-900/30 border border-red-500/50 text-red-300'
                  }`}
                >
                  {formResult.message}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button type="submit" fullWidth loading={isSubmitting}>
                  Registrar Conductor
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}