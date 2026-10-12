/**
 * Generador de notificaciones y enlaces directos para WhatsApp (wa.me)
 */

function limpiarTelefono(tel: string): string {
  // Remueve caracteres no numéricos
  let clean = tel.replace(/\D/g, '');
  // Si empieza con 15 o similar en Argentina sin código de país, normalizar a formato internacional si es posible
  if (clean.length === 10 && !clean.startsWith('54')) {
    clean = `549${clean}`;
  } else if (clean.length === 11 && clean.startsWith('0')) {
    clean = `549${clean.slice(1)}`;
  }
  return clean;
}

export function buildWhatsAppLink(telefono: string, mensaje: string): string {
  const telLimpio = limpiarTelefono(telefono);
  return `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensaje)}`;
}

export function getTrackingUrl(codigoOToken: string): string {
  // URL absoluta usando window.location.origin
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://sontech.com.ar';
  return `${base}/seguimiento/${codigoOToken}`;
}

export const WhatsAppTemplates = {
  recepcion(cliente: string, codigoOT: string, equipoStr: string, trackingToken: string): string {
    const url = getTrackingUrl(trackingToken || codigoOT);
    return `¡Hola ${cliente}! 👋 Te confirmamos que tu equipo *${equipoStr || 'dispositivo'}* ha ingresado a nuestro laboratorio técnico en *Sontech*.

📌 *Orden de Trabajo:* ${codigoOT}
🔍 Podés consultar el estado y diagnóstico en tiempo real aquí:
👉 ${url}

Cualquier consulta quedamos a tu disposición. ¡Muchas gracias!`;
  },

  presupuestoListo(cliente: string, codigoPres: string, monto: number, trackingToken: string): string {
    const url = getTrackingUrl(trackingToken || codigoPres);
    return `¡Hola ${cliente}! 👋 Ya emitimos el presupuesto para tu equipo en *Sontech*.

📄 *Presupuesto:* ${codigoPres}
💵 *Monto Total:* $${monto.toLocaleString('es-AR')}
🔍 Podés revisar el detalle completo y aprobarlo directamente con un clic aquí:
👉 ${url}

Esperamos tu confirmación para proceder con el trabajo. ¡Saludos!`;
  },

  equipoListo(cliente: string, codigoOT: string, equipoStr: string, saldo: number): string {
    return `¡Hola ${cliente}! 🎉 Te informamos que tu equipo *${equipoStr || 'dispositivo'}* (Orden *${codigoOT}*) ya está *LISTO PARA RETIRAR* en el local de *Sontech*.

${saldo > 0 ? `💰 *Saldo pendiente a abonar:* $${saldo.toLocaleString('es-AR')}\n` : '✅ *El trabajo ya se encuentra abonado en su totalidad.*\n'}
📍 Podés pasar a retirarlo en nuestro horario de atención habitual. ¡Muchas gracias por confiar en nosotros!`;
  },

  cambioEstado(cliente: string, codigoOT: string, nuevoEstado: string, trackingToken: string): string {
    const url = getTrackingUrl(trackingToken || codigoOT);
    return `Hola ${cliente}, te informamos una actualización en tu orden *${codigoOT}* en *Sontech*:
Estado actual: *${nuevoEstado.toUpperCase()}*

🔍 Seguimiento en vivo:
👉 ${url}`;
  },
};
