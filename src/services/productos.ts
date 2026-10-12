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
  runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Categoria, Producto } from '../types/producto';
import { pruneDeep } from '../lib/utils';

const COLL_CATEGORIAS = 'categorias';
const COLL_PRODUCTOS = 'productos';

/* ===== CATEGORÍAS ===== */

export async function listCategorias(): Promise<Categoria[]> {
  const ref = collection(db, COLL_CATEGORIAS);
  const q = query(ref, orderBy('nombre', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Categoria));
}

export async function crearCategoria(
  data: Omit<Categoria, 'id'>
): Promise<string> {
  const ref = doc(collection(db, COLL_CATEGORIAS));
  const nueva: Categoria = { ...data, id: ref.id };
  await setDoc(ref, pruneDeep(nueva));
  return ref.id;
}

export async function updateCategoria(
  id: string,
  data: Partial<Omit<Categoria, 'id'>>
): Promise<void> {
  const ref = doc(db, COLL_CATEGORIAS, id);
  await updateDoc(ref, pruneDeep(data));
}

export async function deleteCategoria(id: string): Promise<void> {
  const ref = doc(db, COLL_CATEGORIAS, id);
  await deleteDoc(ref);
}

/* ===== PRODUCTOS & STOCK ===== */

export async function listProductos(max = 200): Promise<Producto[]> {
  const ref = collection(db, COLL_PRODUCTOS);
  const q = query(ref, orderBy('nombre', 'asc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Producto));
}

export async function getProducto(id: string): Promise<Producto | null> {
  const ref = doc(db, COLL_PRODUCTOS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as Producto;
}

export async function crearProducto(
  data: Omit<Producto, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = doc(collection(db, COLL_PRODUCTOS));
  const now = Date.now();
  const nuevo: Producto = {
    ...data,
    id: ref.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, pruneDeep(nuevo));
  return ref.id;
}

export async function updateProducto(
  id: string,
  data: Partial<Omit<Producto, 'id' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, COLL_PRODUCTOS, id);
  await updateDoc(ref, {
    ...pruneDeep(data),
    updatedAt: Date.now(),
  });
}

export async function deleteProducto(id: string): Promise<void> {
  const ref = doc(db, COLL_PRODUCTOS, id);
  await deleteDoc(ref);
}

/** Descontar o incrementar stock de un producto de forma atómica */
export async function ajustarStock(
  productoId: string,
  delta: number
): Promise<number> {
  const ref = doc(db, COLL_PRODUCTOS, productoId);
  let nuevoStock = 0;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Producto no existe');
    const p = snap.data() as Producto;
    nuevoStock = Math.max(0, (p.stock || 0) + delta);
    tx.update(ref, {
      stock: nuevoStock,
      updatedAt: Date.now(),
    });
  });
  return nuevoStock;
}
