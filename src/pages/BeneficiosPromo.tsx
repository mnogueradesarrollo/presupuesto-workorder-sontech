import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  listTurnosBeneficio,
  checkElegibilidadBeneficio,
  recepcionarTurnoEnTaller,
  crearBeneficioMostrador,
  updateEstadoTurnoBeneficio,
  cleanDni,
  DAILY_QUOTA,
} from '../services/beneficios';
import { listClientes } from '../services/clientes';
import type { TurnoBeneficio, EstadoTurnoBeneficio } from '../types/beneficio';
import type { Cliente } from '../types/cliente';
import { buildWhatsAppLink, getTrackingUrl } from '../lib/whatsapp';
import { toast } from 'react-hot-toast';

const ACCESORIOS_OPCIONES = [
  'Cargador Original',
  'Cargador Genérico',
  'Cable de Power',
  'Funda / Estuche',
  'Mouse / Dongle USB',
  'Solo Gabinete',
];

export default function BeneficiosPromo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDniParam = searchParams.get('dni') || '';
  const initialClienteIdParam = searchParams.get('clienteId') || '';

  const [turnos, setTurnos] = useState<TurnoBeneficio[]>([]);
  const [clientesCrm, setClientesCrm] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [filterFecha, setFilterFecha] = useState<string>('');

  // Verificador Rápido de Elegibilidad
  const [checkDniInput, setCheckDniInput] = useState(initialDniParam);
  const [checkEmailInput, setCheckEmailInput] = useState('');
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<{
    checked: boolean;
    eligible: boolean;
    message: string;
    record?: TurnoBeneficio;
  } | null>(null);

  // Modal de Recepción en Taller
  const [recepcionTurno, setRecepcionTurno] = useState<TurnoBeneficio | null>(null);
  const [recNumeroSerie, setRecNumeroSerie] = useState('');
  const [recPass, setRecPass] = useState('');
  const [recTecnico, setRecTecnico] = useState('Técnico 1');
  const [recEstadoEstetico, setRecEstadoEstetico] = useState('');
  const [recAccesorios, setRecAccesorios] = useState<string[]>(['Cargador Original']);
  const [receiving, setReceiving] = useState(false);
  const [recepcionExitosa, setRecepcionExitosa] = useState<{
    ordenId: string;
    codigoUnico: string;
    tokenTracking: string;
    turno: TurnoBeneficio;
  } | null>(null);

  // Modal de Alta en Mostrador / Nuevo Turno
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [savingNuevo, setSavingNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoApellido, setNuevoApellido] = useState('');
  const [nuevoDni, setNuevoDni] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoDomicilio, setNuevoDomicilio] = useState('');
  const [nuevoTipoEquipo, setNuevoTipoEquipo] = useState<'Notebook' | 'PC de Escritorio'>('Notebook');
  const [nuevoMarca, setNuevoMarca] = useState('');
  const [nuevoModelo, setNuevoModelo] = useState('');
  const [nuevoSerie, setNuevoSerie] = useState('');
  const [nuevoPass, setNuevoPass] = useState('');
  const [nuevoObservaciones, setNuevoObservaciones] = useState('');
  const [nuevoFechaTurno, setNuevoFechaTurno] = useState(() => new Date().toISOString().slice(0, 10));
  const [nuevoRecepcionarAhora, setNuevoRecepcionarAhora] = useState(true);
  const [nuevoTecnico, setNuevoTecnico] = useState('Técnico 1');
  const [nuevoAccesorios, setNuevoAccesorios] = useState<string[]>(['Cargador Original']);

  const hoyStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [turnosData, clisData] = await Promise.all([
        listTurnosBeneficio(),
        listClientes(200),
      ]);
      setTurnos(turnosData);
      setClientesCrm(clisData);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar los turnos del beneficio promocional');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Si vino con clienteId por query param desde Clientes.tsx, abrir modal pre-cargado
  useEffect(() => {
    if (initialClienteIdParam && clientesCrm.length > 0) {
      const cli = clientesCrm.find((c) => c.id === initialClienteIdParam);
      if (cli) {
        openModalNuevoConCliente(cli);
      }
    }
  }, [initialClienteIdParam, clientesCrm]);

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const ocupadosHoy = turnos.filter(
      (t) => t.fechaTurno === hoyStr && t.estado !== 'cancelado'
    ).length;
    const pendientes = turnos.filter((t) => t.estado === 'pendiente_recepcion').length;
    const enTaller = turnos.filter(
      (t) => t.estado === 'recepcionado' || t.estado === 'en_mantenimiento'
    ).length;
    const completados = turnos.filter(
      (t) => t.estado === 'listo_entrega' || t.estado === 'entregado'
    ).length;

    return {
      ocupadosHoy,
      disponiblesHoy: Math.max(0, DAILY_QUOTA - ocupadosHoy),
      pendientes,
      enTaller,
      completados,
    };
  }, [turnos, hoyStr]);

  const filteredTurnos = useMemo(() => {
    return turnos.filter((t) => {
      const q = search.toLowerCase().trim();
      const nombreCompleto = `${t.cliente?.nombre || ''} ${t.cliente?.apellido || ''}`.toLowerCase();
      const matchSearch =
        !q ||
        nombreCompleto.includes(q) ||
        (t.cliente?.dni || '').toLowerCase().includes(q) ||
        (t.cliente?.email || '').toLowerCase().includes(q) ||
        (t.codigoUnico || '').toLowerCase().includes(q) ||
        (t.equipo?.marca || '').toLowerCase().includes(q) ||
        (t.equipo?.modelo || '').toLowerCase().includes(q);

      const matchEstado = filterEstado === 'todos' || t.estado === filterEstado;
      const matchFecha = !filterFecha || t.fechaTurno === filterFecha;

      return matchSearch && matchEstado && matchFecha;
    });
  }, [turnos, search, filterEstado, filterFecha]);

  // Verificar elegibilidad por DNI / Email
  const handleVerificarElegibilidad = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cleanDni(checkDniInput);
    if (!cleaned && !checkEmailInput.trim()) {
      toast.error('Ingresá un DNI o un correo electrónico para verificar');
      return;
    }

    setCheckingEligibility(true);
    try {
      const res = await checkElegibilidadBeneficio(cleaned, checkEmailInput);
      if (res.eligible) {
        setEligibilityResult({
          checked: true,
          eligible: true,
          message: `¡Cliente HABILITADO! No registra usos previos del beneficio gratuito de mantenimiento y limpieza.`,
        });
      } else {
        setEligibilityResult({
          checked: true,
          eligible: false,
          message: res.reason || 'El cliente ya utilizó el beneficio anteriormente.',
          record: res.existingRecord,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al verificar elegibilidad');
    } finally {
      setCheckingEligibility(false);
    }
  };

  // Abrir modal de recepción para un turno web
  const handleOpenRecepcion = (turno: TurnoBeneficio) => {
    setRecepcionTurno(turno);
    setRecNumeroSerie(turno.equipo?.numeroSerie || '');
    setRecPass('');
    setRecTecnico('Técnico 1');
    setRecEstadoEstetico(turno.equipo?.observaciones || '');
    setRecAccesorios(
      turno.equipo?.tipo === 'PC de Escritorio' ? ['Solo Gabinete'] : ['Cargador Original']
    );
    setRecepcionExitosa(null);
  };

  const toggleRecAccesorio = (acc: string) => {
    setRecAccesorios((prev) =>
      prev.includes(acc) ? prev.filter((x) => x !== acc) : [...prev, acc]
    );
  };

  const toggleNuevoAccesorio = (acc: string) => {
    setNuevoAccesorios((prev) =>
      prev.includes(acc) ? prev.filter((x) => x !== acc) : [...prev, acc]
    );
  };

  const handleConfirmarRecepcion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recepcionTurno) return;

    setReceiving(true);
    try {
      const result = await recepcionarTurnoEnTaller(recepcionTurno, {
        numeroSerie: recNumeroSerie,
        pass: recPass,
        estadoEstetico: recEstadoEstetico,
        accesoriosRecibidos: recAccesorios,
        notasRecepcion: recEstadoEstetico,
        tecnicoAsignado: recTecnico,
      });

      setRecepcionExitosa({
        ordenId: result.ordenId,
        codigoUnico: result.codigoUnico,
        tokenTracking: result.tokenTracking,
        turno: recepcionTurno,
      });

      toast.success(`Equipo recepcionado con éxito (${result.codigoUnico})`);
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Error al recepcionar el equipo');
    } finally {
      setReceiving(false);
    }
  };

  // Abrir modal de nuevo beneficio (vacío o desde un cliente)
  const openModalNuevo = (dniPreload?: string) => {
    setNuevoNombre('');
    setNuevoApellido('');
    setNuevoDni(dniPreload || '');
    setNuevoTelefono('');
    setNuevoEmail('');
    setNuevoDomicilio('');
    setNuevoTipoEquipo('Notebook');
    setNuevoMarca('');
    setNuevoModelo('');
    setNuevoSerie('');
    setNuevoPass('');
    setNuevoObservaciones('');
    setNuevoFechaTurno(hoyStr);
    setNuevoRecepcionarAhora(true);
    setNuevoTecnico('Técnico 1');
    setNuevoAccesorios(['Cargador Original']);
    setModalNuevoOpen(true);
  };

  const openModalNuevoConCliente = (cli: Cliente) => {
    const partes = (cli.nombre || '').trim().split(' ');
    const nom = partes[0] || '';
    const ape = partes.slice(1).join(' ') || '';

    setNuevoNombre(nom);
    setNuevoApellido(ape);
    setNuevoDni(cleanDni(cli.cuitDni));
    setNuevoTelefono(cli.telefono || '');
    setNuevoEmail(cli.email || '');
    setNuevoDomicilio(
      cli.direccion ? `${cli.direccion}${cli.localidad ? `, ${cli.localidad}` : ''}` : ''
    );
    setNuevoTipoEquipo('Notebook');
    setNuevoMarca('');
    setNuevoModelo('');
    setNuevoSerie('');
    setNuevoPass('');
    setNuevoObservaciones('');
    setNuevoFechaTurno(hoyStr);
    setNuevoRecepcionarAhora(true);
    setNuevoTecnico('Técnico 1');
    setNuevoAccesorios(['Cargador Original']);
    setModalNuevoOpen(true);
  };

  const handleSelectClienteCrm = (id: string) => {
    const cli = clientesCrm.find((c) => c.id === id);
    if (cli) {
      openModalNuevoConCliente(cli);
    }
  };

  const handleCrearBeneficioMostrador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || !cleanDni(nuevoDni) || !nuevoTelefono.trim()) {
      toast.error('Nombre, DNI y Teléfono son obligatorios');
      return;
    }

    setSavingNuevo(true);
    try {
      const res = await crearBeneficioMostrador({
        nombre: nuevoNombre,
        apellido: nuevoApellido,
        dni: nuevoDni,
        telefono: nuevoTelefono,
        email: nuevoEmail,
        domicilio: nuevoDomicilio,
        tipoEquipo: nuevoTipoEquipo,
        marca: nuevoMarca || 'Genérico',
        modelo: nuevoModelo || 'Estándar',
        numeroSerie: nuevoSerie,
        pass: nuevoPass,
        observaciones: nuevoObservaciones,
        fechaTurno: nuevoFechaTurno,
        recepcionarAhora: nuevoRecepcionarAhora,
        tecnicoAsignado: nuevoTecnico,
        accesoriosRecibidos: nuevoAccesorios,
      });

      setModalNuevoOpen(false);
      await loadData();

      if (res.ordenId && res.codigoUnico) {
        toast.success(`¡Beneficio otorgado y OT ${res.codigoUnico} creada!`);
        navigate(`/orden/${res.ordenId}`);
      } else {
        toast.success('Turno de beneficio agendado correctamente.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'No se pudo registrar el beneficio');
    } finally {
      setSavingNuevo(false);
    }
  };

  const handleStatusChange = async (turnoId: string, nuevoEstado: EstadoTurnoBeneficio) => {
    try {
      await updateEstadoTurnoBeneficio(turnoId, nuevoEstado);
      toast.success('Estado del turno actualizado');
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error('No se pudo actualizar el estado');
    }
  };

  const enviarWhatsAppTurno = (turno: TurnoBeneficio, codigoOverride?: string, tokenOverride?: string) => {
    const codigo = codigoOverride || turno.codigoUnico;
    const token = tokenOverride || turno.tokenTracking || codigo;
    const nombre = turno.cliente?.nombre || 'Cliente';
    const equipoStr = `${turno.equipo?.tipo || 'Equipo'} ${turno.equipo?.marca || ''} ${turno.equipo?.modelo || ''}`.trim();

    let mensaje = '';
    if (codigo && token) {
      const urlTracking = getTrackingUrl(token);
      mensaje = `¡Hola ${nombre}! 👋 Te confirmamos que recepcionamos tu equipo *${equipoStr}* en el laboratorio de *Sontech* bajo el *Beneficio Promocional 100% Bonificado* de Mantenimiento y Limpieza Profunda.

📌 *Código Único de Orden:* ${codigo}
🔍 *Seguimiento en vivo de tu equipo:*
👉 ${urlTracking}

Te avisaremos apenas esté listo para retirar (entrega estimada en 24 hs hábiles). ¡Muchas gracias!`;
    } else {
      mensaje = `¡Hola ${nombre}! 👋 Te escribimos de *Sontech Soporte Técnico* por tu turno reservado para el día *${turno.fechaTurno}* (${turno.franjaHoraria}) para el mantenimiento y limpieza gratuita de tu *${equipoStr}*. ¡Te esperamos!`;
    }

    const link = buildWhatsAppLink(turno.cliente?.telefono || '', mensaje);
    window.open(link, '_blank');
  };

  const getBadgeEstado = (estado: EstadoTurnoBeneficio) => {
    switch (estado) {
      case 'pendiente_recepcion':
        return <span className="badge bg-warning text-dark">Pendiente Recepción</span>;
      case 'recepcionado':
        return <span className="badge bg-info text-dark">Recepcionado en Taller</span>;
      case 'en_mantenimiento':
        return <span className="badge bg-primary">En Limpieza / Banco</span>;
      case 'listo_entrega':
        return <span className="badge bg-success">Listo para Retirar</span>;
      case 'entregado':
        return <span className="badge bg-dark">Entregado</span>;
      case 'cancelado':
        return <span className="badge bg-danger">Cancelado</span>;
      default:
        return <span className="badge bg-secondary">{estado}</span>;
    }
  };

  return (
    <div className="container py-4">
      {/* Cabecera */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="badge bg-success-subtle text-success border border-success-subtle text-uppercase small">
              <i className="bi bi-gift-fill me-1"></i> Promoción Oficial Sontech
            </span>
            <span className="badge bg-light text-secondary border font-mono small">
              Cupo Máx: {DAILY_QUOTA} / día
            </span>
          </div>
          <h2 className="fw-bold mb-1 font-display text-gradient">
            Turnero & Beneficio de Limpieza Gratuita
          </h2>
          <p className="text-muted small mb-0">
            Recepción de turnos web (<code>soporte.sontech.com.ar</code>), control antifraude por DNI y generación de Órdenes de Trabajo bonificadas
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
          >
            <i className="bi bi-arrow-clockwise"></i>
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={() => openModalNuevo()}
            className="btn btn-success btn-sm d-inline-flex align-items-center gap-2 fw-bold shadow-sm"
          >
            <i className="bi bi-plus-circle-fill"></i>
            <span>Otorgar Beneficio en Mostrador</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm p-3 bg-white h-100" style={{ borderTop: '3px solid #16a34a' }}>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-bold text-uppercase">Cupos de Hoy</span>
              <i className="bi bi-calendar-check text-success fs-5"></i>
            </div>
            <div className="fs-2 fw-bold font-mono text-dark">
              {stats.ocupadosHoy} / {DAILY_QUOTA}
            </div>
            <div className="small text-muted">
              {stats.disponiblesHoy > 0
                ? `${stats.disponiblesHoy} cupos libres hoy`
                : 'Cupo diario completo'}
            </div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm p-3 bg-white h-100" style={{ borderTop: '3px solid #f59e0b' }}>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-bold text-uppercase">Por Recepcionar</span>
              <i className="bi bi-hourglass-split text-warning fs-5"></i>
            </div>
            <div className="fs-2 fw-bold font-mono text-warning">{stats.pendientes}</div>
            <div className="small text-muted">Turnos agendados desde la web</div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm p-3 bg-white h-100" style={{ borderTop: '3px solid #0284c7' }}>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-bold text-uppercase">En Taller (Activos)</span>
              <i className="bi bi-tools text-primary fs-5"></i>
            </div>
            <div className="fs-2 fw-bold font-mono text-primary">{stats.enTaller}</div>
            <div className="small text-muted">Con OT generada en banco</div>
          </div>
        </div>

        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm p-3 bg-white h-100" style={{ borderTop: '3px solid #0f172a' }}>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small fw-bold text-uppercase">Listos / Entregados</span>
              <i className="bi bi-check2-all text-dark fs-5"></i>
            </div>
            <div className="fs-2 fw-bold font-mono text-dark">{stats.completados}</div>
            <div className="small text-muted">Mantenimientos finalizados</div>
          </div>
        </div>
      </div>

      {/* Verificador Rápido de Elegibilidad por DNI / Email */}
      <div className="card border-0 shadow-sm p-3 mb-4 bg-white">
        <form onSubmit={handleVerificarElegibilidad} className="row g-2 align-items-end">
          <div className="col-12 col-md-4">
            <label className="form-label small fw-bold mb-1">
              <i className="bi bi-shield-lock text-primary me-1"></i>
              Validador Antifraude (DNI del Cliente)
            </label>
            <input
              type="text"
              className="form-control form-control-sm font-mono"
              placeholder="Ej: 38123456 (sin puntos)"
              value={checkDniInput}
              onChange={(e) => setCheckDniInput(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label small fw-bold mb-1">Email (Opcional)</label>
            <input
              type="email"
              className="form-control form-control-sm"
              placeholder="cliente@correo.com"
              value={checkEmailInput}
              onChange={(e) => setCheckEmailInput(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-4 d-flex gap-2">
            <button
              type="submit"
              disabled={checkingEligibility}
              className="btn btn-dark btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-2"
            >
              <i className="bi bi-search"></i>
              <span>{checkingEligibility ? 'Consultando...' : 'Verificar si ya usó el Beneficio'}</span>
            </button>
            {eligibilityResult && (
              <button
                type="button"
                className="btn btn-light btn-sm border"
                onClick={() => setEligibilityResult(null)}
                title="Limpiar resultado"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            )}
          </div>
        </form>

        {eligibilityResult && (
          <div
            className={`alert ${
              eligibilityResult.eligible ? 'alert-success' : 'alert-danger'
            } mt-3 mb-0 py-2 px-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2`}
          >
            <div className="small fw-semibold">
              <i
                className={`bi ${
                  eligibilityResult.eligible
                    ? 'bi-check-circle-fill text-success'
                    : 'bi-exclamation-octagon-fill text-danger'
                } me-2`}
              ></i>
              {eligibilityResult.message}
            </div>
            {eligibilityResult.eligible ? (
              <button
                type="button"
                className="btn btn-success btn-sm fw-bold text-nowrap"
                onClick={() => openModalNuevo(cleanDni(checkDniInput))}
              >
                <i className="bi bi-gift me-1"></i> Cargar Beneficio a este DNI
              </button>
            ) : (
              eligibilityResult.record?.ordenId && (
                <button
                  type="button"
                  className="btn btn-outline-dark btn-sm text-nowrap"
                  onClick={() => navigate(`/orden/${eligibilityResult.record!.ordenId}`)}
                >
                  Ver OT Asociada
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Filtros de Listado */}
      <div className="card border-0 shadow-sm p-3 mb-4 bg-white">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-5">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Buscar por cliente, DNI, código SON-LIMP o modelo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="col-6 col-md-4">
            <select
              className="form-select form-select-sm"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="todos">Todos los estados ({turnos.length})</option>
              <option value="pendiente_recepcion">Pendientes de Recepción</option>
              <option value="recepcionado">Recepcionados (Con código)</option>
              <option value="en_mantenimiento">En Limpieza / Mantenimiento</option>
              <option value="listo_entrega">Listos para Retirar</option>
              <option value="entregado">Entregados</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>

          <div className="col-6 col-md-3 d-flex gap-1">
            <input
              type="date"
              className="form-control form-control-sm"
              value={filterFecha}
              onChange={(e) => setFilterFecha(e.target.value)}
            />
            {filterFecha && (
              <button
                type="button"
                className="btn btn-sm btn-light border"
                onClick={() => setFilterFecha('')}
                title="Todas las fechas"
              >
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Turnos del Beneficio */}
      {loading ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border spinner-border-sm me-2" role="status"></div>
          Sincronizando turnos del beneficio promocional...
        </div>
      ) : filteredTurnos.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 text-center bg-white">
          <i className="bi bi-calendar2-heart display-4 text-muted mb-3 opacity-50"></i>
          <h5 className="fw-bold text-muted">No se encontraron turnos registrados</h5>
          <p className="text-muted small mb-3">
            Los turnos reservados en <code>soporte.sontech.com.ar</code> aparecerán automáticamente aquí.
          </p>
          <div>
            <button onClick={() => openModalNuevo()} className="btn btn-success btn-sm">
              + Registrar Beneficio en Mostrador
            </button>
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm overflow-hidden bg-white">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-uppercase text-muted">
                <tr>
                  <th className="ps-3">Fecha Turno</th>
                  <th>Cliente / DNI</th>
                  <th>Equipo</th>
                  <th>Código / OT</th>
                  <th>Estado</th>
                  <th className="text-end pe-3">Acciones de Taller</th>
                </tr>
              </thead>
              <tbody>
                {filteredTurnos.map((t) => {
                  const esHoy = t.fechaTurno === hoyStr;
                  return (
                    <tr key={t.id}>
                      <td className="ps-3">
                        <div className="fw-bold font-mono text-dark d-flex align-items-center gap-1">
                          <span>{t.fechaTurno}</span>
                          {esHoy && <span className="badge bg-success x-small">HOY</span>}
                        </div>
                        <div className="small text-muted">{t.franjaHoraria || '10:00 a 18:00 hs'}</div>
                        {t.fechaEntregaEstimada && (
                          <div className="x-small text-secondary">
                            Entrega est.: {t.fechaEntregaEstimada}
                          </div>
                        )}
                      </td>

                      <td>
                        <div className="fw-bold text-dark">
                          {t.cliente?.nombre} {t.cliente?.apellido}
                        </div>
                        <div className="d-flex flex-wrap gap-2 align-items-center mt-1">
                          <span className="badge bg-light text-dark border font-mono">
                            DNI: {t.cliente?.dni}
                          </span>
                          {t.cliente?.telefono && (
                            <button
                              type="button"
                              onClick={() => enviarWhatsAppTurno(t)}
                              className="btn btn-link btn-sm p-0 text-success text-decoration-none font-mono small"
                              title="Enviar WhatsApp al cliente"
                            >
                              <i className="bi bi-whatsapp me-1"></i>
                              {t.cliente.telefono}
                            </button>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="fw-semibold text-dark">
                          <i
                            className={`bi ${
                              t.equipo?.tipo === 'PC de Escritorio' ? 'bi-pc-display' : 'bi-laptop'
                            } me-1 text-primary`}
                          ></i>
                          {t.equipo?.tipo}: {t.equipo?.marca} {t.equipo?.modelo}
                        </div>
                        {t.equipo?.numeroSerie && (
                          <div className="small font-mono text-muted">S/N: {t.equipo.numeroSerie}</div>
                        )}
                        {t.equipo?.observaciones && (
                          <div className="small text-muted text-truncate" style={{ maxWidth: '240px' }}>
                            "{t.equipo.observaciones}"
                          </div>
                        )}
                      </td>

                      <td>
                        {t.codigoUnico ? (
                          <div>
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-mono">
                              {t.codigoUnico}
                            </span>
                            {t.ordenId && (
                              <div className="mt-1">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/orden/${t.ordenId}`)}
                                  className="btn btn-link btn-sm p-0 text-decoration-none small fw-bold"
                                >
                                  <i className="bi bi-box-arrow-up-right me-1"></i>Abrir Ficha OT
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted small fst-italic">Sin recepcionar</span>
                        )}
                      </td>

                      <td>
                        <div className="mb-1">{getBadgeEstado(t.estado)}</div>
                        <select
                          className="form-select form-select-sm py-0 px-2 x-small"
                          style={{ width: 'auto', fontSize: '0.75rem' }}
                          value={t.estado}
                          onChange={(e) =>
                            handleStatusChange(t.id, e.target.value as EstadoTurnoBeneficio)
                          }
                        >
                          <option value="pendiente_recepcion">Pendiente Recepción</option>
                          <option value="recepcionado">Recepcionado</option>
                          <option value="en_mantenimiento">En Mantenimiento</option>
                          <option value="listo_entrega">Listo p/ Retirar</option>
                          <option value="entregado">Entregado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>

                      <td className="text-end pe-3">
                        <div className="d-inline-flex gap-1">
                          {t.estado === 'pendiente_recepcion' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenRecepcion(t)}
                              className="btn btn-sm btn-success fw-bold d-inline-flex align-items-center gap-1 shadow-sm"
                            >
                              <i className="bi bi-qr-code-scan"></i>
                              <span>Recepcionar y Crear OT</span>
                            </button>
                          ) : (
                            <>
                              {t.ordenId && (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/orden/${t.ordenId}`)}
                                  className="btn btn-sm btn-soft-primary"
                                  title="Ir a la Orden de Trabajo"
                                >
                                  <i className="bi bi-folder2-open me-1"></i>OT
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => enviarWhatsAppTurno(t)}
                                className="btn btn-sm btn-outline-success"
                                title="Enviar Comprobante / Seguimiento por WhatsApp"
                              >
                                <i className="bi bi-whatsapp"></i>
                              </button>
                              {(t.tokenTracking || t.codigoUnico) && (
                                <a
                                  href={`/seguimiento/${t.tokenTracking || t.codigoUnico}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-sm btn-soft-info"
                                  title="Ver Portal de Seguimiento Público"
                                >
                                  <i className="bi bi-eye"></i>
                                </a>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: RECEPCIONAR EQUIPO EN TALLER Y GENERAR ORDEN DE TRABAJO
         ===================================================================== */}
      {recepcionTurno && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-qr-code-scan text-info"></i>
                  <span>Recepción de Equipo — Beneficio Promocional</span>
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setRecepcionTurno(null)}
                ></button>
              </div>

              {!recepcionExitosa ? (
                <form onSubmit={handleConfirmarRecepcion}>
                  <div className="modal-body p-4">
                    <div className="alert alert-light border mb-3 p-3">
                      <div className="row g-2 small">
                        <div className="col-md-6">
                          <strong>Cliente:</strong> {recepcionTurno.cliente?.nombre}{' '}
                          {recepcionTurno.cliente?.apellido} (DNI: {recepcionTurno.cliente?.dni})
                        </div>
                        <div className="col-md-6">
                          <strong>Equipo Declarado:</strong> {recepcionTurno.equipo?.tipo} —{' '}
                          {recepcionTurno.equipo?.marca} {recepcionTurno.equipo?.modelo}
                        </div>
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-bold">
                          N° de Serie / Service Tag (Se vincula a CMDB)
                        </label>
                        <input
                          type="text"
                          className="form-control font-mono"
                          placeholder="Ej: SN-5CG1234ABC"
                          value={recNumeroSerie}
                          onChange={(e) => setRecNumeroSerie(e.target.value)}
                        />
                      </div>

                      <div className="col-12 col-md-3">
                        <label className="form-label small fw-bold">Contraseña / PIN Equipo</label>
                        <input
                          type="text"
                          className="form-control font-mono"
                          placeholder="Opcional"
                          value={recPass}
                          onChange={(e) => setRecPass(e.target.value)}
                        />
                      </div>

                      <div className="col-12 col-md-3">
                        <label className="form-label small fw-bold">Técnico Asignado</label>
                        <select
                          className="form-select"
                          value={recTecnico}
                          onChange={(e) => setRecTecnico(e.target.value)}
                        >
                          <option value="Técnico 1">Técnico 1</option>
                          <option value="Técnico 2">Técnico 2</option>
                          <option value="Laboratorio Central">Laboratorio Central</option>
                        </select>
                      </div>

                      <div className="col-12">
                        <label className="form-label small fw-bold d-block">
                          Accesorios Recibidos en Mostrador
                        </label>
                        <div className="d-flex flex-wrap gap-2">
                          {ACCESORIOS_OPCIONES.map((acc) => {
                            const active = recAccesorios.includes(acc);
                            return (
                              <button
                                key={acc}
                                type="button"
                                onClick={() => toggleRecAccesorio(acc)}
                                className={`btn btn-sm ${
                                  active ? 'btn-primary' : 'btn-outline-secondary'
                                }`}
                              >
                                <i
                                  className={`bi ${
                                    active ? 'bi-check-square-fill' : 'bi-square'
                                  } me-1`}
                                ></i>
                                {acc}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="col-12">
                        <label className="form-label small fw-bold">
                          Estado Estético / Notas de Recepción
                        </label>
                        <textarea
                          className="form-control"
                          rows={2}
                          placeholder="Ej: Ingresa con cargador original, marcas de uso normales en tapa superior."
                          value={recEstadoEstetico}
                          onChange={(e) => setRecEstadoEstetico(e.target.value)}
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer bg-light">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setRecepcionTurno(null)}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-success fw-bold" disabled={receiving}>
                      {receiving ? (
                        'Generando OT y Sincronizando...'
                      ) : (
                        <>
                          <i className="bi bi-check2-circle me-1"></i>
                          Confirmar Recepción y Crear Orden ($0)
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="modal-body p-4 text-center">
                  <div className="mb-3">
                    <i className="bi bi-check-circle-fill display-4 text-success"></i>
                  </div>
                  <h4 className="fw-bold">¡Equipo Recepcionado y Orden Creada!</h4>
                  <p className="text-muted small mb-3">
                    El cliente fue sincronizado en el CRM y se generó la Orden de Trabajo bonificada:
                  </p>

                  <div className="p-3 bg-light border rounded-3 d-inline-block mb-4">
                    <span className="small text-muted d-block text-uppercase">Código Único</span>
                    <span className="fs-3 fw-bold font-mono text-primary">
                      {recepcionExitosa.codigoUnico}
                    </span>
                  </div>

                  <div className="d-flex flex-wrap justify-content-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        enviarWhatsAppTurno(
                          recepcionExitosa.turno,
                          recepcionExitosa.codigoUnico,
                          recepcionExitosa.tokenTracking
                        )
                      }
                      className="btn btn-success fw-bold d-inline-flex align-items-center gap-2"
                    >
                      <i className="bi bi-whatsapp"></i>
                      <span>Enviar Comprobante y Tracking por WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/orden/${recepcionExitosa.ordenId}`)}
                      className="btn btn-primary fw-bold d-inline-flex align-items-center gap-2"
                    >
                      <i className="bi bi-folder2-open"></i>
                      <span>Abrir Orden de Trabajo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRecepcionTurno(null)}
                      className="btn btn-outline-secondary"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: OTORGAR BENEFICIO EN MOSTRADOR / NUEVO TURNO
         ===================================================================== */}
      {modalNuevoOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-gift-fill"></i>
                  <span>Otorgar Beneficio de Limpieza Gratuita (Mostrador / Turno)</span>
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setModalNuevoOpen(false)}
                ></button>
              </div>

              <form onSubmit={handleCrearBeneficioMostrador}>
                <div className="modal-body p-4">
                  {/* Autocompletar desde CRM */}
                  <div className="mb-3 p-2 bg-light rounded border">
                    <label className="form-label x-small fw-bold text-uppercase text-muted mb-1">
                      Autocompletar con Cliente Existente del Directorio CRM (Opcional)
                    </label>
                    <select
                      className="form-select form-select-sm"
                      defaultValue=""
                      onChange={(e) => handleSelectClienteCrm(e.target.value)}
                    >
                      <option value="">-- Seleccionar cliente registrado o completar abajo --</option>
                      {clientesCrm.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} {c.cuitDni ? `(DNI/CUIT: ${c.cuitDni})` : ''}{' '}
                          {c.beneficioLimpiezaUsado ? '[YA USÓ BENEFICIO]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">
                        Nombre <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={nuevoNombre}
                        onChange={(e) => setNuevoNombre(e.target.value)}
                        placeholder="Ej: Martín"
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Apellido</label>
                      <input
                        type="text"
                        className="form-control"
                        value={nuevoApellido}
                        onChange={(e) => setNuevoApellido(e.target.value)}
                        placeholder="Ej: Noguera"
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">
                        DNI (Validación única) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control font-mono"
                        required
                        value={nuevoDni}
                        onChange={(e) => setNuevoDni(e.target.value)}
                        placeholder="Sin puntos"
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">
                        Teléfono / WhatsApp <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control font-mono"
                        required
                        value={nuevoTelefono}
                        onChange={(e) => setNuevoTelefono(e.target.value)}
                        placeholder="Ej: 11 3458-1490"
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={nuevoEmail}
                        onChange={(e) => setNuevoEmail(e.target.value)}
                        placeholder="cliente@email.com"
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Domicilio / Localidad</label>
                      <input
                        type="text"
                        className="form-control"
                        value={nuevoDomicilio}
                        onChange={(e) => setNuevoDomicilio(e.target.value)}
                        placeholder="Dirección"
                      />
                    </div>

                    <hr className="my-2" />

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Tipo de Equipo</label>
                      <select
                        className="form-select"
                        value={nuevoTipoEquipo}
                        onChange={(e) =>
                          setNuevoTipoEquipo(e.target.value as 'Notebook' | 'PC de Escritorio')
                        }
                      >
                        <option value="Notebook">Notebook / Laptop</option>
                        <option value="PC de Escritorio">PC de Escritorio / Gamer</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Marca</label>
                      <input
                        type="text"
                        className="form-control"
                        value={nuevoMarca}
                        onChange={(e) => setNuevoMarca(e.target.value)}
                        placeholder="Ej: Lenovo, HP, Asus..."
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Modelo</label>
                      <input
                        type="text"
                        className="form-control"
                        value={nuevoModelo}
                        onChange={(e) => setNuevoModelo(e.target.value)}
                        placeholder="Ej: ThinkPad E14 / Armada"
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">N° de Serie (CMDB)</label>
                      <input
                        type="text"
                        className="form-control font-mono"
                        value={nuevoSerie}
                        onChange={(e) => setNuevoSerie(e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Clave / PIN Windows</label>
                      <input
                        type="text"
                        className="form-control font-mono"
                        value={nuevoPass}
                        onChange={(e) => setNuevoPass(e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Fecha del Turno</label>
                      <input
                        type="date"
                        className="form-control"
                        value={nuevoFechaTurno}
                        onChange={(e) => setNuevoFechaTurno(e.target.value)}
                      />
                    </div>

                    <div className="col-12">
                      <div className="form-check form-switch p-3 bg-success-subtle border border-success-subtle rounded-3">
                        <input
                          className="form-check-input ms-0 me-2"
                          type="checkbox"
                          id="switchRecepcionarAhora"
                          checked={nuevoRecepcionarAhora}
                          onChange={(e) => setNuevoRecepcionarAhora(e.target.checked)}
                        />
                        <label
                          className="form-check-label fw-bold text-success"
                          htmlFor="switchRecepcionarAhora"
                        >
                          El cliente deja el equipo ahora en mostrador (Recepcionar y generar Orden de Trabajo $0 de inmediato)
                        </label>
                      </div>
                    </div>

                    {nuevoRecepcionarAhora && (
                      <div className="col-12">
                        <label className="form-label small fw-bold d-block">
                          Accesorios Recibidos
                        </label>
                        <div className="d-flex flex-wrap gap-2">
                          {ACCESORIOS_OPCIONES.map((acc) => {
                            const active = nuevoAccesorios.includes(acc);
                            return (
                              <button
                                key={acc}
                                type="button"
                                onClick={() => toggleNuevoAccesorio(acc)}
                                className={`btn btn-sm ${
                                  active ? 'btn-primary' : 'btn-outline-secondary'
                                }`}
                              >
                                <i
                                  className={`bi ${
                                    active ? 'bi-check-square-fill' : 'bi-square'
                                  } me-1`}
                                ></i>
                                {acc}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="col-12">
                      <label className="form-label small fw-bold">Observaciones / Notas</label>
                      <input
                        type="text"
                        className="form-control"
                        value={nuevoObservaciones}
                        onChange={(e) => setNuevoObservaciones(e.target.value)}
                        placeholder="Ej: Calienta mucho o hace ruido el cooler..."
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setModalNuevoOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-success fw-bold" disabled={savingNuevo}>
                    {savingNuevo
                      ? 'Validando DNI y Procesando...'
                      : nuevoRecepcionarAhora
                      ? 'Validar DNI, Recepcionar y Crear OT'
                      : 'Validar DNI y Agendar Turno'}
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
