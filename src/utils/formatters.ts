export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
  });
}

export function timeAgo(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;
  return formatDateShort(isoString);
}

export function getTipoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    inundacion: 'Inundacion',
    accidente: 'Accidente',
    bache: 'Bache',
    derrumbe: 'Derrumbe',
    sin_luz: 'Sin luz',
    niebla: 'Niebla',
    bloqueo: 'Bloqueo',
    otro: 'Otro',
  };
  return labels[tipo] || tipo;
}

export function getTipoBadgeClass(tipo: string): string {
  return `badge-${tipo}`;
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function truncate(text: string, maxLen = 80): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '...';
}