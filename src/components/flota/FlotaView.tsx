import { useState, useEffect, FormEvent } from 'react';
import { api, motores } from '../../api/client';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import LoadingSpinner from '../ui/LoadingSpinner';

// ─── Tipos ───────────────────────────────────

interface ConductorEmpresa {
  id: string;
  email: string;
  nombre: string;
  tipo: string;
  telefono: string;
  created_at: string;
}

interface PerfilConductor {
  conductor_id: string;
  nombre: string;
  nivel_riesgo: string;
  probabilidad_incidente: number;
  factores_riesgo: string[];
  fortalezas: string[];
  recomendaciones: string[];
  metricas_modelo: any;
  timestamp: string;
}

// ─── Componente ──────────────────────────────

export default function FlotaView() {
  const [conductores, setConductores] = useState<ConductorEmpresa[]>([]);
  const [perfiles, setPerfiles] = useState<Map<string, PerfilConductor>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [limite, setLimite] = useState(0);
  const [total, setTotal] = useState(0);

  // Modal de detalle
  const [conductorSeleccionado, setConductorSeleccionado] = useState<ConductorEmpresa | null>(null);
  const [perfilSeleccionado, setPerfilSeleccionado] = useState<PerfilConductor | null>(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);

  // Formulario
  const [showForm, setShowForm] = useState(false);
  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formResult, setFormResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    cargarConductores();
  }, []);

  // ─── Cargar conductores de la empresa ──────

  async function cargarConductores() {
    setIsLoading(true);
    setError('');

    try {
      const data = await api.get('/api/admin/conductores');
      const lista: ConductorEmpresa[] = data.conductores || [];
      setConductores(lista);
      setTotal(data.total || lista.length);
      setLimite(data.limite || 0);
      console.log(`✅ ${lista.length} conductores cargados`);
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar conductores');
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Cargar perfil de un conductor ─────────

  async function cargarPerfil(conductor: ConductorEmpresa) {
    setConductorSeleccionado(conductor);
    setCargandoPerfil(true);
    setPerfilSeleccionado(null);

    // Verificar si ya tenemos el perfil en caché
    const cached = perfiles.get(conductor.id);
    if (cached) {
      setPerfilSeleccionado(cached);
      setCargandoPerfil(false);
      return;
    }

    try {
      // Intentar desde el motor de predicciones
      const perfil = await motores.post('predicciones', '/predicciones/perfil', {
        conductor_id: conductor.id,
      });
      setPerfilSeleccionado(perfil);
      
      // Guardar en caché
      setPerfiles(prev => new Map(prev).set(conductor.id, perfil));
    } catch {
      // Si falla, intentar desde la API
      try {
        const perfil = await api.get(`/api/admin/conductores/${conductor.id}/perfil`);
        setPerfilSeleccionado(perfil);
        setPerfiles(prev => new Map(prev).set(conductor.id, perfil));
      } catch {
        // Perfil por defecto si no hay datos
        setPerfilSeleccionado({
          conductor_id: conductor.id,
          nombre: conductor.nombre,
          nivel_riesgo: 'sin_datos',
          probabilidad_incidente: 0,
          factores_riesgo: ['Sin datos suficientes'],
          fortalezas: [],
          recomendaciones: ['El conductor necesita más actividad para generar un perfil'],
          metricas_modelo: {},
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      setCargandoPerfil(false);
    }
  }

  // ─── Registrar conductor ───────────────────

  async function registrarConductor(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFormResult(null);

    try {
      await api.post('/api/admin/registrar-conductor', {
        email: formEmail.trim(),
        password: formPassword,
        nombre: formNombre.trim(),
        telefono: formTelefono.trim(),
      });

      setFormResult({ type: 'success', message: '✅ Conductor registrado correctamente' });

      // Limpiar formulario
      setFormNombre('');
      setFormEmail('');
      setFormPassword('');
      setFormTelefono('');

      // Recargar lista
      setTimeout(() => cargarConductores(), 500);
    } catch (err) {
      setFormResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al registrar',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Helpers ───────────────────────────────

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'critico': return '#ef4444';
      case 'alto': return '#f59e0b';
      case 'medio': return '#eab308';
      case 'bajo': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getNivelLabel = (nivel: string) => {
    switch (nivel) {
      case 'critico': return 'Crítico';
      case 'alto': return 'Alto';
      case 'medio': return 'Medio';
      case 'bajo': return 'Bajo';
      default: return 'Sin datos';
    }
  };

  const getIniciales = (nombre: string) => {
    return nombre
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // ─── Render ────────────────────────────────

  return (
    <div className="p-4 lg:p-6 space-y-6 h-full overflow-y-auto">
      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#0d1b33] border border-[#2a4070] rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{total}</p>
          <p className="text-xs text-gray-400">Conductores</p>
        </div>
        <div className="bg-[#0d1b33] border border-[#2a4070] rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{limite}</p>
          <p className="text-xs text-gray-400">Límite del plan</p>
        </div>
        <div className="bg-[#0d1b33] border border-[#2a4070] rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{limite - total}</p>
          <p className="text-xs text-gray-400">Disponibles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Lista de Conductores ── */}
        <Card
          title="Conductores de la Flota"
          headerRight={
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={cargarConductores} loading={isLoading}>
                🔄 Actualizar
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
          ) : conductores.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-3">🚛</p>
              <p className="text-sm">No hay conductores registrados</p>
              <p className="text-xs mt-1">Registra tu primer conductor para empezar</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {conductores.map(conductor => {
                const perfil = perfiles.get(conductor.id);
                const nivel = perfil?.nivel_riesgo || 'sin_datos';
                const nivelColor = getNivelColor(nivel);
                const iniciales = getIniciales(conductor.nombre);

                return (
                  <button
                    key={conductor.id}
                    onClick={() => cargarPerfil(conductor)}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-lg transition-all ${
                      conductorSeleccionado?.id === conductor.id
                        ? 'bg-blue-500/10 border border-blue-400/30'
                        : 'bg-[#0f1f3a] border border-[#2a4070]/30 hover:border-blue-400/30'
                    }`}
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
                      <p className="text-sm font-medium text-white truncate">
                        {conductor.nombre}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {conductor.email}
                      </p>
                    </div>

                    {/* Badge de nivel */}
                    <div className="flex-shrink-0 text-right">
                      {perfil ? (
                        <>
                          <p className="text-xs font-bold" style={{ color: nivelColor }}>
                            {getNivelLabel(nivel)}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {(perfil.probabilidad_incidente * 100).toFixed(0)}%
                          </p>
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-500">Click para ver</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Detalle del Conductor ── */}
        <Card title={conductorSeleccionado ? `Perfil: ${conductorSeleccionado.nombre}` : 'Selecciona un conductor'}>
          {cargandoPerfil ? (
            <LoadingSpinner message="Cargando perfil..." />
          ) : perfilSeleccionado ? (
            <div className="space-y-4">
              {/* Cabecera */}
              <div className="flex items-center gap-4 p-4 rounded-xl" 
                style={{ backgroundColor: `${getNivelColor(perfilSeleccionado.nivel_riesgo)}15` }}>
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white"
                  style={{ backgroundColor: getNivelColor(perfilSeleccionado.nivel_riesgo) }}
                >
                  {getIniciales(perfilSeleccionado.nombre)}
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{perfilSeleccionado.nombre}</p>
                  <p className="text-sm text-gray-400">{conductorSeleccionado?.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    📞 {conductorSeleccionado?.telefono || 'Sin teléfono'} · 
                    📅 Desde {conductorSeleccionado?.created_at ? new Date(conductorSeleccionado.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Nivel de riesgo */}
              <div className="bg-[#0f1f3a] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Nivel de riesgo</span>
                  <span className="text-sm font-bold" style={{ color: getNivelColor(perfilSeleccionado.nivel_riesgo) }}>
                    {getNivelLabel(perfilSeleccionado.nivel_riesgo)}
                  </span>
                </div>
                {/* Barra de progreso */}
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(perfilSeleccionado.probabilidad_incidente * 100, 100)}%`,
                      backgroundColor: getNivelColor(perfilSeleccionado.nivel_riesgo),
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Probabilidad de incidente: {(perfilSeleccionado.probabilidad_incidente * 100).toFixed(1)}%
                </p>
              </div>

              {/* Factores de riesgo */}
              {perfilSeleccionado.factores_riesgo.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-400 mb-2">⚠️ Factores de riesgo</p>
                  <ul className="space-y-1">
                    {perfilSeleccionado.factores_riesgo.map((factor, i) => (
                      <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">•</span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Fortalezas */}
              {perfilSeleccionado.fortalezas.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-400 mb-2">✅ Fortalezas</p>
                  <ul className="space-y-1">
                    {perfilSeleccionado.fortalezas.map((fortaleza, i) => (
                      <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">•</span>
                        {fortaleza}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recomendaciones */}
              {perfilSeleccionado.recomendaciones.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-blue-400 mb-2">💡 Recomendaciones</p>
                  <ul className="space-y-1">
                    {perfilSeleccionado.recomendaciones.map((rec, i) => (
                      <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Métricas del modelo */}
              {perfilSeleccionado.metricas_modelo && Object.keys(perfilSeleccionado.metricas_modelo).length > 0 && (
                <div className="text-[10px] text-gray-600 text-right">
                  Modelo: {perfilSeleccionado.metricas_modelo.tipo || 'ML'} · 
                  Actualizado: {new Date(perfilSeleccionado.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-3">👆</p>
              <p className="text-sm">Selecciona un conductor para ver su perfil de riesgo</p>
            </div>
          )}
        </Card>
      </div>

      {/* ── Formulario de Registro ── */}
      {showForm && (
        <Card title="Registrar Nuevo Conductor">
          <form onSubmit={registrarConductor} className="space-y-4 max-w-md">
            <Input
              label="Nombre completo"
              value={formNombre}
              onChange={e => setFormNombre(e.target.value)}
              placeholder="Juan Pérez"
              required
            />
            <Input
              label="Email"
              type="email"
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
            />
            <Input
              label="Contraseña"
              type="password"
              value={formPassword}
              onChange={e => setFormPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
            <Input
              label="Teléfono (opcional)"
              type="tel"
              value={formTelefono}
              onChange={e => setFormTelefono(e.target.value)}
              placeholder="9611234567"
            />

            {formResult && (
              <div className={`px-4 py-3 rounded-lg text-sm ${
                formResult.type === 'success'
                  ? 'bg-green-900/30 border border-green-500/50 text-green-300'
                  : 'bg-red-900/30 border border-red-500/50 text-red-300'
              }`}>
                {formResult.message}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" loading={isSubmitting}>
                {isSubmitting ? 'Registrando...' : 'Registrar Conductor'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}