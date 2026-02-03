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

  // Función para anular presupuesto (si se requiere en el futuro)
  /*
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
  */

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
    <div className="container">
      <div className="card mb-4">
        <div className="d-flex gap-3 align-items-center flex-wrap">
          <div style={{ flex: 1, minWidth: '240px' }}>
            <label className="d-block small text-muted fw-bold mb-1">BUSCAR</label>
            <input
              type="text"
              placeholder="Nombre del cliente, código o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
            />
          </div>
          <div style={{ minWidth: '200px' }}>
            <label className="d-block small text-muted fw-bold mb-1">ESTADO</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
            >
              <option value="todos">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="aceptado">Aceptado</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>
        </div>
      </div>

      {/* === Presupuestos === */}
      <div className="card mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="fs-5 m-0">Presupuestos Recientes</h2>
          <button className="btn btn-sm btn-light" onClick={() => navigate('/presupuesto-it')}>
            + Nuevo
          </button>
        </div>

        {loadingPres ? (
          <p className="text-muted text-center py-4">Cargando presupuestos...</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <colgroup>
                <col style={{ width: "110px" }} />
                <col />
                <col style={{ width: "110px" }} />
                <col style={{ width: "100px" }} />
                <col style={{ width: "100px" }} />
                <col style={{ width: "180px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th className="text-center">Total</th>
                  <th className="text-center">Estado</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPres.map((p) => (
                  <tr key={p.id}>
                    <td className="fw-medium">{p.codigo || "—"}</td>
                    <td>{p.cliente}</td>
                    <td>{p.fecha?.slice(0, 10)}</td>
                    <td className="text-center text-nowrap">${p.total?.toFixed(2)}</td>
                    <td className="text-center">
                      <span className={`badge status-${p.status}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          className="btn-action btn-soft-info"
                          onClick={() => navigate(`/presupuesto-it?id=${p.id}&view=true`)}
                          title="Ver Presupuesto"
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        <button
                          className="btn-action btn-soft-primary"
                          onClick={() => onEditar(p.id)}
                          disabled={busyId === p.id}
                          title="Editar"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn-action btn-soft-success"
                          disabled={
                            busyId === p.id ||
                            p.status === "aceptado" ||
                            p.status === "anulado"
                          }
                          onClick={() => onAceptar(p.id, p.cliente)}
                          title="Aceptar"
                        >
                          <i className="bi bi-check-lg"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPres.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center text-muted py-4"
                    >
                      {search || statusFilter !== "todos" ? "No se encontraron resultados." : "No hay presupuestos aún."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* === Órdenes === */}
      <div className="card">
        <h2 className="fs-5 mb-3">Órdenes de Trabajo</h2>
        {loadingOrd ? (
          <p className="text-muted text-center py-4">Cargando órdenes...</p>
        ) : (
          <div className="table-responsive">
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
                  <th className="text-center">Estado</th>
                  <th className="text-center">Pago</th>
                  <th className="text-center">Total</th>
                  <th className="text-center">Pagado</th>
                  <th className="text-center">Saldo</th>
                  <th className="right"></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrds.map((o) => (
                  <tr key={o.id}>
                    <td className="fw-medium">{o.codigo || o.id.slice(0, 8)}</td>
                    <td>{o.cliente}</td>
                    <td className="text-center">
                      <span className={`badge status-${o.status}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`badge pay-${o.payStatus}`}>
                        {o.payStatus}
                      </span>
                    </td>
                    <td className="text-center text-nowrap">${(o.totalFinal ?? o.totalEstimado ?? 0).toFixed(2)}</td>
                    <td className="text-center text-nowrap">${(o.pagado ?? 0).toFixed(2)}</td>
                    <td className="text-center text-nowrap" style={{ color: (o.saldo ?? 0) > 0 ? 'var(--red-600, #dc2626)' : 'inherit', fontWeight: 'bold' }}>
                      ${(o.saldo ?? 0).toFixed(2)}
                    </td>
                    <td className="right">
                      <button
                        className="btn btn-sm btn-soft-primary border-0"
                        onClick={() => navigate(`/orden/${o.id}`)}
                      >
                        <i className="bi bi-folder2-open me-1"></i> Abrir
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOrds.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center text-muted py-4"
                    >
                      {search ? "No se encontraron órdenes." : "No hay órdenes todavía."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
