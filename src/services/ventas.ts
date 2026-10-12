import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Venta } from '../types/venta';
import type { Producto } from '../types/producto';
import { pruneDeep } from '../lib/utils';

const COLL_VENTAS = 'ventas';

/** Generador incremental anual para Ventas */
async function nextNumeroVenta(anio: number): Promise<number> {
  const ref = doc(db, 'counters', `ventas-${anio}`);
  let numero = 1;
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { seq: 1 });
    numero = 1;
  } else {
    const seq = (snap.data() as any).seq ?? 0;
    numero = seq + 1;
    await updateDoc(ref, { seq: numero });
  }
  return numero;
}

function codigoVenta(anio: number, numero: number): string {
  return `V-${anio}-${String(numero).padStart(4, '0')}`;
}

export async function crearVenta(
  data: Omit<Venta, 'id' | 'codigo' | 'numero' | 'anio' | 'createdAt'>
): Promise<{ id: string; codigo: string }> {
  const anio = new Date().getFullYear();
  const numero = await nextNumeroVenta(anio);
  const codigo = codigoVenta(anio, numero);
  const ventaRef = doc(collection(db, COLL_VENTAS));

  await runTransaction(db, async (tx) => {
    // 1. Descontar stock para productos que tienen productoId
    for (const item of data.items) {
      if (item.productoId) {
        const prodRef = doc(db, 'productos', item.productoId);
        const prodSnap = await tx.get(prodRef);
        if (prodSnap.exists()) {
          const prod = prodSnap.data() as Producto;
          if (prod.tipo !== 'servicio') {
            const stockActual = prod.stock ?? 0;
            const nuevoStock = Math.max(0, stockActual - item.cantidad);
            tx.update(prodRef, {
              stock: nuevoStock,
              updatedAt: Date.now(),
            });
          }
        }
      }
    }

    // 2. Guardar la venta
    const nuevaVenta: Venta = {
      ...data,
      id: ventaRef.id,
      codigo,
      numero,
      anio,
      createdAt: Date.now(),
    };

    tx.set(ventaRef, pruneDeep(nuevaVenta));
  });

  return { id: ventaRef.id, codigo };
}

export async function listVentas(max = 50): Promise<Venta[]> {
  const ref = collection(db, COLL_VENTAS);
  const q = query(ref, orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Venta));
}

export async function getVenta(id: string): Promise<Venta | null> {
  const ref = doc(db, COLL_VENTAS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as Venta;
}
