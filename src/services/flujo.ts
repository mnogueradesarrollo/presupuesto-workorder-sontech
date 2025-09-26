// src/services/flujo.ts
import { db } from "../lib/firebase";
import { collection, doc, runTransaction, updateDoc } from "firebase/firestore";
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

/**
 * Acepta un presupuesto:
 *  - crea doc en `ordenes`
 *  - marca presupuesto como 'aceptado' y guarda ordenId + aceptación
 *  - devuelve el id de la orden
 *
 * Si ya estaba aceptado, lanza { redirectedOrdenId } para que el caller redirija.
 */
export async function aceptarPresupuesto(
  presupuestoId: string,
  aceptacion: Aceptacion
): Promise<string> {
  const presRef = doc(db, "presupuestos", presupuestoId);
  const ordenRef = doc(collection(db, "ordenes")); // id pre-creado

  await runTransaction(db, async (tx) => {
    const pSnap = await tx.get(presRef);
    if (!pSnap.exists()) throw new Error("Presupuesto no existe");

    const p = pSnap.data() as Presupuesto;

    if (p.status === "aceptado" && p.ordenId) {
      throw { code: "ALREADY_ACCEPTED", ordenId: p.ordenId } as any;
    }

    // Construimos 'equipo' sólo con los campos presentes
    const eq: any = {};
    const first = p.items?.[0];
    if (first?.marca) eq.marca = first.marca;
    if (first?.modelo) eq.modelo = first.modelo;
    if (first?.imeiSerie) eq.imeiSerie = first.imeiSerie;

    const ordenBase: Orden = {
      id: ordenRef.id,
      presupuestoId,
      cliente: p.cliente,
      equipo: Object.keys(eq).length ? eq : ({} as any), // objeto vacío si no hay datos
      trabajos: [],
      repuestos: [],
      // limpiamos undefined dentro de cada item del snapshot
      itemsPresupuesto: (p.items ?? []).map((it) => pruneDeep(it)),
      moneda: p.moneda ?? "ARS",
      status: "pendiente",
      payStatus: "impago",
      createdAt: Date.now(),
      totalEstimado: p.total ?? 0,
      // totalFinal omitido (queda undefined)
      saldo: p.total ?? 0,
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
    const saldoActual = ord.saldo ?? base;
    const nuevoSaldo = Math.max(
      0,
      Number((saldoActual - pago.monto).toFixed(2))
    );

    tx.update(ordenRef, {
      saldo: nuevoSaldo,
      payStatus: nuevoSaldo <= 0 ? "pagado" : "parcial",
    });
  });
}
