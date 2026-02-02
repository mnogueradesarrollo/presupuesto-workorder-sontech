import { db } from "../lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit as qLimit,
  startAfter as qStartAfter,
} from "firebase/firestore";
import type { Orden } from "../types/orden";

export type OrdenListItem = Pick<
  Orden,
  | "id"
  | "presupuestoId"
  | "cliente"
  | "status"
  | "payStatus"
  | "saldo"
  | "pagado"
  | "codigo"
  | "createdAt"
  | "totalEstimado"
  | "totalFinal"
>;

export async function listOrdenes(opts?: {
  limit?: number;
  startAfterCreatedAt?: number;
}): Promise<{ items: OrdenListItem[]; nextCursor?: number }> {
  const col = collection(db, "ordenes");
  const clauses: any[] = [
    orderBy("createdAt", "desc"),
    qLimit(opts?.limit ?? 50),
  ];
  if (opts?.startAfterCreatedAt)
    clauses.splice(1, 0, qStartAfter(opts.startAfterCreatedAt));
  const qs = await getDocs(query(col, ...clauses));

  const items = qs.docs.map((d) => {
    const data = d.data() as Orden;
    return {
      id: d.id,
      presupuestoId: data.presupuestoId,
      cliente: data.cliente,
      status: data.status,
      payStatus: data.payStatus,
      saldo:
        data.saldo !== undefined
          ? data.saldo
          : (data.totalFinal ?? data.totalEstimado ?? 0) - (data.pagado ?? 0),
      pagado: data.pagado ?? 0,
      codigo: data.codigo,
      createdAt: data.createdAt,
      totalEstimado: data.totalEstimado,
      totalFinal: data.totalFinal,
    };
  });

  const last = qs.docs.at(-1)?.data() as Orden | undefined;
  return { items, nextCursor: last?.createdAt };
}
