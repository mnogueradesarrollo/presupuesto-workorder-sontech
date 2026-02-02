import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Orden } from '../types/orden';
import { registrarPago, getPagosPorOrden, eliminarPago } from '../services/flujo';
import type { Pago } from '../types/pago';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { generarOrdenPDF, toDataURL } from '../lib/pdf';
import { getSettings } from '../services/settings';
import logoUrl from '../assets/logotipo-sontech.png';
import type { ItemPresupuesto } from '../types/presupuesto';

const schema = z.object({
  diagnostico: z.string().optional(),
  notasEntrega: z.string().optional(),
  status: z.string(),
  trabajos: z.array(z.object({
    id: z.string(),
    descripcion: z.string().min(1, "La descripción es obligatoria"),
    horas: z.coerce.number().optional(),
    precio: z.coerce.number().optional(),
    tecnico: z.string().optional(),
  })),
  repuestos: z.array(z.object({
    id: z.string(),
    descripcion: z.string().min(1, "La descripción es obligatoria"),
    cantidad: z.coerce.number().min(1),
    precio: z.coerce.number().optional(),
  })),
});

type FormData = z.infer<typeof schema>;

export default function OrdenPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [orden, setOrden] = useState<Orden | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [saving, setSaving] = useState(false);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      trabajos: [],
      repuestos: [],
      status: 'pendiente'
    }
  });

  const { fields: trabajoFields, append: appendTrabajo, remove: removeTrabajo } = useFieldArray({
    control,
    name: "trabajos"
  });

  const { fields: repuestoFields, append: appendRepuesto, remove: removeRepuesto } = useFieldArray({
    control,
    name: "repuestos"
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      const snap = await getDoc(doc(db, 'ordenes', id));
      if (snap.exists()) {
        const data = snap.data() as Orden;
        setOrden(data);
        reset({
          diagnostico: data.diagnostico || '',
          notasEntrega: data.notasEntrega || '',
          status: data.status,
          trabajos: data.trabajos || [],
          repuestos: data.repuestos || [],
        });
        const pList = await getPagosPorOrden(id);
        setPagos(pList);
      }
    })();
  }, [id, reset]);

  const onSubmit = async (data: FormData) => {
    if (!id) return;
    setSaving(true);
    try {
      // Calcular Totales Extra
      const extraTrabajos = (data.trabajos || []).reduce((acc: number, t: any) => acc + (Number(t.precio) || 0), 0);
      const extraRepuestos = (data.repuestos || []).reduce((acc: number, r: any) => acc + (Number(r.precio) || 0) * (Number(r.cantidad) || 0), 0);

      const totalEstimado = orden?.totalEstimado || 0;
      const totalFinal = totalEstimado + extraTrabajos + extraRepuestos;
      const pagado = orden?.pagado || 0;
      const saldo = Math.max(0, Number((totalFinal - pagado).toFixed(2)));
      const payStatus = saldo <= 0 ? (pagado > 0 ? 'pagado' : 'impago') : (pagado > 0 ? 'parcial' : 'impago');

      // ACTUALIZAR PRESUPUESTO ORIGINAL
      if (orden?.presupuestoId) {
        // Mapear trabajos y repuestos a ItemPresupuesto
        const extraItems: ItemPresupuesto[] = [
          ...(data.trabajos || []).map((t: any) => ({
            id: t.id,
            tipo: 'Servicio' as const,
            descripcion: t.descripcion,
            cantidad: 1,
            precioUnitario: Number(t.precio) || 0,
          })),
          ...(data.repuestos || []).map((r: any) => ({
            id: r.id,
            tipo: 'Producto' as const,
            descripcion: r.descripcion,
            cantidad: Number(r.cantidad) || 1,
            precioUnitario: Number(r.precio) || 0,
          }))
        ];

        // Combinar con items originales (snapshot)
        const allItems = [...(orden.itemsPresupuesto || []), ...extraItems];

        // Actualizar doc presupuesto
        await updateDoc(doc(db, 'presupuestos', orden.presupuestoId), {
          items: allItems,
          total: totalFinal,
          updatedAt: Date.now()
        });
      }

      await updateDoc(doc(db, 'ordenes', id), {
        ...data,
        totalFinal,
        saldo,
        payStatus,
        updatedAt: Date.now()
      });
      // Actualizar estado local para que el UI refleje el saldo inmediatamente
      setOrden(prev => prev ? { ...prev, totalFinal, saldo, payStatus } : null);
      toast.success("Orden actualizada correctamente");
    } catch (e) {
      console.error(e);
      toast.error("Error al actualizar la orden");
    } finally {
      setSaving(false);
    }
  };

  const handlePagar = async () => {
    const montoStr = prompt('Monto a pagar:');
    if (montoStr === null) return;
    const monto = Number(montoStr);
    if (isNaN(monto) || monto <= 0) {
      toast.error("Monto inválido");
      return;
    }

    try {
      await registrarPago({
        ordenId: id!,
        presupuestoId: orden!.presupuestoId,
        monto,
        moneda: orden!.moneda ?? 'ARS',
        metodo: 'Efectivo',
      });
      toast.success("Pago registrado");
      // Recargar datos
      const snap = await getDoc(doc(db, 'ordenes', id!));
      if (snap.exists()) setOrden(snap.data() as Orden);
      const pList = await getPagosPorOrden(id!);
      setPagos(pList);
    } catch (e) {
      console.error(e);
      toast.error("Error al registrar pago");
    }
  };


  const handleImprimir = async () => {
    if (!orden) return;
    const biz = await getSettings();
    const logoDataUrl = biz?.logoUrl ? await toDataURL(biz.logoUrl) : await toDataURL(logoUrl);

    const docPdf = await generarOrdenPDF({
      cliente: orden.cliente,
      fecha: new Date(orden.createdAt).toLocaleDateString(),
      codigoOrden: orden.codigo,
      equipo: {
        marca: orden.equipo?.marca,
        modelo: orden.equipo?.modelo,
        imeiSerie: orden.equipo?.imeiSerie
      },
      diagnostico: orden.diagnostico,
      notasEntrega: orden.notasEntrega,
      trabajos: orden.trabajos.map(t => ({
        descripcion: t.descripcion,
        precio: t.precio,
        horas: t.horas
      })),
      repuestos: orden.repuestos.map(r => ({
        descripcion: r.descripcion,
        cantidad: r.cantidad,
        precio: r.precio || 0
      })),
      totalFinal: orden.totalFinal ?? orden.totalEstimado ?? 0,
      pagado: orden.pagado ?? 0,
      saldo: orden.saldo ?? 0,
      moneda: orden.moneda,
      logoDataUrl: logoDataUrl ?? undefined,
      sub: biz?.name,
      address: biz?.address,
      phone: biz?.phone,
      email: biz?.email,
      footerText: biz?.footerText
    });

    docPdf.save(`Informe-OT-${orden.codigo || id?.slice(0, 8)}.pdf`);
  };

  const handleEliminarPago = async (pagoId: string) => {
    if (!confirm("¿Eliminar este pago? El saldo se recalculará automáticamente.")) return;
    try {
      await eliminarPago(pagoId, id!);
      toast.success("Pago eliminado");
      // Recargar datos
      const snap = await getDoc(doc(db, 'ordenes', id!));
      if (snap.exists()) setOrden(snap.data() as Orden);
      const pList = await getPagosPorOrden(id!);
      setPagos(pList);
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar pago");
    }
  };


  if (!orden) return <div className="container">Cargando…</div>;

  return (
    <div className="container">
      <div className="toolbar print-hide">
        <button onClick={() => navigate(-1)} className="btn">← Volver</button>
        <button onClick={handleSubmit(onSubmit, (err) => {
          console.log("Validation errors:", err);
          toast.error("Revisá los errores en el formulario");
        })} className="btn primary" disabled={saving}>
          {saving ? "Guardando..." : "Guardar Cambios"}
        </button>
        <button onClick={handlePagar} className="btn">Registrar Pago</button>
        <button onClick={() => handleImprimir()} className="btn">Imprimir Informe</button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card paper A4">
        <h2 className="title">Orden de Trabajo #{id?.slice(0, 8)}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <p><strong>Cliente:</strong> {orden.cliente}</p>
            <p><strong>Equipo:</strong> {orden.equipo?.marca} {orden.equipo?.modelo}</p>
            <p><strong>IMEI/Serie:</strong> {orden.equipo?.imeiSerie || '—'}</p>
          </div>
          <div className="right">
            <p><strong>Estado:</strong>
              <select {...register("status")} style={{ marginLeft: 10, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <option value="pendiente">Pendiente</option>
                <option value="en_progreso">En Proceso</option>
                <option value="completado">Completado</option>
                <option value="anulado">Anulado</option>
              </select>
            </p>
            <p><strong>Total Final:</strong> ${(orden.totalFinal ?? orden.totalEstimado ?? 0).toFixed(2)}</p>
            <p><strong>Pagado:</strong> ${(orden.pagado ?? 0).toFixed(2)}</p>
            <p><strong>Saldo:</strong> <span style={{ color: (orden.saldo ?? 0) > 0 ? 'red' : 'green', fontWeight: 'bold' }}>${(orden.saldo ?? 0).toFixed(2)}</span></p>
          </div>
        </div>

        <hr />

        <div style={{ marginBottom: 20 }}>
          <label><strong>Informe Técnico / Diagnóstico:</strong></label>
          <textarea
            {...register("diagnostico")}
            rows={4}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', marginTop: 8, fontFamily: 'inherit' }}
            placeholder="Escribe aquí el informe técnico..."
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label><strong>Notas de Entrega (Se muestran al cliente):</strong></label>
          <textarea
            {...register("notasEntrega")}
            rows={2}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)', marginTop: 8, fontFamily: 'inherit' }}
            placeholder="Notas adicionales para el cliente..."
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Trabajos Realizados</h3>
            <button type="button" onClick={() => appendTrabajo({ id: crypto.randomUUID(), descripcion: '' })} className="btn">+ Agregar Trabajo</button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Descripción del trabajo</th>
                <th style={{ width: 100 }}>Horas</th>
                <th style={{ width: 120 }}>Precio</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {trabajoFields.map((field, index) => (
                <tr key={field.id}>
                  <td>
                    <input {...register(`trabajos.${index}.descripcion`)} placeholder="Ej: Cambio de pantalla" className={(errors.trabajos as any)?.[index]?.descripcion ? "error" : ""} />
                  </td>
                  <td>
                    <input type="number" {...register(`trabajos.${index}.horas`)} />
                  </td>
                  <td>
                    <input type="number" {...register(`trabajos.${index}.precio`)} />
                  </td>
                  <td className="right">
                    <button type="button" onClick={() => removeTrabajo(index)} className="btn">🗑️</button>
                  </td>
                </tr>
              ))}
              {trabajoFields.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>No hay trabajos registrados</td></tr>}
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Repuestos / Materiales</h3>
            <button type="button" onClick={() => appendRepuesto({ id: crypto.randomUUID(), descripcion: '', cantidad: 1 })} className="btn">+ Agregar Repuesto</button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Repuesto</th>
                <th style={{ width: 100 }}>Cant.</th>
                <th style={{ width: 120 }}>Precio Unit.</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {repuestoFields.map((field, index) => (
                <tr key={field.id}>
                  <td>
                    <input {...register(`repuestos.${index}.descripcion`)} placeholder="Ej: Pantalla iPhone 11" className={(errors.repuestos as any)?.[index]?.descripcion ? "error" : ""} />
                  </td>
                  <td>
                    <input type="number" {...register(`repuestos.${index}.cantidad`)} />
                  </td>
                  <td>
                    <input type="number" {...register(`repuestos.${index}.precio`)} />
                  </td>
                  <td className="right">
                    <button type="button" onClick={() => removeRepuesto(index)} className="btn">🗑️</button>
                  </td>
                </tr>
              ))}
              {repuestoFields.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>No hay repuestos registrados</td></tr>}
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Historial de Pagos</h3>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Método</th>
                <th className="right">Monto</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.createdAt).toLocaleString()}</td>
                  <td>{p.metodo}</td>
                  <td className="right">${p.monto.toFixed(2)}</td>
                  <td className="right">
                    <button type="button" onClick={() => handleEliminarPago(p.id)} className="btn">🗑️</button>
                  </td>
                </tr>
              ))}
              {pagos.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>No hay pagos registrados</td></tr>}
            </tbody>
          </table>
        </div>

        {orden.itemsPresupuesto && orden.itemsPresupuesto.length > 0 && (
          <div style={{ marginTop: 30, padding: 15, background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
            <h4 style={{ marginTop: 0 }}>Referencia del Presupuesto Original</h4>
            <ul style={{ fontSize: '0.9rem', color: '#475569' }}>
              {orden.itemsPresupuesto.map((it, idx) => (
                <li key={idx}>
                  {it.descripcion} - {it.cantidad}x ${it.precioUnitario?.toFixed(2) || (it.horas! * it.tarifaHora!).toFixed(2)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}
