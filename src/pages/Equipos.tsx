import { useEffect, useState, useMemo } from 'react';
import {
  listEquipos,
  crearEquipo,
  updateEquipo,
  deleteEquipo,
} from '../services/equipos';
import { listClientes } from '../services/clientes';
import { listOrdenes } from '../services/ordenes';
import type { EquipoActivo, TipoEquipo } from '../types/equipo';
import type { Cliente } from '../types/cliente';
import type { OrdenListItem } from '../services/ordenes';
import { toast } from 'react-hot-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { formatDate } from '../lib/utils';

export default function Equipos() {
  const [params] = useSearchParams();
  const initialClienteId = params.get('clienteId') || '';
  const navigate = useNavigate();

  const [equipos, setEquipos] = useState<EquipoActivo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterCliente, setFilterCliente] = useState(initialClienteId);
  const [filterTipo, setFilterTipo] = useState('todos');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEquipo, setEditingEquipo] = useState<EquipoActivo | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [clienteId, setClienteId] = useState('');
  const [tipo, setTipo] = useState<TipoEquipo>('Notebook');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [pinClave, setPinClave] = useState('');
  const [color, setColor] = useState('');
  const [cpu, setCpu] = useState('');
  const [ram, setRam] = useState('');
  const [almacenamiento, setAlmacenamiento] = useState('');
  const [notas, setNotas] = useState('');

  // Modal Historia Clínica
  const [selectedEquipoHistorial, setSelectedEquipoHistorial] = useState<EquipoActivo | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eqs, clis, ords] = await Promise.all([
        listEquipos(undefined, 200),
        listClientes(150),
        listOrdenes({ limit: 150 }),
      ]);
      setEquipos(eqs);
      setClientes(clis);
      setOrdenes(ords.items);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar inventario de equipos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCrear = () => {
    setEditingEquipo(null);
    setClienteId(filterCliente || (clientes[0]?.id || ''));
    setTipo('Notebook');
    setMarca('');
    setModelo('');
    setNumeroSerie('');
    setPinClave('');
    setColor('');
    setCpu('');
    setRam('');
    setAlmacenamiento('');
    setNotas('');
    setModalOpen(true);
  };

  const openEditar = (eq: EquipoActivo) => {
    setEditingEquipo(eq);
    setClienteId(eq.clienteId);
    setTipo(eq.tipo);
    setMarca(eq.marca);
    setModelo(eq.modelo);
    setNumeroSerie(eq.numeroSerie);
    setPinClave(eq.pinClave || '');
    setColor(eq.color || '');
    setCpu(eq.especificaciones?.cpu || '');
    setRam(eq.especificaciones?.ram || '');
    setAlmacenamiento(eq.especificaciones?.almacenamiento || '');
    setNotas(eq.notas || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marca.trim() || !modelo.trim() || !numeroSerie.trim()) {
      toast.error('Marca, Modelo y Número de Serie son obligatorios');
      return;
    }

    const cliObj = clientes.find((c) => c.id === clienteId);
    if (!cliObj) {
      toast.error('Debes seleccionar un cliente válido');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        clienteId,
        clienteNombre: cliObj.nombre,
        tipo,
        marca,
        modelo,
        numeroSerie: numeroSerie.trim(),
        pinClave,
        color,
        especificaciones: {
          cpu: cpu || undefined,
          ram: ram || undefined,
          almacenamiento: almacenamiento || undefined,
        },
        notas,
      };

      if (editingEquipo) {
        await updateEquipo(editingEquipo.id, payload);
        toast.success('Ficha del equipo actualizada');
      } else {
        await crearEquipo(payload);
        toast.success('Equipo registrado en la CMDB');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar el equipo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, serial: string) => {
    if (!window.confirm(`¿Eliminar el equipo con Serial/IMEI "${serial}"?`)) return;
    try {
      await deleteEquipo(id);
      toast.success('Equipo eliminado');
      setEquipos((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar');
    }
  };

  const filteredEquipos = useMemo(() => {
    return equipos.filter((eq) => {
      const q = search.toLowerCase();
      const matchSearch =
        eq.marca.toLowerCase().includes(q) ||
        eq.modelo.toLowerCase().includes(q) ||
        eq.numeroSerie.toLowerCase().includes(q) ||
        eq.clienteNombre.toLowerCase().includes(q);

      const matchCliente = !filterCliente || eq.clienteId === filterCliente;
      const matchTipo = filterTipo === 'todos' || eq.tipo === filterTipo;

      return matchSearch && matchCliente && matchTipo;
    });
  }, [equipos, search, filterCliente, filterTipo]);

  // Órdenes vinculadas al equipo seleccionado en el modal de historia clínica
  const ordenesHistorial = useMemo(() => {
    if (!selectedEquipoHistorial) return [];
    return ordenes.filter((o) => {
      // Coincide por ID o por coincidencia de Nro de serie
      return (
        (selectedEquipoHistorial.historialOrdenesIds &&
          selectedEquipoHistorial.historialOrdenesIds.includes(o.id)) ||
        o.equipo?.imeiSerie === selectedEquipoHistorial.numeroSerie
      );
    });
  }, [selectedEquipoHistorial, ordenes]);

  return (
    <div className="container py-3 py-md-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1 font-display">Inventario de Equipos & CMDB</h2>
          <p className="text-muted small mb-0">
            Fichas técnicas de hardware, credenciales y trazabilidad histórica por Nro. de Serie / IMEI
          </p>
        </div>
        <button onClick={openCrear} className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2 w-100 w-md-auto">
          <i className="bi bi-laptop"></i>
          <span>Registrar Equipo</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="card shadow-sm border-0 mb-4 p-3 bg-white">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Buscar por Nro de Serie, Marca, Modelo o Cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-6 col-md-4">
            <select
              className="form-select"
              value={filterCliente}
              onChange={(e) => setFilterCliente(e.target.value)}
            >
              <option value="">Todos los Clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select"
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
            >
              <option value="todos">Todos los Tipos</option>
              <option value="Notebook">Notebooks</option>
              <option value="PC Escritorio">PC de Escritorio</option>
              <option value="Celular">Celulares / Smartphones</option>
              <option value="Tablet">Tablets</option>
              <option value="Impresora">Impresoras</option>
              <option value="Servidor">Servidores</option>
              <option value="Consola">Consolas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid de Equipos */}
      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm me-2" role="status"></div>
          Cargando inventario de equipos...
        </div>
      ) : filteredEquipos.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 text-center bg-white">
          <i className="bi bi-cpu display-4 text-muted mb-3 opacity-50"></i>
          <h5 className="text-muted fw-bold">No se encontraron equipos registrados</h5>
          <p className="text-muted small">
            Registra los dispositivos de tus clientes para llevar la historia clínica de cada máquina.
          </p>
          <div className="mt-2">
            <button onClick={openCrear} className="btn btn-outline-primary btn-sm">
              + Registrar Primer Equipo
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {filteredEquipos.map((eq) => (
            <div key={eq.id} className="col-12 col-md-6 col-lg-4">
              <div className="card border-0 shadow-sm h-100 bg-white">
                <div className="card-body p-4 d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <span className="badge bg-light text-dark border text-uppercase small mb-1">
                        {eq.tipo}
                      </span>
                      <h5 className="fw-bold text-dark mb-0">
                        {eq.marca} {eq.modelo}
                      </h5>
                    </div>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-mono small">
                      S/N: {eq.numeroSerie}
                    </span>
                  </div>

                  <div className="small text-muted mb-2">
                    <i className="bi bi-person me-1"></i>
                    <strong>Cliente:</strong> {eq.clienteNombre}
                  </div>

                  {eq.pinClave && (
                    <div className="small text-muted mb-2">
                      <i className="bi bi-key me-1 text-warning"></i>
                      <strong>PIN/Pass:</strong> <span className="font-mono">{eq.pinClave}</span>
                    </div>
                  )}

                  {eq.especificaciones && (eq.especificaciones.cpu || eq.especificaciones.ram) && (
                    <div className="bg-light p-2 rounded small text-secondary mb-3">
                      {eq.especificaciones.cpu && <div>• CPU: {eq.especificaciones.cpu}</div>}
                      {eq.especificaciones.ram && <div>• RAM: {eq.especificaciones.ram}</div>}
                      {eq.especificaciones.almacenamiento && (
                        <div>• Disco: {eq.especificaciones.almacenamiento}</div>
                      )}
                    </div>
                  )}

                  {eq.notas && (
                    <div className="small text-muted mb-3 fst-italic">"{eq.notas}"</div>
                  )}

                  <div className="mt-auto pt-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => setSelectedEquipoHistorial(eq)}
                    >
                      <i className="bi bi-clock-history me-1"></i> Historia Clínica
                    </button>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-light border"
                        onClick={() => openEditar(eq)}
                        title="Editar Ficha"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(eq.id, eq.numeroSerie)}
                        title="Eliminar"
                      >
                        <i className="bi bi-trash3"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Historia Clínica */}
      {selectedEquipoHistorial && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <div>
                  <h5 className="modal-title fw-bold">Historia Clínica del Equipo</h5>
                  <span className="small text-muted font-mono">
                    {selectedEquipoHistorial.marca} {selectedEquipoHistorial.modelo} (S/N:{' '}
                    {selectedEquipoHistorial.numeroSerie})
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedEquipoHistorial(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3 d-flex justify-content-between align-items-center">
                  <h6 className="fw-bold mb-0 text-dark">
                    Intervenciones Técnicas ({ordenesHistorial.length})
                  </h6>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => {
                      const eq = selectedEquipoHistorial;
                      setSelectedEquipoHistorial(null);
                      navigate(
                        `/presupuesto-it?cliente=${encodeURIComponent(
                          eq.clienteNombre
                        )}&marca=${encodeURIComponent(eq.marca)}&modelo=${encodeURIComponent(
                          eq.modelo
                        )}&serie=${encodeURIComponent(eq.numeroSerie)}`
                      );
                    }}
                  >
                    + Nueva Reparación para este Equipo
                  </button>
                </div>

                {ordenesHistorial.length === 0 ? (
                  <div className="bg-light p-4 rounded text-center text-muted small">
                    <i className="bi bi-journal-x fs-2 d-block mb-1 opacity-50"></i>
                    Aún no se registran órdenes de trabajo vinculadas a este número de serie.
                  </div>
                ) : (
                  <div className="list-group">
                    {ordenesHistorial.map((ord) => (
                      <div
                        key={ord.id}
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3"
                      >
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="font-mono fw-bold text-primary">{ord.codigo}</span>
                            <span className="badge bg-secondary text-uppercase small">
                              {ord.status}
                            </span>
                          </div>
                          <div className="small text-muted">
                            Fecha de ingreso: {formatDate(ord.createdAt)}
                          </div>
                          {ord.diagnostico && (
                            <div className="small text-dark mt-1">
                              <strong>Diagnóstico:</strong> {ord.diagnostico}
                            </div>
                          )}
                        </div>
                        <button
                          className="btn btn-sm btn-outline-dark"
                          onClick={() => {
                            setSelectedEquipoHistorial(null);
                            navigate(`/orden/${ord.id}`);
                          }}
                        >
                          Ver Orden
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedEquipoHistorial(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Equipo */}
      {modalOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  {editingEquipo ? 'Editar Ficha de Equipo' : 'Registrar Nuevo Dispositivo'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalOpen(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">
                        Cliente Propietario <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={clienteId}
                        onChange={(e) => setClienteId(e.target.value)}
                      >
                        {clientes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Tipo de Dispositivo</label>
                      <select
                        className="form-select"
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value as TipoEquipo)}
                      >
                        <option value="Notebook">Notebook</option>
                        <option value="PC Escritorio">PC de Escritorio</option>
                        <option value="Celular">Celular / Smartphone</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Impresora">Impresora</option>
                        <option value="Servidor">Servidor</option>
                        <option value="Consola">Consola</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">
                        Marca <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={marca}
                        onChange={(e) => setMarca(e.target.value)}
                        placeholder="Ej: Lenovo, Apple, Asus, HP, Samsung"
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">
                        Modelo Exacto <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={modelo}
                        onChange={(e) => setModelo(e.target.value)}
                        placeholder="Ej: ThinkPad E14 Gen 2 o iPhone 13 Pro"
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">
                        Número de Serie / IMEI <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control font-mono"
                        required
                        value={numeroSerie}
                        onChange={(e) => setNumeroSerie(e.target.value)}
                        placeholder="Identificador único del chasis/placa"
                      />
                    </div>

                    <div className="col-12 col-md-3">
                      <label className="form-label small fw-bold">Contraseña / PIN</label>
                      <input
                        type="text"
                        className="form-control font-mono"
                        value={pinClave}
                        onChange={(e) => setPinClave(e.target.value)}
                        placeholder="PIN / Patrón"
                      />
                    </div>

                    <div className="col-12 col-md-3">
                      <label className="form-label small fw-bold">Color</label>
                      <input
                        type="text"
                        className="form-control"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="Gris espacial, Negro..."
                      />
                    </div>

                    {/* Especificaciones */}
                    <div className="col-12">
                      <label className="form-label small fw-bold text-muted border-bottom w-100 pb-1">
                        Especificaciones de Hardware (Opcional)
                      </label>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">Procesador (CPU)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={cpu}
                        onChange={(e) => setCpu(e.target.value)}
                        placeholder="Ej: Intel Core i7-1165G7"
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">Memoria RAM</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={ram}
                        onChange={(e) => setRam(e.target.value)}
                        placeholder="Ej: 16GB DDR4 3200MHz"
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">Almacenamiento</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={almacenamiento}
                        onChange={(e) => setAlmacenamiento(e.target.value)}
                        placeholder="Ej: 512GB NVMe Kingston"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">Observaciones Generales</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        placeholder="Marcas preexistentes conocidas, antecedentes de caídas, etc."
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : editingEquipo ? 'Guardar Cambios' : 'Registrar Equipo'}
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
