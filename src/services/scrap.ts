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
import type { ItemConsumibleScrap } from '../types/scrap';
import { pruneDeep } from '../lib/utils';

const COLLECTION = 'consumibles_scrap';

export async function listItemsTaller(): Promise<ItemConsumibleScrap[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as ItemConsumibleScrap));
}

export async function getItemTaller(id: string): Promise<ItemConsumibleScrap | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as ItemConsumibleScrap;
}

export async function crearItemTaller(
  data: Omit<ItemConsumibleScrap, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = doc(collection(db, COLLECTION));
  const now = Date.now();
  const nuevo: ItemConsumibleScrap = {
    ...data,
    id: ref.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, pruneDeep(nuevo));
  return ref.id;
}

export async function updateItemTaller(
  id: string,
  data: Partial<Omit<ItemConsumibleScrap, 'id' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...pruneDeep(data),
    updatedAt: Date.now(),
  });
}

export async function deleteItemTaller(id: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}

/** Marca una pieza de scrap como utilizada en una orden de trabajo */
export async function utilizarPiezaScrap(
  tallerItemId: string,
  piezaId: string,
  ordenId: string,
  ordenCodigo: string
): Promise<void> {
  const item = await getItemTaller(tallerItemId);
  if (!item || !item.piezasRecuperadas) return;

  const piezas = item.piezasRecuperadas.map((p) => {
    if (p.id === piezaId) {
      return {
        ...p,
        usadoEnOrdenId: ordenId,
        usadoEnOrdenCodigo: ordenCodigo,
        fechaUso: Date.now(),
      };
    }
    return p;
  });

  await updateItemTaller(tallerItemId, {
    piezasRecuperadas: piezas,
  });
}
