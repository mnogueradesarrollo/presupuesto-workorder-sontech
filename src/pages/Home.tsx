import { useEffect, useState } from "react";
import { listPresupuestos, anularPresupuesto } from "../services/presupuestos";
import type { PresupuestoListItem } from "../services/presupuestos";
import { aceptarPresupuesto } from "../services/flujo";
import { listOrdenes } from "../services/ordenes";
import type { OrdenListItem } from "../services/ordenes";
import { useNavigate } from "react-router-dom";
import type { Aceptacion } from "../types/presupuesto";

export default function Home() {
  const [pres, setPres] = useState<PresupuestoListItem[]>([]);
  const [ords, setOrds] = useState<OrdenListItem[]>([]);
  const [loadingPres, setLoadingPres] = useState(true);
  const [loadingOrd, setLoadingOrd] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null); // id con acción en curso
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoadingPres(true);
        const { items } = await listPresupuestos({ limit: 50 });
        setPres(items);
      } catch (e) {
        console.error("Error listPresupuestos", e);
        alert("No pude cargar los presupuestos. Revisá la consola.");
      } finally {
        setLoadingPres(false);
      }
    })();

    (async () => {
      try {
        setLoadingOrd(true);
        const { items } = await listOrdenes({ limit: 50 });
        setOrds(items);
      } catch (e) {
        console.error("Error listOrdenes", e);
      } finally {
        setLoadingOrd(false);
      }
    })();
  }, []);

  const onEditar = (id: string) => navigate(`/presupuesto-it?id=${id}`);

  const onAceptar = async (id: string, cliente: string) => {
    const aceptacion: Aceptacion = {
      nombre: cliente || "Cliente",
      metodo: "whatsapp",
      aceptadoAt: Date.now(),
    };
    try {
      setBusyId(id);
      const ordenId = await aceptarPresupuesto(id, aceptacion);
      navigate(`/orden/${ordenId}`);
    } catch (e: any) {
      // si el service informó que ya estaba aceptado, redirigimos a esa orden
      if (e?.redirectedOrdenId) {
        navigate(`/orden/${e.redirectedOrdenId}`);
      } else {
        console.error("Error aceptarPresupuesto", e);
        alert("No pude aceptar el presupuesto. Revisá la consola.");
      }
    } finally {
      setBusyId(null);
    }
  };

  const onAnular = async (id: string) => {
    if (!confirm("¿Anular este presupuesto?")) return;
    try {
      setBusyId(id);
      await anularPresupuesto(id, "Anulado desde Home");
      setPres((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "anulado" } : p))
      );
    } catch (e) {
      console.error("Error anularPresupuesto", e);
      alert("No pude anular el presupuesto. Revisá la consola.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="container" style={{ padding: 0 }}>
      {/* === Presupuestos === */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="title">Presupuestos</h2>
        {loadingPres ? (
          <p>Cargando…</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th className="right">Total</th>
                <th>Estado</th>
                <th className="right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pres.map((p) => (
                <tr key={p.id}>
                  <td>{p.codigo || "—"}</td>
                  <td>{p.cliente}</td>
                  <td>{p.fecha?.slice(0, 10)}</td>
                  <td className="right">{p.total?.toFixed(2)}</td>
                  <td>{p.status}</td>
                  <td className="right">
                    <button
                      className="btn"
                      onClick={() => onEditar(p.id)}
                      disabled={busyId === p.id}
                    >
                      Editar
                    </button>{" "}
                    <button
                      className="btn"
                      disabled={
                        busyId === p.id ||
                        p.status === "aceptado" ||
                        p.status === "anulado"
                      }
                      onClick={() => onAceptar(p.id, p.cliente)}
                    >
                      Aceptar
                    </button>{" "}
                    <button
                      className="btn"
                      disabled={busyId === p.id || p.status === "anulado"}
                      onClick={() => onAnular(p.id)}
                    >
                      Anular
                    </button>
                  </td>
                </tr>
              ))}
              {pres.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: "center", color: "#666" }}
                  >
                    No hay presupuestos aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* === Órdenes === */}
      <div className="card">
        <h2 className="title">Órdenes de trabajo</h2>
        {loadingOrd ? (
          <p>Cargando…</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Pago</th>
                <th className="right">Saldo</th>
                <th className="right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ords.map((o) => (
                <tr key={o.id}>
                  <td>{o.id.slice(0, 7)}…</td>
                  <td>{o.cliente}</td>
                  <td>{o.status}</td>
                  <td>{o.payStatus}</td>
                  <td className="right">{(o.saldo ?? 0).toFixed(2)}</td>
                  <td className="right">
                    <button
                      className="btn"
                      onClick={() => navigate(`/orden/${o.id}`)}
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
              {ords.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: "center", color: "#666" }}
                  >
                    No hay órdenes todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
