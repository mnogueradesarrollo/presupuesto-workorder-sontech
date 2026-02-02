import { useEffect, useState, useMemo } from "react";
import { listPresupuestos, anularPresupuesto } from "../services/presupuestos";
import type { PresupuestoListItem } from "../services/presupuestos";
import { aceptarPresupuesto } from "../services/flujo";
import { listOrdenes } from "../services/ordenes";
import type { OrdenListItem } from "../services/ordenes";
import { useNavigate } from "react-router-dom";
import type { Aceptacion } from "../types/presupuesto";
import { toast } from "react-hot-toast";

export default function Home() {
  const [pres, setPres] = useState<PresupuestoListItem[]>([]);
  const [ords, setOrds] = useState<OrdenListItem[]>([]);
  const [loadingPres, setLoadingPres] = useState(true);
  const [loadingOrd, setLoadingOrd] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null); // id con acción en curso
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoadingPres(true);
        const { items } = await listPresupuestos({ limit: 50 });
        setPres(items);
      } catch (e) {
        console.error("Error listPresupuestos", e);
        toast.error("No se pudieron cargar los presupuestos.");
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
        toast.error("No se pudo aceptar el presupuesto.");
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
      toast.success("Presupuesto anulado correctamente.");
    } catch (e) {
      console.error("Error anularPresupuesto", e);
      toast.error("No se pudo anular el presupuesto.");
    } finally {
      setBusyId(null);
    }
  };

  const filteredPres = useMemo(() => {
    return pres.filter((p) => {
      const matchSearch = p.cliente.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "todos" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [pres, search, statusFilter]);

  const filteredOrds = useMemo(() => {
    return ords.filter((o) => {
      const matchSearch =
        o.cliente.toLowerCase().includes(search.toLowerCase()) ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.codigo?.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [ords, search]);

  return (
    <div className="container" style={{ padding: 0 }}>
      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Buscar cliente o código</label>
          <input
            type="text"
            placeholder="Ej: Juan Perez o A-001..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Estado Presupuesto</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'white' }}
          >
            <option value="todos">Todos los estados</option>
            <option value="borrador">Borrador</option>
            <option value="aceptado">Aceptado</option>
            <option value="anulado">Anulado</option>
          </select>
        </div>
      </div>

      {/* === Presupuestos === */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="title">Presupuestos</h2>
        {loadingPres ? (
          <p>Cargando…</p>
        ) : (
          <table className="table">
            <colgroup>
              <col style={{ width: "110px" }} />
              <col />
              <col style={{ width: "110px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "240px" }} />
            </colgroup>
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
              {filteredPres.map((p) => (
                <tr key={p.id}>
                  <td>{p.codigo || "—"}</td>
                  <td>{p.cliente}</td>
                  <td>{p.fecha?.slice(0, 10)}</td>
                  <td className="right">${p.total?.toFixed(2)}</td>
                  <td>
                    <span className={`badge status-${p.status}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="right">
                    <button
                      className="btn btn-sm"
                      onClick={() => navigate(`/presupuesto-it?id=${p.id}&view=true`)}
                      title="Ver Presupuesto"
                    >
                      👁️
                    </button>{" "}
                    <button
                      className="btn btn-sm"
                      onClick={() => onEditar(p.id)}
                      disabled={busyId === p.id}
                      title="Editar"
                    >
                      ✏️
                    </button>{" "}
                    <button
                      className="btn btn-sm"
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
                      className="btn btn-sm"
                      disabled={busyId === p.id || p.status === "anulado"}
                      onClick={() => onAnular(p.id)}
                    >
                      Anular
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPres.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: "center", color: "#666" }}
                  >
                    {search || statusFilter !== "todos" ? "No se encontraron resultados." : "No hay presupuestos aún."}
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
            <colgroup>
              <col style={{ width: "100px" }} />
              <col />
              <col style={{ width: "110px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "80px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Orden</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Pago</th>
                <th className="right">Total</th>
                <th className="right">Pagado</th>
                <th className="right">Saldo</th>
                <th className="right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrds.map((o) => (
                <tr key={o.id}>
                  <td>{o.codigo || o.id.slice(0, 8)}</td>
                  <td>{o.cliente}</td>
                  <td>
                    <span className={`badge status-${o.status}`}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge pay-${o.payStatus}`}>
                      {o.payStatus}
                    </span>
                  </td>
                  <td className="right">${(o.totalFinal ?? o.totalEstimado ?? 0).toFixed(2)}</td>
                  <td className="right">${(o.pagado ?? 0).toFixed(2)}</td>
                  <td className="right" style={{ color: (o.saldo ?? 0) > 0 ? 'red' : 'green', fontWeight: 'bold' }}>
                    ${(o.saldo ?? 0).toFixed(2)}
                  </td>
                  <td className="right">
                    <button
                      className="btn btn-sm"
                      onClick={() => navigate(`/orden/${o.id}`)}
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
              {filteredOrds.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: "center", color: "#666" }}
                  >
                    {search ? "No se encontraron órdenes." : "No hay órdenes todavía."}
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
