import { doc, updateDoc, addDoc, collection, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Presupuesto, Aceptacion } from '../types/presupuesto';
import type { Orden } from '../types/orden';
import type { Pago } from '../types/pago';

export async function aceptarPresupuesto(presupuestoId: string, aceptacion: Aceptacion) {
  const presRef = doc(db, 'presupuestos', presupuestoId);
  const ordenRef = doc(collection(db, 'ordenes')); // id nuevo

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(presRef);
    if (!snap.exists()) throw new Error('Presupuesto no existe');
    const p = snap.data() as Presupuesto;
    if (p.status === 'aceptado') return;

    const orden: Orden = {
      id: ordenRef.id,
      presupuestoId,
      cliente: p.cliente,
      equipo: { marca: p.items[0]?.marca, modelo: p.items[0]?.modelo, imeiSerie: p.items[0]?.imeiSerie },
      trabajos: [],
      repuestos: [],
      itemsPresupuesto: p.items,
      moneda: p.moneda ?? 'ARS',
      status: 'pendiente',
      payStatus: 'impago',
      createdAt: Date.now(),
      totalEstimado: p.total,
      saldo: p.total
    };

    tx.update(presRef, { status: 'aceptado', aceptacion, ordenId: orden.id });
    tx.set(ordenRef, orden);
  });

  return ordenRef.id;
}

export async function completarOrden(ordenId: string, data: Partial<Orden>) {
  const ref = doc(db, 'ordenes', ordenId);
  await updateDoc(ref, {
    ...data,
    status: 'completado',
    completedAt: Date.now()
  });
}

export async function registrarPago(pago: Omit<Pago, 'id'|'createdAt'>) {
  const pagosCol = collection(db, 'pagos');
  const ordenRef = doc(db, 'ordenes', pago.ordenId);

  await runTransaction(db, async (tx) => {
    const ordenSnap = await tx.get(ordenRef);
    if (!ordenSnap.exists()) throw new Error('Orden no existe');
    const ord = ordenSnap.data() as Orden;

    await addDoc(pagosCol, { ...pago, createdAt: Date.now() });
    const baseTotal = ord.totalFinal ?? ord.totalEstimado ?? 0;
    const nuevoSaldo = (ord.saldo ?? baseTotal) - pago.monto;

    tx.update(ordenRef, {
      saldo: nuevoSaldo,
      payStatus: nuevoSaldo <= 0 ? 'pagado' : 'parcial'
    });
  });
}
