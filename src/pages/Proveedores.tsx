import { useEffect, useState, useMemo } from 'react';
import {
  listProveedores,
  crearProveedor,
  updateProveedor,
  deleteProveedor,
} from '../services/proveedores';
import type { Proveedor } from '../types/proveedor';
import { toast } from 'react-hot-toast';

export default function Proveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [razonSocial, setRazonSocial] = useState('');
  const [cuit, setCuit] = useState('');
  const [contactoNombre, setContactoNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [rubrosInput, setRubrosInput] = useState('');
  const [direccion, setDireccion] = useState('');
  const [web, setWeb] = useState('');
  const [plazoGarantiaDiasDefault, setPlazoGarantiaDiasDefault] = useState<number>(90);
  const [notas, setNotas] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await listProveedores(100);
      setProveedores(data);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCrear = () => {
    setEditingProveedor(null);
    setRazonSocial('');
    setCuit('');
    setContactoNombre('');
    setTelefono('');
    setEmail('');
    setRubrosInput('Pantallas, Baterías, Repuestos');
    setDireccion('');
    setWeb('');
    setPlazoGarantiaDiasDefault(90);
    setNotas('');
    setModalOpen(true);
  };

  const openEditar = (p: Proveedor) => {
    setEditingProveedor(p);
    setRazonSocial(p.razonSocial);
    setCuit(p.cuit || '');
    setContactoNombre(p.contactoNombre || '');
    setTelefono(p.telefono || '');
    setEmail(p.email || '');
    setRubrosInput((p.rubros || []).join(', '));
    setDireccion(p.direccion || '');
    setWeb(p.web || '');
    setPlazoGarantiaDiasDefault(p.plazoGarantiaDiasDefault ?? 90);
    setNotas(p.notas || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!razonSocial.trim()) {
      toast.error('La Razón Social es requerida');
      return;
    }
    const rubros = rubrosInput
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      if (editingProveedor) {
        await updateProveedor(editingProveedor.id, {
          razonSocial,
          cuit,
          contactoNombre,
          telefono,
          email,
          rubros,
          direccion,
          web,
          plazoGarantiaDiasDefault: Number(plazoGarantiaDiasDefault) || 0,
          notas,
        });
        toast.success('Proveedor actualizado');
      } else {
        await crearProveedor({
          razonSocial,
          cuit,
          contactoNombre,
          telefono,
          email,
          rubros,
          direccion,
          web,
          plazoGarantiaDiasDefault: Number(plazoGarantiaDiasDefault) || 0,
          notas,
        });
        toast.success('Proveedor registrado');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar proveedor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar proveedor "${name}"?`)) return;
    try {
      await deleteProveedor(id);
      toast.success('Proveedor eliminado');
      setProveedores((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar');
    }
  };

  const filteredProveedores = useMemo(() => {
    const q = search.toLowerCase();
    return proveedores.filter(
      (p) =>
        p.razonSocial.toLowerCase().includes(q) ||
        (p.cuit && p.cuit.includes(q)) ||
        (p.contactoNombre && p.contactoNombre.toLowerCase().includes(q)) ||
        (p.rubros && p.rubros.some((r) => r.toLowerCase().includes(q)))
    );
  }, [proveedores, search]);

  return (
    <div className="container py-3 py-md-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1 font-display">Directorio de Proveedores</h2>
          <p className="text-muted small mb-0">
            Control de proveedores de repuestos, insumos de microelectrónica y garantías RMA
          </p>
        </div>
        <button onClick={openCrear} className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2 w-100 w-md-auto">
          <i className="bi bi-building-add"></i>
          <span>Nuevo Proveedor</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="card shadow-sm border-0 mb-4 p-3 bg-white">
        <div className="input-group">
          <span className="input-group-text bg-light border-end-0">
            <i className="bi bi-search text-muted"></i>
          </span>
          <input
            type="text"
            className="form-control border-start-0"
            placeholder="Buscar por razón social, CUIT, contacto o rubro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Lista / Grid */}
      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm me-2" role="status"></div>
          Cargando proveedores...
        </div>
      ) : filteredProveedores.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 text-center bg-white">
          <i className="bi bi-truck display-4 text-muted mb-3 opacity-50"></i>
          <h5 className="text-muted fw-bold">No hay proveedores registrados</h5>
          <p className="text-muted small">
            Registra a tus proveedores para asociar repuestos comprados y controlar garantías de compra.
          </p>
          <div className="mt-2">
            <button onClick={openCrear} className="btn btn-outline-primary btn-sm">
              + Registrar Proveedor
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {filteredProveedores.map((p) => (
            <div key={p.id} className="col-12 col-md-6 col-lg-4">
              <div className="card border-0 shadow-sm h-100 bg-white">
                <div className="card-body p-4 d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="fw-bold text-dark mb-0">{p.razonSocial}</h5>
                    <span className="badge bg-light text-dark border small font-mono">
                      Garantía: {p.plazoGarantiaDiasDefault ?? 90}d
                    </span>
                  </div>

                  {p.cuit && (
                    <div className="small text-muted font-mono mb-2">CUIT: {p.cuit}</div>
                  )}

                  {/* Rubros */}
                  <div className="d-flex flex-wrap gap-1 mb-3">
                    {p.rubros && p.rubros.length > 0 ? (
                      p.rubros.map((r, i) => (
                        <span key={i} className="badge bg-light text-primary border">
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="badge bg-light text-muted">General</span>
                    )}
                  </div>

                  {/* Contacto */}
                  <div className="small text-muted mb-3 space-y-1">
                    {p.contactoNombre && (
                      <div>
                        <i className="bi bi-person me-2"></i>
                        {p.contactoNombre}
                      </div>
                    )}
                    {p.telefono && (
                      <div>
                        <i className="bi bi-telephone me-2 text-success"></i>
                        <a
                          href={`https://wa.me/${p.telefono.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-decoration-none font-mono text-dark"
                        >
                          {p.telefono}
                        </a>
                      </div>
                    )}
                    {p.email && (
                      <div className="text-break">
                        <i className="bi bi-envelope me-2"></i>
                        {p.email}
                      </div>
                    )}
                    {p.web && (
                      <div className="text-break">
                        <i className="bi bi-globe me-2 text-primary"></i>
                        <a href={p.web} target="_blank" rel="noreferrer" className="text-decoration-none">
                          {p.web}
                        </a>
                      </div>
                    )}
                  </div>

                  {p.notas && (
                    <div className="small text-secondary bg-light p-2 rounded mb-3">
                      <i className="bi bi-chat-left-text me-1"></i> {p.notas}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="mt-auto pt-2 border-top d-flex justify-content-end gap-2">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => openEditar(p)}
                    >
                      <i className="bi bi-pencil me-1"></i> Editar
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(p.id, p.razonSocial)}
                    >
                      <i className="bi bi-trash3"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Proveedor */}
      {modalOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
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
                        Razón Social / Nombre Comercial <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={razonSocial}
                        onChange={(e) => setRazonSocial(e.target.value)}
                        placeholder="Ej: Distribuidora Tech Repuestos SRL"
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">CUIT</label>
                      <input
                        type="text"
                        className="form-control"
                        value={cuit}
                        onChange={(e) => setCuit(e.target.value)}
                        placeholder="Ej: 30-71234567-8"
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Persona de Contacto / Vendedor</label>
                      <input
                        type="text"
                        className="form-control"
                        value={contactoNombre}
                        onChange={(e) => setContactoNombre(e.target.value)}
                        placeholder="Ej: Laura Díaz (Ejecutiva de Cuentas)"
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Teléfono / WhatsApp de Pedidos</label>
                      <input
                        type="text"
                        className="form-control"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="+54 9 11 ..."
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Correo Electrónico</label>
                      <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ventas@proveedor.com"
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Garantía Otorgada por Defecto</label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          value={plazoGarantiaDiasDefault}
                          onChange={(e) => setPlazoGarantiaDiasDefault(Number(e.target.value))}
                        />
                        <span className="input-group-text bg-light small">días</span>
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">
                        Rubros y Especialidades (separados por coma)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={rubrosInput}
                        onChange={(e) => setRubrosInput(e.target.value)}
                        placeholder="Ej: Módulos OLED, Baterías iPhone, Estaciones de Soldar, Cintas Kapton"
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Sitio Web / Catálogo Online</label>
                      <input
                        type="url"
                        className="form-control"
                        value={web}
                        onChange={(e) => setWeb(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Dirección / Depósito</label>
                      <input
                        type="text"
                        className="form-control"
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        placeholder="Dirección física o galería comercial"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">Notas Internas</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        placeholder="Condiciones de pago, horarios de entrega en moto, política de cambio..."
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
                    {saving ? 'Guardando...' : editingProveedor ? 'Guardar Cambios' : 'Registrar Proveedor'}
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
