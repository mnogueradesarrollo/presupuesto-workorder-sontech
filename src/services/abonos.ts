import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AbonoCliente } from '../types/abono';
import { pruneDeep } from '../lib/utils';

const COLLECTION = 'abonos';

export async function listAbonos(): Promise<AbonoCliente[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as AbonoCliente));
}

export async function getAbono(id: string): Promise<AbonoCliente | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as AbonoCliente;
}

export async function crearAbono(
  data: Omit<AbonoCliente, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = doc(collection(db, COLLECTION));
  const now = Date.now();
  const nuevo: AbonoCliente = {
    ...data,
    id: ref.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, pruneDeep(nuevo));
  return ref.id;
}

export async function updateAbono(
  id: string,
  data: Partial<Omit<AbonoCliente, 'id' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...pruneDeep(data),
    updatedAt: Date.now(),
  });
}

export async function deleteAbono(id: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}

/** Registra horas o visitas consumidas dentro del período */
export async function registrarConsumoAbono(
  id: string,
  horas: number,
  visitas: number,
  notas?: string
): Promise<void> {
  const ab = await getAbono(id);
  if (!ab) throw new Error('Abono no encontrado');

  const curr = ab.periodoActual || {
    mesAnio: new Date().toISOString().slice(0, 7),
    horasConsumidas: 0,
    visitasRealizadas: 0,
    horasExcedentes: 0,
  };

  const nuevasHoras = (curr.horasConsumidas || 0) + horas;
  const nuevasVisitas = (curr.visitasRealizadas || 0) + visitas;
  const horasExcedentes = Math.max(0, nuevasHoras - ab.horasIncluidas);

  await updateAbono(id, {
    periodoActual: {
      ...curr,
      horasConsumidas: nuevasHoras,
      visitasRealizadas: nuevasVisitas,
      horasExcedentes,
      notas: notas ? `${curr.notas ? curr.notas + ' | ' : ''}${notas}` : curr.notas,
    },
  });
}
