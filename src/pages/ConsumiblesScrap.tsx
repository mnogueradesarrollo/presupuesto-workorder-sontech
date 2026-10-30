import { useEffect, useState } from 'react';
import {
  listItemsTaller,
  crearItemTaller,
  updateItemTaller,
  deleteItemTaller,
} from '../services/scrap';
import type { ItemConsumibleScrap, PiezaRecuperada, TipoItemTaller } from '../types/scrap';
import { toast } from 'react-hot-toast';

export default function ConsumiblesScrap() {
  const [activeTab, setActiveTab] = useState<'consumibles' | 'scrap'>('consumibles');
  const [items, setItems] = useState<ItemConsumibleScrap[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemConsumibleScrap | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal para agregar pieza recuperada a un equipo de despiece
  const [selectedScrapItem, setSelectedScrapItem] = useState<ItemConsumibleScrap | null>(null);
  const [piezaDesc, setPiezaDesc] = useState('');
  const [piezaEstado, setPiezaEstado] = useState<'operativo' | 'reparable' | 'para_pruebas'>('operativo');

  // Form State
  const [tipo, setTipo] = useState<TipoItemTaller>('consumible');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [origenDonacion, setOrigenDonacion] = useState('');
  const [cantidadDisponible, setCantidadDisponible] = useState<number>(1);
  const [unidadMedida, setUnidadMedida] = useState<any>('unidades');
  const [ubicacion, setUbicacion] = useState('');
  const [notas, setNotas] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await listItemsTaller();
      setItems(data);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar insumos y scrap de taller');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCrear = (tabType: TipoItemTaller) => {
    setEditingItem(null);
    setTipo(tabType);
    setNombre(tabType === 'consumible' ? 'Pasta Térmica Arctic MX-4' : 'Notebook Lenovo G480 donada');
    setCategoria(tabType === 'consumible' ? 'Químicos / Térmicos' : 'Notebooks');
    setOrigenDonacion(tabType === 'scrap' ? 'Cliente Pérez - donada por falla de placa' : '');
    setCantidadDisponible(tabType === 'consumible' ? 4 : 1);
    setUnidadMedida(tabType === 'consumible' ? 'jeringas' : 'unidades');
    setUbicacion('Estante Taller B');
    setNotas('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tipo,
        nombre,
        categoria,
        origenDonacion: tipo === 'scrap' ? origenDonacion : undefined,
        cantidadDisponible: Number(cantidadDisponible) || 0,
        unidadMedida,
        ubicacion,
        notas,
        piezasRecuperadas: editingItem?.piezasRecuperadas || [],
      };

      if (editingItem) {
        await updateItemTaller(editingItem.id, payload);
        toast.success('Registro actualizado');
      } else {
        await crearItemTaller(payload);
        toast.success(tipo === 'consumible' ? 'Consumible registrado' : 'Equipo ingresado a Scrap');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar "${name}"?`)) return;
    try {
      await deleteItemTaller(id);
      toast.success('Eliminado correctamente');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error(e);
      toast.error('Error al eliminar');
    }
  };

  const handleAgregarPieza = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScrapItem || !piezaDesc.trim()) return;

    const nuevaPieza: PiezaRecuperada = {
      id: crypto.randomUUID(),
      descripcion: piezaDesc.trim(),
      estado: piezaEstado,
    };

    const nuevasPiezas = [...(selectedScrapItem.piezasRecuperadas || []), nuevaPieza];
    try {
      await updateItemTaller(selectedScrapItem.id, {
        piezasRecuperadas: nuevasPiezas,
      });
      toast.success('Pieza recuperada agregada al inventario de scrap');
      setPiezaDesc('');
      setSelectedScrapItem((prev) => (prev ? { ...prev, piezasRecuperadas: nuevasPiezas } : null));
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('Error al agregar pieza');
    }
  };

  const consumibles = items.filter((i) => i.tipo === 'consumible');
  const scrapList = items.filter((i) => i.tipo === 'scrap');

  return (
    <div className="container py-3 py-md-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1 font-display">Consumibles de Taller & Despiece (Scrap)</h2>
          <p className="text-muted small mb-0">
            Control de insumos de laboratorio (pasta, estaño, alcohol) y banco de partes recicladas
          </p>
        </div>
        <button
          onClick={() => openCrear(activeTab === 'consumibles' ? 'consumible' : 'scrap')}
          className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2 w-100 w-md-auto"
        >
          <i className="bi bi-plus-lg"></i>
          <span>{activeTab === 'consumibles' ? 'Nuevo Consumible' : 'Ingresar Equipo p/ Despiece'}</span>
        </button>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 bg-white p-2 rounded shadow-sm border">
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold px-4 ${activeTab === 'consumibles' ? 'active' : 'text-dark'}`}
            onClick={() => setActiveTab('consumibles')}
          >
            <i className="bi bi-droplet-half me-2"></i>
            Consumibles de Laboratorio ({consumibles.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold px-4 ${activeTab === 'scrap' ? 'active' : 'text-dark'}`}
            onClick={() => setActiveTab('scrap')}
          >
            <i className="bi bi-recycle me-2"></i>
            Despiece / Scrap & Repuestos Usados ({scrapList.length})
          </button>
        </li>
      </ul>

      {loading ? (
        <div className="text-center py-5 text-muted">Cargando inventario de taller...</div>
      ) : activeTab === 'consumibles' ? (
        /* VISTA CONSUMIBLES */
        consumibles.length === 0 ? (
          <div className="card border-0 shadow-sm p-5 text-center bg-white">
            <i className="bi bi-eyedropper display-4 text-muted mb-3 opacity-50"></i>
            <h5 className="text-muted fw-bold">No hay consumibles registrados</h5>
            <p className="text-muted small">
              Registra pasta térmica, thermal pads, alcohol isopropílico o rollos de estaño para controlar el uso en banco.
            </p>
            <div className="mt-2">
              <button onClick={() => openCrear('consumible')} className="btn btn-outline-primary btn-sm">
                + Cargar Consumible
              </button>
            </div>
          </div>
        ) : (
          <div className="row g-3">
            {consumibles.map((item) => (
              <div key={item.id} className="col-12 col-md-6 col-lg-4">
                <div className="card border-0 shadow-sm h-100 bg-white">
                  <div className="card-body p-4 d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h5 className="fw-bold text-dark mb-0">{item.nombre}</h5>
                      <span className="badge bg-light text-primary border font-mono">
                        {item.cantidadDisponible} {item.unidadMedida}
                      </span>
                    </div>
                    {item.categoria && (
                      <span className="badge bg-light text-secondary border small align-self-start mb-2">
                        {item.categoria}
                      </span>
                    )}
                    {item.ubicacion && (
                      <div className="small text-muted mb-2">
                        <i className="bi bi-geo-alt text-danger me-1"></i> Ubicación: {item.ubicacion}
                      </div>
                    )}
                    {item.notas && (
                      <div className="small text-secondary mb-3 fst-italic">"{item.notas}"</div>
                    )}
                    <div className="mt-auto pt-2 border-top d-flex justify-content-end gap-2">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(item.id, item.nombre)}
                      >
                        <i className="bi bi-trash3"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* VISTA SCRAP / DESPIECE */
        scrapList.length === 0 ? (
          <div className="card border-0 shadow-sm p-5 text-center bg-white">
            <i className="bi bi-recycle display-4 text-muted mb-3 opacity-50"></i>
            <h5 className="text-muted fw-bold">No hay equipos en despiece</h5>
            <p className="text-muted small">
              Registra máquinas dadas de baja o donadas de las cuales rescatas pantallas, coolers, bisagras o conectores DC.
            </p>
            <div className="mt-2">
              <button onClick={() => openCrear('scrap')} className="btn btn-outline-primary btn-sm">
                + Ingresar Equipo a Despiece
              </button>
            </div>
          </div>
        ) : (
          <div className="row g-3">
            {scrapList.map((item) => (
              <div key={item.id} className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm h-100 bg-white">
                  <div className="card-body p-4 d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h5 className="fw-bold text-dark mb-0">{item.nombre}</h5>
                        {item.origenDonacion && (
                          <div className="small text-muted">Origen: {item.origenDonacion}</div>
                        )}
                      </div>
                      <span className="badge bg-secondary font-mono small">
                        {item.piezasRecuperadas?.length || 0} piezas catalogadas
                      </span>
                    </div>

                    {/* Lista de Partes Rescatadas */}
                    <div className="bg-light p-3 rounded-3 my-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small fw-bold text-dark">Componentes Rescatados:</span>
                        <button
                          className="btn btn-sm btn-link text-primary p-0 text-decoration-none"
                          onClick={() => setSelectedScrapItem(item)}
                        >
                          + Agregar Pieza
                        </button>
                      </div>

                      {(!item.piezasRecuperadas || item.piezasRecuperadas.length === 0) ? (
                        <div className="small text-muted">Aún no se catalogaron piezas rescatadas.</div>
                      ) : (
                        <div className="space-y-1">
                          {item.piezasRecuperadas.map((pz) => (
                            <div
                              key={pz.id}
                              className="d-flex justify-content-between align-items-center small py-1 border-bottom border-white"
                            >
                              <span>
                                {pz.descripcion}
                                {pz.usadoEnOrdenCodigo && (
                                  <span className="badge bg-success ms-2 font-mono">
                                    Usado en {pz.usadoEnOrdenCodigo}
                                  </span>
                                )}
                              </span>
                              <span
                                className={`badge ${
                                  pz.estado === 'operativo'
                                    ? 'bg-success'
                                    : pz.estado === 'para_pruebas'
                                    ? 'bg-warning text-dark'
                                    : 'bg-secondary'
                                }`}
                              >
                                {pz.estado}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pt-2 border-top d-flex justify-content-end">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(item.id, item.nombre)}
                      >
                        <i className="bi bi-trash3 me-1"></i> Eliminar Registro
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal Agregar Pieza a Scrap */}
      {selectedScrapItem && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">Catalogar Pieza de Scrap</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedScrapItem(null)}
                ></button>
              </div>
              <form onSubmit={handleAgregarPieza}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Equipo de Origen</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      disabled
                      value={selectedScrapItem.nombre}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">
                      Descripción de la Pieza <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="Ej: Cooler disipador, Flex de video 30 pines, Bisagra derecha"
                      value={piezaDesc}
                      onChange={(e) => setPiezaDesc(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Estado del Componente</label>
                    <select
                      className="form-select"
                      value={piezaEstado}
                      onChange={(e) => setPiezaEstado(e.target.value as any)}
                    >
                      <option value="operativo">Operativo 100% (Listo para repuesto)</option>
                      <option value="para_pruebas">Para Pruebas en Laboratorio</option>
                      <option value="reparable">Reparable</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setSelectedScrapItem(null)}
                  >
                    Cerrar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Agregar al Banco de Piezas
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Item General */}
      {modalOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  {tipo === 'consumible' ? 'Registrar Consumible' : 'Ingresar Equipo a Despiece'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalOpen(false)}
                ></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-bold">
                        Nombre / Modelo <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej: Alcohol Isopropílico 1L o Gabinete HP ProDesk para scrap"
                      />
                    </div>
                    {tipo === 'scrap' && (
                      <div className="col-12">
                        <label className="form-label small fw-bold">Origen / Motivo de Baja</label>
                        <input
                          type="text"
                          className="form-control"
                          value={origenDonacion}
                          onChange={(e) => setOrigenDonacion(e.target.value)}
                          placeholder="Donación por derrame de líquido, descarte de empresa..."
                        />
                      </div>
                    )}
                    {tipo === 'consumible' && (
                      <>
                        <div className="col-6">
                          <label className="form-label small fw-bold">Cantidad</label>
                          <input
                            type="number"
                            className="form-control font-mono"
                            value={cantidadDisponible}
                            onChange={(e) => setCantidadDisponible(Number(e.target.value))}
                          />
                        </div>
                        <div className="col-6">
                          <label className="form-label small fw-bold">Unidad de Medida</label>
                          <select
                            className="form-select"
                            value={unidadMedida}
                            onChange={(e) => setUnidadMedida(e.target.value)}
                          >
                            <option value="unidades">Unidades</option>
                            <option value="jeringas">Jeringas / Tubos</option>
                            <option value="gramos">Gramos</option>
                            <option value="ml">Mililitros (ml)</option>
                            <option value="pack">Pack / Rollos</option>
                          </select>
                        </div>
                      </>
                    )}
                    <div className="col-12">
                      <label className="form-label small fw-bold">Ubicación en Taller</label>
                      <input
                        type="text"
                        className="form-control"
                        value={ubicacion}
                        onChange={(e) => setUbicacion(e.target.value)}
                        placeholder="Cajón de insumos, Estante bajo mesada..."
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold">Notas</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
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
                    {saving ? 'Guardando...' : 'Guardar'}
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
