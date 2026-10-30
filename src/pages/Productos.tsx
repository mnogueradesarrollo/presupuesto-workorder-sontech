import { useEffect, useState, useMemo } from 'react';
import {
  listProductos,
  crearProducto,
  updateProducto,
  deleteProducto,
  ajustarStock,
  listCategorias,
  crearCategoria,
  updateCategoria,
  deleteCategoria,
} from '../services/productos';
import { listProveedores } from '../services/proveedores';
import type { Producto, Categoria, TipoProducto } from '../types/producto';
import type { Proveedor } from '../types/proveedor';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../lib/utils';

export default function Productos() {
  const [activeTab, setActiveTab] = useState<'productos' | 'categorias'>('productos');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('todas');
  const [selectedTipo, setSelectedTipo] = useState('todos');
  const [soloStockBajo, setSoloStockBajo] = useState(false);

  // Modales
  const [modalProdOpen, setModalProdOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<Producto | null>(null);
  const [savingProd, setSavingProd] = useState(false);

  const [modalCatOpen, setModalCatOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Categoria | null>(null);
  const [savingCat, setSavingCat] = useState(false);

  // Form Producto
  const [pCodigo, setPCodigo] = useState('');
  const [pNombre, setPNombre] = useState('');
  const [pCategoriaId, setPCategoriaId] = useState('');
  const [pTipo, setPTipo] = useState<TipoProducto>('repuesto');
  const [pCosto, setPCosto] = useState<number>(0);
  const [pPrecioVenta, setPPrecioVenta] = useState<number>(0);
  const [pStock, setPStock] = useState<number>(0);
  const [pStockMinimo, setPStockMinimo] = useState<number>(2);
  const [pProveedorId, setPProveedorId] = useState('');
  const [pUbicacion, setPUbicacion] = useState('');
  const [pGarantiaMesesCliente, setPGarantiaMesesCliente] = useState<number>(3);

  // Form Categoria
  const [catNombre, setCatNombre] = useState('');
  const [catTipo, setCatTipo] = useState<any>('repuesto');
  const [catDescripcion, setCatDescripcion] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, cats, provs] = await Promise.all([
        listProductos(300),
        listCategorias(),
        listProveedores(100),
      ]);
      setProductos(prods);
      setCategorias(cats);
      setProveedores(provs);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar catálogo de productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ===== PRODUCTO HANDLERS ===== */
  const openCrearProd = () => {
    setEditingProd(null);
    setPCodigo('');
    setPNombre('');
    setPCategoriaId(categorias[0]?.id || '');
    setPTipo('repuesto');
    setPCosto(0);
    setPPrecioVenta(0);
    setPStock(1);
    setPStockMinimo(2);
    setPProveedorId('');
    setPUbicacion('');
    setPGarantiaMesesCliente(3);
    setModalProdOpen(true);
  };

  const openEditarProd = (p: Producto) => {
    setEditingProd(p);
    setPCodigo(p.codigo || '');
    setPNombre(p.nombre);
    setPCategoriaId(p.categoriaId);
    setPTipo(p.tipo);
    setPCosto(p.costo || 0);
    setPPrecioVenta(p.precioVenta || 0);
    setPStock(p.stock || 0);
    setPStockMinimo(p.stockMinimo || 0);
    setPProveedorId(p.proveedorId || '');
    setPUbicacion(p.ubicacionTaller || '');
    setPGarantiaMesesCliente(p.garantiaMesesCliente || 3);
    setModalProdOpen(true);
  };

  const handleSaveProd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pNombre.trim()) {
      toast.error('El nombre del producto es obligatorio');
      return;
    }
    const catObj = categorias.find((c) => c.id === pCategoriaId);
    const provObj = proveedores.find((pr) => pr.id === pProveedorId);

    setSavingProd(true);
    try {
      const payload = {
        codigo: pCodigo.trim() || `SKU-${Date.now().toString().slice(-6)}`,
        nombre: pNombre,
        categoriaId: pCategoriaId,
        categoriaNombre: catObj?.nombre || 'General',
        tipo: pTipo,
        costo: Number(pCosto) || 0,
        precioVenta: Number(pPrecioVenta) || 0,
        moneda: 'ARS' as const,
        stock: Number(pStock) || 0,
        stockMinimo: Number(pStockMinimo) || 0,
        proveedorId: pProveedorId || undefined,
        proveedorNombre: provObj?.razonSocial || undefined,
        garantiaMesesCliente: Number(pGarantiaMesesCliente) || 0,
        ubicacionTaller: pUbicacion || undefined,
        activo: true,
      };

      if (editingProd) {
        await updateProducto(editingProd.id, payload);
        toast.success('Producto actualizado');
      } else {
        await crearProducto(payload);
        toast.success('Producto creado');
      }
      setModalProdOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar el producto');
    } finally {
      setSavingProd(false);
    }
  };

  const handleDeleteProd = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Eliminar producto "${nombre}"?`)) return;
    try {
      await deleteProducto(id);
      toast.success('Producto eliminado');
      setProductos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar');
    }
  };

  const handleAjusteStock = async (id: string, delta: number) => {
    try {
      const nuevo = await ajustarStock(id, delta);
      setProductos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stock: nuevo } : p))
      );
      toast.success(`Stock actualizado: ${nuevo}`);
    } catch (e) {
      console.error(e);
      toast.error('No se pudo ajustar stock');
    }
  };

  /* ===== CATEGORÍA HANDLERS ===== */
  const openCrearCat = () => {
    setEditingCat(null);
    setCatNombre('');
    setCatTipo('repuesto');
    setCatDescripcion('');
    setModalCatOpen(true);
  };

  const openEditarCat = (c: Categoria) => {
    setEditingCat(c);
    setCatNombre(c.nombre);
    setCatTipo(c.tipo);
    setCatDescripcion(c.descripcion || '');
    setModalCatOpen(true);
  };

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNombre.trim()) {
      toast.error('El nombre de la categoría es requerido');
      return;
    }
    setSavingCat(true);
    try {
      if (editingCat) {
        await updateCategoria(editingCat.id, {
          nombre: catNombre,
          tipo: catTipo,
          descripcion: catDescripcion,
        });
        toast.success('Categoría actualizada');
      } else {
        await crearCategoria({
          nombre: catNombre,
          tipo: catTipo,
          descripcion: catDescripcion,
        });
        toast.success('Categoría creada');
      }
      setModalCatOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar categoría');
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCat = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar categoría "${name}"?`)) return;
    try {
      await deleteCategoria(id);
      toast.success('Categoría eliminada');
      setCategorias((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error(e);
      toast.error('Error al eliminar categoría');
    }
  };

  /* ===== FILTRADO ===== */
  const filteredProds = useMemo(() => {
    return productos.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.nombre.toLowerCase().includes(q) ||
        (p.codigo && p.codigo.toLowerCase().includes(q)) ||
        (p.categoriaNombre && p.categoriaNombre.toLowerCase().includes(q));

      const matchCat = selectedCategoria === 'todas' || p.categoriaId === selectedCategoria;
      const matchTipo = selectedTipo === 'todos' || p.tipo === selectedTipo;
      const matchStockBajo = !soloStockBajo || (p.tipo !== 'servicio' && p.stock <= p.stockMinimo);

      return matchSearch && matchCat && matchTipo && matchStockBajo;
    });
  }, [productos, search, selectedCategoria, selectedTipo, soloStockBajo]);

  return (
    <div className="container py-3 py-md-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1 font-display">Inventario & Catálogo</h2>
          <p className="text-muted small mb-0">
            Control de repuestos, productos para venta en mostrador, consumibles y categorías
          </p>
        </div>
        <div className="d-flex gap-2">
          {activeTab === 'productos' ? (
            <button onClick={openCrearProd} className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2 w-100 w-md-auto">
              <i className="bi bi-box-seam"></i>
              <span>Nuevo Producto/Repuesto</span>
            </button>
          ) : (
            <button onClick={openCrearCat} className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2 w-100 w-md-auto">
              <i className="bi bi-tag-fill"></i>
              <span>Nueva Categoría</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 bg-white p-2 rounded shadow-sm border">
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold px-4 ${activeTab === 'productos' ? 'active' : 'text-dark'}`}
            onClick={() => setActiveTab('productos')}
          >
            <i className="bi bi-boxes me-2"></i>
            Productos & Repuestos ({productos.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold px-4 ${activeTab === 'categorias' ? 'active' : 'text-dark'}`}
            onClick={() => setActiveTab('categorias')}
          >
            <i className="bi bi-tags me-2"></i>
            Categorías ({categorias.length})
          </button>
        </li>
      </ul>

      {/* VISTA PRODUCTOS */}
      {activeTab === 'productos' && (
        <>
          {/* Barra de Filtros */}
          <div className="card shadow-sm border-0 mb-4 p-3 bg-white">
            <div className="row g-2 align-items-center">
              <div className="col-12 col-md-4">
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Buscar por código, nombre o categoría..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-6 col-md-3">
                <select
                  className="form-select"
                  value={selectedCategoria}
                  onChange={(e) => setSelectedCategoria(e.target.value)}
                >
                  <option value="todas">Todas las Categorías</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-3">
                <select
                  className="form-select"
                  value={selectedTipo}
                  onChange={(e) => setSelectedTipo(e.target.value)}
                >
                  <option value="todos">Todos los Tipos</option>
                  <option value="repuesto">Repuestos</option>
                  <option value="producto">Accesorios / Hardware</option>
                  <option value="consumible">Consumibles</option>
                  <option value="servicio">Servicios / Mano de Obra</option>
                </select>
              </div>
              <div className="col-12 col-md-2">
                <div className="form-check form-switch pt-1">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="stockBajoCheck"
                    checked={soloStockBajo}
                    onChange={(e) => setSoloStockBajo(e.target.checked)}
                  />
                  <label className="form-check-label small fw-bold text-danger" htmlFor="stockBajoCheck">
                    <i className="bi bi-exclamation-triangle-fill me-1"></i> Stock Bajo
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Productos */}
          {loading ? (
            <div className="text-center py-5 text-muted">
              <div className="spinner-border spinner-border-sm me-2" role="status"></div>
              Cargando catálogo...
            </div>
          ) : filteredProds.length === 0 ? (
            <div className="card border-0 shadow-sm p-5 text-center bg-white">
              <i className="bi bi-box2 display-4 text-muted mb-3 opacity-50"></i>
              <h5 className="text-muted fw-bold">No se encontraron productos</h5>
              <p className="text-muted small">Crea categorías y productos para agilizar tus presupuestos y ventas.</p>
              <div className="mt-2">
                <button onClick={openCrearProd} className="btn btn-outline-primary btn-sm">
                  + Crear Producto
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Vista Tabla (Desktop) */}
              <div className="card border-0 shadow-sm overflow-hidden bg-white d-none d-md-block">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light small text-uppercase text-muted">
                      <tr>
                        <th className="ps-3">Código / Producto</th>
                        <th>Categoría / Tipo</th>
                        <th>Ubicación</th>
                        <th>Costo</th>
                        <th>Precio Venta</th>
                        <th>Margen</th>
                        <th className="text-center">Stock</th>
                        <th className="text-end pe-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProds.map((p) => {
                        const margen =
                          p.costo > 0 ? (((p.precioVenta - p.costo) / p.costo) * 100).toFixed(0) : '-';
                        const esBajo = p.tipo !== 'servicio' && p.stock <= p.stockMinimo;

                        return (
                          <tr key={p.id}>
                            <td className="ps-3">
                              <div className="fw-bold text-dark">{p.nombre}</div>
                              <span className="badge bg-light text-secondary border font-mono small">
                                {p.codigo}
                              </span>
                              {p.garantiaMesesCliente ? (
                                <span className="text-muted small ms-2">
                                  <i className="bi bi-shield-check text-success me-1"></i>
                                  {p.garantiaMesesCliente}m g/cliente
                                </span>
                              ) : null}
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border me-1">
                                {p.categoriaNombre}
                              </span>
                              <span
                                className={`badge ${
                                  p.tipo === 'repuesto'
                                    ? 'bg-info'
                                    : p.tipo === 'servicio'
                                    ? 'bg-warning text-dark'
                                    : 'bg-secondary'
                                } small`}
                              >
                                {p.tipo}
                              </span>
                              {p.proveedorNombre && (
                                <div className="small text-muted mt-1">Prov: {p.proveedorNombre}</div>
                              )}
                            </td>
                            <td className="small text-muted">
                              {p.ubicacionTaller ? (
                                <span>
                                  <i className="bi bi-geo-alt me-1 text-danger"></i>
                                  {p.ubicacionTaller}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="font-mono small text-muted">{formatCurrency(p.costo)}</td>
                            <td className="font-mono fw-bold text-dark">{formatCurrency(p.precioVenta)}</td>
                            <td className="font-mono small">
                              {margen !== '-' ? (
                                <span className="badge bg-light text-success border">+{margen}%</span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="text-center">
                              {p.tipo === 'servicio' ? (
                                <span className="badge bg-light text-muted">N/A</span>
                              ) : (
                                <div className="d-flex align-items-center justify-content-center gap-2">
                                  <button
                                    className="btn btn-outline-secondary btn-sm p-0 px-2"
                                    onClick={() => handleAjusteStock(p.id, -1)}
                                    title="Restar 1"
                                  >
                                    -
                                  </button>
                                  <span
                                    className={`badge font-mono px-2 py-1 ${
                                      esBajo ? 'bg-danger' : 'bg-success'
                                    }`}
                                  >
                                    {p.stock}
                                  </span>
                                  <button
                                    className="btn btn-outline-secondary btn-sm p-0 px-2"
                                    onClick={() => handleAjusteStock(p.id, +1)}
                                    title="Sumar 1"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                              {esBajo && (
                                <div className="small text-danger fw-bold mt-1" style={{ fontSize: '0.7rem' }}>
                                  Mín: {p.stockMinimo}
                                </div>
                              )}
                            </td>
                            <td className="text-end pe-3">
                              <button
                                className="btn btn-sm btn-light border me-1"
                                onClick={() => openEditarProd(p)}
                                title="Editar"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteProd(p.id, p.nombre)}
                                title="Eliminar"
                              >
                                <i className="bi bi-trash3"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vista Tarjetas (Móvil) */}
              <div className="d-md-none d-flex flex-column gap-3">
                {filteredProds.map((p) => {
                  const margen =
                    p.costo > 0 ? (((p.precioVenta - p.costo) / p.costo) * 100).toFixed(0) : '-';
                  const esBajo = p.tipo !== 'servicio' && p.stock <= p.stockMinimo;

                  return (
                    <div key={p.id} className="mobile-data-card">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div>
                          <div className="fw-bold text-dark">{p.nombre}</div>
                          <div className="d-flex flex-wrap gap-1 mt-1">
                            <span className="badge bg-light text-secondary border font-mono x-small">
                              {p.codigo}
                            </span>
                            <span className="badge bg-light text-dark border x-small">
                              {p.categoriaNombre}
                            </span>
                            <span
                              className={`badge ${
                                p.tipo === 'repuesto'
                                  ? 'bg-info'
                                  : p.tipo === 'servicio'
                                  ? 'bg-warning text-dark'
                                  : 'bg-secondary'
                              } x-small`}
                            >
                              {p.tipo}
                            </span>
                          </div>
                        </div>
                        <div className="text-end flex-shrink-0">
                          <div className="fw-bold font-mono text-primary fs-6">
                            {formatCurrency(p.precioVenta)}
                          </div>
                          <div className="x-small text-muted font-mono">
                            Costo: {formatCurrency(p.costo)}
                            {margen !== '-' ? ` (+${margen}%)` : ''}
                          </div>
                        </div>
                      </div>

                      {(p.ubicacionTaller || p.proveedorNombre) && (
                        <div className="x-small text-muted mb-2">
                          {p.ubicacionTaller && (
                            <span className="me-3">
                              <i className="bi bi-geo-alt text-danger me-1"></i>
                              {p.ubicacionTaller}
                            </span>
                          )}
                          {p.proveedorNombre && <span>Prov: {p.proveedorNombre}</span>}
                        </div>
                      )}

                      <div className="d-flex justify-content-between align-items-center pt-2 border-top gap-2">
                        <div>
                          {p.tipo === 'servicio' ? (
                            <span className="badge bg-light text-muted">Servicio</span>
                          ) : (
                            <div className="d-flex align-items-center gap-2">
                              <button
                                className="btn btn-outline-secondary btn-sm py-0 px-2"
                                style={{ minHeight: '32px' }}
                                onClick={() => handleAjusteStock(p.id, -1)}
                              >
                                -
                              </button>
                              <span
                                className={`badge font-mono px-2 py-1 ${
                                  esBajo ? 'bg-danger' : 'bg-success'
                                }`}
                              >
                                Stock: {p.stock}
                              </span>
                              <button
                                className="btn btn-outline-secondary btn-sm py-0 px-2"
                                style={{ minHeight: '32px' }}
                                onClick={() => handleAjusteStock(p.id, +1)}
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-light border"
                            onClick={() => openEditarProd(p)}
                            title="Editar"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteProd(p.id, p.nombre)}
                            title="Eliminar"
                          >
                            <i className="bi bi-trash3"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* VISTA CATEGORÍAS */}
      {activeTab === 'categorias' && (
        <div className="row g-3">
          {categorias.map((c) => (
            <div key={c.id} className="col-12 col-md-6 col-lg-4">
              <div className="card border-0 shadow-sm h-100 bg-white">
                <div className="card-body p-4 d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="fw-bold mb-0 text-dark">{c.nombre}</h5>
                    <span className="badge bg-dark text-white text-uppercase">{c.tipo}</span>
                  </div>
                  <p className="text-muted small mb-3 flex-grow-1">
                    {c.descripcion || 'Sin descripción adicional.'}
                  </p>
                  <div className="d-flex justify-content-end gap-2 border-top pt-2">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => openEditarCat(c)}
                    >
                      <i className="bi bi-pencil me-1"></i> Editar
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDeleteCat(c.id, c.nombre)}
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

      {/* Modal Crear / Editar Producto */}
      {modalProdOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  {editingProd ? 'Editar Producto / Repuesto' : 'Nuevo Producto / Repuesto'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalProdOpen(false)}
                ></button>
              </div>
              <form onSubmit={handleSaveProd}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12 col-md-8">
                      <label className="form-label small fw-bold">
                        Nombre del Ítem / Repuesto <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={pNombre}
                        onChange={(e) => setPNombre(e.target.value)}
                        placeholder="Ej: Módulo Pantalla OLED iPhone 11 Pro o Pasta Térmica Arctic MX-4"
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Código SKU / Serial</label>
                      <input
                        type="text"
                        className="form-control font-mono"
                        value={pCodigo}
                        onChange={(e) => setPCodigo(e.target.value)}
                        placeholder="Dejar vacío para auto"
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Categoría</label>
                      <select
                        className="form-select"
                        value={pCategoriaId}
                        onChange={(e) => setPCategoriaId(e.target.value)}
                      >
                        {categorias.length === 0 && <option value="">Sin categorías (creá una primero)</option>}
                        {categorias.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Tipo de Ítem</label>
                      <select
                        className="form-select"
                        value={pTipo}
                        onChange={(e) => setPTipo(e.target.value as TipoProducto)}
                      >
                        <option value="repuesto">Repuesto de Laboratorio</option>
                        <option value="producto">Producto / Accesorio Mostrador</option>
                        <option value="consumible">Consumible Interno</option>
                        <option value="servicio">Servicio / Mano de Obra</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Costo de Compra ($)</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control font-mono"
                        value={pCosto}
                        onChange={(e) => setPCosto(Number(e.target.value))}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">
                        Precio de Venta ($) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        className="form-control font-mono fw-bold"
                        required
                        value={pPrecioVenta}
                        onChange={(e) => setPPrecioVenta(Number(e.target.value))}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Garantía Cliente (Meses)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={pGarantiaMesesCliente}
                        onChange={(e) => setPGarantiaMesesCliente(Number(e.target.value))}
                      />
                    </div>

                    {pTipo !== 'servicio' && (
                      <>
                        <div className="col-12 col-md-4">
                          <label className="form-label small fw-bold">Stock Actual</label>
                          <input
                            type="number"
                            className="form-control font-mono"
                            value={pStock}
                            onChange={(e) => setPStock(Number(e.target.value))}
                          />
                        </div>

                        <div className="col-12 col-md-4">
                          <label className="form-label small fw-bold">Stock Mínimo (Alerta)</label>
                          <input
                            type="number"
                            className="form-control font-mono"
                            value={pStockMinimo}
                            onChange={(e) => setPStockMinimo(Number(e.target.value))}
                          />
                        </div>

                        <div className="col-12 col-md-4">
                          <label className="form-label small fw-bold">Ubicación en Taller</label>
                          <input
                            type="text"
                            className="form-control"
                            value={pUbicacion}
                            onChange={(e) => setPUbicacion(e.target.value)}
                            placeholder="Ej: Gaveta 4 - B"
                          />
                        </div>
                      </>
                    )}

                    <div className="col-12">
                      <label className="form-label small fw-bold">Proveedor Habitual</label>
                      <select
                        className="form-select"
                        value={pProveedorId}
                        onChange={(e) => setPProveedorId(e.target.value)}
                      >
                        <option value="">(Ninguno / No especificado)</option>
                        {proveedores.map((pr) => (
                          <option key={pr.id} value={pr.id}>
                            {pr.razonSocial}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setModalProdOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingProd}>
                    {savingProd ? 'Guardando...' : editingProd ? 'Guardar Cambios' : 'Crear Producto'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Categoría */}
      {modalCatOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  {editingCat ? 'Editar Categoría' : 'Nueva Categoría'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalCatOpen(false)}
                ></button>
              </div>
              <form onSubmit={handleSaveCat}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-bold">
                        Nombre de Categoría <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={catNombre}
                        onChange={(e) => setCatNombre(e.target.value)}
                        placeholder="Ej: Pantallas Celulares, Insumos Soldadura, Cables y Cargadores"
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold">Tipo Predeterminado</label>
                      <select
                        className="form-select"
                        value={catTipo}
                        onChange={(e) => setCatTipo(e.target.value)}
                      >
                        <option value="repuesto">Repuesto</option>
                        <option value="producto">Producto / Accesorio</option>
                        <option value="consumible">Consumible</option>
                        <option value="servicio">Servicio</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold">Descripción (opcional)</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={catDescripcion}
                        onChange={(e) => setCatDescripcion(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setModalCatOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingCat}>
                    {savingCat ? 'Guardando...' : editingCat ? 'Guardar Cambios' : 'Crear Categoría'}
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
