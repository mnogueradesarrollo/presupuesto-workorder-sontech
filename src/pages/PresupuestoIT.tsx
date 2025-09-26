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
import logoUrl from "../assets/logotipo-sontech.png";

export default function PresupuestoIT() {
  const [params] = useSearchParams();
  const editingId = params.get("id");

  const [items, setItems] = useState<ItemPresupuesto[]>([
    {
      id: crypto.randomUUID(),
      tipo: "Producto",
      descripcion: "",
      cantidad: 1,
      precioUnitario: 0,
    },
  ]);
  const [cliente, setCliente] = useState("");
  const [saving, setSaving] = useState(false);
  const [codigo, setCodigo] = useState<string | undefined>(undefined);

  const navigate = useNavigate();

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
      setItems(p.items || []);
      setCliente(p.cliente || "");
      setCodigo(p.codigo);
    })();
  }, [editingId]);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        tipo: "Producto",
        descripcion: "",
        cantidad: 1,
        precioUnitario: 0,
      },
    ]);

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  // Guardar (crear o actualizar)
  const handleGuardar = async () => {
    if (!cliente.trim()) {
      alert("Ingresá el cliente");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updatePresupuesto(editingId, {
          cliente,
          items,
          total: t.total,
          fecha: new Date().toISOString(),
          ivaPct: 0,
        } as Partial<Presupuesto>);
        alert("Presupuesto actualizado.");
      } else {
        const { id, codigo } = await crearPresupuesto({
          cliente,
          fecha: new Date().toISOString(),
          moneda: "ARS",
          items,
          ivaPct: 0,
          notas: "",
          total: t.total,
        });
        setCodigo(codigo);
        navigate(`/presupuesto-it?id=${id}`);
      }
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
    const logoDataUrl = await toDataURL(logoUrl);

    const doc = await generarPresupuestoPDF({
      cliente: cliente || "Cliente",
      fecha: `${yyyy}-${mm}-${dd}`,
      items: itemsPdf,
      total: t.total,
      moneda: "ARS",
      logoDataUrl: logoDataUrl ?? undefined,
      sub: "Informática y Celulares",
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
      alert("Guardá el presupuesto primero.");
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
        <button onClick={addItem} className="btn">
          + Agregar ítem
        </button>
        <button onClick={handleGuardar} className="btn">
          {saving ? "Guardando…" : "Guardar"}
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

      <div className="card paper A4">
        <h2 className="title">
          Presupuesto IT{" "}
          {codigo ? (
            <small style={{ fontWeight: 400 }}>{`(${codigo})`}</small>
          ) : null}
        </h2>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <label>
            Cliente:{" "}
            <input
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
            />
          </label>
        </div>

        <ItemsTableIT
          items={items}
          onChange={setItems}
          onRemoveItem={removeItem}
        />

        <div className="right" style={{ marginTop: 12 }}>
          <div style={{ color: "#667085" }}>IVA no incluido</div>
          <strong>Total: {t.total.toFixed(2)}</strong>
        </div>
      </div>
    </>
  );
}
