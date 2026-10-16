import { useEffect, useState, useMemo } from "react";
import { crearOrdenDirecta } from "../services/flujo";
import { listOrdenes } from "../services/ordenes";
import type { OrdenListItem } from "../services/ordenes";
import { listClientes } from "../services/clientes";
import type { Cliente } from "../types/cliente";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

export default function Home() {
  const [ords, setOrds] = useState<OrdenListItem[]>([]);
  const [clientesDb, setClientesDb] = useState<Cliente[]>([]);
  const [loadingOrd, setLoadingOrd] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [payFilter, setPayFilter] = useState("todos");
  const navigate = useNavigate();

  // Modal Nueva Orden Directa
  const [showNuevaModal, setShowNuevaModal] = useState(false);
  const [creatingOrd, setCreatingOrd] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [equipoTipo, setEquipoTipo] = useState("Notebook");
  const [equipoMarca, setEquipoMarca] = useState("");
  const [equipoModelo, setEquipoModelo] = useState("");
  const [equipoSerie, setEquipoSerie] = useState("");
  const [equipoPass, setEquipoPass] = useState("");
  const [fallaInicial, setFallaInicial] = useState("");
  const [presupuestoInicial, setPresupuestoInicial] = useState<string>("");

  const cargarOrdenes = async () => {
    try {
      setLoadingOrd(true);
      const { items } = await listOrdenes({ limit: 100 });
      setOrds(items);
    } catch (e) {
      console.error("Error listOrdenes", e);
      toast.error("No se pudieron cargar las órdenes de trabajo.");
    } finally {
      setLoadingOrd(false);
    }
  };

  useEffect(() => {
    cargarOrdenes();
    listClientes(200)
      .then(setClientesDb)
      .catch((e) => console.error("Error listClientes", e));
  }, []);

  const handleClienteChange = (val: string) => {
    setNuevoCliente(val);
    const match = clientesDb.find(
      (c) => c.nombre.toLowerCase() === val.trim().toLowerCase()
    );
    if (match && match.telefono && !nuevoTelefono) {
      setNuevoTelefono(match.telefono);
    }
  };

  const handleCrearOrden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCliente.trim()) {
      toast.error("El nombre del cliente es obligatorio");
      return;
    }

    setCreatingOrd(true);
    try {
      const montoBase = Number(presupuestoInicial) || 0;
      const { id, codigo } = await crearOrdenDirecta({
        cliente: nuevoCliente.trim(),
        clienteTelefono: nuevoTelefono.trim() || undefined,
        equipo: {
          tipo: equipoTipo || undefined,
          marca: equipoMarca.trim() || undefined,
          modelo: equipoModelo.trim() || undefined,
          imeiSerie: equipoSerie.trim() || undefined,
          pass: equipoPass.trim() || undefined,
        },
        checkin: fallaInicial.trim()
          ? {
              estadoEstetico: "",
              accesoriosRecibidos: [],
              fallaDeclarada: fallaInicial.trim(),
              comportamientoInicial: "",
            }
          : undefined,
        diagnostico: fallaInicial.trim() || "",
        totalEstimado: montoBase,
        totalFinal: montoBase,
        saldo: montoBase,
      });

      toast.success(`Orden ${codigo} creada correctamente`);
      setShowNuevaModal(false);
      navigate(`/orden/${id}`);
    } catch (err) {
      console.error("Error crearOrdenDirecta", err);
      toast.error("No se pudo crear la orden de trabajo");
    } finally {
      setCreatingOrd(false);
    }
  };

  const handleEliminarOrden = async (id: string, codigo?: string) => {
    if (
      !confirm(
        `¿Seguro que deseas eliminar la Orden de Trabajo ${codigo || id.slice(0, 8)}?`
      )
    ) {
      return;
    }
    try {
      await deleteDoc(doc(db, "ordenes", id));
      setOrds((prev) => prev.filter((o) => o.id !== id));
      toast.success("Orden eliminada");
    } catch (e) {
      console.error("Error al eliminar orden:", e);
      toast.error("No se pudo eliminar la orden");
    }
  };

  const filteredOrds = useMemo(() => {
    const q = search.toLowerCase();
    return ords.filter((o) => {
      const equipoStr = `${o.equipo?.marca || ""} ${o.equipo?.modelo || ""} ${
        o.equipo?.imeiSerie || ""
      }`.toLowerCase();
      const matchSearch =
        o.cliente.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        (o.codigo?.toLowerCase().includes(q) ?? false) ||
        equipoStr.includes(q);
      const matchStatus =
        statusFilter === "todos" || o.status === statusFilter;
      const matchPay = payFilter === "todos" || o.payStatus === payFilter;
      return matchSearch && matchStatus && matchPay;
    });
  }, [ords, search, statusFilter, payFilter]);

  return (
    <div className="container">
      {/* Encabezado */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1 font-display text-gradient">
            Órdenes de Trabajo (OT)
          </h2>
          <p className="text-muted small mb-0">
            Gestión de taller, diagnóstico, repuestos, estados y cobranzas de órdenes
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/beneficios-promo")}
            className="btn btn-outline-success fw-semibold d-inline-flex align-items-center gap-1"
          >
            <i className="bi bi-gift-fill"></i>
            <span>Turnero & Promo Limpieza</span>
          </button>
          <button
            type="button"
            onClick={() => setShowNuevaModal(true)}
            className="btn btn-primary d-inline-flex align-items-center gap-2"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Nueva Orden de Trabajo</span>
          </button>
        </div>
      </div>

      {/* Filtros de Órdenes */}
      <div className="card mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-6">
            <label className="d-block small text-muted fw-bold mb-1">
              BUSCAR ORDEN
            </label>
            <input
              type="text"
              placeholder="Cliente, código OT, marca, modelo o serie/IMEI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="d-block small text-muted fw-bold mb-1">
              ESTADO TALLER
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendiente (Ingresado)</option>
              <option value="en_progreso">En Diagnóstico / Banco</option>
              <option value="esperando_repuestos">Esperando Repuestos</option>
              <option value="pausado">Pausado</option>
              <option value="completado">Completado</option>
              <option value="entregado">Entregado</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <label className="d-block small text-muted fw-bold mb-1">
              ESTADO DE PAGO
            </label>
            <select
              value={payFilter}
              onChange={(e) => setPayFilter(e.target.value)}
              className="form-control"
            >
              <option value="todos">Todos los pagos</option>
              <option value="impago">Impago</option>
              <option value="parcial">Parcial</option>
              <option value="pagado">Pagado</option>
            </select>
          </div>
        </div>
      </div>

      {/* === Órdenes === */}
      <div className="card">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h3 className="fs-5 mb-0 fw-bold">
            Listado de Órdenes
            <span className="badge bg-light text-muted border ms-2 font-mono">
              {filteredOrds.length}
            </span>
          </h3>
        </div>
        {loadingOrd ? (
          <p className="text-muted text-center py-4">Cargando órdenes...</p>
        ) : (
          <>
            {/* Table View (Desktop) */}
            <div className="table-responsive d-none d-md-block">
              <table className="table">
                <colgroup>
                  <col style={{ width: "115px" }} />
                  <col />
                  <col />
                  <col style={{ width: "120px" }} />
                  <col style={{ width: "95px" }} />
                  <col style={{ width: "95px" }} />
                  <col style={{ width: "95px" }} />
                  <col style={{ width: "95px" }} />
                  <col style={{ width: "150px" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Cliente</th>
                    <th>Equipo</th>
                    <th className="text-center">Estado</th>
                    <th className="text-center">Pago</th>
                    <th className="text-center">Total</th>
                    <th className="text-center">Pagado</th>
                    <th className="text-center">Saldo</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrds.map((o) => {
                    const equipoLabel = [o.equipo?.marca, o.equipo?.modelo]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <tr key={o.id}>
                        <td className="fw-medium font-mono">
                          {o.codigo || o.id.slice(0, 8)}
                        </td>
                        <td>
                          <span className="fw-semibold">{o.cliente}</span>
                          {o.esBeneficioPromo && (
                            <span className="badge bg-success-subtle text-success border border-success-subtle ms-2 x-small">
                              <i className="bi bi-gift-fill me-1"></i>Promo Limpieza
                            </span>
                          )}
                        </td>
                        <td>
                          {equipoLabel ? (
                            <div>
                              <span className="small fw-semibold">{equipoLabel}</span>
                              {o.equipo?.imeiSerie && (
                                <span className="d-block x-small text-muted font-mono">
                                  SN: {o.equipo.imeiSerie}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          <span className={`badge status-${o.status}`}>
                            {o.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className={`badge pay-${o.payStatus}`}>
                            {o.payStatus}
                          </span>
                        </td>
                        <td className="text-center text-nowrap font-mono">
                          ${(o.totalFinal ?? o.totalEstimado ?? 0).toFixed(2)}
                        </td>
                        <td className="text-center text-nowrap font-mono">
                          ${(o.pagado ?? 0).toFixed(2)}
                        </td>
                        <td
                          className="text-center text-nowrap font-mono"
                          style={{
                            color: (o.saldo ?? 0) > 0 ? "var(--danger)" : "inherit",
                            fontWeight: "bold",
                          }}
                        >
                          ${(o.saldo ?? 0).toFixed(2)}
                        </td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            <button
                              className="btn btn-sm btn-soft-primary border-0"
                              onClick={() => navigate(`/orden/${o.id}`)}
                              title="Editar / Abrir Ficha de Orden"
                            >
                              <i className="bi bi-pencil-square me-1"></i> Editar
                            </button>
                            <a
                              href={`/seguimiento/${o.codigo || o.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm btn-soft-info border-0"
                              title="Ver Portal de Seguimiento del Cliente"
                            >
                              <i className="bi bi-eye"></i>
                            </a>
                            <button
                              className="btn btn-sm btn-soft-danger border-0"
                              onClick={() => handleEliminarOrden(o.id, o.codigo)}
                              title="Eliminar Orden"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Card View (Mobile) */}
            <div className="d-md-none">
              <div className="row g-3">
                {filteredOrds.map((o) => {
                  const equipoLabel = [o.equipo?.marca, o.equipo?.modelo]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <div key={o.id} className="col-12">
                      <div
                        className="card p-3"
                        style={{
                          borderLeft: o.esBeneficioPromo
                            ? "4px solid var(--success)"
                            : "4px solid var(--warning)",
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <span className="x-small fw-bold text-muted text-uppercase d-block font-mono">
                              {o.codigo || o.id.slice(0, 8)}
                            </span>
                            <span className="fw-bold d-block">{o.cliente}</span>
                            {equipoLabel && (
                              <span className="small text-muted d-block">
                                <i className="bi bi-laptop me-1"></i>
                                {equipoLabel}
                              </span>
                            )}
                            {o.esBeneficioPromo && (
                              <span className="badge bg-success-subtle text-success border border-success-subtle mt-1 x-small">
                                <i className="bi bi-gift-fill me-1"></i>Promo Limpieza
                              </span>
                            )}
                          </div>
                          <div className="d-flex flex-column align-items-end gap-1">
                            <span className={`badge status-${o.status}`}>
                              {o.status.replace("_", " ")}
                            </span>
                            <span className={`badge pay-${o.payStatus} x-small`}>
                              {o.payStatus}
                            </span>
                          </div>
                        </div>
                        <div className="row g-2 my-2 py-2 border-top border-bottom">
                          <div className="col-4 text-center">
                            <span className="x-small text-muted d-block text-uppercase">
                              Total
                            </span>
                            <span className="small fw-bold font-mono">
                              ${(o.totalFinal ?? o.totalEstimado ?? 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="col-4 text-center border-start border-end">
                            <span className="x-small text-muted d-block text-uppercase">
                              Pagado
                            </span>
                            <span className="small fw-bold text-success font-mono">
                              ${(o.pagado ?? 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="col-4 text-center">
                            <span className="x-small text-muted d-block text-uppercase">
                              Saldo
                            </span>
                            <span className="small fw-bold text-danger font-mono">
                              ${(o.saldo ?? 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="d-flex gap-2 mt-2">
                          <button
                            className="btn btn-primary btn-sm flex-grow-1"
                            onClick={() => navigate(`/orden/${o.id}`)}
                          >
                            <i className="bi bi-pencil-square me-2"></i> Editar / Abrir OT
                          </button>
                          <button
                            className="btn btn-soft-danger btn-sm"
                            onClick={() => handleEliminarOrden(o.id, o.codigo)}
                            title="Eliminar Orden"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {filteredOrds.length === 0 && (
              <p className="text-center text-muted py-4">
                {search || statusFilter !== "todos" || payFilter !== "todos"
                  ? "No se encontraron órdenes con esos filtros."
                  : "No hay órdenes de trabajo registradas todavía."}
              </p>
            )}
          </>
        )}
      </div>

      {/* Modal Crear Nueva Orden de Trabajo Directa */}
      {showNuevaModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.65)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-tools me-2 text-primary"></i>
                  Nueva Orden de Trabajo Directa
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowNuevaModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCrearOrden}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12 col-md-7">
                      <label className="form-label small fw-bold text-uppercase text-muted">
                        Cliente *
                      </label>
                      <input
                        type="text"
                        list="clientesOtDatalist"
                        className="form-control"
                        placeholder="Nombre del cliente o empresa..."
                        value={nuevoCliente}
                        onChange={(e) => handleClienteChange(e.target.value)}
                        required
                      />
                      <datalist id="clientesOtDatalist">
                        {clientesDb.map((c) => (
                          <option key={c.id} value={c.nombre}>
                            {c.nombre} {c.telefono ? `(${c.telefono})` : ""}
                          </option>
                        ))}
                      </datalist>
                    </div>
                    <div className="col-12 col-md-5">
                      <label className="form-label small fw-bold text-uppercase text-muted">
                        Teléfono / WhatsApp
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej: 11 2345 6789"
                        value={nuevoTelefono}
                        onChange={(e) => setNuevoTelefono(e.target.value)}
                      />
                    </div>

                    <div className="col-6 col-md-3">
                      <label className="form-label small fw-bold text-uppercase text-muted">
                        Tipo de Equipo
                      </label>
                      <select
                        className="form-select"
                        value={equipoTipo}
                        onChange={(e) => setEquipoTipo(e.target.value)}
                      >
                        <option value="Notebook">Notebook</option>
                        <option value="PC / Desktop">PC / Desktop</option>
                        <option value="Celular">Celular</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Consola">Consola</option>
                        <option value="Monitor / Periférico">Monitor / Periférico</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="form-label small fw-bold text-uppercase text-muted">
                        Marca
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej: Lenovo, Samsung..."
                        value={equipoMarca}
                        onChange={(e) => setEquipoMarca(e.target.value)}
                      />
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="form-label small fw-bold text-uppercase text-muted">
                        Modelo
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej: ThinkPad T480"
                        value={equipoModelo}
                        onChange={(e) => setEquipoModelo(e.target.value)}
                      />
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="form-label small fw-bold text-uppercase text-muted">
                        N° Serie / IMEI
                      </label>
                      <input
                        type="text"
                        className="form-control font-mono"
                        placeholder="SN / IMEI"
                        value={equipoSerie}
                        onChange={(e) => setEquipoSerie(e.target.value)}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold text-uppercase text-muted">
                        Clave / PIN / Patrón de desbloqueo
                      </label>
                      <input
                        type="text"
                        className="form-control font-mono"
                        placeholder="Opcional"
                        value={equipoPass}
                        onChange={(e) => setEquipoPass(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold text-uppercase text-muted">
                        Importe Base Estimado ($)
                      </label>
                      <input
                        type="number"
                        className="form-control font-mono"
                        placeholder="0.00 (se puede editar luego)"
                        value={presupuestoInicial}
                        onChange={(e) => setPresupuestoInicial(e.target.value)}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold text-uppercase text-muted">
                        Falla Declarada / Trabajo Solicitado
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Describí el motivo de ingreso o diagnóstico inicial..."
                        value={fallaInicial}
                        onChange={(e) => setFallaInicial(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowNuevaModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={creatingOrd}
                  >
                    {creatingOrd ? "Creando..." : "Crear y Abrir Orden"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
