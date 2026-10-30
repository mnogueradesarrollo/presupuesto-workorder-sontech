import { useEffect, useState } from 'react';
import { listOrdenes } from '../services/ordenes';
import { listClientes } from '../services/clientes';
import type { OrdenListItem } from '../services/ordenes';
import type { Cliente } from '../types/cliente';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export interface VisitaItem {
  id: string;
  ordenId?: string;
  ordenCodigo?: string;
  clienteNombre: string;
  telefono: string;
  direccion: string;
  fecha: string;
  franjaHoraria: string;
  tecnico: string;
  notas: string;
  estado: 'programada' | 'en_camino' | 'completada' | 'reprogramada';
}

export default function VisitasTecnicas() {
  const [visitas, setVisitas] = useState<VisitaItem[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  // Form State
  const [clienteNombre, setClienteNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [franjaHoraria, setFranjaHoraria] = useState('10:00 - 12:00 hs');
  const [tecnico, setTecnico] = useState('Técnico 1');
  const [notas, setNotas] = useState('');
  const [ordenCodigo, setOrdenCodigo] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [ords, clis] = await Promise.all([
          listOrdenes({ limit: 100 }),
          listClientes(100),
        ]);
        setOrdenes(ords.items);
        setClientes(clis);

        // Extraer visitas técnicas guardadas en las órdenes si las hubiera
        const vList: VisitaItem[] = [];
        ords.items.forEach((o: any) => {
          if (o.visitaTecnica) {
            vList.push({
              id: o.id,
              ordenId: o.id,
              ordenCodigo: o.codigo,
              clienteNombre: o.cliente,
              telefono: o.clienteTelefono || '',
              direccion: o.visitaTecnica.direccion || '',
              fecha: o.visitaTecnica.fecha || '',
              franjaHoraria: o.visitaTecnica.franjaHoraria || '',
              tecnico: o.visitaTecnica.tecnico || '',
              notas: o.visitaTecnica.notas || '',
              estado: o.visitaTecnica.completada ? 'completada' : 'programada',
            });
          }
        });
        setVisitas(vList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleClienteSelect = (nombre: string) => {
    setClienteNombre(nombre);
    const cli = clientes.find((c) => c.nombre === nombre);
    if (cli) {
      setTelefono(cli.telefono || '');
      setDireccion(cli.direccion ? `${cli.direccion}${cli.localidad ? `, ${cli.localidad}` : ''}` : '');
    }
  };

  const handleCrearVisita = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNombre || !direccion) {
      toast.error('Cliente y Dirección son obligatorios');
      return;
    }

    const nueva: VisitaItem = {
      id: crypto.randomUUID(),
      ordenCodigo: ordenCodigo || undefined,
      clienteNombre,
      telefono,
      direccion,
      fecha,
      franjaHoraria,
      tecnico,
      notas,
      estado: 'programada',
    };

    setVisitas((prev) => [nueva, ...prev]);
    toast.success('Visita técnica agendada');
    setModalOpen(false);
  };

  return (
    <div className="container py-3 py-md-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1 font-display">Servicios a Domicilio & Visitas Técnicas</h2>
          <p className="text-muted small mb-0">
            Agenda de soporte in-situ, franjas horarias y asignación de técnicos en calle
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2 w-100 w-md-auto"
        >
          <i className="bi bi-calendar-plus"></i>
          <span>Agendar Visita</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5 text-muted">Cargando agenda técnica...</div>
      ) : visitas.length === 0 ? (
        <div className="card border-0 shadow-sm p-5 text-center bg-white">
          <i className="bi bi-geo-alt display-4 text-muted mb-3 opacity-50"></i>
          <h5 className="text-muted fw-bold">No hay visitas programadas</h5>
          <p className="text-muted small">
            Programa servicios técnicos a domicilio para clientes particulares o empresas con abono.
          </p>
          <div className="mt-2">
            <button onClick={() => setModalOpen(true)} className="btn btn-outline-primary btn-sm">
              + Agendar Primera Visita
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {visitas.map((v) => (
            <div key={v.id} className="col-12 col-md-6 col-lg-4">
              <div className="card border-0 shadow-sm h-100 bg-white">
                <div className="card-body p-4 d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-mono small">
                      {v.fecha} ({v.franjaHoraria})
                    </span>
                    <span className={`badge ${v.estado === 'completada' ? 'bg-success' : 'bg-warning text-dark'} text-uppercase small`}>
                      {v.estado}
                    </span>
                  </div>

                  <h5 className="fw-bold text-dark mb-1">{v.clienteNombre}</h5>
                  {v.ordenCodigo && (
                    <div className="small font-mono text-muted mb-2">OT: {v.ordenCodigo}</div>
                  )}

                  <div className="small text-muted space-y-1 mb-3">
                    <div>
                      <i className="bi bi-geo-alt-fill text-danger me-1"></i> {v.direccion}
                    </div>
                    {v.telefono && (
                      <div>
                        <i className="bi bi-telephone text-success me-1"></i>
                        <a
                          href={`https://wa.me/${v.telefono.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-decoration-none font-mono text-dark"
                        >
                          {v.telefono}
                        </a>
                      </div>
                    )}
                    <div>
                      <i className="bi bi-person-badge text-primary me-1"></i>
                      Técnico asignado: <strong>{v.tecnico}</strong>
                    </div>
                  </div>

                  {v.notas && (
                    <div className="small text-secondary bg-light p-2 rounded mb-3">
                      "{v.notas}"
                    </div>
                  )}

                  <div className="mt-auto pt-2 border-top d-flex justify-content-between align-items-center">
                    {v.ordenId ? (
                      <button
                        className="btn btn-sm btn-outline-dark"
                        onClick={() => navigate(`/orden/${v.ordenId}`)}
                      >
                        Ver Orden de Trabajo
                      </button>
                    ) : (
                      <span className="text-muted small">Visita puntual</span>
                    )}
                    <button
                      className="btn btn-sm btn-outline-success"
                      onClick={() => {
                        setVisitas((prev) =>
                          prev.map((item) => (item.id === v.id ? { ...item, estado: 'completada' } : item))
                        );
                        toast.success('Visita marcada como completada');
                      }}
                    >
                      <i className="bi bi-check-lg"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Agendar Visita */}
      {modalOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">Agendar Visita Técnica</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalOpen(false)}
                ></button>
              </div>
              <form onSubmit={handleCrearVisita}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-bold">Cliente</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        list="clientesList"
                        value={clienteNombre}
                        onChange={(e) => handleClienteSelect(e.target.value)}
                        placeholder="Escribe o selecciona cliente..."
                      />
                      <datalist id="clientesList">
                        {clientes.map((c) => (
                          <option key={c.id} value={c.nombre} />
                        ))}
                      </datalist>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">
                        Dirección del Domicilio / Oficina <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        placeholder="Calle, número, timbre, piso..."
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Teléfono de Contacto</label>
                      <input
                        type="text"
                        className="form-control"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="+54 9 11 ..."
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Técnico Asignado</label>
                      <select
                        className="form-select"
                        value={tecnico}
                        onChange={(e) => setTecnico(e.target.value)}
                      >
                        <option value="Técnico 1">Técnico 1</option>
                        <option value="Técnico 2">Técnico 2</option>
                        <option value="Técnico 3">Técnico 3</option>
                        <option value="Tercerizado">Tercerizado</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Fecha de Visita</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-bold">Franja Horaria</label>
                      <select
                        className="form-select"
                        value={franjaHoraria}
                        onChange={(e) => setFranjaHoraria(e.target.value)}
                      >
                        <option value="09:00 - 11:00 hs">09:00 - 11:00 hs</option>
                        <option value="11:00 - 13:00 hs">11:00 - 13:00 hs</option>
                        <option value="14:00 - 16:00 hs">14:00 - 16:00 hs</option>
                        <option value="16:00 - 18:00 hs">16:00 - 18:00 hs</option>
                        <option value="A convenir">A convenir</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">
                        Vincular a Orden de Trabajo (opcional)
                      </label>
                      <select
                        className="form-select font-mono"
                        value={ordenCodigo}
                        onChange={(e) => setOrdenCodigo(e.target.value)}
                      >
                        <option value="">(Ninguna orden específica)</option>
                        {ordenes.map((o) => (
                          <option key={o.id} value={o.codigo}>
                            {o.codigo} - {o.cliente}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-bold">Notas o Tarea a Realizar</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        placeholder="Revisión de cableado estructurado, cambio de switch..."
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
                  <button type="submit" className="btn btn-primary">
                    Guardar Visita
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
