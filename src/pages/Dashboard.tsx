import { useEffect, useState } from "react";
import { listPresupuestos } from "../services/presupuestos";
import { listOrdenes } from "../services/ordenes";
import { toast } from "react-hot-toast";

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalPres: 0,
        presAceptados: 0,
        totalOrds: 0,
        ordsPendientes: 0,
        ordsCompletadas: 0,
        totalPagado: 0,
        saldoPendiente: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [presData, ordsData] = await Promise.all([
                    listPresupuestos({ limit: 1000 }),
                    listOrdenes({ limit: 1000 })
                ]);

                const totalPres = presData.items.length;
                const presAceptados = presData.items.filter(p => p.status === 'aceptado').length;

                const totalOrds = ordsData.items.length;
                const ordsPendientes = ordsData.items.filter(o => o.status === 'pendiente' || o.status === 'en_progreso').length;
                const ordsCompletadas = ordsData.items.filter(o => o.status === 'completado').length;

                const totalPagado = ordsData.items.reduce((acc, o) => acc + (o.pagado ?? 0), 0);
                const saldoPendiente = ordsData.items.reduce((acc, o) => acc + (o.saldo ?? 0), 0);

                setStats({
                    totalPres,
                    presAceptados,
                    totalOrds,
                    ordsPendientes,
                    ordsCompletadas,
                    totalPagado,
                    saldoPendiente
                });
            } catch (e) {
                console.error(e);
                toast.error("Error al cargar estadísticas");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return <div className="container py-4">Cargando Dashboard…</div>;

    return (
        <div className="container py-5">
            <h2 className="mb-4 fw-bold text-gradient d-inline-block">Dashboard General</h2>

            <div className="grid-stats">
                <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
                    <label className="text-uppercase small fw-bold text-muted mb-2 d-block">PRESUPUESTOS</label>
                    <div className="fs-1 fw-bold text-primary">{stats.totalPres}</div>
                    <div className="text-success small mt-1 fw-semibold">
                        <i className="bi bi-check-circle-fill me-1"></i>
                        {stats.presAceptados} aceptados
                    </div>
                </div>

                <div className="card" style={{ borderTop: '4px solid var(--warning)' }}>
                    <label className="text-uppercase small fw-bold text-muted mb-2 d-block">ÓRDENES ACTIVAS</label>
                    <div className="fs-1 fw-bold" style={{ color: 'var(--warning)' }}>{stats.ordsPendientes}</div>
                    <div className="text-muted small mt-1">
                        <i className="bi bi-tools me-1"></i>
                        {stats.ordsCompletadas} finalizadas
                    </div>
                </div>

                <div className="card" style={{ borderTop: '4px solid var(--success)' }}>
                    <label className="text-uppercase small fw-bold text-muted mb-2 d-block">TOTAL RECAUDADO</label>
                    <div className="fs-1 fw-bold text-success">${stats.totalPagado.toLocaleString()}</div>
                    <div className="text-muted small mt-1">Efectivo / Otros</div>
                </div>

                <div className="card" style={{ borderTop: '4px solid var(--danger)' }}>
                    <label className="text-uppercase small fw-bold text-muted mb-2 d-block">SALDO PENDIENTE</label>
                    <div className="fs-1 fw-bold text-danger">${stats.saldoPendiente.toLocaleString()}</div>
                    <div className="text-muted small mt-1">Por cobrar</div>
                </div>
            </div>

            <div className="grid-cols-2">
                <div className="card">
                    <h3 className="fs-5 mb-4 fw-bold">Rendimiento de Conversión</h3>
                    <div style={{ height: 16, background: '#f1f3f4', borderRadius: 8, overflow: 'hidden', display: 'flex' }}>
                        <div style={{
                            width: `${(stats.presAceptados / (stats.totalPres || 1)) * 100}%`,
                            background: 'var(--gradient-primary)',
                            boxShadow: '0 0 10px rgba(67, 97, 238, 0.4)'
                        }} />
                    </div>
                    <p className="text-muted small mt-3 mb-0">
                        El <strong>{((stats.presAceptados / (stats.totalPres || 1)) * 100).toFixed(1)}%</strong> de tus presupuestos son aceptados satisfactoriamente.
                    </p>
                </div>

                <div className="card">
                    <h3 className="fs-5 mb-4 fw-bold">Estado de Reparaciones</h3>
                    <div style={{ height: 16, background: '#f1f3f4', borderRadius: 8, overflow: 'hidden', display: 'flex' }}>
                        <div style={{
                            width: `${(stats.ordsCompletadas / (stats.totalOrds || 1)) * 100}%`,
                            background: 'linear-gradient(90deg, #2ec4b6, #00b4d8)'
                        }} />
                    </div>
                    <p className="text-muted small mt-3 mb-0">
                        Has completado exitosamente el <strong>{((stats.ordsCompletadas / (stats.totalOrds || 1)) * 100).toFixed(1)}%</strong> de los trabajos técnicos asignados.
                    </p>
                </div>
            </div>
        </div>
    );
}
