// src/services/presupuestos.ts
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  limit as qLimit,
  startAfter as qStartAfter,
  runTransaction,
} from "firebase/firestore";
import type { Presupuesto } from "../types/presupuesto";

const COL = "presupuestos";

/** Elimina propiedades con valor undefined (Firestore no acepta undefined) */
function pruneUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

// ===== Numeración por año: counters/presupuestos-YYYY {seq:number}
async function nextNumero(anio: number): Promise<number> {
  const ref = doc(db, "counters", `presupuestos-${anio}`);
  let numero = 1;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      tx.set(ref, { seq: 1 });
      numero = 1;
    } else {
      const seq = (snap.data() as any).seq ?? 0;
      numero = seq + 1;
      tx.update(ref, { seq: numero });
    }
  });
  return numero;
}

function codigoPresupuesto(anio: number, numero: number) {
  return `P-${anio}-${String(numero).padStart(4, "0")}`;
}

// ===== Crear (con numeración) =====
export async function crearPresupuesto(
  p: Omit<
    Presupuesto,
    "id" | "createdAt" | "status" | "anio" | "numero" | "codigo"
  >
): Promise<{ id: string; codigo: string }> {
  const col = collection(db, COL);
  const anio = new Date().getFullYear();
  const numero = await nextNumero(anio);
  const codigo = codigoPresupuesto(anio, numero);

  const payload = pruneUndefined({
    ...p,
    anio,
    numero,
    codigo,
    createdAt: Date.now(),
    status: "borrador",
  });

  const docRef = await addDoc(col, payload);
  return { id: docRef.id, codigo };
}

// ===== Actualizar (patch sin undefined) =====
export async function updatePresupuesto(
  id: string,
  patch: Partial<Presupuesto>
) {
  await updateDoc(doc(db, COL, id), pruneUndefined(patch) as any);
}

// ===== Leer =====
export async function getPresupuesto(id: string): Promise<Presupuesto | null> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Omit<Presupuesto, "id">;
  return { ...data, id: snap.id } as Presupuesto;
}

// ===== Soft delete / Anular =====
export async function anularPresupuesto(id: string, motivo?: string) {
  const curr = await getPresupuesto(id);
  const notas = motivo
    ? (curr?.notas || "") + `\n[Anulado]: ${motivo}`
    : curr?.notas;
  await updatePresupuesto(id, { status: "anulado", notas });
}

// ===== Listar con paginación =====
export type PresupuestoListItem = Pick<
  Presupuesto,
  | "id"
  | "cliente"
  | "fecha"
  | "total"
  | "status"
  | "ordenId"
  | "createdAt"
  | "codigo"
>;

export async function listPresupuestos(opts?: {
  limit?: number;
  startAfterCreatedAt?: number;
}): Promise<{ items: PresupuestoListItem[]; nextCursor?: number }> {
  const col = collection(db, COL);
  const clauses: any[] = [
    orderBy("createdAt", "desc"),
    qLimit(opts?.limit ?? 20),
  ];
  if (opts?.startAfterCreatedAt) {
    clauses.splice(1, 0, qStartAfter(opts.startAfterCreatedAt));
  }

  const qs = await getDocs(query(col, ...clauses));

  const items = qs.docs.map((d) => {
    const data = d.data() as Omit<Presupuesto, "id">;
    return {
      id: d.id,
      cliente: data.cliente,
      fecha: data.fecha,
      total: data.total,
      status: data.status,
      ordenId: data.ordenId,
      createdAt: data.createdAt,
      codigo: data.codigo,
    };
  });

  const last = qs.docs.at(-1)?.data() as Omit<Presupuesto, "id"> | undefined;
  const nextCursor = last?.createdAt;

  return { items, nextCursor };
}
