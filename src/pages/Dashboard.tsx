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

    if (loading) return <div className="container">Cargando Dashboard…</div>;

    return (
        <div className="container">
            <h2 className="title" style={{ textAlign: 'left', marginBottom: 24 }}>Dashboard General</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 30 }}>
                <div className="card" style={{ borderLeft: '4px solid #0d6efd' }}>
                    <label style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>PRESUPUESTOS</label>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{stats.totalPres}</div>
                    <div style={{ color: '#027a48', fontSize: 12, marginTop: 4 }}>{stats.presAceptados} aceptados</div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <label style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>ÓRDENES ACTIVAS</label>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{stats.ordsPendientes}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{stats.ordsCompletadas} finalizadas</div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
                    <label style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>TOTAL RECAUDADO</label>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8, color: '#027a48' }}>${stats.totalPagado.toFixed(2)}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>Efectivo / Otros</div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
                    <label style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>SALDO PENDIENTE</label>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8, color: '#b42318' }}>${stats.saldoPendiente.toFixed(2)}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>Por cobrar</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="card">
                    <h3 style={{ marginTop: 0, fontSize: 16 }}>Rendimiento de Conversión</h3>
                    <div style={{ height: 12, background: '#f2f4f7', borderRadius: 6, marginTop: 20, overflow: 'hidden', display: 'flex' }}>
                        <div style={{
                            width: `${(stats.presAceptados / (stats.totalPres || 1)) * 100}%`,
                            background: '#0d6efd'
                        }} />
                    </div>
                    <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 10 }}>
                        El <strong>{((stats.presAceptados / (stats.totalPres || 1)) * 100).toFixed(1)}%</strong> de tus presupuestos son aceptados.
                    </p>
                </div>

                <div className="card">
                    <h3 style={{ marginTop: 0, fontSize: 16 }}>Estado de Reparaciones</h3>
                    <div style={{ height: 12, background: '#f2f4f7', borderRadius: 6, marginTop: 20, overflow: 'hidden', display: 'flex' }}>
                        <div style={{
                            width: `${(stats.ordsCompletadas / (stats.totalOrds || 1)) * 100}%`,
                            background: '#10b981'
                        }} />
                    </div>
                    <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 10 }}>
                        Has finalizado el <strong>{((stats.ordsCompletadas / (stats.totalOrds || 1)) * 100).toFixed(1)}%</strong> de tus trabajos.
                    </p>
                </div>
            </div>
        </div>
    );
}
