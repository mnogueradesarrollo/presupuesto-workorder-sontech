import { useEffect, useState, useMemo } from 'react';
import {
  listClientes,
  crearCliente,
  updateCliente,
  deleteCliente,
} from '../services/clientes';
import type { Cliente, TipoCliente, CondicionIva } from '../types/cliente';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../lib/utils';

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<'todos' | 'particular' | 'empresa'>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  // Form State
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoCliente>('particular');
  const [contacto, setContacto] = useState('');
  const [cuitDni, setCuitDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [condicionIva, setCondicionIva] = useState<CondicionIva>('Consumidor Final');
  const [notas, setNotas] = useState('');

  const loadClientes = async () => {
    try {
      setLoading(true);
      const data = await listClientes(200);
      setClientes(data);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, []);

  const openCrear = () => {
    setEditingCliente(null);
    setNombre('');
    setTipo('particular');
    setContacto('');
    setCuitDni('');
    setTelefono('');
    setEmail('');
    setDireccion('');
    setLocalidad('');
    setCondicionIva('Consumidor Final');
    setNotas('');
    setModalOpen(true);
  };

  const openEditar = (c: Cliente) => {
    setEditingCliente(c);
    setNombre(c.nombre);
    setTipo(c.tipo);
    setContacto(c.contacto || '');
    setCuitDni(c.cuitDni || '');
    setTelefono(c.telefono || '');
    setEmail(c.email || '');
    setDireccion(c.direccion || '');
    setLocalidad(c.localidad || '');
    setCondicionIva(c.condicionIva || 'Consumidor Final');
    setNotas(c.notas || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      if (editingCliente) {
        await updateCliente(editingCliente.id, {
          nombre,
          tipo,
          contacto,
          cuitDni,
          telefono,
          email,
          direccion,
          localidad,
          condicionIva,
          notas,
        });
        toast.success('Cliente actualizado correctamente');
      } else {
        await crearCliente({
          nombre,
          tipo,
          contacto,
          cuitDni,
          telefono,
          email,
          direccion,
          localidad,
          condicionIva,
          notas,
        });
        toast.success('Cliente registrado exitosamente');
      }
      setModalOpen(false);
      loadClientes();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nombreCli: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar al cliente "${nombreCli}"?`)) return;
    try {
      await deleteCliente(id);
      toast.success('Cliente eliminado');
      setClientes((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
      toast.error('No se pudo eliminar el cliente');
    }
  };

  const filteredClientes = useMemo(() => {
    return clientes.filter((c) => {
      const matchTipo = filterTipo === 'todos' || c.tipo === filterTipo;
      const q = search.toLowerCase();
      const matchSearch =
        c.nombre.toLowerCase().includes(q) ||
        (c.cuitDni && c.cuitDni.toLowerCase().includes(q)) ||
        (c.telefono && c.telefono.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.contacto && c.contacto.toLowerCase().includes(q));
      return matchTipo && matchSearch;
    });
  }, [clientes, search, filterTipo]);

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1 font-display">Directorio de Clientes</h2>
          <p className="text-muted small mb-0">
            Administración de clientes particulares y cuentas corporativas
          </p>
        </div>
        <button onClick={openCrear} className="btn btn-primary d-inline-flex align-items-center gap-2">
          <i className="bi bi-person-plus-fill"></i>
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="card shadow-sm border-0 mb-4 p-3 bg-white">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-6">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Buscar por nombre, DNI/CUIT, teléfono, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-md-6 d-flex gap-2 justify-content-md-end">
            <div className="btn-group" role="group">
              <button
                type="button"
                className={`btn btn-sm ${filterTipo === 'todos' ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setFilterTipo('todos')}
              >
                Todos ({clientes.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filterTipo === 'particular' ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setFilterTipo('particular')}
              >
                Particulares
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filterTipo === 'empresa' ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setFilterTipo('empresa')}
              >
                Empresas
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Clientes */}
      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm me-2" role="status"></div>
          Cargando clientes...
        </div>
      ) : filteredClientes.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 text-center bg-white">
          <i className="bi bi-people display-4 text-muted mb-3 opacity-50"></i>
          <h5 className="text-muted fw-bold">No se encontraron clientes</h5>
          <p className="text-muted small">
            {search ? 'Intenta modificar el término de búsqueda.' : 'Empieza registrando el primer cliente de Sontech.'}
          </p>
          {!search && (
            <div className="mt-2">
              <button onClick={openCrear} className="btn btn-outline-primary btn-sm">
                + Crear Primer Cliente
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card border-0 shadow-sm overflow-hidden bg-white">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-uppercase text-muted">
                <tr>
                  <th className="ps-3">Cliente</th>
                  <th>Tipo / IVA</th>
                  <th>Contacto</th>
                  <th>Ubicación</th>
                  <th>Registrado</th>
                  <th className="text-end pe-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map((c) => (
                  <tr key={c.id}>
                    <td className="ps-3">
                      <div className="fw-bold text-dark">{c.nombre}</div>
                      {c.contacto && (
                        <div className="small text-muted">Contacto: {c.contacto}</div>
                      )}
                      {c.cuitDni && (
                        <span className="badge bg-light text-secondary border font-mono small">
                          ID: {c.cuitDni}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${c.tipo === 'empresa' ? 'bg-primary' : 'bg-secondary'} me-1`}>
                        {c.tipo === 'empresa' ? 'Empresa' : 'Particular'}
                      </span>
                      {c.condicionIva && (
                        <div className="small text-muted mt-1">{c.condicionIva}</div>
                      )}
                    </td>
                    <td>
                      {c.telefono ? (
                        <div className="small">
                          <i className="bi bi-whatsapp text-success me-1"></i>
                          <a
                            href={`https://wa.me/${c.telefono.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-decoration-none font-mono text-dark"
                          >
                            {c.telefono}
                          </a>
                        </div>
                      ) : (
                        <span className="text-muted small">-</span>
                      )}
                      {c.email && (
                        <div className="small text-muted">
                          <i className="bi bi-envelope me-1"></i>
                          {c.email}
                        </div>
                      )}
                    </td>
                    <td className="small text-muted">
                      {c.direccion || c.localidad ? (
                        <div>
                          {c.direccion && <div>{c.direccion}</div>}
                          {c.localidad && <div className="text-secondary">{c.localidad}</div>}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="small text-muted font-mono">{formatDate(c.createdAt)}</td>
                    <td className="text-end pe-3">
                      <div className="dropdown d-inline-block">
                        <button
                          className="btn btn-sm btn-light border dropdown-toggle"
                          type="button"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                        >
                          Opciones
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0">
                          <li>
                            <button
                              className="dropdown-item small"
                              onClick={() => navigate(`/presupuesto-it?cliente=${encodeURIComponent(c.nombre)}`)}
                            >
                              <i className="bi bi-file-earmark-plus me-2 text-primary"></i>
                              Nuevo Presupuesto
                            </button>
                          </li>
                          <li>
                            <button
                              className="dropdown-item small"
                              onClick={() => navigate(`/equipos?clienteId=${c.id}`)}
                            >
                              <i className="bi bi-laptop me-2 text-info"></i>
                              Ver Equipos (CMDB)
                            </button>
                          </li>
                          <li>
                            <hr className="dropdown-divider my-1" />
                          </li>
                          <li>
                            <button className="dropdown-item small" onClick={() => openEditar(c)}>
                              <i className="bi bi-pencil-square me-2 text-secondary"></i>
                              Editar Datos
                            </button>
                          </li>
                          <li>
                            <button
                              className="dropdown-item small text-danger"
                              onClick={() => handleDelete(c.id, c.nombre)}
                            >
                              <i className="bi bi-trash3 me-2"></i>
                              Eliminar
                            </button>
                          </li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Cliente */}
      {modalOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                    <div className="col-12 col-md-8">
                      <label className="form-label small fw-bold">
                        Nombre completo / Razón Social <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej: Juan Pérez o Sontech Corp"
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Tipo de Cliente</label>
                      <select
                        className="form-select"
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value as TipoCliente)}
                      >
                        <option value="particular">Particular</option>
                        <option value="empresa">Empresa / Pyme</option>
                      </select>
                    </div>

                    {tipo === 'empresa' && (
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-bold">Persona de Contacto</label>
                        <input
                          type="text"
                          className="form-control"
                          value={contacto}
                          onChange={(e) => setContacto(e.target.value)}
                          placeholder="Ej: Lic. Martín Gómez (Gerente IT)"
                        />
                      </div>
                    )}

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">DNI o CUIT</label>
                      <input
                        type="text"
                        className="form-control"
                        value={cuitDni}
                        onChange={(e) => setCuitDni(e.target.value)}
                        placeholder="Ej: 20-34567890-9"
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Teléfono / WhatsApp</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light">
                          <i className="bi bi-whatsapp text-success"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value)}
                          placeholder="Ej: +54 9 11 1234-5678"
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Correo Electrónico</label>
                      <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="cliente@ejemplo.com"
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Condición de IVA</label>
                      <select
                        className="form-select"
                        value={condicionIva}
                        onChange={(e) => setCondicionIva(e.target.value as CondicionIva)}
                      >
                        <option value="Consumidor Final">Consumidor Final</option>
                        <option value="Responsable Inscripto">Responsable Inscripto</option>
                        <option value="Monotributo">Monotributo</option>
                        <option value="Exento">Exento</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Dirección</label>
                      <input
                        type="text"
                        className="form-control"
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        placeholder="Calle, número, piso/depto"
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Localidad / Ciudad</label>
                      <input
                        type="text"
                        className="form-control"
                        value={localidad}
                        onChange={(e) => setLocalidad(e.target.value)}
                        placeholder="Ej: CABA, Rosario, etc."
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">Notas u Observaciones</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        placeholder="Preferencias de horario, equipos habituales, etc."
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
                    {saving ? 'Guardando...' : editingCliente ? 'Guardar Cambios' : 'Registrar Cliente'}
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
