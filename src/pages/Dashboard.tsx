import { useEffect, useState } from "react";
import { listPresupuestos } from "../services/presupuestos";
import { listOrdenes } from "../services/ordenes";
import { listClientes } from "../services/clientes";
import { listProductos } from "../services/productos";
import { listVentas } from "../services/ventas";
import { listEquipos } from "../services/equipos";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import { formatCurrency } from "../lib/utils";

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalPres: 0,
        presAceptados: 0,
        totalOrds: 0,
        ordsPendientes: 0,
        ordsCompletadas: 0,
        totalPagado: 0,
        saldoPendiente: 0,
        totalClientes: 0,
        totalEquipos: 0,
        totalVentasMostrador: 0,
        cantidadVentasMostrador: 0,
        prodsStockBajo: 0,
        ordsSlaAlerta: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [presData, ordsData, clis, prods, vts, eqs] = await Promise.all([
                    listPresupuestos({ limit: 500 }),
                    listOrdenes({ limit: 500 }),
                    listClientes(300),
                    listProductos(300),
                    listVentas(100),
                    listEquipos(undefined, 300),
                ]);

                const totalPres = presData.items.length;
                const presAceptados = presData.items.filter(p => p.status === 'aceptado').length;

                const totalOrds = ordsData.items.length;
                const ordsPendientes = ordsData.items.filter(o => o.status === 'pendiente' || o.status === 'en_progreso' || o.status === 'esperando_repuestos').length;
                const ordsCompletadas = ordsData.items.filter(o => o.status === 'completado').length;

                // SLA Alerta: > 5 días abierta y no completada
                const ahora = Date.now();
                const ordsSlaAlerta = ordsData.items.filter(o => {
                    const dias = (ahora - o.createdAt) / (1000 * 60 * 60 * 24);
                    return dias > 5 && o.status !== 'completado' && o.status !== 'entregado';
                }).length;

                const totalPagado = ordsData.items.reduce((acc, o) => acc + (o.pagado ?? 0), 0);
                const saldoPendiente = ordsData.items.reduce((acc, o) => acc + (o.saldo ?? 0), 0);

                const totalVentasMostrador = vts.reduce((acc, v) => acc + (v.total || 0), 0);
                const prodsStockBajo = prods.filter(p => p.tipo !== 'servicio' && p.stock <= p.stockMinimo).length;

                setStats({
                    totalPres,
                    presAceptados,
                    totalOrds,
                    ordsPendientes,
                    ordsCompletadas,
                    totalPagado,
                    saldoPendiente,
                    totalClientes: clis.length,
                    totalEquipos: eqs.length,
                    totalVentasMostrador,
                    cantidadVentasMostrador: vts.length,
                    prodsStockBajo,
                    ordsSlaAlerta,
                });
            } catch (e) {
                console.error(e);
                toast.error("Error al cargar estadísticas");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div className="container py-5 text-center text-muted">
                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                <span>Cargando panel de control de Sontech...</span>
            </div>
        );
    }

    return (
        <div className="container py-4">
            {/* Header del Dashboard */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                <div>
                    <h2 className="fw-bold mb-1 font-display text-gradient">Panel de Control & Laboratorio</h2>
                    <p className="text-muted small mb-0">
                        Métricas comerciales, taller técnico en tiempo real e inventario de Sontech
                    </p>
                </div>
                <div className="d-flex flex-wrap gap-2">
                    <Link to="/beneficios-promo" className="btn btn-outline-success btn-sm d-flex align-items-center gap-1 fw-semibold">
                        <i className="bi bi-gift-fill"></i>
                        <span>Turnero & Promo Limpieza</span>
                    </Link>
                    <Link to="/ventas" className="btn btn-outline-dark btn-sm d-flex align-items-center gap-1">
                        <i className="bi bi-cart3"></i>
                        <span>Venta Mostrador</span>
                    </Link>
                    <Link to="/gestion" className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1">
                        <i className="bi bi-tools"></i>
                        <span>Órdenes (OT)</span>
                    </Link>
                    <Link to="/presupuestos" className="btn btn-primary btn-sm d-flex align-items-center gap-1">
                        <i className="bi bi-file-earmark-text"></i>
                        <span>Presupuestos</span>
                    </Link>
                </div>
            </div>

            {/* Alerta de SLA si hay demoras */}
            {stats.ordsSlaAlerta > 0 && (
                <div className="alert alert-warning border-0 shadow-sm d-flex align-items-center justify-content-between p-3 rounded-3 mb-4">
                    <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-exclamation-triangle-fill fs-4 text-warning"></i>
                        <div>
                            <strong>Alerta de Taller:</strong> Hay{' '}
                            <span className="badge bg-warning text-dark font-mono">{stats.ordsSlaAlerta}</span> órdenes con más de 5 días de demora en diagnóstico o repuestos.
                        </div>
                    </div>
                    <Link to="/gestion" className="btn btn-sm btn-dark">
                        Ver Órdenes
                    </Link>
                </div>
            )}

            {/* Grid Estadísticas Principales */}
            <div className="grid-stats mb-4">
                <Link to="/presupuestos" className="card shadow-sm border-0 text-decoration-none text-reset" style={{ borderTop: '3px solid var(--tech-accent)' }}>
                    <label className="text-uppercase small fw-bold text-muted mb-2 d-block cursor-pointer">PRESUPUESTOS</label>
                    <div className="fs-1 fw-bold text-primary font-mono">{stats.totalPres}</div>
                    <div className="text-success small mt-1 fw-semibold">
                        <i className="bi bi-check-circle-fill me-1"></i>
                        <span className="font-mono">{stats.presAceptados}</span> convertidos a OT
                    </div>
                </Link>

                <Link to="/gestion" className="card shadow-sm border-0 text-decoration-none text-reset" style={{ borderTop: '3px solid var(--warning)' }}>
                    <label className="text-uppercase small fw-bold text-muted mb-2 d-block cursor-pointer">ÓRDENES EN BANCO</label>
                    <div className="fs-1 fw-bold font-mono text-warning">{stats.ordsPendientes}</div>
                    <div className="text-muted small mt-1">
                        <i className="bi bi-tools me-1"></i>
                        <span className="font-mono">{stats.ordsCompletadas}</span> listas para retirar
                    </div>
                </Link>

                <div className="card shadow-sm border-0" style={{ borderTop: '3px solid var(--success)' }}>
                    <label className="text-uppercase small fw-bold text-muted mb-2 d-block">COBRANZAS TALLER</label>
                    <div className="fs-1 fw-bold text-success font-mono">{formatCurrency(stats.totalPagado)}</div>
                    <div className="text-muted small mt-1">Pagos registrados en OTs</div>
                </div>

                <div className="card shadow-sm border-0" style={{ borderTop: '3px solid var(--danger)' }}>
                    <label className="text-uppercase small fw-bold text-muted mb-2 d-block">SALDO POR COBRAR</label>
                    <div className="fs-1 fw-bold text-danger font-mono">{formatCurrency(stats.saldoPendiente)}</div>
                    <div className="text-muted small mt-1">Pendiente de cobro</div>
                </div>
            </div>

            {/* Segunda Fila: Métricas ERP */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="card border-0 shadow-sm p-3 bg-white h-100">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="text-muted small fw-bold text-uppercase">Ventas Mostrador (POS)</span>
                            <i className="bi bi-shop text-primary fs-5"></i>
                        </div>
                        <div className="fs-3 fw-bold font-mono text-dark">
                            {formatCurrency(stats.totalVentasMostrador)}
                        </div>
                        <div className="small text-muted font-mono">{stats.cantidadVentasMostrador} tickets emitidos</div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="card border-0 shadow-sm p-3 bg-white h-100">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="text-muted small fw-bold text-uppercase">Clientes Registrados</span>
                            <i className="bi bi-people text-info fs-5"></i>
                        </div>
                        <div className="fs-3 fw-bold font-mono text-dark">{stats.totalClientes}</div>
                        <div className="small text-muted">Cuentas particulares y empresas</div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="card border-0 shadow-sm p-3 bg-white h-100">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="text-muted small fw-bold text-uppercase">Equipos en CMDB</span>
                            <i className="bi bi-laptop text-dark fs-5"></i>
                        </div>
                        <div className="fs-3 fw-bold font-mono text-dark">{stats.totalEquipos}</div>
                        <div className="small text-muted">Con historia clínica de serie</div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="card border-0 shadow-sm p-3 bg-white h-100">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="text-muted small fw-bold text-uppercase">Stock Bajo / Crítico</span>
                            <i className="bi bi-box-seam text-danger fs-5"></i>
                        </div>
                        <div className="fs-3 fw-bold font-mono text-danger">{stats.prodsStockBajo}</div>
                        <div className="small text-muted">Repuestos por debajo del mínimo</div>
                    </div>
                </div>
            </div>

            {/* Rendimiento & Gráficos Visuales */}
            <div className="grid-cols-2 mb-4">
                <div className="card shadow-sm border-0">
                    <h3 className="fs-5 mb-4 fw-bold">Tasa de Conversión de Presupuestos</h3>
                    <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                        <div style={{
                            width: `${(stats.presAceptados / (stats.totalPres || 1)) * 100}%`,
                            background: 'var(--gradient-primary)',
                        }} />
                    </div>
                    <p className="text-muted small mt-3 mb-0">
                        El <strong className="font-mono">{((stats.presAceptados / (stats.totalPres || 1)) * 100).toFixed(1)}%</strong> de tus cotizaciones se convierten en órdenes de trabajo efectivas.
                    </p>
                </div>

                <div className="card shadow-sm border-0">
                    <h3 className="fs-5 mb-4 fw-bold">Rendimiento de Reparaciones en Taller</h3>
                    <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                        <div style={{
                            width: `${(stats.ordsCompletadas / (stats.totalOrds || 1)) * 100}%`,
                            background: 'var(--success)'
                        }} />
                    </div>
                    <p className="text-muted small mt-3 mb-0">
                        Se ha entregado y completado el <strong className="font-mono">{((stats.ordsCompletadas / (stats.totalOrds || 1)) * 100).toFixed(1)}%</strong> de las órdenes ingresadas.
                    </p>
                </div>
            </div>

            {/* Accesos Rápidos del Laboratorio */}
            <div className="card border-0 shadow-sm p-4 bg-white">
                <h6 className="fw-bold text-dark text-uppercase small mb-3">Módulos & Herramientas Rápidas</h6>
                <div className="row g-2">
                    <div className="col-6 col-md-3">
                        <Link to="/equipos" className="btn btn-outline-secondary w-100 text-start py-2 px-3">
                            <i className="bi bi-laptop me-2 text-primary"></i> Equipos (CMDB)
                        </Link>
                    </div>
                    <div className="col-6 col-md-3">
                        <Link to="/clientes" className="btn btn-outline-secondary w-100 text-start py-2 px-3">
                            <i className="bi bi-people me-2 text-info"></i> Directorio Clientes
                        </Link>
                    </div>
                    <div className="col-6 col-md-3">
                        <Link to="/productos" className="btn btn-outline-secondary w-100 text-start py-2 px-3">
                            <i className="bi bi-boxes me-2 text-warning"></i> Catálogo de Stock
                        </Link>
                    </div>
                    <div className="col-6 col-md-3">
                        <Link to="/kb" className="btn btn-outline-secondary w-100 text-start py-2 px-3">
                            <i className="bi bi-journal-code me-2 text-success"></i> Base de Conocimiento
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
