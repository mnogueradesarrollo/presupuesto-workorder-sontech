// src/services/presupuestos.ts
import { db } from '../lib/firebase';
import {
  collection, addDoc, doc, getDoc, updateDoc, getDocs,
  query, orderBy, limit as qLimit, startAfter as qStartAfter
} from 'firebase/firestore';
import type { Presupuesto } from '../types/presupuesto';

/** ====== Crear ======
 * Guarda un presupuesto en Firestore con status 'borrador'
 * Devuelve el id del documento creado
 */
export async function crearPresupuesto(
  p: Omit<Presupuesto, 'id' | 'createdAt' | 'status'>
): Promise<string> {
  const col = collection(db, 'presupuestos');
  const docRef = await addDoc(col, {
    ...p,
    createdAt: Date.now(),   // número para poder ordenar/paginar
    status: 'borrador',      // luego pasará a 'enviado' o 'aceptado'
  });
  return docRef.id;
}

/** ====== Leer uno ====== */
export async function getPresupuesto(id: string) {
  const ref = doc(db, 'presupuestos', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Omit<Presupuesto, 'id'>; // el documento no guarda 'id'
  return { ...data, id: snap.id } as Presupuesto;
}

/** ====== Actualizar (patch) ====== */
export async function updatePresupuesto(
  id: string,
  patch: Partial<Presupuesto>
): Promise<void> {
  const ref = doc(db, 'presupuestos', id);
  await updateDoc(ref, patch as any);
}

/** ====== Marcar como enviado (opcional) ====== */
export async function marcarEnviado(id: string): Promise<void> {
  await updatePresupuesto(id, { status: 'enviado' });
}

/** ====== Anular (soft delete) ====== */
export async function anularPresupuesto(id: string, motivo?: string): Promise<void> {
  const p = await getPresupuesto(id);
  const nota = motivo ? `\n\n[Anulado]: ${motivo}` : '';
  await updatePresupuesto(id, {
    status: 'anulado',
    notas: (p?.notas || '') + nota,
  });
}

/** ====== Listar (con paginación simple por createdAt DESC) ======
 *  Devuelve items y un cursor (último createdAt) para pedir la página siguiente
 */
export type PresupuestoListItem = Pick<
  Presupuesto,
  'id' | 'cliente' | 'fecha' | 'total' | 'status' | 'ordenId' | 'createdAt'
>;

export async function listPresupuestos(opts?: {
  limit?: number;
  startAfterCreatedAt?: number;
}) {
  const col = collection(db, 'presupuestos');
  const clauses: any[] = [orderBy('createdAt', 'desc'), qLimit(opts?.limit ?? 20)];
  if (opts?.startAfterCreatedAt) clauses.splice(1, 0, qStartAfter(opts.startAfterCreatedAt));

  const qs = await getDocs(query(col, ...clauses));

  const items = qs.docs.map(d => {
    const data = d.data() as Omit<Presupuesto, 'id'>;
    return {
      id: d.id,
      cliente: data.cliente,
      fecha: data.fecha,
      total: data.total,
      status: data.status,
      ordenId: data.ordenId,
      createdAt: data.createdAt,
    };
  });

  const last = qs.docs.at(-1)?.data() as (Omit<Presupuesto, 'id'> | undefined);
  const nextCursor = last?.createdAt;

  return { items, nextCursor };
}
