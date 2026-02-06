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
import { generarPresupuestoPDF, toDataURL } from "../lib/pdf";
import { getSettings } from "../services/settings";
import { toast } from "react-hot-toast";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import logoUrl from "../assets/logotipo-sontech.png";

const schema = z.object({
  cliente: z.string().min(1, "El cliente es obligatorio"),
  items: z.array(z.object({
    id: z.string(),
    tipo: z.enum(["Producto", "Servicio", "Reparación"]),
    descripcion: z.string().min(1, "La descripción es necesaria"),
    cantidad: z.coerce.number().min(1, "La cantidad debe ser al menos 1"),
    precioUnitario: z.preprocess((val) => val === "" ? undefined : val, z.coerce.number().optional()),
    horas: z.preprocess((val) => val === "" ? undefined : val, z.coerce.number().optional()),
    tarifaHora: z.preprocess((val) => val === "" ? undefined : val, z.coerce.number().optional()),
    marca: z.preprocess((val) => val === "" ? undefined : val, z.string().optional()),
    modelo: z.preprocess((val) => val === "" ? undefined : val, z.string().optional()),
    imeiSerie: z.preprocess((val) => val === "" ? undefined : val, z.string().optional()),
    estado: z.preprocess((val) => val === "" ? undefined : val, z.string().optional()),
    garantiaValor: z.preprocess((val) => val === "" ? undefined : val, z.coerce.number().optional()),
    garantiaUnidad: z.string().optional(),
    descuentoPct: z.preprocess((val) => val === "" ? undefined : val, z.coerce.number().optional()),
  })).min(1, "Debe haber al menos un ítem"),
});


export default function PresupuestoIT() {
  const [params] = useSearchParams();
  const editingId = params.get("id");
  const isViewMode = params.get("view") === "true";
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [codigo, setCodigo] = useState<string | undefined>(undefined);
  const [currentOrdenId, setCurrentOrdenId] = useState<string | undefined>(undefined);

  const { register, control, handleSubmit, watch, reset, formState: { errors } } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      cliente: "",
      items: [{
        id: crypto.randomUUID(),
        tipo: "Producto",
        descripcion: "",
        cantidad: 1,
        precioUnitario: 0,
      }]
    }
  });

  const { append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const items = watch("items") as ItemPresupuesto[];
  const cliente = watch("cliente");

  // SIN IVA por ahora
  const t = totals({
    items,
    ivaPct: 0,
    recargoTarjetaPct: undefined,
    bonificacionPct: undefined,
  });

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

  const onSubmit = async (data: any) => {
    console.log("Submitting Data:", data);
    setSaving(true);
    try {
      if (editingId) {
        await updatePresupuesto(editingId, {
          cliente: data.cliente,
          items: data.items as ItemPresupuesto[],
          total: t.total,
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
          items: data.items as ItemPresupuesto[],
          ivaPct: 0,
          notas: "",
          total: t.total,
        });
        setCodigo(newCodigo);
        toast.success("Presupuesto creado.");
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
    console.log("Validation Errors:", errors);
    if (errors.cliente) {
      toast.error("El nombre del cliente es obligatorio.");
    } else if (errors.items) {
      if (Array.isArray(errors.items)) {
        toast.error("Revisa la descripción de los productos.");
      } else {
        toast.error("Debes agregar al menos un producto.");
      }
    } else {
      toast.error("Por favor, revisa los campos obligatorios.");
    }
  };

  // Descargar PDF (usa código si existe)
  const handleDescargarPDF = async () => {
    const itemsPdf = items.map((it) => {
      const unit =
        it.horas && it.tarifaHora
          ? it.horas * (it.tarifaHora || 0)
          : it.precioUnitario;
      const desc = [
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
        descripcion: desc || "-",
        cantidad: it.cantidad || 1,
        precioUnitario: unit,
      };
    });

    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    // Intentar obtener ajustes del negocio
    const biz = await getSettings();
    const logoDataUrl = biz?.logoUrl ? await toDataURL(biz.logoUrl) : await toDataURL(logoUrl);

    const doc = await generarPresupuestoPDF({
      cliente: cliente || "Cliente",
      fecha: `${yyyy}-${mm}-${dd}`,
      items: itemsPdf,
      total: t.total,
      moneda: "ARS",
      logoDataUrl: logoDataUrl ?? undefined,
      sub: biz?.name || "Informática y Celulares",
      address: biz?.address || "Mendoza 4459, Paso del Rey",
      phone: biz?.phone || "11 3458 1490 (Whatsapp)",
      email: biz?.email || "ventas@sontech.com.ar",
      footerText: biz?.footerText,
      codigo, // << acá va el código para imprimirse en el título del PDF
    });

    const fname = codigo
      ? `Presupuesto-${cliente || "cliente"}-${codigo}.pdf`
      : `Presupuesto-${cliente || "cliente"}-${yyyy}${mm}${dd}.pdf`;
    doc.save(fname);
  };

  // Aceptar → crear Orden (mejor hacerlo desde Home, pero lo dejo por si lo usás)
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

  return (
    <div className="container py-5">
      {/* Header de la Página */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="m-0 fw-bold text-gradient">
          {isViewMode ? 'Vista de Presupuesto' : (editingId ? 'Editar Presupuesto' : 'Nuevo Presupuesto')}
          {codigo && <span className="ms-2 text-muted small fw-normal">({codigo})</span>}
        </h2>
        <button onClick={() => navigate(-1)} className="btn btn-light">
          <i className="bi bi-arrow-left me-1"></i> Volver
        </button>
      </div>

      <div className="row">
        <div className="col-lg-9 mx-auto">
          {/* El formulario estilo papel */}
          <form onSubmit={handleSubmit(onSubmit)} className="paper-container mb-4 shadow-lg">
            <div className="d-flex justify-content-between align-items-center mb-5">
              <img src={logoUrl} alt="Sontech" width={200} />
              <div className="text-end">
                <h1 className="h3 mb-0 fw-bold text-primary">PRESUPUESTO</h1>
                <p className="text-muted mb-0 fw-bold">{codigo || 'BORRADOR PENDIENTE'}</p>
              </div>
            </div>

            <div className="row mb-5">
              <div className="col-md-7">
                <div className="bg-light p-3 rounded-3">
                  <label className="small fw-bold text-muted mb-2 d-block text-uppercase">Datos del Cliente</label>
                  <input
                    {...register("cliente")}
                    placeholder="Nombre completo del cliente..."
                    disabled={isViewMode}
                    className={`form-control form-control-lg border-0 bg-white ${errors.cliente ? "is-invalid" : ""}`}
                  />
                  {errors.cliente && <div className="invalid-feedback">{(errors.cliente as any).message}</div>}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <label className="small fw-bold text-muted text-uppercase m-0">Detalle de Productos / Servicios</label>
                {!isViewMode && (
                  <button
                    type="button"
                    onClick={() => append({ id: crypto.randomUUID(), tipo: "Producto", descripcion: "", cantidad: 1, precioUnitario: 0 })}
                    className="btn btn-soft-primary btn-sm"
                  >
                    <i className="bi bi-plus-circle me-1"></i> Agregar Ítem
                  </button>
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
              <div className="text-end bg-light p-4 rounded-3" style={{ minWidth: '250px' }}>
                <div className="text-muted small mb-1 fw-bold text-uppercase">Total Presupuesto</div>
                <div className="fs-2 fw-bold text-primary">${t.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <div className="text-muted x-small mt-1">IVA no incluido</div>
              </div>
            </div>
          </form>

          {/* Acciones Finales (FIJAS AL FONDO) */}
          <div className="sticky-action-bar print-hide">
            <button onClick={handleDescargarPDF} className="btn btn-soft-info">
              <i className="bi bi-file-earmark-pdf me-1"></i> Descargar PDF
            </button>

            {editingId && (
              <button
                onClick={handleAceptar}
                className="btn btn-soft-success"
              >
                <i className="bi bi-check2-circle me-1"></i> Aceptar Presupuesto
              </button>
            )}

            {!isViewMode && (
              <button
                onClick={handleSubmit(onSubmit, onInvalid)}
                className="btn btn-primary px-5"
                disabled={saving}
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
    </div>
  );
}
