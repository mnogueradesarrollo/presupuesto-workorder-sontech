/**
 * Utilidades generales para Firestore y manipulación de datos en Sontech Gestor
 */

/** Quita recursivamente todas las propiedades con valor undefined (objetos y arrays) */
export function pruneDeep<T>(val: T): T {
  if (Array.isArray(val)) {
    return val.map((v) => pruneDeep(v)).filter((v) => v !== undefined) as any;
  }
  if (val !== null && typeof val === "object") {
    const out: any = {};
    Object.entries(val as any).forEach(([k, v]) => {
      if (v === undefined) return;
      const pv = pruneDeep(v as any);
      if (pv !== undefined) out[k] = pv;
    });
    return out;
  }
  return val;
}

/** Formatea montos en moneda local */
export function formatCurrency(amount: number | undefined | null, currency: 'ARS' | 'USD' = 'ARS'): string {
  const val = Number(amount || 0);
  return `${currency === 'ARS' ? '$' : 'US$'}${val.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Formatea timestamps o fechas ISO */
export function formatDate(timestampOrDate: number | string | undefined | null): string {
  if (!timestampOrDate) return '-';
  const d = new Date(timestampOrDate);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Formatea fecha y hora */
export function formatDateTime(timestampOrDate: number | string | undefined | null): string {
  if (!timestampOrDate) return '-';
  const d = new Date(timestampOrDate);
  if (isNaN(d.getTime())) return '-';
  return `${d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })} ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Genera un token aleatorio seguro para tracking público */
export function generateToken(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
