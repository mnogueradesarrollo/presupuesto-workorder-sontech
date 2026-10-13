import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrdenPublica } from '../services/flujo';
import { getPresupuesto } from '../services/presupuestos';
import { aceptarPresupuesto } from '../services/flujo';
import type { Orden } from '../types/orden';
import type { Presupuesto } from '../types/presupuesto';
import logoUrl from '../assets/logotipo-sontech.png';
import { formatCurrency, formatDateTime } from '../lib/utils';
import { toast } from 'react-hot-toast';

export default function TrackingPublico() {
  const { codigo } = useParams<{ codigo: string }>();
  const [orden, setOrden] = useState<Orden | null>(null);
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
  const [loading, setLoading] = useState(true);
  const [aprobando, setAprobando] = useState(false);
  const [aprobadoExitoso, setAprobadoExitoso] = useState(false);

  useEffect(() => {
    if (!codigo) return;
    (async () => {
      try {
        setLoading(true);
        const ord = await getOrdenPublica(codigo);
        if (ord) {
          setOrden(ord);
          if (ord.presupuestoId && ord.presupuestoId !== 'BENEFICIO-PROMO') {
            const p = await getPresupuesto(ord.presupuestoId);
            setPresupuesto(p);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [codigo]);

  const handleAprobarPresupuesto = async () => {
    if (!presupuesto || !orden) return;
    if (!window.confirm('¿Confirmas la aprobación del presupuesto para iniciar los trabajos en tu equipo?')) {
      return;
    }
    setAprobando(true);
    try {
      await aceptarPresupuesto(presupuesto.id, {
        nombre: orden.cliente || 'Aprobado por Cliente en Portal',
        metodo: 'otro',
        aceptadoAt: Date.now(),
      });
      setAprobadoExitoso(true);
      toast.success('¡Presupuesto aprobado con éxito! El taller comenzará la reparación.');
      // Refrescar orden
      const updated = await getOrdenPublica(codigo!);
      if (updated) setOrden(updated);
    } catch (e) {
      console.error(e);
      toast.error('No se pudo registrar la aprobación. Por favor contáctanos por WhatsApp.');
    } finally {
      setAprobando(false);
    }
  };

  // Etapas del Flujo
  const etapas = [
    { key: 'pendiente', label: 'Ingresado', desc: 'Recepción y triage inicial' },
    { key: 'en_progreso', label: 'En Diagnóstico', desc: 'Evaluación técnica en banco' },
    { key: 'esperando_repuestos', label: 'Repuestos / Reparación', desc: 'Trabajando en el equipo' },
    { key: 'completado', label: 'Listo p/ Retirar', desc: 'Testeo final superado' },
    { key: 'entregado', label: 'Entregado', desc: 'Retirado por el titular' },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 0;
      case 'en_progreso':
        return 1;
      case 'esperando_repuestos':
      case 'pausado':
        return 2;
      case 'completado':
        return 3;
      case 'entregado':
        return 4;
      default:
        return 0;
    }
  };

  const currentStep = orden ? getStepIndex(orden.status) : 0;

  if (loading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary mb-3" role="status"></div>
        <div className="text-muted fw-semibold">Consultando estado de la orden en Sontech...</div>
      </div>
    );
  }

  if (!orden) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light p-4 text-center">
        <img src={logoUrl} alt="Sontech" style={{ height: '45px' }} className="mb-4" />
        <div className="card border-0 shadow-sm p-5 bg-white" style={{ maxWidth: '480px' }}>
          <i className="bi bi-search text-muted display-4 mb-3 opacity-50"></i>
          <h4 className="fw-bold text-dark">Orden no encontrada</h4>
          <p className="text-muted small">
            No encontramos ninguna orden de trabajo asociada al código o token{' '}
            <strong className="font-mono text-dark">{codigo}</strong>.
          </p>
          <div className="mt-3">
            <a
              href="https://wa.me/5491112345678"
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline-success d-inline-flex align-items-center gap-2"
            >
              <i className="bi bi-whatsapp"></i>
              <span>Consultar por WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const equipoStr = `${orden.equipo?.marca || ''} ${orden.equipo?.modelo || ''}`.trim() || 'Dispositivo';

  return (
    <div className="min-vh-100 bg-light py-4 py-md-5">
      <div className="container" style={{ maxWidth: '850px' }}>
        {/* Header Branding */}
        <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
          <Link to="/" className="text-decoration-none">
            <img src={logoUrl} alt="Sontech" style={{ height: '40px' }} />
          </Link>
          <span className="badge bg-dark font-mono fs-6 px-3 py-2">
            OT: {orden.codigo || orden.id}
          </span>
        </div>

        {/* Card Principal: Estado & Progreso */}
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4 bg-white">
          <div className="card-header bg-dark text-white p-4">
            <div className="row align-items-center">
              <div className="col-12 col-md-8">
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle small text-uppercase mb-2">
                  Portal de Seguimiento Técnico
                </span>
                <h3 className="fw-bold mb-1 font-display text-white">{equipoStr}</h3>
                <div className="text-white-50 small font-mono">
                  Titular: {orden.cliente} {orden.equipo?.imeiSerie ? `| S/N: ${orden.equipo.imeiSerie}` : ''}
                </div>
              </div>
              <div className="col-12 col-md-4 text-md-end mt-3 mt-md-0">
                <div className="small text-white-50">Ingreso al laboratorio:</div>
                <div className="font-mono text-white fw-semibold">
                  {formatDateTime(orden.createdAt)}
                </div>
              </div>
            </div>
          </div>

          <div className="card-body p-4 p-md-5">
            {/* Barra Visual de Progreso */}
            <h6 className="text-uppercase text-muted fw-bold small mb-4">Progreso de Reparación</h6>
            <div className="position-relative mb-5">
              <div
                className="progress"
                style={{ height: '6px', backgroundColor: '#e2e8f0' }}
              >
                <div
                  className="progress-bar bg-primary"
                  role="progressbar"
                  style={{ width: `${(currentStep / (etapas.length - 1)) * 100}%` }}
                ></div>
              </div>

              <div className="d-flex justify-content-between position-absolute top-50 start-0 w-100 translate-middle-y">
                {etapas.map((etapa, idx) => {
                  const alcanzada = idx <= currentStep;
                  const esActual = idx === currentStep;

                  return (
                    <div key={etapa.key} className="text-center" style={{ width: '80px' }}>
                      <div
                        className={`rounded-circle d-inline-flex align-items-center justify-content-center shadow-sm ${
                          esActual
                            ? 'bg-primary text-white ring-4'
                            : alcanzada
                            ? 'bg-dark text-white'
                            : 'bg-white text-muted border'
                        }`}
                        style={{ width: '32px', height: '32px', fontSize: '13px' }}
                      >
                        {alcanzada && !esActual ? (
                          <i className="bi bi-check-lg"></i>
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>
                      <div
                        className={`small mt-2 ${
                          esActual ? 'fw-bold text-primary' : alcanzada ? 'fw-semibold text-dark' : 'text-muted'
                        }`}
                        style={{ fontSize: '0.75rem', lineHeight: '1.2' }}
                      >
                        {etapa.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aviso de Beneficio Promocional */}
            {(orden.esBeneficioPromo ||
              orden.presupuestoId === 'BENEFICIO-PROMO' ||
              Boolean(orden.codigo && orden.codigo.startsWith('SON-LIMP'))) && (
              <div className="alert alert-success border-success-subtle d-flex align-items-center gap-3 p-3 rounded-3 mb-4">
                <i className="bi bi-gift-fill fs-3 text-success"></i>
                <div>
                  <h6 className="fw-bold mb-1 text-success">
                    Beneficio Oficial Sontech: Mantenimiento & Limpieza 100% Bonificado
                  </h6>
                  <p className="mb-0 small text-muted">
                    Tu equipo ingresó bajo la promoción exclusiva de mantenimiento preventivo, limpieza interna profunda y cambio de pasta térmica sin cargo.
                  </p>
                </div>
              </div>
            )}

            {/* Aviso Destacado de Estado */}
            {orden.status === 'completado' && (
              <div className="alert alert-success d-flex align-items-center gap-3 p-3 rounded-3 mb-4">
                <i className="bi bi-check-circle-fill fs-2 text-success"></i>
                <div>
                  <h6 className="fw-bold mb-1">¡Tu equipo está listo para retirar!</h6>
                  <p className="mb-0 small">
                    El servicio técnico y el control de calidad han finalizado exitosamente. Podés pasar por nuestro local dentro del horario de atención.
                  </p>
                </div>
              </div>
            )}

            {/* Ficha de Diagnóstico & Trabajo */}
            <div className="row g-4 mt-1">
              <div className="col-12 col-md-6">
                <div className="p-3 bg-light rounded-3 h-100">
                  <h6 className="fw-bold text-dark mb-2">
                    <i className="bi bi-clipboard-pulse text-primary me-2"></i>
                    Diagnóstico Técnico
                  </h6>
                  <p className="small text-muted mb-0">
                    {orden.diagnostico || 'Equipo en etapa de revisión en banco de pruebas.'}
                  </p>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="p-3 bg-light rounded-3 h-100">
                  <h6 className="fw-bold text-dark mb-2">
                    <i className="bi bi-shield-check text-success me-2"></i>
                    Garantía del Trabajo
                  </h6>
                  <p className="small text-muted mb-0">
                    {orden.garantiaDias
                      ? `Este servicio cuenta con garantía oficial de Sontech por ${orden.garantiaDias} días corridos.`
                      : 'Garantía oficial Sontech de acuerdo a los repuestos y mano de obra aplicados.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Si hay Presupuesto Pendiente de Aprobación */}
            {presupuesto && presupuesto.status === 'enviado' && !aprobadoExitoso && (
              <div className="card border-primary mt-4 p-4 bg-primary-subtle rounded-3">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                  <div>
                    <span className="badge bg-primary text-white text-uppercase small mb-1">
                      Presupuesto Listo
                    </span>
                    <h5 className="fw-bold text-dark mb-1">
                      Aprobación de Cotización ({presupuesto.codigo})
                    </h5>
                    <div className="text-muted small">
                      Total presupuestado:{' '}
                      <strong className="fs-5 text-dark font-mono">
                        {formatCurrency(presupuesto.total)}
                      </strong>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-lg fw-bold d-inline-flex align-items-center gap-2"
                    onClick={handleAprobarPresupuesto}
                    disabled={aprobando}
                  >
                    {aprobando ? (
                      'Procesando...'
                    ) : (
                      <>
                        <i className="bi bi-hand-thumbs-up-fill"></i>
                        <span>Aprobar Presupuesto</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Resumen Financiero */}
            <div className="border-top pt-4 mt-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="small text-muted d-block">Estado de Pago:</span>
                  <span className={`badge ${orden.payStatus === 'pagado' ? 'bg-success' : 'bg-warning text-dark'} text-uppercase`}>
                    {orden.payStatus}
                  </span>
                </div>
                <div className="text-end">
                  <span className="small text-muted d-block">Saldo Pendiente a Abonar:</span>
                  <span className="fs-4 fw-bold font-mono text-primary">
                    {formatCurrency(orden.saldo)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer de la Card */}
          <div className="card-footer bg-light p-3 text-center small text-muted">
            ¿Tenés alguna duda o consulta técnica sobre tu orden?{' '}
            <a
              href={`https://wa.me/5491134581490?text=${encodeURIComponent(
                `Hola Sontech, tengo una consulta sobre mi orden ${orden.codigo}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="text-decoration-none fw-bold text-success ms-1"
            >
              <i className="bi bi-whatsapp me-1"></i> Escribinos por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
