import { useEffect, useState, useMemo } from 'react';
import { listProductos } from '../services/productos';
import { listClientes } from '../services/clientes';
import { crearVenta, listVentas } from '../services/ventas';
import type { Producto } from '../types/producto';
import type { Cliente } from '../types/cliente';
import type { Venta, VentaItem, TipoComprobante } from '../types/venta';
import type { PaymentMethod } from '../types/common';
import { toast } from 'react-hot-toast';
import { formatCurrency, formatDateTime } from '../lib/utils';
import { printDocumentHtml } from '../lib/print';

export default function Ventas() {
  const [activeView, setActiveView] = useState<'pos' | 'historial'>('pos');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);

  // POS State
  const [searchProd, setSearchProd] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [clienteNombreManual, setClienteNombreManual] = useState('Consumidor Final');
  const [clienteCuitManual, setClienteCuitManual] = useState('');
  const [cart, setCart] = useState<VentaItem[]>([]);
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>('Efectivo');
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>('ticket');
  const [descuentoPct, setDescuentoPct] = useState<number>(0);
  const [referenciaPago, setReferenciaPago] = useState('');
  const [cobrando, setCobrando] = useState(false);

  // Venta Completada para Modal / Ticket
  const [ultimaVenta, setUltimaVenta] = useState<Venta | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, clis, vts] = await Promise.all([
        listProductos(300),
        listClientes(100),
        listVentas(50),
      ]);
      setProductos(prods);
      setClientes(clis);
      setVentas(vts);
    } catch (e) {
      console.error(e);
      toast.error('Error al inicializar Punto de Venta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Manejo de Selección de Cliente
  const handleSelectCliente = (id: string) => {
    setSelectedClienteId(id);
    if (!id) {
      setClienteNombreManual('Consumidor Final');
      setClienteCuitManual('');
      return;
    }
    const c = clientes.find((cli) => cli.id === id);
    if (c) {
      setClienteNombreManual(c.nombre);
      setClienteCuitManual(c.cuitDni || '');
    }
  };

  // Carrito
  const addToCart = (p: Producto) => {
    if (p.tipo !== 'servicio' && p.stock <= 0) {
      toast.error(`"${p.nombre}" no tiene stock disponible.`);
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((item) => item.productoId === p.id);
      if (idx >= 0) {
        const item = prev[idx];
        const newQty = item.cantidad + 1;
        if (p.tipo !== 'servicio' && newQty > p.stock) {
          toast.error(`Solo hay ${p.stock} unidades en stock.`);
          return prev;
        }
        const updated = [...prev];
        updated[idx] = {
          ...item,
          cantidad: newQty,
          subtotal: newQty * item.precioUnitario,
        };
        return updated;
      }
      return [
        ...prev,
        {
          productoId: p.id,
          codigo: p.codigo,
          descripcion: p.nombre,
          cantidad: 1,
          precioUnitario: p.precioVenta,
          costoUnitario: p.costo,
          subtotal: p.precioVenta,
        },
      ];
    });
  };

  const updateCartQty = (idx: number, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    setCart((prev) => {
      const item = prev[idx];
      const prod = productos.find((p) => p.id === item.productoId);
      if (prod && prod.tipo !== 'servicio' && newQty > prod.stock) {
        toast.error(`Stock máximo disponible: ${prod.stock}`);
        return prev;
      }
      const updated = [...prev];
      updated[idx] = {
        ...item,
        cantidad: newQty,
        subtotal: newQty * item.precioUnitario,
      };
      return updated;
    });
  };

  const updateCartPrice = (idx: number, newPrice: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[idx];
      updated[idx] = {
        ...item,
        precioUnitario: newPrice,
        subtotal: item.cantidad * newPrice,
      };
      return updated;
    });
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  // Totales
  const subtotalCart = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.subtotal, 0);
  }, [cart]);

  const totalCart = useMemo(() => {
    const desc = subtotalCart * ((Number(descuentoPct) || 0) / 100);
    return Math.max(0, subtotalCart - desc);
  }, [subtotalCart, descuentoPct]);

  // Cobrar Venta
  const handleCobrar = async () => {
    if (cart.length === 0) {
      toast.error('El carrito de compras está vacío');
      return;
    }
    setCobrando(true);
    try {
      const descMonto = subtotalCart * ((Number(descuentoPct) || 0) / 100);
      const res = await crearVenta({
        clienteId: selectedClienteId || undefined,
        clienteNombre: clienteNombreManual || 'Consumidor Final',
        clienteCuitDni: clienteCuitManual || undefined,
        items: cart,
        subtotal: subtotalCart,
        descuentoPct: Number(descuentoPct) || 0,
        descuentoMonto: descMonto,
        total: totalCart,
        metodoPago,
        referenciaPago: referenciaPago || undefined,
        tipoComprobante,
        vendedor: 'Mostrador',
      });

      const ventaGuardada: Venta = {
        id: res.id,
        codigo: res.codigo,
        anio: new Date().getFullYear(),
        numero: 0,
        clienteId: selectedClienteId || undefined,
        clienteNombre: clienteNombreManual || 'Consumidor Final',
        clienteCuitDni: clienteCuitManual || undefined,
        items: [...cart],
        subtotal: subtotalCart,
        descuentoPct: Number(descuentoPct) || 0,
        descuentoMonto: descMonto,
        total: totalCart,
        metodoPago,
        referenciaPago,
        tipoComprobante,
        vendedor: 'Mostrador',
        createdAt: Date.now(),
      };

      setUltimaVenta(ventaGuardada);
      toast.success(`¡Venta registrada con éxito! Comprobante: ${res.codigo}`);

      // Reset
      setCart([]);
      setDescuentoPct(0);
      setReferenciaPago('');
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('Error al registrar la venta');
    } finally {
      setCobrando(false);
    }
  };

  // Impresión de Ticket
  const imprimirTicket = (v: Venta) => {
    const html = `
      <div style="font-family: monospace; max-width: 300px; margin: 0 auto; padding: 10px; font-size: 12px; color: #000;">
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
          <h2 style="margin: 0; font-size: 16px; font-weight: bold;">SONTECH</h2>
          <div style="font-size: 11px;">Laboratorio Técnico & Insumos IT</div>
          <div style="margin-top: 4px;">Comprobante: <strong>${v.codigo}</strong></div>
          <div>Fecha: ${formatDateTime(v.createdAt)}</div>
        </div>

        <div style="margin-bottom: 8px; font-size: 11px;">
          <div><strong>Cliente:</strong> ${v.clienteNombre}</div>
          ${v.clienteCuitDni ? `<div><strong>ID/CUIT:</strong> ${v.clienteCuitDni}</div>` : ''}
          <div><strong>Pago:</strong> ${v.metodoPago} ${v.referenciaPago ? `(${v.referenciaPago})` : ''}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px;">
          <thead>
            <tr style="border-bottom: 1px solid #000; text-align: left;">
              <th>Cant</th>
              <th>Detalle</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${v.items
              .map(
                (it) => `
              <tr>
                <td style="vertical-align: top;">${it.cantidad}x</td>
                <td style="vertical-align: top;">${it.descripcion}</td>
                <td style="text-align: right; vertical-align: top;">$${it.subtotal.toLocaleString('es-AR')}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div style="border-top: 1px dashed #000; padding-top: 6px; text-align: right;">
          ${
            v.descuentoMonto && v.descuentoMonto > 0
              ? `<div>Subtotal: $${v.subtotal.toLocaleString('es-AR')}</div>
                 <div>Descuento: -$${v.descuentoMonto.toLocaleString('es-AR')}</div>`
              : ''
          }
          <div style="font-size: 14px; font-weight: bold;">TOTAL: $${v.total.toLocaleString('es-AR')}</div>
        </div>

        <div style="text-align: center; margin-top: 15px; font-size: 10px; border-top: 1px dashed #000; padding-top: 6px;">
          ¡Gracias por tu compra en Sontech!<br/>
          Garantía y consultas: soporte@sontech.com.ar
        </div>
      </div>
    `;
    printDocumentHtml(html, `Ticket-${v.codigo}`);
  };

  // Productos filtrados para el POS
  const prodsDisponibles = useMemo(() => {
    const q = searchProd.toLowerCase();
    return productos.filter(
      (p) =>
        p.activo &&
        (p.nombre.toLowerCase().includes(q) ||
          p.codigo.toLowerCase().includes(q) ||
          p.categoriaNombre.toLowerCase().includes(q))
    );
  }, [productos, searchProd]);

  return (
    <div className="container-fluid px-3 px-md-4 py-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
        <div>
          <h2 className="fw-bold mb-1 font-display">Punto de Venta & Facturación</h2>
          <p className="text-muted small mb-0">
            Ventas rápidas de mostrador, accesorios, repuestos y emisión de comprobantes
          </p>
        </div>
        <div className="btn-group">
          <button
            className={`btn btn-sm ${activeView === 'pos' ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setActiveView('pos')}
          >
            <i className="bi bi-cart3 me-1"></i> Mostrador / POS
          </button>
          <button
            className={`btn btn-sm ${activeView === 'historial' ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setActiveView('historial')}
          >
            <i className="bi bi-receipt me-1"></i> Historial de Ventas ({ventas.length})
          </button>
        </div>
      </div>

      {activeView === 'pos' ? (
        <div className="row g-4">
          {/* LADO IZQUIERDO: CATÁLOGO */}
          <div className="col-12 col-lg-7">
            <div className="card border-0 shadow-sm p-3 bg-white mb-3">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Buscar producto por nombre, SKU o categoría..."
                  value={searchProd}
                  onChange={(e) => setSearchProd(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5 text-muted">Cargando catálogo...</div>
            ) : prodsDisponibles.length === 0 ? (
              <div className="card border-0 shadow-sm p-5 text-center bg-white text-muted">
                No se encontraron productos coincidentes.
              </div>
            ) : (
              <div className="row g-2" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                {prodsDisponibles.map((p) => {
                  const sinStock = p.tipo !== 'servicio' && p.stock <= 0;
                  return (
                    <div key={p.id} className="col-12 col-md-6 col-xl-4">
                      <div
                        className={`card border-0 shadow-sm h-100 p-3 bg-white cursor-pointer ${
                          sinStock ? 'opacity-50' : 'hover-shadow'
                        }`}
                        onClick={() => addToCart(p)}
                        style={{ cursor: sinStock ? 'not-allowed' : 'pointer' }}
                      >
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <span className="badge bg-light text-secondary border font-mono small">
                            {p.codigo}
                          </span>
                          {p.tipo !== 'servicio' ? (
                            <span
                              className={`badge font-mono small ${
                                p.stock <= p.stockMinimo ? 'bg-danger' : 'bg-light text-dark border'
                              }`}
                            >
                              Stock: {p.stock}
                            </span>
                          ) : (
                            <span className="badge bg-warning text-dark small">Servicio</span>
                          )}
                        </div>
                        <div className="fw-bold text-dark text-truncate mb-2" title={p.nombre}>
                          {p.nombre}
                        </div>
                        <div className="mt-auto d-flex justify-content-between align-items-center">
                          <span className="text-muted small">{p.categoriaNombre}</span>
                          <span className="fw-bold text-primary font-mono fs-6">
                            {formatCurrency(p.precioVenta)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LADO DERECHO: TICKET & COBRO */}
          <div className="col-12 col-lg-5">
            <div className="card border-0 shadow-sm bg-white p-4 sticky-top" style={{ top: '85px' }}>
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <h5 className="fw-bold mb-0">Detalle de Venta</h5>
                <button
                  className="btn btn-sm btn-link text-danger text-decoration-none p-0"
                  onClick={() => setCart([])}
                  disabled={cart.length === 0}
                >
                  Vaciar carrito
                </button>
              </div>

              {/* Selección de Cliente */}
              <div className="row g-2 mb-3">
                <div className="col-12 col-sm-6">
                  <label className="form-label small fw-bold text-muted mb-1">Cliente Registrado</label>
                  <select
                    className="form-select form-select-sm"
                    value={selectedClienteId}
                    onChange={(e) => handleSelectCliente(e.target.value)}
                  >
                    <option value="">Consumidor Final / Anónimo</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label small fw-bold text-muted mb-1">Nombre en Ticket</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={clienteNombreManual}
                    onChange={(e) => setClienteNombreManual(e.target.value)}
                  />
                </div>
              </div>

              {/* Lista del Carrito */}
              <div
                className="table-responsive mb-3"
                style={{ maxHeight: '250px', overflowY: 'auto' }}
              >
                {cart.length === 0 ? (
                  <div className="text-center py-4 text-muted small">
                    <i className="bi bi-cart-x fs-2 d-block mb-1 opacity-50"></i>
                    Haz clic en los productos para agregarlos al ticket.
                  </div>
                ) : (
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th>Ítem</th>
                        <th style={{ width: '85px' }}>Cant</th>
                        <th style={{ width: '90px' }}>Precio</th>
                        <th className="text-end">Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((it, idx) => (
                        <tr key={idx}>
                          <td>
                            <div className="small fw-semibold text-truncate" style={{ maxWidth: '140px' }}>
                              {it.descripcion}
                            </div>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              className="form-control form-control-sm font-mono text-center p-1"
                              value={it.cantidad}
                              onChange={(e) => updateCartQty(idx, parseInt(e.target.value) || 1)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control form-control-sm font-mono text-end p-1"
                              value={it.precioUnitario}
                              onChange={(e) => updateCartPrice(idx, parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="text-end font-mono small fw-bold">
                            {formatCurrency(it.subtotal)}
                          </td>
                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-link text-danger p-0 border-0"
                              onClick={() => removeFromCart(idx)}
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Parámetros de Cobro */}
              <div className="bg-light p-3 rounded mb-3">
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted mb-1">Método de Pago</label>
                    <select
                      className="form-select form-select-sm"
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value as PaymentMethod)}
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="MercadoPago">MercadoPago</option>
                      <option value="Débito">Tarjeta Débito</option>
                      <option value="Crédito">Tarjeta Crédito</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted mb-1">Comprobante</label>
                    <select
                      className="form-select form-select-sm"
                      value={tipoComprobante}
                      onChange={(e) => setTipoComprobante(e.target.value as TipoComprobante)}
                    >
                      <option value="ticket">Ticket Mostrador</option>
                      <option value="recibo">Recibo X</option>
                      <option value="factura_b">Factura B</option>
                      <option value="factura_a">Factura A</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted mb-1">Descuento (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-control form-control-sm font-mono"
                      value={descuentoPct}
                      onChange={(e) => setDescuentoPct(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold text-muted mb-1">Ref / Operación</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Nro comprobante..."
                      value={referenciaPago}
                      onChange={(e) => setReferenciaPago(e.target.value)}
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                  <span className="text-muted small">Subtotal:</span>
                  <span className="font-mono">{formatCurrency(subtotalCart)}</span>
                </div>
                {descuentoPct > 0 && (
                  <div className="d-flex justify-content-between align-items-center text-success small">
                    <span>Descuento ({descuentoPct}%):</span>
                    <span className="font-mono">
                      -{formatCurrency(subtotalCart * (descuentoPct / 100))}
                    </span>
                  </div>
                )}
                <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-1">
                  <span className="fw-bold fs-5 text-dark">TOTAL:</span>
                  <span className="font-mono fw-bold fs-4 text-primary">
                    {formatCurrency(totalCart)}
                  </span>
                </div>
              </div>

              {/* Botón Cobrar */}
              <button
                className="btn btn-primary btn-lg w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
                disabled={cart.length === 0 || cobrando}
                onClick={handleCobrar}
              >
                {cobrando ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle fs-5"></i>
                    <span>Cobrar {formatCurrency(totalCart)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* HISTORIAL DE VENTAS */
        <div className="card border-0 shadow-sm bg-white overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-uppercase text-muted">
                <tr>
                  <th className="ps-3">Código</th>
                  <th>Fecha & Hora</th>
                  <th>Cliente</th>
                  <th>Comprobante / Pago</th>
                  <th>Ítems</th>
                  <th className="text-end">Total</th>
                  <th className="text-end pe-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ventas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      No hay ventas registradas aún.
                    </td>
                  </tr>
                ) : (
                  ventas.map((v) => (
                    <tr key={v.id}>
                      <td className="ps-3 font-mono fw-bold text-dark">{v.codigo}</td>
                      <td className="small text-muted font-mono">{formatDateTime(v.createdAt)}</td>
                      <td>
                        <div className="fw-semibold text-dark">{v.clienteNombre}</div>
                        {v.clienteCuitDni && (
                          <div className="small text-muted font-mono">CUIT/DNI: {v.clienteCuitDni}</div>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border me-1 text-uppercase">
                          {v.tipoComprobante}
                        </span>
                        <span className="badge bg-secondary small">{v.metodoPago}</span>
                      </td>
                      <td className="small text-muted">
                        {v.items.length} {v.items.length === 1 ? 'producto' : 'productos'}
                      </td>
                      <td className="text-end font-mono fw-bold text-primary">
                        {formatCurrency(v.total)}
                      </td>
                      <td className="text-end pe-3">
                        <button
                          className="btn btn-sm btn-outline-dark"
                          onClick={() => imprimirTicket(v)}
                          title="Imprimir Ticket"
                        >
                          <i className="bi bi-printer me-1"></i> Ticket
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Última Venta / Éxito */}
      {ultimaVenta && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg text-center p-4">
              <div className="mb-3">
                <i className="bi bi-check-circle-fill text-success display-3"></i>
              </div>
              <h4 className="fw-bold mb-1">¡Venta Registrada!</h4>
              <p className="text-muted small mb-3">
                Código de operación: <strong className="font-mono">{ultimaVenta.codigo}</strong>
              </p>

              <div className="bg-light p-3 rounded mb-3 text-start small">
                <div className="d-flex justify-content-between">
                  <span>Cliente:</span>
                  <strong>{ultimaVenta.clienteNombre}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Método de pago:</span>
                  <strong>{ultimaVenta.metodoPago}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Monto Total:</span>
                  <strong className="text-primary font-mono fs-6">
                    {formatCurrency(ultimaVenta.total)}
                  </strong>
                </div>
              </div>

              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-secondary w-50"
                  onClick={() => setUltimaVenta(null)}
                >
                  Continuar
                </button>
                <button
                  className="btn btn-dark w-50 d-flex align-items-center justify-content-center gap-2"
                  onClick={() => {
                    imprimirTicket(ultimaVenta);
                    setUltimaVenta(null);
                  }}
                >
                  <i className="bi bi-printer"></i>
                  <span>Imprimir Ticket</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
