import { useEffect, useState, useMemo } from 'react';
import {
  listArticulosKB,
  crearArticuloKB,
  updateArticuloKB,
  deleteArticuloKB,
  incrementarVisitasKB,
} from '../services/kb';
import type { ArticuloKB, CategoriaKB } from '../types/kb';
import { toast } from 'react-hot-toast';

export default function BaseConocimiento() {
  const [articulos, setArticulos] = useState<ArticuloKB[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todas');

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticulo, setEditingArticulo] = useState<ArticuloKB | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewArticulo, setViewArticulo] = useState<ArticuloKB | null>(null);

  // Form State
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState<CategoriaKB>('Notebooks');
  const [marcaModelo, setMarcaModelo] = useState('');
  const [fallaSintoma, setFallaSintoma] = useState('');
  const [diagnosticoYSolucion, setDiagnosticoYSolucion] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [autor, setAutor] = useState('Laboratorio Sontech');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await listArticulosKB();
      setArticulos(data);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar la Base de Conocimiento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCrear = () => {
    setEditingArticulo(null);
    setTitulo('');
    setCategoria('Notebooks');
    setMarcaModelo('');
    setFallaSintoma('');
    setDiagnosticoYSolucion('');
    setTagsInput('corto en 19v, mosfet, capacitores');
    setAutor('Laboratorio Sontech');
    setModalOpen(true);
  };

  const openEditar = (art: ArticuloKB) => {
    setEditingArticulo(art);
    setTitulo(art.titulo);
    setCategoria(art.categoria);
    setMarcaModelo(art.marcaModelo);
    setFallaSintoma(art.fallaSintoma);
    setDiagnosticoYSolucion(art.diagnosticoYSolucion);
    setTagsInput((art.tags || []).join(', '));
    setAutor(art.autor || 'Laboratorio Sontech');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !fallaSintoma.trim() || !diagnosticoYSolucion.trim()) {
      toast.error('Título, Síntoma y Solución son obligatorios');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const payload = {
        titulo,
        categoria,
        marcaModelo,
        fallaSintoma,
        diagnosticoYSolucion,
        tags,
        autor,
      };

      if (editingArticulo) {
        await updateArticuloKB(editingArticulo.id, payload);
        toast.success('Artículo actualizado');
      } else {
        await crearArticuloKB(payload);
        toast.success('Solución documentada en la Base de Conocimiento');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar artículo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar artículo "${name}"?`)) return;
    try {
      await deleteArticuloKB(id);
      toast.success('Artículo eliminado');
      setArticulos((prev) => prev.filter((a) => a.id !== id));
      if (viewArticulo?.id === id) setViewArticulo(null);
    } catch (e) {
      console.error(e);
      toast.error('Error al eliminar');
    }
  };

  const handleVerDetalle = (art: ArticuloKB) => {
    setViewArticulo(art);
    incrementarVisitasKB(art.id);
  };

  const filtered = useMemo(() => {
    return articulos.filter((a) => {
      const q = search.toLowerCase();
      const matchSearch =
        a.titulo.toLowerCase().includes(q) ||
        a.marcaModelo.toLowerCase().includes(q) ||
        a.fallaSintoma.toLowerCase().includes(q) ||
        (a.tags && a.tags.some((t) => t.toLowerCase().includes(q)));

      const matchCat = selectedCategoria === 'todas' || a.categoria === selectedCategoria;
      return matchSearch && matchCat;
    });
  }, [articulos, search, selectedCategoria]);

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1 font-display">Base de Conocimiento Técnica (KB)</h2>
          <p className="text-muted small mb-0">
            Documentación de fallas típicas, soluciones probadas, esquemáticos y configuraciones de BIOS
          </p>
        </div>
        <button onClick={openCrear} className="btn btn-primary d-inline-flex align-items-center gap-2">
          <i className="bi bi-journal-plus"></i>
          <span>Documentar Solución</span>
        </button>
      </div>

      {/* Buscador & Categorías */}
      <div className="card shadow-sm border-0 mb-4 p-3 bg-white">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-8">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Buscar por síntoma (ej: no enciende, no da video, consumo 0.02A, modelo)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-md-4">
            <select
              className="form-select"
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
            >
              <option value="todas">Todas las Especialidades</option>
              <option value="Notebooks">Notebooks</option>
              <option value="PC Escritorio">PC Escritorio</option>
              <option value="Placas de Video">Placas de Video (GPU)</option>
              <option value="Motherboards">Motherboards</option>
              <option value="Smartphones">Smartphones</option>
              <option value="BIOS / Firmware">BIOS / Firmware</option>
              <option value="General">General</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Artículos */}
      {loading ? (
        <div className="text-center py-5 text-muted">Cargando base de conocimiento...</div>
      ) : filtered.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 text-center bg-white">
          <i className="bi bi-journal-text display-4 text-muted mb-3 opacity-50"></i>
          <h5 className="text-muted fw-bold">No se encontraron artículos</h5>
          <p className="text-muted small">
            Empieza a registrar las reparaciones exitosas del taller para resolver casos futuros en segundos.
          </p>
          <div className="mt-2">
            <button onClick={openCrear} className="btn btn-outline-primary btn-sm">
              + Documentar Primera Solución
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {filtered.map((art) => (
            <div key={art.id} className="col-12 col-md-6">
              <div className="card border-0 shadow-sm h-100 bg-white hover-shadow transition">
                <div className="card-body p-4 d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="badge bg-light text-primary border small text-uppercase">
                      {art.categoria}
                    </span>
                    {art.marcaModelo && (
                      <span className="badge bg-dark-subtle text-dark font-mono small">
                        {art.marcaModelo}
                      </span>
                    )}
                  </div>

                  <h5
                    className="fw-bold text-dark mb-2 cursor-pointer"
                    onClick={() => handleVerDetalle(art)}
                    style={{ cursor: 'pointer' }}
                  >
                    {art.titulo}
                  </h5>

                  <div className="small text-danger mb-3">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    <strong>Síntoma:</strong> {art.fallaSintoma}
                  </div>

                  <p
                    className="small text-muted mb-3 text-truncate-3"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {art.diagnosticoYSolucion}
                  </p>

                  <div className="d-flex flex-wrap gap-1 mb-3">
                    {art.tags &&
                      art.tags.map((t, idx) => (
                        <span key={idx} className="badge bg-light text-secondary border" style={{ fontSize: '0.7rem' }}>
                          #{t}
                        </span>
                      ))}
                  </div>

                  <div className="mt-auto pt-2 border-top d-flex justify-content-between align-items-center">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleVerDetalle(art)}
                    >
                      <i className="bi bi-eye me-1"></i> Ver Solución Completa
                    </button>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-light border"
                        onClick={() => openEditar(art)}
                        title="Editar"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(art.id, art.titulo)}
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

      {/* Modal Ver Detalle de Solución */}
      {viewArticulo && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white p-4">
                <div>
                  <span className="badge bg-primary text-uppercase mb-1">{viewArticulo.categoria}</span>
                  <h4 className="fw-bold mb-0 text-white">{viewArticulo.titulo}</h4>
                  {viewArticulo.marcaModelo && (
                    <div className="small text-white-50 mt-1 font-mono">
                      Modelo: {viewArticulo.marcaModelo}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setViewArticulo(null)}
                ></button>
              </div>
              <div className="modal-body p-4 p-md-5">
                <div className="alert alert-danger d-flex align-items-center gap-2 p-3 mb-4">
                  <i className="bi bi-exclamation-octagon-fill fs-4"></i>
                  <div>
                    <strong className="d-block">Comportamiento / Falla Detectada:</strong>
                    <span className="small">{viewArticulo.fallaSintoma}</span>
                  </div>
                </div>

                <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
                  <i className="bi bi-tools text-primary me-2"></i>
                  Diagnóstico y Procedimiento de Solución:
                </h6>
                <div
                  className="bg-light p-3 rounded-3 text-dark mb-4"
                  style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', fontFamily: 'inherit' }}
                >
                  {viewArticulo.diagnosticoYSolucion}
                </div>

                {viewArticulo.tags && viewArticulo.tags.length > 0 && (
                  <div className="mb-2">
                    <span className="small text-muted fw-bold me-2">Etiquetas:</span>
                    {viewArticulo.tags.map((t, idx) => (
                      <span key={idx} className="badge bg-light text-dark border me-1">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setViewArticulo(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Artículo */}
      {modalOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  {editingArticulo ? 'Editar Guía Técnica' : 'Documentar Solución en Base de Conocimiento'}
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
                    <div className="col-12 col-md-8">
                      <label className="form-label small fw-bold">
                        Título de la Solución <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        placeholder="Ej: ASUS TUF FX505 - Corto en línea principal de 19V"
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Especialidad / Área</label>
                      <select
                        className="form-select"
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value as CategoriaKB)}
                      >
                        <option value="Notebooks">Notebooks</option>
                        <option value="PC Escritorio">PC Escritorio</option>
                        <option value="Placas de Video">Placas de Video (GPU)</option>
                        <option value="Motherboards">Motherboards</option>
                        <option value="Smartphones">Smartphones</option>
                        <option value="BIOS / Firmware">BIOS / Firmware</option>
                        <option value="General">General</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Marca y Modelo Específico</label>
                      <input
                        type="text"
                        className="form-control"
                        value={marcaModelo}
                        onChange={(e) => setMarcaModelo(e.target.value)}
                        placeholder="Ej: Dell Inspiron 5570 / Placa LA-F115P"
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">
                        Tags / Palabras clave (separadas por coma)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="Ej: bios bin, no carga batería, mosfet entrada, kbc"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">
                        Falla / Síntoma observado <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={fallaSintoma}
                        onChange={(e) => setFallaSintoma(e.target.value)}
                        placeholder="Ej: La fuente de laboratorio entra en protección (consumo 2A a 0V) al conectar cargador."
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">
                        Procedimiento de Reparación / Diagnóstico <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows={7}
                        required
                        value={diagnosticoYSolucion}
                        onChange={(e) => setDiagnosticoYSolucion(e.target.value)}
                        placeholder="1. Se inyecta 1V en la línea después del segundo mosfet de entrada.
2. Con cámara térmica o alcohol se detecta capacitor cerámico PC102 en corto cerca del conector de batería.
3. Se retira capacitor, se limpia con alcohol isopropílico y se reemplaza por uno de 10uF 25V.
4. Equipo enciende normalmente y carga batería."
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
                    {saving ? 'Guardando...' : 'Guardar Artículo'}
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
