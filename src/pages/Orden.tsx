import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Orden, TrabajoHecho, RepuestoUsado } from '../types/orden';
import { registrarPago } from '../services/flujo';

export default function OrdenPage() {
  const { id } = useParams<{id: string}>();
  const [orden, setOrden] = useState<Orden | null>(null);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'ordenes', id)).then(s => s.exists() && setOrden(s.data() as Orden));
  }, [id]);

  if (!orden) return <div>Cargando…</div>;

  const addTrabajo = async () => {
    const t: TrabajoHecho = { id: crypto.randomUUID(), descripcion: prompt('Trabajo realizado:') || '' };
    const next = { ...orden, trabajos: [...orden.trabajos, t] };
    await updateDoc(doc(db, 'ordenes', orden.id), { trabajos: next.trabajos });
    setOrden(next);
  };

  const addRepuesto = async () => {
    const r: RepuestoUsado = { id: crypto.randomUUID(), descripcion: prompt('Repuesto:') || '', cantidad: 1 };
    const next = { ...orden, repuestos: [...orden.repuestos, r] };
    await updateDoc(doc(db, 'ordenes', orden.id), { repuestos: next.repuestos });
    setOrden(next);
  };

  const pagar = async () => {
    const monto = Number(prompt('Monto a pagar:') || '0');
    if (!monto) return;
    await registrarPago({
      ordenId: orden.id,
      presupuestoId: orden.presupuestoId,
      monto,
      moneda: orden.moneda ?? 'ARS',
      metodo: 'Efectivo',
    });
    // refrescar
    const snap = await getDoc(doc(db, 'ordenes', orden.id));
    setOrden(snap.data() as Orden);
  };

  return (
    <div>
      <h2>Orden #{orden.id}</h2>
      <p><b>Cliente:</b> {orden.cliente}</p>
      <p><b>Equipo:</b> {orden.equipo?.marca} {orden.equipo?.modelo} (IMEI/Serie: {orden.equipo?.imeiSerie || '—'})</p>
      <p><b>Estado:</b> {orden.status} | <b>Pago:</b> {orden.payStatus} | <b>Saldo:</b> {orden.saldo ?? 0}</p>

      <hr />
      <h3>Trabajos</h3>
      <ul>{orden.trabajos.map(t => <li key={t.id}>{t.descripcion}</li>)}</ul>
      <button onClick={addTrabajo}>+ Agregar trabajo</button>

      <h3>Repuestos</h3>
      <ul>{orden.repuestos.map(r => <li key={r.id}>{r.descripcion} x{r.cantidad}</li>)}</ul>
      <button onClick={addRepuesto}>+ Agregar repuesto</button>

      <hr />
      <button onClick={pagar}>Registrar pago…</button>
    </div>
  );
}
