import { useEffect, useState } from 'react';
import {
  listAbonos,
  crearAbono,
  updateAbono,
  deleteAbono,
  registrarConsumoAbono,
} from '../services/abonos';
import { listClientes } from '../services/clientes';
import type { AbonoCliente, EstadoAbono } from '../types/abono';
import type { Cliente } from '../types/cliente';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../lib/utils';

export default function Abonos() {
  const [abonos, setAbonos] = useState<AbonoCliente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAbono, setEditingAbono] = useState<AbonoCliente | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal Consumo
  const [modalConsumoOpen, setModalConsumoOpen] = useState(false);
  const [selectedAbonoId, setSelectedAbonoId] = useState<string | null>(null);
  const [horasACargar, setHorasACargar] = useState<number>(1);
  const [visitasACargar, setVisitasACargar] = useState<number>(0);
  const [notaConsumo, setNotaConsumo] = useState('');
  const [guardandoConsumo, setGuardandoConsumo] = useState(false);

  // Form State
  const [clienteId, setClienteId] = useState('');
  const [tituloPlan, setTituloPlan] = useState('');
  const [costoFijoMensual, setCostoFijoMensual] = useState<number>(0);
  const [horasIncluidas, setHorasIncluidas] = useState<number>(10);
  const [visitasIncluidas, setVisitasIncluidas] = useState<number>(2);
  const [tarifaHoraExcedente, setTarifaHoraExcedente] = useState<number>(0);
  const [diaFacturacion, setDiaFacturacion] = useState<number>(1);
  const [estado, setEstado] = useState<EstadoAbono>('activo');
  const [notas, setNotas] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [abs, clis] = await Promise.all([listAbonos(), listClientes(100)]);
      setAbonos(abs);
      setClientes(clis);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar contratos y abonos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCrear = () => {
    setEditingAbono(null);
    setClienteId(clientes[0]?.id || '');
    setTituloPlan('Abono Soporte Pyme Básico');
    setCostoFijoMensual(80000);
    setHorasIncluidas(10);
    setVisitasIncluidas(2);
    setTarifaHoraExcedente(9500);
    setDiaFacturacion(1);
    setEstado('activo');
    setNotas('');
    setModalOpen(true);
  };

  const openEditar = (ab: AbonoCliente) => {
    setEditingAbono(ab);
    setClienteId(ab.clienteId);
    setTituloPlan(ab.tituloPlan);
    setCostoFijoMensual(ab.costoFijoMensual);
    setHorasIncluidas(ab.horasIncluidas);
    setVisitasIncluidas(ab.visitasIncluidas);
    setTarifaHoraExcedente(ab.tarifaHoraExcedente || 0);
    setDiaFacturacion(ab.diaFacturacion);
    setEstado(ab.estado);
    setNotas(ab.notas || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cli = clientes.find((c) => c.id === clienteId);
    if (!cli) {
      toast.error('Debes seleccionar un cliente válido');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        clienteId,
        clienteNombre: cli.nombre,
        tituloPlan,
        costoFijoMensual: Number(costoFijoMensual) || 0,
        horasIncluidas: Number(horasIncluidas) || 0,
        visitasIncluidas: Number(visitasIncluidas) || 0,
        tarifaHoraExcedente: Number(tarifaHoraExcedente) || 0,
        diaFacturacion: Number(diaFacturacion) || 1,
        estado,
        periodoActual: editingAbono?.periodoActual || {
          mesAnio: new Date().toISOString().slice(0, 7),
          horasConsumidas: 0,
          visitasRealizadas: 0,
          horasExcedentes: 0,
        },
        notas,
      };

      if (editingAbono) {
        await updateAbono(editingAbono.id, payload);
        toast.success('Contrato actualizado');
      } else {
        await crearAbono(payload);
        toast.success('Contrato de abono registrado');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar abono');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar contrato de "${name}"?`)) return;
    try {
      await deleteAbono(id);
      toast.success('Abono eliminado');
      setAbonos((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar');
    }
  };

  const handleCargarConsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAbonoId) return;
    setGuardandoConsumo(true);
    try {
      await registrarConsumoAbono(
        selectedAbonoId,
        Number(horasACargar) || 0,
        Number(visitasACargar) || 0,
        notaConsumo
      );
      toast.success('Consumo técnico registrado correctamente');
      setModalConsumoOpen(false);
      setNotaConsumo('');
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('Error al registrar consumo');
    } finally {
      setGuardandoConsumo(false);
    }
  };

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1 font-display">Contratos de Mantenimiento & Abonos IT</h2>
          <p className="text-muted small mb-0">
            Soporte recurrente para empresas, banco de horas mensuales y cálculo de excedentes
          </p>
        </div>
        <button onClick={openCrear} className="btn btn-primary d-inline-flex align-items-center gap-2">
          <i className="bi bi-file-earmark-lock2-fill"></i>
          <span>Nuevo Contrato / Abono</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5 text-muted">Cargando contratos...</div>
      ) : abonos.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 text-center bg-white">
          <i className="bi bi-clock-history display-4 text-muted mb-3 opacity-50"></i>
          <h5 className="text-muted fw-bold">No hay contratos activos</h5>
          <p className="text-muted small">
            Ofrece abonos mensuales a oficinas y pymes para asegurar ingresos recurrentes.
          </p>
          <div className="mt-2">
            <button onClick={openCrear} className="btn btn-outline-primary btn-sm">
              + Crear Primer Abono
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {abonos.map((ab) => {
            const p = ab.periodoActual || {
              horasConsumidas: 0,
              visitasRealizadas: 0,
              horasExcedentes: 0,
            };
            const pct = ab.horasIncluidas > 0 ? (p.horasConsumidas / ab.horasIncluidas) * 100 : 0;
            const tieneExcedente = p.horasExcedentes > 0;

            return (
              <div key={ab.id} className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm h-100 bg-white">
                  <div className="card-body p-4 d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <span
                          className={`badge ${
                            ab.estado === 'activo'
                              ? 'bg-success'
                              : ab.estado === 'pausado'
                              ? 'bg-warning text-dark'
                              : 'bg-secondary'
                          } text-uppercase small mb-1`}
                        >
                          {ab.estado}
                        </span>
                        <h5 className="fw-bold text-dark mb-0">{ab.clienteNombre}</h5>
                        <div className="text-muted small">{ab.tituloPlan}</div>
                      </div>
                      <div className="text-end">
                        <div className="fs-5 fw-bold font-mono text-primary">
                          {formatCurrency(ab.costoFijoMensual)}/mes
                        </div>
                        <div className="small text-muted">Día de cobro: {ab.diaFacturacion}</div>
                      </div>
                    </div>

                    {/* Barra de Banco de Horas */}
                    <div className="bg-light p-3 rounded-3 my-3">
                      <div className="d-flex justify-content-between align-items-center mb-1 small fw-bold">
                        <span>Horas Consumidas este mes:</span>
                        <span className="font-mono">
                          {p.horasConsumidas} / {ab.horasIncluidas} hs
                        </span>
                      </div>
                      <div
                        className="progress mb-2"
                        style={{ height: '8px', backgroundColor: '#e2e8f0' }}
                      >
                        <div
                          className={`progress-bar ${tieneExcedente ? 'bg-danger' : 'bg-primary'}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        ></div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center small text-muted">
                        <span>
                          Visitas: {p.visitasRealizadas} / {ab.visitasIncluidas}
                        </span>
                        {tieneExcedente ? (
                          <span className="text-danger fw-bold">
                            ⚠️ Excedente: +{p.horasExcedentes} hs (
                            {formatCurrency(p.horasExcedentes * (ab.tarifaHoraExcedente || 0))})
                          </span>
                        ) : (
                          <span className="text-success">
                            Restan {Math.max(0, ab.horasIncluidas - p.horasConsumidas)} hs
                          </span>
                        )}
                      </div>
                    </div>

                    {ab.notas && (
                      <div className="small text-muted mb-3 fst-italic">"{ab.notas}"</div>
                    )}

                    <div className="mt-auto pt-2 border-top d-flex justify-content-between align-items-center">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          setSelectedAbonoId(ab.id);
                          setHorasACargar(1);
                          setVisitasACargar(0);
                          setNotaConsumo('');
                          setModalConsumoOpen(true);
                        }}
                      >
                        <i className="bi bi-plus-circle me-1"></i> Registrar Horas / Visita
                      </button>
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-light border"
                          onClick={() => openEditar(ab)}
                          title="Editar"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(ab.id, ab.clienteNombre)}
                          title="Eliminar"
                        >
                          <i className="bi bi-trash3"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Registrar Consumo */}
      {modalConsumoOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">Registrar Horas de Soporte</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalConsumoOpen(false)}
                ></button>
              </div>
              <form onSubmit={handleCargarConsumo}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label small fw-bold">Horas Técnicas Dedicadas</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        className="form-control font-mono"
                        required
                        value={horasACargar}
                        onChange={(e) => setHorasACargar(Number(e.target.value))}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold">¿Fue Visita Presencial?</label>
                      <select
                        className="form-select"
                        value={visitasACargar}
                        onChange={(e) => setVisitasACargar(Number(e.target.value))}
                      >
                        <option value={0}>No (Remoto / Taller)</option>
                        <option value={1}>Sí (1 Visita In-situ)</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold">
                        Detalle del Trabajo Realizado
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        required
                        value={notaConsumo}
                        onChange={(e) => setNotaConsumo(e.target.value)}
                        placeholder="Ej: Mantenimiento preventivo de servidor y configuración de backup de red."
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setModalConsumoOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={guardandoConsumo}>
                    {guardandoConsumo ? 'Guardando...' : 'Descontar del Abono'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Abono */}
      {modalOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  {editingAbono ? 'Editar Contrato de Abono' : 'Nuevo Contrato de Mantenimiento'}
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
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">
                        Cliente / Empresa <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={clienteId}
                        onChange={(e) => setClienteId(e.target.value)}
                      >
                        {clientes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">
                        Nombre del Plan <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={tituloPlan}
                        onChange={(e) => setTituloPlan(e.target.value)}
                        placeholder="Ej: Plan Corporativo Oro 15hs"
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Costo Mensual ($)</label>
                      <input
                        type="number"
                        className="form-control font-mono"
                        required
                        value={costoFijoMensual}
                        onChange={(e) => setCostoFijoMensual(Number(e.target.value))}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Horas Mensuales Incluidas</label>
                      <input
                        type="number"
                        className="form-control font-mono"
                        value={horasIncluidas}
                        onChange={(e) => setHorasIncluidas(Number(e.target.value))}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Visitas Mensuales Incluidas</label>
                      <input
                        type="number"
                        className="form-control font-mono"
                        value={visitasIncluidas}
                        onChange={(e) => setVisitasIncluidas(Number(e.target.value))}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Tarifa Hora Excedente ($)</label>
                      <input
                        type="number"
                        className="form-control font-mono"
                        value={tarifaHoraExcedente}
                        onChange={(e) => setTarifaHoraExcedente(Number(e.target.value))}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Día de Facturación</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        className="form-control font-mono"
                        value={diaFacturacion}
                        onChange={(e) => setDiaFacturacion(Number(e.target.value))}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-bold">Estado del Contrato</label>
                      <select
                        className="form-select"
                        value={estado}
                        onChange={(e) => setEstado(e.target.value as EstadoAbono)}
                      >
                        <option value="activo">Activo</option>
                        <option value="pausado">Pausado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">Términos y Notas</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        placeholder="Equipos cubiertos, cláusulas de horario de atención, etc."
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
                    {saving ? 'Guardando...' : editingAbono ? 'Guardar Cambios' : 'Registrar Contrato'}
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
