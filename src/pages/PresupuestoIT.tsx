import { useRef, useState } from 'react';
import type { ItemPresupuesto, Aceptacion } from '../types/presupuesto';
import ItemsTableIT from '../components/ItemsTableIT';
import { totals } from '../lib/calc';
import { useNavigate } from 'react-router-dom';
import { crearPresupuesto } from '../services/presupuestos';
import { aceptarPresupuesto } from '../services/flujo';
import { printElement } from '../lib/print';

export default function PresupuestoIT() {
  const [items, setItems] = useState<ItemPresupuesto[]>([
    { id: crypto.randomUUID(), tipo: 'Producto', descripcion: '', cantidad: 1, precioUnitario: 0 }
  ]);
  const [cliente, setCliente] = useState('');
  const [ivaPct, setIvaPct] = useState<number | undefined>(21);
  const [saving, setSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const t = totals({ items, ivaPct, recargoTarjetaPct: undefined, bonificacionPct: undefined });

  const handlePrint = () => {
    if (printRef.current) {
      printElement(printRef.current, { pageStyle: '@page { size: A4; margin: 12mm }', title: 'Presupuesto IT' });
    }
  };

  const addItem = () =>
    setItems(prev => [...prev, { id: crypto.randomUUID(), tipo: 'Producto', descripcion: '', cantidad: 1, precioUnitario: 0 }]);

  const handleAceptar = async () => {
    if (!cliente.trim()) { alert('Ingresá el nombre del cliente antes de aceptar.'); return; }
    setSaving(true);
    try {
      const presupuestoId = await crearPresupuesto({
        cliente,
        fecha: new Date().toISOString(),
        moneda: 'ARS',
        items,
        ivaPct,
        recargoTarjetaPct: undefined,
        bonificacionPct: undefined,
        notas: '',
        total: t.total,
        ordenId: undefined,
        aceptacion: undefined,
      });

      const aceptacion: Aceptacion = { nombre: cliente, metodo: 'whatsapp', aceptadoAt: Date.now() };
      const ordenId = await aceptarPresupuesto(presupuestoId, aceptacion);
      navigate(`/orden/${ordenId}`);
    } catch (e) {
      console.error(e);
      alert('No se pudo aceptar el presupuesto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="toolbar print-hide">
        <button onClick={addItem} className="btn">+ Agregar ítem</button>
        <button onClick={handlePrint} className="btn">Imprimir / PDF</button>
        <button onClick={handleAceptar} className="btn primary" disabled={saving}>
          {saving ? 'Creando orden…' : 'Aceptar presupuesto → Orden'}
        </button>
      </div>

      <div ref={printRef} className="card paper A4">
        <h2 className="title">Presupuesto IT</h2>

        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
          <label>Cliente: <input value={cliente} onChange={e=>setCliente(e.target.value)} /></label>
          <label>IVA: <input type="number" min={0} max={27} value={ivaPct ?? 0}
            onChange={e=>setIvaPct(Number(e.target.value)||0)} style={{ width: 60, marginLeft: 6 }} />%</label>
        </div>

        <ItemsTableIT items={items} onChange={setItems} />

        <div className="right" style={{ marginTop: 12 }}>
          <div>IVA {ivaPct ?? 0}%</div>
          <strong>Total: {t.total.toFixed(2)}</strong>
        </div>
      </div>
    </>
  );
}
