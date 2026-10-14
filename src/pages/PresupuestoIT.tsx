import { useEffect, useState } from "react";
import type {
  ItemPresupuesto,
  Aceptacion,
  Presupuesto,
} from "../types/presupuesto";
import ItemsTableIT from "../components/ItemsTableIT";
import { totals } from "../lib/calc";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  crearPresupuesto,
  getPresupuesto,
  updatePresupuesto,
} from "../services/presupuestos";
import { aceptarPresupuesto, sincronizarOrdenConPresupuesto } from "../services/flujo";
import { listClientes } from "../services/clientes";
import { listProductos } from "../services/productos";
import type { Cliente } from "../types/cliente";
import type { Producto } from "../types/producto";
import { generarPresupuestoPDF, toDataURL } from "../lib/pdf";
import { getSettings } from "../services/settings";
import { toast } from "react-hot-toast";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import logoUrl from "../assets/logotipo-sontech.png";

const safeOptionalNumber = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  if (typeof val === "number" && isNaN(val)) return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
}, z.number().optional());

const safeRequiredNumber = (minVal = 1, defaultVal = 1) => z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return defaultVal;
  if (typeof val === "number" && isNaN(val)) return defaultVal;
  const num = Number(val);
  return isNaN(num) || num < minVal ? defaultVal : num;
}, z.number().min(minVal));

const schema = z.object({
  cliente: z.string().min(1, "El cliente es obligatorio"),
  items: z.array(z.object({
    id: z.string(),
    productoId: z.string().optional(),
    tipo: z.enum(["Producto", "Servicio", "Reparación"]).default("Producto"),
    descripcion: z.preprocess((val) => {
      const s = String(val || "").trim();
      return s.length > 0 ? s : undefined;
    }, z.string().optional().default("Servicio / Reparación")),
    cantidad: safeRequiredNumber(1, 1),
    precioUnitario: safeOptionalNumber,
    horas: safeOptionalNumber,
    tarifaHora: safeOptionalNumber,
    marca: z.preprocess((val) => val === "" ? undefined : val, z.string().optional()),
    modelo: z.preprocess((val) => val === "" ? undefined : val, z.string().optional()),
    imeiSerie: z.preprocess((val) => val === "" ? undefined : val, z.string().optional()),
    estado: z.preprocess((val) => val === "" ? undefined : val, z.string().optional()),
    garantiaValor: safeOptionalNumber,
    garantiaUnidad: z.string().optional(),
    descuentoPct: safeOptionalNumber,
  })).min(1, "Debe haber al menos un ítem"),
});

export default function PresupuestoIT() {
  const [params] = useSearchParams();
  const editingId = params.get("id");
  const isViewMode = params.get("view") === "true";
  const paramCliente = params.get("cliente");
  const paramMarca = params.get("marca");
  const paramModelo = params.get("modelo");
  const paramSerie = params.get("serie");

  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [codigo, setCodigo] = useState<string | undefined>(undefined);
  const [currentOrdenId, setCurrentOrdenId] = useState<string | undefined>(undefined);

  // Catálogos auxiliares
  const [clientesDb, setClientesDb] = useState<Cliente[]>([]);
  const [productosDb, setProductosDb] = useState<Producto[]>([]);
  const [modalProdPicker, setModalProdPicker] = useState(false);
  const [searchPicker, setSearchPicker] = useState("");

  const { register, control, handleSubmit, watch, reset, formState: { errors } } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      cliente: paramCliente || "",
      items: [{
        id: crypto.randomUUID(),
        tipo: paramMarca || paramModelo ? "Reparación" : "Producto",
        descripcion: paramMarca || paramModelo ? `Reparación y diagnóstico de ${paramMarca || ''} ${paramModelo || ''}`.trim() : "Diagnóstico y Reparación",
        cantidad: 1,
        precioUnitario: 0,
        marca: paramMarca || undefined,
        modelo: paramModelo || undefined,
        imeiSerie: paramSerie || undefined,
      }]
    }
  });

  const { append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const items = watch("items") as ItemPresupuesto[];
  const cliente = watch("cliente");

  // Totales
  const t = totals({
    items,
    ivaPct: 0,
    recargoTarjetaPct: undefined,
    bonificacionPct: undefined,
  });

  // Cargar clientes y productos
  useEffect(() => {
    (async () => {
      try {
        const [clis, prods] = await Promise.all([
          listClientes(200),
          listProductos(200),
        ]);
        setClientesDb(clis);
        setProductosDb(prods);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Cargar si es edición
  useEffect(() => {
    (async () => {
      if (!editingId) return;
      const p = await getPresupuesto(editingId);
      if (!p) return;
      reset({
        cliente: p.cliente || "",
        items: p.items || []
      });
      setCodigo(p.codigo);
      setCurrentOrdenId(p.ordenId);
    })();
  }, [editingId, reset]);

  // Agregar producto desde catálogo
  const handleAddFromCatalog = (prod: Producto) => {
    append({
      id: crypto.randomUUID(),
      productoId: prod.id,
      tipo: prod.tipo === "repuesto" ? "Reparación" : prod.tipo === "servicio" ? "Servicio" : "Producto",
      descripcion: prod.nombre,
      cantidad: 1,
      precioUnitario: prod.precioVenta,
      garantiaValor: prod.garantiaMesesCliente || 3,
      garantiaUnidad: "meses",
    });
    setModalProdPicker(false);
    toast.success(`"${prod.nombre}" agregado al presupuesto`);
  };

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      const sanitizedItems: ItemPresupuesto[] = (data.items || []).map((it: any) => {
        let desc = (it.descripcion || "").trim();
        if (!desc) {
          if (it.marca || it.modelo) {
            desc = `Servicio de ${it.marca || ''} ${it.modelo || ''}`.trim();
          } else {
            desc = it.tipo === "Producto" ? "Producto" : "Servicio técnico";
          }
        }
        return {
          id: it.id || crypto.randomUUID(),
          productoId: it.productoId || undefined,
          tipo: it.tipo || "Producto",
          descripcion: desc,
          cantidad: Number(it.cantidad) > 0 ? Number(it.cantidad) : 1,
          precioUnitario: it.precioUnitario !== undefined && !isNaN(Number(it.precioUnitario)) ? Number(it.precioUnitario) : undefined,
          horas: it.horas !== undefined && !isNaN(Number(it.horas)) ? Number(it.horas) : undefined,
          tarifaHora: it.tarifaHora !== undefined && !isNaN(Number(it.tarifaHora)) ? Number(it.tarifaHora) : undefined,
          marca: it.marca || undefined,
          modelo: it.modelo || undefined,
          imeiSerie: it.imeiSerie || undefined,
          estado: it.estado || undefined,
          garantiaValor: it.garantiaValor !== undefined && !isNaN(Number(it.garantiaValor)) ? Number(it.garantiaValor) : undefined,
          garantiaUnidad: it.garantiaUnidad || undefined,
          descuentoPct: it.descuentoPct !== undefined && !isNaN(Number(it.descuentoPct)) ? Number(it.descuentoPct) : undefined,
        };
      });

      const finalTotals = totals({
        items: sanitizedItems,
        ivaPct: 0,
        recargoTarjetaPct: undefined,
        bonificacionPct: undefined,
      });

      if (editingId) {
        await updatePresupuesto(editingId, {
          cliente: data.cliente,
          items: sanitizedItems,
          total: finalTotals.total,
          fecha: new Date().toISOString(),
          ivaPct: 0,
        } as Partial<Presupuesto>);

        if (currentOrdenId) {
          await sincronizarOrdenConPresupuesto(currentOrdenId, editingId);
        }

        toast.success("Presupuesto actualizado.");
      } else {
        const { id, codigo: newCodigo } = await crearPresupuesto({
          cliente: data.cliente,
          fecha: new Date().toISOString(),
          moneda: "ARS",
          items: sanitizedItems,
          ivaPct: 0,
          notas: "",
          total: finalTotals.total,
        });
        setCodigo(newCodigo);
        toast.success("Presupuesto creado con éxito.");
        navigate(`/presupuesto-it?id=${id}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar el presupuesto.");
    } finally {
      setSaving(false);
    }
  };

  const onInvalid = (errors: any) => {
    console.warn("Validación falló:", errors);
    if (errors.cliente?.message) {
      toast.error(errors.cliente.message);
      return;
    }
    if (errors.items) {
      if (Array.isArray(errors.items)) {
        for (let i = 0; i < errors.items.length; i++) {
          const itemErr = errors.items[i];
          if (itemErr) {
            const firstKey = Object.keys(itemErr)[0];
            const msg = itemErr[firstKey]?.message || `Error en el ítem #${i + 1}`;
            toast.error(`Ítem #${i + 1}: ${msg}`);
            return;
          }
        }
      } else if (errors.items.message) {
        toast.error(errors.items.message);
        return;
      }
    }
    toast.error("Por favor, revisa los campos requeridos.");
  };

  // Descargar PDF
  const handleDescargarPDF = async () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    const biz = await getSettings();
    const logoDataUrl = biz?.logoUrl ? await toDataURL(biz.logoUrl) : await toDataURL(logoUrl);

    const doc = await generarPresupuestoPDF({
      cliente: cliente || "Cliente",
      fecha: `${yyyy}-${mm}-${dd}`,
      items: items.map((it) => {
        const unit =
          it.horas && it.tarifaHora
            ? it.horas * (it.tarifaHora || 0)
            : it.precioUnitario;
        const descText = [
          it.descripcion,
          it.marca ? `Marca: ${it.marca}` : "",
          it.modelo ? `Modelo: ${it.modelo}` : "",
          it.imeiSerie ? `IMEI/Serie: ${it.imeiSerie}` : "",
          it.garantiaValor && it.garantiaUnidad
            ? `Garantía: ${it.garantiaValor} ${it.garantiaUnidad}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ");
        return {
          descripcion: descText || "-",
          cantidad: it.cantidad || 1,
          precioUnitario: unit,
          descuentoPct: it.descuentoPct,
        };
      }),
      subtotal: t.sub,
      bonificacionPct: undefined,
      total: t.total,
      moneda: "ARS",
      logoDataUrl: logoDataUrl ?? undefined,
      sub: biz?.name || "Informática y Celulares",
      address: biz?.address || "Mendoza 4459, Paso del Rey",
      phone: biz?.phone || "11 3458 1490 (Whatsapp)",
      email: biz?.email || "ventas@sontech.com.ar",
      footerText: biz?.footerText,
      codigo,
    });

    const fname = codigo
      ? `Presupuesto-${cliente || "cliente"}-${codigo}.pdf`
      : `Presupuesto-${cliente || "cliente"}-${yyyy}${mm}${dd}.pdf`;
    doc.save(fname);
  };

  // Aceptar → crear Orden
  const handleAceptar = async () => {
    if (!editingId) {
      toast.error("Guardá el presupuesto primero.");
      return;
    }
    const aceptacion: Aceptacion = {
      nombre: cliente || "Cliente",
      metodo: "whatsapp",
      aceptadoAt: Date.now(),
    };
    const ordenId = await aceptarPresupuesto(editingId, aceptacion);
    navigate(`/orden/${ordenId}`);
  };

  const prodsFiltradosPicker = productosDb.filter((p) => {
    const q = searchPicker.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.codigo.toLowerCase().includes(q) ||
      p.categoriaNombre.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container py-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="m-0 fw-bold text-gradient">
          {isViewMode ? 'Vista de Presupuesto' : (editingId ? 'Editar Presupuesto' : 'Nuevo Presupuesto')}
          {codigo && <span className="ms-2 text-muted small fw-normal font-mono">({codigo})</span>}
        </h2>
        <button onClick={() => navigate(-1)} className="btn btn-light">
          <i className="bi bi-arrow-left me-1"></i> Volver
        </button>
      </div>

      <div className="row">
        <div className="col-lg-10 mx-auto">
          {/* El formulario estilo papel */}
          <form onSubmit={handleSubmit(onSubmit)} className="paper-container mb-4 border shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-5">
              <img src={logoUrl} alt="Sontech" width={180} />
              <div className="text-end">
                <h1 className="h3 mb-0 fw-bold text-primary">PRESUPUESTO</h1>
                <p className="text-muted mb-0 fw-bold font-mono">{codigo || 'BORRADOR PENDIENTE'}</p>
              </div>
            </div>

            <div className="row mb-5">
              <div className="col-md-7">
                <div className="bg-light p-3 border rounded">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="small fw-bold text-muted text-uppercase m-0">Datos del Cliente</label>
                    <span className="small text-muted">Escribe o selecciona de la lista</span>
                  </div>
                  <input
                    {...register("cliente")}
                    list="clientesDatalist"
                    placeholder="Nombre completo o empresa del cliente..."
                    disabled={isViewMode}
                    className={`form-control form-control-lg border-0 bg-white shadow-none ${errors.cliente ? "is-invalid" : ""}`}
                  />
                  <datalist id="clientesDatalist">
                    {clientesDb.map((c) => (
                      <option key={c.id} value={c.nombre}>
                        {c.nombre} {c.telefono ? `(${c.telefono})` : ''}
                      </option>
                    ))}
                  </datalist>
                  {errors.cliente && <div className="invalid-feedback">{(errors.cliente as any).message}</div>}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <label className="small fw-bold text-muted text-uppercase m-0">Detalle de Productos / Servicios</label>
                {!isViewMode && (
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      onClick={() => setModalProdPicker(true)}
                      className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                    >
                      <i className="bi bi-box-seam"></i>
                      <span>Desde Catálogo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => append({ id: crypto.randomUUID(), tipo: "Producto", descripcion: "", cantidad: 1, precioUnitario: 0 })}
                      className="btn btn-soft-primary btn-sm d-flex align-items-center gap-1"
                    >
                      <i className="bi bi-plus-circle"></i>
                      <span>Ítem Manual</span>
                    </button>
                  </div>
                )}
              </div>

              <ItemsTableIT
                items={items}
                register={register}
                remove={remove}
                errors={errors}
                readOnly={isViewMode}
              />
            </div>

            <div className="d-flex justify-content-end mt-5 border-top pt-4">
              <div className="text-end bg-light p-4 border rounded" style={{ minWidth: '250px' }}>
                <div className="text-muted small mb-1 fw-bold text-uppercase">Total Presupuesto</div>
                <div className="fs-2 fw-bold text-primary font-mono">${t.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <div className="text-muted x-small mt-1">IVA no incluido</div>
              </div>
            </div>
          </form>

          {/* Acciones Finales (FIJAS AL FONDO) */}
          <div className="sticky-action-bar print-hide">
            <button onClick={handleDescargarPDF} className="btn btn-soft-info" type="button">
              <i className="bi bi-file-earmark-pdf me-1"></i> Descargar PDF
            </button>

            {editingId && (
              <button
                onClick={handleAceptar}
                className="btn btn-soft-success"
                type="button"
              >
                <i className="bi bi-check2-circle me-1"></i> Aceptar Presupuesto → Generar OT
              </button>
            )}

            {!isViewMode && (
              <button
                onClick={handleSubmit(onSubmit, onInvalid)}
                className="btn btn-primary px-5"
                disabled={saving}
                type="submit"
              >
                {saving ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>
                ) : (
                  <><i className="bi bi-check-lg me-1"></i> Guardar Todo</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Selector de Productos desde Catálogo */}
      {modalProdPicker && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">Seleccionar del Catálogo de Productos y Repuestos</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalProdPicker(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar producto por nombre o código..."
                    value={searchPicker}
                    onChange={(e) => setSearchPicker(e.target.value)}
                  />
                </div>
                <div className="list-group" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {prodsFiltradosPicker.length === 0 ? (
                    <div className="text-center py-4 text-muted small">No se encontraron productos coincidentes.</div>
                  ) : (
                    prodsFiltradosPicker.map((p) => (
                      <div
                        key={p.id}
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3 cursor-pointer"
                        onClick={() => handleAddFromCatalog(p)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div>
                          <div className="fw-bold text-dark">{p.nombre}</div>
                          <div className="small text-muted font-mono">
                            SKU: {p.codigo} | Categoría: {p.categoriaNombre} | Stock: {p.stock}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold font-mono text-primary fs-6">
                            ${p.precioVenta.toLocaleString('es-AR')}
                          </div>
                          <span className="badge bg-light text-primary border small">
                            + Agregar
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setModalProdPicker(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
