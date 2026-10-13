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
import type { Cliente } from '../types/cliente';
import { pruneDeep } from '../lib/utils';

const COLLECTION = 'clientes';

function normalizeCliente(id: string, raw: any): Cliente {
  const nombreCompleto =
    raw.apellido && !String(raw.nombre || '').toLowerCase().includes(String(raw.apellido).toLowerCase())
      ? `${raw.nombre || ''} ${raw.apellido || ''}`.trim()
      : raw.nombre || 'Cliente';

  return {
    ...raw,
    id,
    tipo: raw.tipo || 'particular',
    nombre: nombreCompleto,
    cuitDni: raw.cuitDni || raw.dni || '',
    telefono: raw.telefono || '',
    email: raw.email || '',
    direccion: raw.direccion || raw.domicilio || '',
    condicionIva: raw.condicionIva || 'Consumidor Final',
    beneficioLimpiezaUsado: Boolean(
      raw.beneficioLimpiezaUsado || raw.ultimoTurnoBeneficio || raw.fechaBeneficioLimpieza
    ),
    fechaBeneficioLimpieza: raw.fechaBeneficioLimpieza || raw.ultimoTurnoBeneficio || undefined,
    codigoBeneficioLimpieza: raw.codigoBeneficioLimpieza || undefined,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  } as Cliente;
}

export async function listClientes(max = 100): Promise<Cliente[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, orderBy('nombre', 'asc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeCliente(d.id, d.data()));
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return normalizeCliente(snap.id, snap.data());
}

export async function crearCliente(
  data: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = doc(collection(db, COLLECTION));
  const now = Date.now();
  const nuevo: Cliente = {
    ...data,
    id: ref.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, pruneDeep(nuevo));
  return ref.id;
}

export async function updateCliente(
  id: string,
  data: Partial<Omit<Cliente, 'id' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...pruneDeep(data),
    updatedAt: Date.now(),
  });
}

export async function deleteCliente(id: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}
