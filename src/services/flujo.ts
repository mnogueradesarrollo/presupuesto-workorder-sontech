// src/services/flujo.ts
import { db } from "../lib/firebase";
import { collection, doc, runTransaction, updateDoc, getDoc, setDoc, where, query, getDocs } from "firebase/firestore";
import type { Presupuesto, Aceptacion } from "../types/presupuesto";
import type { Orden } from "../types/orden";
import type { Pago } from "../types/pago";

/** Quita recursivamente todas las props con valor undefined (objetos y arrays) */
function pruneDeep<T>(val: T): T {
  if (Array.isArray(val)) {
    return val.map((v) => pruneDeep(v)).filter((v) => v !== undefined) as any;
  }
  if (val !== null && typeof val === "object") {
    const out: any = {};
    Object.entries(val as any).forEach(([k, v]) => {
      if (v === undefined) return;
      const pv = pruneDeep(v as any);
      if (pv !== undefined) out[k] = pv;
    });
    return out;
  }
  return val;
}

/** Numeración de órdenes por año */
async function nextNumeroOrden(anio: number): Promise<number> {
  const ref = doc(db, "counters", `ordenes-${anio}`);
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

function codigoOrden(anio: number, numero: number) {
  return `OT-${anio}-${String(numero).padStart(4, "0")}`;
}

/**
 * Acepta un presupuesto:
 *  - crea doc en `ordenes`
 *  - marca presupuesto como 'aceptado' y guarda ordenId + aceptación
 *  - devuelve el id de la orden
 */
export async function aceptarPresupuesto(
  presupuestoId: string,
  aceptacion: Aceptacion
): Promise<string> {
  const presRef = doc(db, "presupuestos", presupuestoId);
  const ordenRef = doc(collection(db, "ordenes")); // id pre-creado

  const anio = new Date().getFullYear();
  const numero = await nextNumeroOrden(anio);
  const codigo = codigoOrden(anio, numero);

  await runTransaction(db, async (tx) => {
    const pSnap = await tx.get(presRef);
    if (!pSnap.exists()) throw new Error("Presupuesto no existe");

    const p = pSnap.data() as Presupuesto;

    if (p.status === "aceptado" && p.ordenId) {
      throw { code: "ALREADY_ACCEPTED", ordenId: p.ordenId } as any;
    }

    const eq: any = {};
    const first = p.items?.[0];
    if (first?.marca) eq.marca = first.marca;
    if (first?.modelo) eq.modelo = first.modelo;
    if (first?.imeiSerie) eq.imeiSerie = first.imeiSerie;

    const ordenBase: Orden = {
      id: ordenRef.id,
      presupuestoId,
      cliente: p.cliente,
      equipo: Object.keys(eq).length ? eq : ({} as any),
      trabajos: [],
      repuestos: [],
      itemsPresupuesto: (p.items ?? []).map((it) => pruneDeep(it)),
      moneda: p.moneda ?? "ARS",
      status: "pendiente",
      payStatus: "impago",
      createdAt: Date.now(),
      totalEstimado: p.total ?? 0,
      saldo: p.total ?? 0,
      pagado: 0,
      codigo,
      anio,
      numero,
    };

    const orden = pruneDeep(ordenBase) as Orden;

    tx.set(ordenRef, orden);
    tx.update(presRef, {
      status: "aceptado",
      aceptacion,
      ordenId: orden.id,
    });
  }).catch((e: any) => {
    if (e?.code === "ALREADY_ACCEPTED") {
      throw { redirectedOrdenId: e.ordenId };
    }
    throw e;
  });

  return ordenRef.id;
}

/** Completar/cerrar orden */
export async function completarOrden(ordenId: string, data: Partial<Orden>) {
  const ref = doc(db, "ordenes", ordenId);
  await updateDoc(ref, {
    ...pruneDeep(data),
    status: "completado",
    completedAt: Date.now(),
  } as any);
}

/** Registrar pago y actualizar saldo/payStatus en transacción */
export async function registrarPago(pago: Omit<Pago, "id" | "createdAt">) {
  const ordenRef = doc(db, "ordenes", pago.ordenId);
  const pagoRef = doc(collection(db, "pagos"));

  await runTransaction(db, async (tx) => {
    const oSnap = await tx.get(ordenRef);
    if (!oSnap.exists()) throw new Error("Orden no existe");
    const ord = oSnap.data() as Orden;

    tx.set(pagoRef, {
      ...pruneDeep(pago),
      id: pagoRef.id,
      createdAt: Date.now(),
    });

    const base = ord.totalFinal ?? ord.totalEstimado ?? 0;
    const saldoActual = ord.saldo !== undefined ? ord.saldo : base;
    const pagadoActual = ord.pagado ?? 0;
    const nuevoSaldo = Math.max(
      0,
      Number((saldoActual - pago.monto).toFixed(2))
    );

    tx.update(ordenRef, {
      saldo: nuevoSaldo,
      pagado: pagadoActual + pago.monto,
      payStatus: nuevoSaldo <= 0 ? "pagado" : "parcial",
    });
  });
}

/** Obtener pagos de una orden */
export async function getPagosPorOrden(ordenId: string): Promise<Pago[]> {
  const q = query(collection(db, "pagos"), where("ordenId", "==", ordenId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Pago));
}

/** Eliminar pago y restaurar saldo/pagado */
export async function eliminarPago(pagoId: string, ordenId: string) {
  const ordenRef = doc(db, "ordenes", ordenId);
  const pagoRef = doc(db, "pagos", pagoId);

  await runTransaction(db, async (tx) => {
    const pSnap = await tx.get(pagoRef);
    if (!pSnap.exists()) throw new Error("Pago no existe");
    const pago = pSnap.data() as Pago;

    const oSnap = await tx.get(ordenRef);
    if (!oSnap.exists()) throw new Error("Orden no existe");
    const ord = oSnap.data() as Orden;

    const nuevoPagado = Math.max(0, (ord.pagado ?? 0) - pago.monto);
    const total = ord.totalFinal ?? ord.totalEstimado ?? 0;
    const nuevoSaldo = Math.max(0, Number((total - nuevoPagado).toFixed(2)));

    tx.delete(pagoRef);
    tx.update(ordenRef, {
      pagado: nuevoPagado,
      saldo: nuevoSaldo,
      payStatus: nuevoPagado <= 0 ? "impago" : nuevoSaldo <= 0 ? "pagado" : "parcial"
    });
  });
}
