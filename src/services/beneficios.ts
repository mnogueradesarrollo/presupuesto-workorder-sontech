import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { TurnoBeneficio, EstadoTurnoBeneficio } from '../types/beneficio';
import type { Orden } from '../types/orden';
import { pruneDeep, generateToken } from '../lib/utils';
import { buscarEquipoPorSerial, crearEquipo, vincularOrdenAEquipo } from './equipos';
import type { TipoEquipo } from '../types/equipo';

export const DAILY_QUOTA = 4;
const COLLECTION_TURNOS = 'beneficios_limpieza';

export function cleanDni(dni?: string): string {
  return String(dni || '').replace(/\D/g, '').trim();
}

export function generateCodigoBeneficio(): string {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `SON-LIMP-${year}-${randomPart}`;
}

export function calcularFechaEntregaEstimada(fechaTurnoStr: string): string {
  const parts = fechaTurnoStr.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = parts[1] || new Date().getMonth() + 1;
  const day = parts[2] || new Date().getDate();
  const turnoDate = new Date(year, month - 1, day);
  const entregaDate = new Date(turnoDate);
  entregaDate.setDate(entregaDate.getDate() + 1);
  if (entregaDate.getDay() === 0) {
    entregaDate.setDate(entregaDate.getDate() + 1);
  }
  return `${entregaDate.getFullYear()}-${String(entregaDate.getMonth() + 1).padStart(2, '0')}-${String(
    entregaDate.getDate()
  ).padStart(2, '0')}`;
}

/**
 * Obtiene todos los turnos del beneficio promocional ordenados por fecha descendente
 */
export async function listTurnosBeneficio(): Promise<TurnoBeneficio[]> {
  const snap = await getDocs(collection(db, COLLECTION_TURNOS));
  const items = snap.docs.map((d) => ({
    ...(d.data() as Omit<TurnoBeneficio, 'id'>),
    id: d.id,
  }));
  return items.sort((a, b) => (b.fechaTurno || '').localeCompare(a.fechaTurno || ''));
}

/**
 * Verifica si un cliente ya utilizó o tiene reservado el beneficio por única vez (por DNI o Email)
 */
export async function checkElegibilidadBeneficio(
  dni: string,
  email?: string
): Promise<{
  eligible: boolean;
  reason?: string;
  existingRecord?: TurnoBeneficio;
}> {
  const cleanedDni = cleanDni(dni);
  const normalizedEmail = (email || '').toLowerCase().trim();

  const turnosRef = collection(db, COLLECTION_TURNOS);

  if (cleanedDni) {
    const qDni = query(turnosRef, where('cliente.dni', '==', cleanedDni));
    const snapDni = await getDocs(qDni);
    const activeDoc = snapDni.docs.find((d) => d.data().estado !== 'cancelado');
    if (activeDoc) {
      const data = activeDoc.data() as TurnoBeneficio;
      return {
        eligible: false,
        reason: `El DNI ${cleanedDni} ya registra un beneficio (${data.codigoUnico || 'Fecha: ' + data.fechaTurno}).`,
        existingRecord: { ...data, id: activeDoc.id },
      };
    }
  }

  if (normalizedEmail) {
    const qEmail = query(turnosRef, where('cliente.email', '==', normalizedEmail));
    const snapEmail = await getDocs(qEmail);
    const activeDoc = snapEmail.docs.find((d) => d.data().estado !== 'cancelado');
    if (activeDoc) {
      const data = activeDoc.data() as TurnoBeneficio;
      return {
        eligible: false,
        reason: `El email ${normalizedEmail} ya registra un beneficio (${data.codigoUnico || 'Fecha: ' + data.fechaTurno}).`,
        existingRecord: { ...data, id: activeDoc.id },
      };
    }
  }

  return { eligible: true };
}

/**
 * Sincroniza los datos del cliente del beneficio con el Directorio de Clientes (CRM) del ERP
 */
export async function sincronizarClienteCRM(
  clienteTurno: TurnoBeneficio['cliente'],
  codigoBeneficio: string,
  fechaTurno: string
): Promise<string> {
  const cleanedDni = cleanDni(clienteTurno.dni);
  const nombreCompleto = `${clienteTurno.nombre || ''} ${clienteTurno.apellido || ''}`.trim() || 'Cliente';
  const now = Date.now();

  // Buscar si ya existe por cuitDni o por ID dni_{DNI}
  let targetDocId = cleanedDni ? `dni_${cleanedDni}` : '';

  if (cleanedDni) {
    const qCuit = query(collection(db, 'clientes'), where('cuitDni', '==', cleanedDni), limit(1));
    const snapCuit = await getDocs(qCuit);
    if (!snapCuit.empty) {
      targetDocId = snapCuit.docs[0].id;
    }
  }

  if (!targetDocId) {
    targetDocId = doc(collection(db, 'clientes')).id;
  }

  const clientRef = doc(db, 'clientes', targetDocId);
  const existingSnap = await getDoc(clientRef);

  const payload = pruneDeep({
    id: targetDocId,
    tipo: 'particular',
    nombre: nombreCompleto,
    apellido: clienteTurno.apellido || '',
    cuitDni: cleanedDni,
    dni: cleanedDni,
    telefono: clienteTurno.telefono || '',
    email: (clienteTurno.email || '').toLowerCase().trim(),
    direccion: clienteTurno.domicilio || '',
    domicilio: clienteTurno.domicilio || '',
    condicionIva: 'Consumidor Final',
    beneficioLimpiezaUsado: true,
    fechaBeneficioLimpieza: fechaTurno,
    ultimoTurnoBeneficio: fechaTurno,
    codigoBeneficioLimpieza: codigoBeneficio,
    origen: 'Beneficio Limpieza Gratuita',
    createdAt: existingSnap.exists() ? existingSnap.data()?.createdAt || now : now,
    updatedAt: now,
  });

  await setDoc(clientRef, payload, { merge: true });
  return targetDocId;
}

/**
 * Recepciona un turno del beneficio en el taller:
 * 1. Sincroniza cliente en CRM ('clientes')
 * 2. Crea la Orden de Trabajo en 'ordenes' ($0, 100% Bonificado) con tokenTracking
 * 3. Vincula o registra el equipo en la CMDB ('equipos') si tiene N° de Serie
 * 4. Actualiza el turno en 'beneficios_limpieza' a 'recepcionado'
 */
export async function recepcionarTurnoEnTaller(
  turno: TurnoBeneficio,
  opciones: {
    numeroSerie?: string;
    pass?: string;
    estadoEstetico?: string;
    accesoriosRecibidos?: string[];
    notasRecepcion?: string;
    tecnicoAsignado?: string;
  }
): Promise<{ ordenId: string; codigoUnico: string; tokenTracking: string }> {
  const codigoUnico = turno.codigoUnico || generateCodigoBeneficio();
  const tokenTracking = turno.tokenTracking || generateToken(12);
  const now = Date.now();
  const nombreCliente = `${turno.cliente?.nombre || ''} ${turno.cliente?.apellido || ''}`.trim() || 'Cliente';
  const cleanedDni = cleanDni(turno.cliente?.dni);

  // 1. Sincronizar Cliente en CRM
  const clienteId = await sincronizarClienteCRM(turno.cliente, codigoUnico, turno.fechaTurno);

  // 2. Preparar y guardar Orden de Trabajo
  const ordenRef = doc(collection(db, 'ordenes'));
  const accesoriosList =
    opciones.accesoriosRecibidos && opciones.accesoriosRecibidos.length > 0
      ? opciones.accesoriosRecibidos
      : turno.equipo?.tipo === 'Notebook'
      ? ['Cargador Original']
      : ['Solo Gabinete'];

  // 3. Vincular o crear en CMDB si hay número de serie
  let equipoId: string | undefined;
  const serialLimpio = (opciones.numeroSerie || turno.equipo?.numeroSerie || '').trim();
  if (serialLimpio) {
    try {
      const existente = await buscarEquipoPorSerial(serialLimpio);
      if (existente) {
        equipoId = existente.id;
        await vincularOrdenAEquipo(existente.id, ordenRef.id);
      } else {
        const tipoEq: TipoEquipo =
          turno.equipo?.tipo?.toLowerCase().includes('escritorio') ? 'PC Escritorio' : 'Notebook';
        equipoId = await crearEquipo({
          clienteId,
          clienteNombre: nombreCliente,
          tipo: tipoEq,
          marca: turno.equipo?.marca || 'Genérico',
          modelo: turno.equipo?.modelo || 'Estándar',
          numeroSerie: serialLimpio,
          pinClave: opciones.pass || undefined,
          historialOrdenesIds: [ordenRef.id],
          notas: `Ingresado por Beneficio Promocional Limpieza (${codigoUnico})`,
        });
      }
    } catch (errEq) {
      console.warn('No se pudo vincular en CMDB:', errEq);
    }
  }

  const nuevaOrden: Orden = {
    id: ordenRef.id,
    presupuestoId: 'BENEFICIO-PROMO',
    esBeneficioPromo: true,
    beneficioTurnoId: turno.id,
    cliente: nombreCliente,
    clienteId,
    clienteDni: cleanedDni,
    clienteTelefono: turno.cliente?.telefono || '',
    clienteEmail: turno.cliente?.email || '',
    equipo: {
      tipo: 'Notebook/PC',
      marca: turno.equipo?.marca || '',
      modelo: turno.equipo?.modelo || '',
      imeiSerie: serialLimpio,
      pass: opciones.pass || '',
      accesorios: accesoriosList.join(', '),
    },
    equipoId,
    checkin: {
      estadoEstetico: opciones.estadoEstetico || opciones.notasRecepcion || 'Sin observaciones estéticas',
      accesoriosRecibidos: accesoriosList,
      fallaDeclarada: 'Beneficio Promocional: Mantenimiento preventivo y limpieza física profunda',
      comportamientoInicial: turno.equipo?.observaciones || 'Equipo ingresa operativo para mantenimiento preventivo',
    },
    diagnostico:
      'Beneficio Promocional por única vez (100% Bonificado): Limpieza física profunda interna, remoción de polvo en disipadores, lubricación de ventiladores y recambio de pasta térmica de alta conductividad.',
    trabajos: [
      {
        id: crypto.randomUUID(),
        descripcion: 'Servicio de Limpieza Profunda + Cambio de Pasta Térmica (Beneficio Promocional 100% Bonificado)',
        horas: 1,
        precio: 0,
        tecnico: opciones.tecnicoAsignado || 'Técnico 1',
      },
    ],
    repuestos: [],
    itemsPresupuesto: [
      {
        id: 'item-promo-limpieza',
        tipo: 'Servicio',
        descripcion: 'Mantenimiento Preventivo y Limpieza Profunda (Promoción 100% Bonificada)',
        cantidad: 1,
        precioUnitario: 0,
        descuentoPct: 100,
      },
    ],
    moneda: 'ARS',
    status: 'pendiente',
    payStatus: 'pagado',
    garantiaDias: 30,
    tecnicoAsignado: opciones.tecnicoAsignado || 'Técnico 1',
    notas: `Promoción Limpieza Gratuita (${codigoUnico}). DNI: ${cleanedDni} | Tel: ${turno.cliente?.telefono || ''}. ${
      opciones.notasRecepcion || ''
    }`.trim(),
    tokenTracking,
    totalEstimado: 0,
    totalFinal: 0,
    saldo: 0,
    pagado: 0,
    codigo: codigoUnico,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(ordenRef, pruneDeep(nuevaOrden));

  // 4. Actualizar Turno en 'beneficios_limpieza'
  const turnoRef = doc(db, COLLECTION_TURNOS, turno.id);
  await updateDoc(turnoRef, {
    estado: 'recepcionado',
    codigoUnico,
    ordenId: ordenRef.id,
    tokenTracking,
    recepcionadoEn: new Date().toISOString(),
    notasRecepcion: opciones.notasRecepcion || opciones.estadoEstetico || '',
    'equipo.numeroSerie': serialLimpio,
    actualizadoEn: new Date().toISOString(),
  });

  return { ordenId: ordenRef.id, codigoUnico, tokenTracking };
}

/**
 * Permite otorgar el beneficio desde el mostrador del taller (con o sin recepción inmediata)
 */
export async function crearBeneficioMostrador(datos: {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  domicilio: string;
  tipoEquipo: 'Notebook' | 'PC de Escritorio';
  marca: string;
  modelo: string;
  numeroSerie?: string;
  pass?: string;
  observaciones?: string;
  fechaTurno: string;
  recepcionarAhora: boolean;
  tecnicoAsignado?: string;
  accesoriosRecibidos?: string[];
}): Promise<{
  turnoId: string;
  ordenId?: string;
  codigoUnico?: string;
  tokenTracking?: string;
}> {
  const cleanedDni = cleanDni(datos.dni);
  const elegibilidad = await checkElegibilidadBeneficio(cleanedDni, datos.email);
  if (!elegibilidad.eligible) {
    throw new Error(elegibilidad.reason || 'El cliente ya utilizó el beneficio promocional.');
  }

  const entregaStr = calcularFechaEntregaEstimada(datos.fechaTurno);

  const nuevoTurnoPayload: Omit<TurnoBeneficio, 'id'> = {
    cliente: {
      nombre: datos.nombre.trim(),
      apellido: datos.apellido.trim(),
      dni: cleanedDni,
      domicilio: datos.domicilio.trim(),
      email: datos.email.trim().toLowerCase(),
      telefono: datos.telefono.trim(),
    },
    equipo: {
      tipo: datos.tipoEquipo,
      marca: datos.marca.trim(),
      modelo: datos.modelo.trim(),
      observaciones: (datos.observaciones || '').trim(),
      numeroSerie: (datos.numeroSerie || '').trim(),
    },
    fechaTurno: datos.fechaTurno,
    franjaHoraria: '10:00 a 18:00 hs',
    fechaEntregaEstimada: entregaStr,
    estado: 'pendiente_recepcion',
    codigoUnico: null,
    tipoBeneficio: 'Limpieza preventiva y cambio de pasta térmica (100% Bonificado)',
    creadoEn: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, COLLECTION_TURNOS), {
    ...pruneDeep(nuevoTurnoPayload),
    createdAtServer: serverTimestamp(),
  });

  if (datos.recepcionarAhora) {
    const rec = await recepcionarTurnoEnTaller(
      { ...nuevoTurnoPayload, id: docRef.id },
      {
        numeroSerie: datos.numeroSerie,
        pass: datos.pass,
        estadoEstetico: datos.observaciones,
        accesoriosRecibidos: datos.accesoriosRecibidos,
        notasRecepcion: datos.observaciones,
        tecnicoAsignado: datos.tecnicoAsignado,
      }
    );
    return {
      turnoId: docRef.id,
      ordenId: rec.ordenId,
      codigoUnico: rec.codigoUnico,
      tokenTracking: rec.tokenTracking,
    };
  }

  return { turnoId: docRef.id };
}

/**
 * Cambia el estado de un turno manualmente
 */
export async function updateEstadoTurnoBeneficio(
  turnoId: string,
  nuevoEstado: EstadoTurnoBeneficio
): Promise<void> {
  const ref = doc(db, COLLECTION_TURNOS, turnoId);
  await updateDoc(ref, {
    estado: nuevoEstado,
    actualizadoEn: new Date().toISOString(),
  });
}

/**
 * Sincroniza automáticamente el estado de 'beneficios_limpieza' cuando cambia el estado de la OT en 'Orden.tsx'
 */
export async function sincronizarEstadoOrdenConBeneficio(
  orden: Orden,
  nuevoStatusOrden: string
): Promise<void> {
  const esPromo =
    orden.esBeneficioPromo ||
    orden.presupuestoId === 'BENEFICIO-PROMO' ||
    Boolean(orden.codigo && orden.codigo.startsWith('SON-LIMP'));

  if (!esPromo) return;

  let estadoTurno: EstadoTurnoBeneficio = 'recepcionado';
  if (nuevoStatusOrden === 'en_progreso' || nuevoStatusOrden === 'esperando_repuestos' || nuevoStatusOrden === 'pausado') {
    estadoTurno = 'en_mantenimiento';
  } else if (nuevoStatusOrden === 'completado') {
    estadoTurno = 'listo_entrega';
  } else if (nuevoStatusOrden === 'entregado') {
    estadoTurno = 'entregado';
  }

  try {
    if (orden.beneficioTurnoId) {
      await updateEstadoTurnoBeneficio(orden.beneficioTurnoId, estadoTurno);
      return;
    }

    if (orden.codigo) {
      const q = query(collection(db, COLLECTION_TURNOS), where('codigoUnico', '==', orden.codigo), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateEstadoTurnoBeneficio(snap.docs[0].id, estadoTurno);
      }
    }
  } catch (err) {
    console.warn('No se pudo sincronizar el estado con beneficios_limpieza:', err);
  }
}
