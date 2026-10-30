import { useEffect, useState, useMemo } from "react";
import { listPresupuestos, anularPresupuesto } from "../services/presupuestos";
import type { PresupuestoListItem } from "../services/presupuestos";
import { aceptarPresupuesto } from "../services/flujo";
import { useNavigate } from "react-router-dom";
import type { Aceptacion } from "../types/presupuesto";
import { toast } from "react-hot-toast";

export default function Presupuestos() {
  const [pres, setPres] = useState<PresupuestoListItem[]>([]);
  const [loadingPres, setLoadingPres] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoadingPres(true);
        const { items } = await listPresupuestos({ limit: 100 });
        setPres(items);
      } catch (e) {
        console.error("Error listPresupuestos", e);
        toast.error("No se pudieron cargar los presupuestos.");
      } finally {
        setLoadingPres(false);
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
      toast.success("Presupuesto aceptado y Orden de Trabajo generada.");
      navigate(`/orden/${ordenId}`);
    } catch (e: any) {
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
      await anularPresupuesto(id, "Anulado desde listado de presupuestos");
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
      const matchSearch =
        p.cliente.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "todos" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [pres, search, statusFilter]);

  return (
    <div className="container py-3 py-md-4">
      {/* Encabezado de página */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1 font-display text-gradient">Presupuestos Comerciales</h2>
          <p className="text-muted small mb-0">
            Gestión independiente de cotizaciones, estados y exportación a PDF
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            className="btn btn-primary d-flex align-items-center justify-content-center gap-2 flex-fill flex-md-grow-0"
            onClick={() => navigate("/presupuesto-it")}
          >
            <i className="bi bi-plus-lg"></i>
            <span>Nuevo Presupuesto</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-8">
            <label className="d-block small text-muted fw-bold mb-1">BUSCAR PRESUPUESTO</label>
            <input
              type="text"
              placeholder="Nombre del cliente o código (ej: P-2026-0001)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
            />
          </div>
          <div className="col-12 col-md-4">
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

      {/* Listado de Presupuestos */}
      <div className="card">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="fs-5 m-0 fw-bold">
            Listado de Presupuestos
            <span className="badge bg-light text-muted border ms-2 font-mono">
              {filteredPres.length}
            </span>
          </h3>
        </div>

        {loadingPres ? (
          <p className="text-muted text-center py-4">Cargando presupuestos...</p>
        ) : (
          <>
            {/* Table View (Desktop) */}
            <div className="table-responsive d-none d-md-block">
              <table className="table">
                <colgroup>
                  <col style={{ width: "120px" }} />
                  <col />
                  <col style={{ width: "120px" }} />
                  <col style={{ width: "120px" }} />
                  <col style={{ width: "110px" }} />
                  <col style={{ width: "220px" }} />
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
                      <td className="fw-medium font-mono">{p.codigo || "—"}</td>
                      <td>{p.cliente}</td>
                      <td className="font-mono text-muted">{p.fecha?.slice(0, 10)}</td>
                      <td className="text-center text-nowrap font-mono">${p.total?.toFixed(2)}</td>
                      <td className="text-center">
                        <span className={`badge status-${p.status}`}>{p.status}</span>
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
                            title="Editar Presupuesto"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          {p.ordenId ? (
                            <button
                              className="btn-action btn-soft-warning"
                              onClick={() => navigate(`/orden/${p.ordenId}`)}
                              title="Ir a la Orden de Trabajo vinculada"
                            >
                              <i className="bi bi-tools"></i>
                            </button>
                          ) : (
                            <button
                              className="btn-action btn-soft-success"
                              disabled={
                                busyId === p.id ||
                                p.status === "aceptado" ||
                                p.status === "anulado"
                              }
                              onClick={() => onAceptar(p.id, p.cliente)}
                              title="Aceptar y Generar OT"
                            >
                              <i className="bi bi-check-lg"></i>
                            </button>
                          )}
                          {p.status !== "anulado" && (
                            <button
                              className="btn-action btn-soft-danger"
                              disabled={busyId === p.id}
                              onClick={() => onAnular(p.id)}
                              title="Anular Presupuesto"
                            >
                              <i className="bi bi-x-lg"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Card View (Mobile) */}
            <div className="d-md-none">
              <div className="row g-3">
                {filteredPres.map((p) => (
                  <div key={p.id} className="col-12">
                    <div className="card p-3" style={{ borderLeft: "4px solid var(--tech-accent)" }}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <span className="x-small fw-bold text-muted text-uppercase d-block font-mono">
                            {p.codigo || "BORRADOR"}
                          </span>
                          <span className="fw-bold d-block">{p.cliente}</span>
                          <span className="text-muted small font-mono">{p.fecha?.slice(0, 10)}</span>
                        </div>
                        <span className={`badge status-${p.status}`}>{p.status}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <div className="fs-5 fw-bold text-primary font-mono">${p.total?.toFixed(2)}</div>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-soft-info"
                            onClick={() => navigate(`/presupuesto-it?id=${p.id}&view=true`)}
                            title="Ver"
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-soft-primary"
                            onClick={() => onEditar(p.id)}
                            disabled={busyId === p.id}
                            title="Editar"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          {p.ordenId ? (
                            <button
                              className="btn btn-sm btn-soft-warning"
                              onClick={() => navigate(`/orden/${p.ordenId}`)}
                              title="Ver OT"
                            >
                              <i className="bi bi-tools"></i>
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-soft-success"
                              disabled={
                                busyId === p.id ||
                                p.status === "aceptado" ||
                                p.status === "anulado"
                              }
                              onClick={() => onAceptar(p.id, p.cliente)}
                              title="Generar OT"
                            >
                              <i className="bi bi-check-lg"></i>
                            </button>
                          )}
                          {p.status !== "anulado" && (
                            <button
                              className="btn btn-sm btn-soft-danger"
                              disabled={busyId === p.id}
                              onClick={() => onAnular(p.id)}
                              title="Anular"
                            >
                              <i className="bi bi-x-lg"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {filteredPres.length === 0 && (
              <p className="text-center text-muted py-4">
                {search || statusFilter !== "todos"
                  ? "No se encontraron presupuestos coincidentes."
                  : "No hay presupuestos registrados aún."}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
