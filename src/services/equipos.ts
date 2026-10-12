import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { EquipoActivo } from '../types/equipo';
import { pruneDeep } from '../lib/utils';

const COLLECTION = 'equipos';

export async function listEquipos(clienteId?: string, max = 100): Promise<EquipoActivo[]> {
  const ref = collection(db, COLLECTION);
  let q;
  if (clienteId) {
    q = query(ref, where('clienteId', '==', clienteId), limit(max));
  } else {
    q = query(ref, orderBy('updatedAt', 'desc'), limit(max));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as EquipoActivo));
}

export async function getEquipo(id: string): Promise<EquipoActivo | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as EquipoActivo;
}

export async function buscarEquipoPorSerial(serial: string): Promise<EquipoActivo | null> {
  if (!serial.trim()) return null;
  const ref = collection(db, COLLECTION);
  const q = query(ref, where('numeroSerie', '==', serial.trim()), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { ...d.data(), id: d.id } as EquipoActivo;
}

export async function crearEquipo(
  data: Omit<EquipoActivo, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = doc(collection(db, COLLECTION));
  const now = Date.now();
  const nuevo: EquipoActivo = {
    ...data,
    id: ref.id,
    historialOrdenesIds: data.historialOrdenesIds || [],
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, pruneDeep(nuevo));
  return ref.id;
}

export async function updateEquipo(
  id: string,
  data: Partial<Omit<EquipoActivo, 'id' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...pruneDeep(data),
    updatedAt: Date.now(),
  });
}

export async function deleteEquipo(id: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}

/** Agrega una orden al historial del equipo */
export async function vincularOrdenAEquipo(equipoId: string, ordenId: string): Promise<void> {
  const eq = await getEquipo(equipoId);
  if (!eq) return;
  const historial = eq.historialOrdenesIds || [];
  if (!historial.includes(ordenId)) {
    await updateEquipo(equipoId, {
      historialOrdenesIds: [ordenId, ...historial],
    });
  }
}
