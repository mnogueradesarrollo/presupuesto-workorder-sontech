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
import { aceptarPresupuesto } from "../services/flujo";
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
    cantidad: z.coerce.number().min(1),
    precioUnitario: z.coerce.number().optional(),
    horas: z.coerce.number().optional(),
    tarifaHora: z.coerce.number().optional(),
    marca: z.string().optional(),
    modelo: z.string().optional(),
    imeiSerie: z.string().optional(),
    estado: z.string().optional(),
    garantiaValor: z.coerce.number().optional(),
    garantiaUnidad: z.string().optional(),
    descuentoPct: z.coerce.number().optional(),
  })).min(1, "Debe haber al menos un ítem"),
});


export default function PresupuestoIT() {
  const [params] = useSearchParams();
  const editingId = params.get("id");
  const isViewMode = params.get("view") === "true";
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [codigo, setCodigo] = useState<string | undefined>(undefined);

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
      email: biz?.email || "sontech.sistemas@gmail.com",
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
    <>
      <div className="toolbar print-hide">
        {!isViewMode && (
          <>
            <button onClick={() => append({ id: crypto.randomUUID(), tipo: "Producto", descripcion: "", cantidad: 1, precioUnitario: 0 })} className="btn">
              + Agregar ítem
            </button>
            <button onClick={handleSubmit(onSubmit, (err) => {
              console.log("Validation Errors:", err);
              toast.error("Revisá los errores en el formulario");
            })} className="btn" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </>
        )}
        <button onClick={() => navigate(-1)} className="btn">
          ← Volver
        </button>
        <button onClick={handleDescargarPDF} className="btn">
          Descargar PDF
        </button>
        <button
          onClick={handleAceptar}
          className="btn primary"
          disabled={!editingId}
        >
          Aceptar → Orden
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card paper A4">
        <h2 className="title">
          Presupuesto IT{" "}
          {codigo ? (
            <small style={{ fontWeight: 400 }}>{`(${codigo})`}</small>
          ) : null}
        </h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginBottom: 12,
          }}
        >
          <label>
            Cliente:{" "}
            <input
              {...register("cliente")}
              disabled={isViewMode}
              className={errors.cliente ? "error" : ""}
            />
          </label>
          {errors.cliente && <span style={{ color: "red", fontSize: "0.8rem" }}>{(errors.cliente as any).message}</span>}
        </div>

        <ItemsTableIT
          items={items}
          register={register}
          remove={remove}
          errors={errors}
          readOnly={isViewMode}
        />

        <div className="right" style={{ marginTop: 12 }}>
          <div style={{ color: "#667085" }}>IVA no incluido</div>
          <strong>Total: {t.total.toFixed(2)}</strong>
        </div>
      </form>
    </>
  );
}
