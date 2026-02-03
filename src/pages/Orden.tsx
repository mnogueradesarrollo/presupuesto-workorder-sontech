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


  if (!orden) return <div className="container py-5 text-center">Cargando orden...</div>;

  return (
    <div className="container py-5">
      {/* Header de la Página */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="m-0 fw-bold text-gradient">
          Orden de Trabajo
          <span className="ms-2 text-muted small fw-normal">({orden.codigo || id?.slice(0, 8)})</span>
        </h2>
        <button onClick={() => navigate(-1)} className="btn btn-light">
          <i className="bi bi-arrow-left me-1"></i> Volver
        </button>
      </div>

      <div className="row">
        <div className="col-lg-10 mx-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="paper-container mb-4 shadow-lg">
            {/* Cabecera Sontech */}
            <div className="d-flex justify-content-between align-items-center mb-5">
              <img src={logoUrl} alt="Sontech" width={180} />
              <div className="text-end">
                <span className={`badge mb-2 status-${orden.status}`}>
                  {orden.status.replace('_', ' ')}
                </span>
                <h1 className="h4 mb-0 fw-bold text-primary">ORDEN DE TRABAJO</h1>
                <p className="text-muted small mb-0 fw-bold">OT-{orden.codigo || id?.slice(0, 8)}</p>
              </div>
            </div>

            {/* Info Cliente & Equipo */}
            <div className="row mb-5 g-4">
              <div className="col-md-6">
                <div className="bg-light p-3 rounded-3 h-100 border-start border-primary border-4">
                  <label className="x-small fw-bold text-muted mb-2 d-block text-uppercase">Información del Cliente</label>
                  <div className="fs-5 fw-bold mb-1">{orden.cliente}</div>
                  <div className="text-muted small">ID de seguimiento: {id?.slice(0, 12)}</div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="bg-light p-3 rounded-3 h-100">
                  <label className="x-small fw-bold text-muted mb-2 d-block text-uppercase">Equipo en Servicio</label>
                  <div className="fw-bold">{orden.equipo?.marca} {orden.equipo?.modelo}</div>
                  <div className="text-muted small">SN/IMEI: {orden.equipo?.imeiSerie || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Resumen Financiero Rápido */}
            <div className="info-box-premium mb-5">
              <div className="stats-grid-compact">
                <div className="stat-item">
                  <label>Total Final</label>
                  <div className="value">${(orden.totalFinal ?? orden.totalEstimado ?? 0).toLocaleString()}</div>
                </div>
                <div className="stat-item">
                  <label>Pagado</label>
                  <div className="value text-success">${(orden.pagado ?? 0).toLocaleString()}</div>
                </div>
                <div className="stat-item">
                  <label>Saldo Pendiente</label>
                  <div className={`value ${(orden.saldo ?? 0) > 0 ? 'balance-negative' : 'balance-positive'}`}>
                    ${(orden.saldo ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="stat-item">
                  <label>Cambiar Estado</label>
                  <select {...register("status")} className="form-control form-control-sm mt-1">
                    <option value="pendiente">Pendiente</option>
                    <option value="en_progreso">En Proceso</option>
                    <option value="completado">Completado</option>
                    <option value="anulado">Anulado</option>
                  </select>
                </div>
              </div>
            </div>

            <hr className="my-5 opacity-10" />

            {/* Diagnóstico & Notas */}
            <div className="row mb-5">
              <div className="col-md-12 mb-4">
                <label className="small fw-bold text-muted text-uppercase mb-2 d-block">Informe Técnico / Diagnóstico</label>
                <textarea
                  {...register("diagnostico")}
                  rows={4}
                  className="form-control w-100"
                  placeholder="Detalla el problema encontrado y la solución técnica..."
                />
              </div>
              <div className="col-md-12">
                <label className="small fw-bold text-muted text-uppercase mb-2 d-block">Notas para el Cliente (Informe final)</label>
                <textarea
                  {...register("notasEntrega")}
                  rows={2}
                  className="form-control w-100"
                  placeholder="Recomendaciones o aclaraciones para el cliente al entregar el equipo..."
                />
              </div>
            </div>

            {/* Trabajos Realizados */}
            <div className="mb-5">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="h6 fw-bold text-uppercase m-0">Trabajos Realizados</h3>
                <button type="button" onClick={() => appendTrabajo({ id: crypto.randomUUID(), descripcion: '', precio: 0 })} className="btn btn-soft-primary btn-sm">
                  <i className="bi bi-plus-circle me-1"></i> Agregar Trabajo
                </button>
              </div>

              <div className="items-container-vertical">
                {trabajoFields.map((field, index) => (
                  <div key={field.id} className="item-card p-3">
                    <div className="row g-3">
                      <div className="col-md-7">
                        <label className="x-small fw-bold text-muted text-uppercase d-block mb-1">Descripción</label>
                        <input
                          {...register(`trabajos.${index}.descripcion`)}
                          placeholder="Ej: Rebalanceo de carga, Soldadura..."
                          className={`form-control form-control-sm ${(errors.trabajos as any)?.[index]?.descripcion ? "is-invalid" : ""}`}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="x-small fw-bold text-muted text-uppercase d-block mb-1">Horas</label>
                        <input type="number" {...register(`trabajos.${index}.horas`)} className="form-control form-control-sm" />
                      </div>
                      <div className="col-md-2">
                        <label className="x-small fw-bold text-muted text-uppercase d-block mb-1">Precio</label>
                        <input type="number" {...register(`trabajos.${index}.precio`)} className="form-control form-control-sm" />
                      </div>
                      <div className="col-md-1 d-flex align-items-end">
                        <button type="button" onClick={() => removeTrabajo(index)} className="btn-action btn-soft-danger ms-auto">
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {trabajoFields.length === 0 && <div className="text-center py-4 text-muted small bg-light rounded-3 border-grow">No hay trabajos registrados aún</div>}
              </div>
            </div>

            {/* Repuestos / Materiales */}
            <div className="mb-5">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="h6 fw-bold text-uppercase m-0">Repuestos & Materiales</h3>
                <button type="button" onClick={() => appendRepuesto({ id: crypto.randomUUID(), descripcion: '', cantidad: 1, precio: 0 })} className="btn btn-soft-primary btn-sm">
                  <i className="bi bi-plus-circle me-1"></i> Agregar Repuesto
                </button>
              </div>

              <div className="items-container-vertical">
                {repuestoFields.map((field, index) => (
                  <div key={field.id} className="item-card p-3">
                    <div className="row g-3">
                      <div className="col-md-7">
                        <label className="x-small fw-bold text-muted text-uppercase d-block mb-1">Repuesto / Material</label>
                        <input
                          {...register(`repuestos.${index}.descripcion`)}
                          placeholder="Ej: Pantalla OLED, Tornillería..."
                          className={`form-control form-control-sm ${(errors.repuestos as any)?.[index]?.descripcion ? "is-invalid" : ""}`}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="x-small fw-bold text-muted text-uppercase d-block mb-1">Cant.</label>
                        <input type="number" {...register(`repuestos.${index}.cantidad`)} className="form-control form-control-sm" />
                      </div>
                      <div className="col-md-2">
                        <label className="x-small fw-bold text-muted text-uppercase d-block mb-1">Precio Unit.</label>
                        <input type="number" {...register(`repuestos.${index}.precio`)} className="form-control form-control-sm" />
                      </div>
                      <div className="col-md-1 d-flex align-items-end">
                        <button type="button" onClick={() => removeRepuesto(index)} className="btn-action btn-soft-danger ms-auto">
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {repuestoFields.length === 0 && <div className="text-center py-4 text-muted small bg-light rounded-3 border-grow">No hay repuestos registrados aún</div>}
              </div>
            </div>

            {/* Historial de Pagos */}
            <div className="mb-4">
              <h3 className="h6 fw-bold text-uppercase mb-3">Historial de Pagos</h3>
              <div className="table-responsive bg-light rounded-3 p-2">
                <table className="table table-sm table-borderless m-0">
                  <thead className="x-small text-muted text-uppercase">
                    <tr>
                      <th>Fecha</th>
                      <th>Método</th>
                      <th className="text-end">Monto</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="small">
                    {pagos.map((p) => (
                      <tr key={p.id}>
                        <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td><span className="badge bg-white text-dark border">{p.metodo}</span></td>
                        <td className="text-end fw-bold">${p.monto.toLocaleString()}</td>
                        <td className="text-end">
                          <button type="button" onClick={() => handleEliminarPago(p.id)} className="btn-action btn-soft-danger btn-xs ms-auto" style={{ width: 24, height: 24 }}>
                            <i className="bi bi-x"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pagos.length === 0 && <tr><td colSpan={4} className="text-center py-3 text-muted">No hay pagos registrados</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Referencia Presupuesto Original */}
            {orden.itemsPresupuesto && orden.itemsPresupuesto.length > 0 && (
              <div className="info-box-premium mt-5">
                <label className="x-small fw-bold text-muted text-uppercase d-block mb-2">Base del Presupuesto Original</label>
                <div className="row row-cols-1 row-cols-md-2 g-2">
                  {orden.itemsPresupuesto.map((it, idx) => (
                    <div key={idx} className="col">
                      <div className="small bg-white p-2 rounded border-start border-2 border-info d-flex justify-content-between">
                        <span className="text-truncate" style={{ maxWidth: '70%' }}>{it.descripcion}</span>
                        <span className="fw-bold">${(it.precioUnitario ?? (it.horas! * it.tarifaHora!)).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>

          {/* Acciones Finales (FIJAS AL FONDO) */}
          <div className="sticky-action-bar print-hide">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-light text-muted me-auto">
              Volver
            </button>
            <button type="button" onClick={handlePagar} className="btn btn-soft-success">
              <i className="bi bi-cash-stack me-1"></i> Registrar Pago
            </button>
            <button type="button" onClick={handleImprimir} className="btn btn-soft-info">
              <i className="bi bi-file-earmark-pdf me-1"></i> Informe PDF
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              className="btn btn-primary px-5"
              disabled={saving}
            >
              {saving ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>Gaurdando...</>
              ) : (
                <><i className="bi bi-check-lg me-1"></i> Guardar Cambios</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
