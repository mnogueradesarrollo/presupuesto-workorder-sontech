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
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Proveedor } from '../types/proveedor';
import { pruneDeep } from '../lib/utils';

const COLLECTION = 'proveedores';

export async function listProveedores(max = 100): Promise<Proveedor[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, orderBy('razonSocial', 'asc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Proveedor));
}

export async function getProveedor(id: string): Promise<Proveedor | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as Proveedor;
}

export async function crearProveedor(
  data: Omit<Proveedor, 'id' | 'createdAt'>
): Promise<string> {
  const ref = doc(collection(db, COLLECTION));
  const nuevo: Proveedor = {
    ...data,
    id: ref.id,
    createdAt: Date.now(),
  };
  await setDoc(ref, pruneDeep(nuevo));
  return ref.id;
}

export async function updateProveedor(
  id: string,
  data: Partial<Omit<Proveedor, 'id' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, pruneDeep(data));
}

export async function deleteProveedor(id: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}
