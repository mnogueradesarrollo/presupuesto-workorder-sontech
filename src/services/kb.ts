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
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ArticuloKB, CategoriaKB } from '../types/kb';
import { pruneDeep } from '../lib/utils';

const COLLECTION = 'kb_articulos';

export async function listArticulosKB(categoria?: CategoriaKB): Promise<ArticuloKB[]> {
  const ref = collection(db, COLLECTION);
  let q;
  if (categoria) {
    q = query(ref, where('categoria', '==', categoria));
  } else {
    q = query(ref, orderBy('updatedAt', 'desc'));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as ArticuloKB));
}

export async function getArticuloKB(id: string): Promise<ArticuloKB | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as ArticuloKB;
}

export async function crearArticuloKB(
  data: Omit<ArticuloKB, 'id' | 'createdAt' | 'updatedAt' | 'relevanciaVisitas'>
): Promise<string> {
  const ref = doc(collection(db, COLLECTION));
  const now = Date.now();
  const nuevo: ArticuloKB = {
    ...data,
    id: ref.id,
    relevanciaVisitas: 0,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, pruneDeep(nuevo));
  return ref.id;
}

export async function updateArticuloKB(
  id: string,
  data: Partial<Omit<ArticuloKB, 'id' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...pruneDeep(data),
    updatedAt: Date.now(),
  });
}

export async function deleteArticuloKB(id: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}

export async function incrementarVisitasKB(id: string): Promise<void> {
  const art = await getArticuloKB(id);
  if (!art) return;
  await updateArticuloKB(id, {
    relevanciaVisitas: (art.relevanciaVisitas || 0) + 1,
  });
}
