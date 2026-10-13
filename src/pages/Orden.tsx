import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Orden, OrdenCheckin, QAChecklist, BitacoraNota, QAResult } from '../types/orden';
import { registrarPago, getPagosPorOrden, eliminarPago } from '../services/flujo';
import { listProductos } from '../services/productos';
import type { Pago } from '../types/pago';
import type { Producto } from '../types/producto';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { generarOrdenPDF, toDataURL } from '../lib/pdf';
import { getSettings } from '../services/settings';
import logoUrl from '../assets/logotipo-sontech.png';
import type { ItemPresupuesto } from '../types/presupuesto';
import { buildWhatsAppLink, WhatsAppTemplates, getTrackingUrl } from '../lib/whatsapp';
import { formatCurrency, formatDateTime, pruneDeep } from '../lib/utils';
import { sincronizarEstadoOrdenConBeneficio } from '../services/beneficios';

const schema = z.object({
  diagnostico: z.string().optional(),
  notasEntrega: z.string().optional(),
  status: z.string(),
  trabajos: z.array(z.object({
    id: z.string(),
    descripcion: z.string().min(1, "La descripción es obligatoria"),
    horas: z.coerce.number().optional(),
    precio: z.coerce.number().optional(),
    tecnico: z.string().optional(),
  })),
  repuestos: z.array(z.object({
    id: z.string(),
    productoId: z.string().optional(),
    descripcion: z.string().min(1, "La descripción es obligatoria"),
    cantidad: z.coerce.number().min(1),
    precio: z.coerce.number().optional(),
  })),
});

type FormData = z.infer<typeof schema>;

export default function OrdenPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [orden, setOrden] = useState<Orden | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [saving, setSaving] = useState(false);
  const [waMenuOpen, setWaMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'taller' | 'checkin' | 'qa' | 'bitacora' | 'rma_sla'>('taller');

  // Catálogo de repuestos
  const [productosDb, setProductosDb] = useState<Producto[]>([]);
  const [modalRepuestoPicker, setModalRepuestoPicker] = useState(false);

  // Check-in State
  const [estadoEstetico, setEstadoEstetico] = useState('');
  const [accesoriosRecibidos, setAccesoriosRecibidos] = useState<string[]>([]);
  const [fallaDeclarada, setFallaDeclarada] = useState('');
  const [comportamientoInicial, setComportamientoInicial] = useState('');

  // QA Checklists
  const [qaEntrada, setQaEntrada] = useState<QAChecklist>({});
  const [qaSalida, setQaSalida] = useState<QAChecklist>({});

  // Bitácora Interna
  const [bitacora, setBitacora] = useState<BitacoraNota[]>([]);
  const [nuevaNotaBitacora, setNuevaNotaBitacora] = useState('');
  const [tecnicoBitacora, setTecnicoBitacora] = useState('Técnico de Turno');

  // RMA & SLA
  const [esGarantiaRMA, setEsGarantiaRMA] = useState(false);
  const [ordenOrigenCodigo, setOrdenOrigenCodigo] = useState('');
  const [garantiaDias, setGarantiaDias] = useState<number>(90);
  const [tecnicoAsignado, setTecnicoAsignado] = useState('Técnico 1');
  const [esTercerizado, setEsTercerizado] = useState(false);
  const [proveedorTercerizadoNombre, setProveedorTercerizadoNombre] = useState('');

  const { register, control, handleSubmit, reset } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      trabajos: [],
      repuestos: [],
      status: 'pendiente'
    }
  });

  const { fields: trabajoFields, append: appendTrabajo, remove: removeTrabajo } = useFieldArray({
    control,
    name: "trabajos"
  });

  const { fields: repuestoFields, append: appendRepuesto, remove: removeRepuesto } = useFieldArray({
    control,
    name: "repuestos"
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'ordenes', id));
        if (snap.exists()) {
          const data = snap.data() as Orden;
          setOrden(data);
          reset({
            diagnostico: data.diagnostico || '',
            notasEntrega: data.notasEntrega || '',
            status: data.status,
            trabajos: data.trabajos || [],
            repuestos: data.repuestos || [],
          });

          // Check-in
          setEstadoEstetico(data.checkin?.estadoEstetico || '');
          setAccesoriosRecibidos(data.checkin?.accesoriosRecibidos || []);
          setFallaDeclarada(data.checkin?.fallaDeclarada || '');
          setComportamientoInicial(data.checkin?.comportamientoInicial || '');

          // QA
          setQaEntrada(data.qaEntrada || {});
          setQaSalida(data.qaSalida || {});

          // Bitácora
          setBitacora(data.bitacora || []);

          // RMA & SLA
          setEsGarantiaRMA(data.esGarantiaRMA || false);
          setOrdenOrigenCodigo(data.ordenOrigenCodigo || '');
          setGarantiaDias(data.garantiaDias ?? 90);
          setTecnicoAsignado(data.tecnicoAsignado || 'Técnico 1');
          setEsTercerizado(data.esTercerizado || false);
          setProveedorTercerizadoNombre(data.proveedorTercerizadoNombre || '');

          const pList = await getPagosPorOrden(id);
          setPagos(pList);
        }

        const prods = await listProductos(200);
        setProductosDb(prods);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [id, reset]);

  const onSubmit = async (data: FormData) => {
    if (!id) return;
    setSaving(true);
    try {
      // Calcular Totales Extra
      const extraTrabajos = (data.trabajos || []).reduce((acc: number, t: any) => acc + (Number(t.precio) || 0), 0);
      const extraRepuestos = (data.repuestos || []).reduce((acc: number, r: any) => acc + (Number(r.precio) || 0) * (Number(r.cantidad) || 0), 0);

      const totalEstimado = orden?.totalEstimado || 0;
      const totalFinal = totalEstimado + extraTrabajos + extraRepuestos;
      const pagado = orden?.pagado || 0;
      const saldo = Math.max(0, Number((totalFinal - pagado).toFixed(2)));
      const esPromo = Boolean(
        orden?.esBeneficioPromo ||
        orden?.presupuestoId === 'BENEFICIO-PROMO' ||
        (orden?.codigo && orden.codigo.startsWith('SON-LIMP'))
      );
      const payStatus =
        saldo <= 0
          ? pagado > 0 || (esPromo && totalFinal === 0)
            ? 'pagado'
            : 'impago'
          : pagado > 0
          ? 'parcial'
          : 'impago';

      // Actualizar presupuesto si existe y no es el marcador de promoción
      if (orden?.presupuestoId && orden.presupuestoId !== 'BENEFICIO-PROMO') {
        const extraItems: ItemPresupuesto[] = [
          ...(data.trabajos || []).map((t: any) => ({
            id: t.id,
            tipo: 'Servicio' as const,
            descripcion: t.descripcion,
            cantidad: 1,
            precioUnitario: Number(t.precio) || 0,
          })),
          ...(data.repuestos || []).map((r: any) => ({
            id: r.id,
            tipo: 'Producto' as const,
            descripcion: r.descripcion,
            cantidad: Number(r.cantidad) || 1,
            precioUnitario: Number(r.precio) || 0,
          }))
        ];
        const allItems = [...(orden.itemsPresupuesto || []), ...extraItems];
        await updateDoc(doc(db, 'presupuestos', orden.presupuestoId), {
          items: allItems,
          total: totalFinal,
          updatedAt: Date.now()
        });
      }

      // Checkin y QA estructurados
      const checkin: OrdenCheckin = {
        estadoEstetico,
        accesoriosRecibidos,
        fallaDeclarada,
        comportamientoInicial,
      };

      await updateDoc(
        doc(db, 'ordenes', id),
        pruneDeep({
          ...data,
          checkin,
          qaEntrada,
          qaSalida,
          bitacora,
          esGarantiaRMA,
          ordenOrigenCodigo: ordenOrigenCodigo || undefined,
          garantiaDias: Number(garantiaDias) || 90,
          tecnicoAsignado,
          esTercerizado,
          proveedorTercerizadoNombre: esTercerizado ? proveedorTercerizadoNombre : undefined,
          totalFinal,
          saldo,
          payStatus,
          updatedAt: Date.now()
        })
      );

      if (orden) {
        await sincronizarEstadoOrdenConBeneficio(orden, data.status);
      }

      setOrden(prev => prev ? {
        ...prev,
        ...data as any,
        checkin,
        qaEntrada,
        qaSalida,
        bitacora,
        totalFinal,
        saldo,
        payStatus
      } : null);

      toast.success("Orden y registros de laboratorio guardados exitosamente.");
    } catch (e) {
      console.error(e);
      toast.error("Error al actualizar la orden");
    } finally {
      setSaving(false);
    }
  };

  const handlePagar = async () => {
    const montoStr = prompt('Monto a pagar:');
    if (montoStr === null) return;
    const monto = Number(montoStr);
    if (isNaN(monto) || monto <= 0) {
      toast.error("Monto inválido");
      return;
    }

    try {
      await registrarPago({
        ordenId: id!,
        presupuestoId: orden!.presupuestoId,
        monto,
        moneda: orden!.moneda ?? 'ARS',
        metodo: 'Efectivo',
      });
      toast.success("Pago registrado");
      const snap = await getDoc(doc(db, 'ordenes', id!));
      if (snap.exists()) setOrden(snap.data() as Orden);
      const pList = await getPagosPorOrden(id!);
      setPagos(pList);
    } catch (e) {
      console.error(e);
      toast.error("Error al registrar pago");
    }
  };

  const handleEliminarPago = async (pagoId: string) => {
    if (!confirm("¿Eliminar este pago? El saldo se recalculará automáticamente.")) return;
    try {
      await eliminarPago(pagoId, id!);
      toast.success("Pago eliminado");
      const snap = await getDoc(doc(db, 'ordenes', id!));
      if (snap.exists()) setOrden(snap.data() as Orden);
      const pList = await getPagosPorOrden(id!);
      setPagos(pList);
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar pago");
    }
  };

  const handleAgregarNotaBitacora = () => {
    if (!nuevaNotaBitacora.trim()) return;
    const nota: BitacoraNota = {
      id: crypto.randomUUID(),
      fecha: Date.now(),
      tecnico: tecnicoBitacora || 'Técnico',
      nota: nuevaNotaBitacora.trim(),
    };
    setBitacora(prev => [nota, ...prev]);
    setNuevaNotaBitacora('');
    toast.success("Nota interna agregada a la bitácora");
  };

  const handleToggleAccesorio = (acc: string) => {
    setAccesoriosRecibidos(prev =>
      prev.includes(acc) ? prev.filter(x => x !== acc) : [...prev, acc]
    );
  };

  const handleSetQA = (tipo: 'entrada' | 'salida', campo: keyof QAChecklist, valor: QAResult) => {
    if (tipo === 'entrada') {
      setQaEntrada(prev => ({ ...prev, [campo]: valor }));
    } else {
      setQaSalida(prev => ({ ...prev, [campo]: valor }));
    }
  };

  const handleAddRepuestoCatalogo = (p: Producto) => {
    appendRepuesto({
      id: crypto.randomUUID(),
      productoId: p.id,
      descripcion: p.nombre,
      cantidad: 1,
      precio: p.precioVenta,
    });
    setModalRepuestoPicker(false);
    toast.success(`"${p.nombre}" añadido como repuesto`);
  };

  // WhatsApp helpers
  const sendWhatsAppMsg = (type: 'recepcion' | 'presupuesto' | 'retiro') => {
    if (!orden) return;
    const tel = orden.clienteTelefono || '';
    if (!tel) {
      const askTel = prompt('Ingresa el teléfono del cliente (+54 9 11...):');
      if (!askTel) return;
      orden.clienteTelefono = askTel;
    }

    const token = orden.tokenTracking || orden.codigo || orden.id;
    const equipoStr = `${orden.equipo?.marca || ''} ${orden.equipo?.modelo || ''}`.trim();
    let msg = '';

    if (type === 'recepcion') {
      msg = WhatsAppTemplates.recepcion(orden.cliente, orden.codigo || orden.id, equipoStr, token);
    } else if (type === 'presupuesto') {
      msg = WhatsAppTemplates.presupuestoListo(orden.cliente, orden.codigo || orden.id, orden.totalFinal ?? orden.totalEstimado ?? 0, token);
    } else if (type === 'retiro') {
      msg = WhatsAppTemplates.equipoListo(orden.cliente, orden.codigo || orden.id, equipoStr, orden.saldo ?? 0);
    }

    const link = buildWhatsAppLink(orden.clienteTelefono || '', msg);
    window.open(link, '_blank');
  };

  const copyTrackingUrl = () => {
    if (!orden) return;
    const token = orden.tokenTracking || orden.codigo || orden.id;
    const url = getTrackingUrl(token);
    navigator.clipboard.writeText(url);
    toast.success('¡Enlace público copiado al portapapeles!');
  };

  const handleImprimir = async () => {
    if (!orden) return;
    const biz = await getSettings();
    const logoDataUrl = biz?.logoUrl ? await toDataURL(biz.logoUrl) : await toDataURL(logoUrl);

    const docPdf = await generarOrdenPDF({
      cliente: orden.cliente,
      fecha: new Date(orden.createdAt).toLocaleDateString(),
      codigoOrden: orden.codigo,
      equipo: {
        marca: orden.equipo?.marca,
        modelo: orden.equipo?.modelo,
        imeiSerie: orden.equipo?.imeiSerie
      },
      diagnostico: orden.diagnostico,
      notasEntrega: orden.notasEntrega,
      trabajos: orden.trabajos.map(t => ({
        descripcion: t.descripcion,
        precio: t.precio,
        horas: t.horas
      })),
      repuestos: orden.repuestos.map(r => ({
        descripcion: r.descripcion,
        cantidad: r.cantidad,
        precio: r.precio || 0
      })),
      totalFinal: orden.totalFinal ?? orden.totalEstimado ?? 0,
      pagado: orden.pagado ?? 0,
      saldo: orden.saldo ?? 0,
      moneda: orden.moneda,
      logoDataUrl: logoDataUrl ?? undefined,
      sub: biz?.name,
      address: biz?.address,
      phone: biz?.phone,
      email: biz?.email,
      footerText: biz?.footerText
    });

    docPdf.save(`Informe-OT-${orden.codigo || id?.slice(0, 8)}.pdf`);
  };

  if (!orden) return <div className="container py-5 text-center">Cargando orden...</div>;

  const accesoriosPredefinidos = [
    'Cargador Original',
    'Cargador Genérico',
    'Cable de Power',
    'Funda / Estuche',
    'Dongle USB / Receptor Mouse',
    'Caja Original',
    'Batería Desmontable',
    'Bandeja SIM'
  ];

  const qaItems: { key: keyof QAChecklist; label: string }[] = [
    { key: 'pantalla', label: 'Pantalla / Display / Touch' },
    { key: 'tecladoTouch', label: 'Teclado y Trackpad' },
    { key: 'puertosUsbAudio', label: 'Puertos USB y Conectores Audio' },
    { key: 'camaraMic', label: 'Cámara Frontal y Micrófono' },
    { key: 'wifiBluetooth', label: 'Conectividad Wi-Fi y Bluetooth' },
    { key: 'bateriaCarga', label: 'Batería y Ciclo de Carga' },
    { key: 'saludDiscosSMART', label: 'Salud SMART de SSD/HDD' },
    { key: 'temperaturasStress', label: 'Temperaturas bajo Carga (Stress)' },
  ];

  // SLA Alerta
  const diasAbierta = Math.floor((Date.now() - orden.createdAt) / (1000 * 60 * 60 * 24));
  const esSlaCritico = diasAbierta > 5 && orden.status !== 'completado' && orden.status !== 'entregado';

  return (
    <div className="container py-5">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
        <div>
          <h2 className="m-0 fw-bold text-gradient font-display">
            Orden de Trabajo
            <span className="ms-2 text-muted small fw-normal font-mono">({orden.codigo || id?.slice(0, 8)})</span>
          </h2>
          <span className="small text-muted">
            Ingreso: {formatDateTime(orden.createdAt)} ({diasAbierta} días transcurridos)
          </span>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {/* Botón WhatsApp */}
          <div className="dropdown position-relative">
            <button
              className="btn btn-outline-success dropdown-toggle d-flex align-items-center gap-1"
              type="button"
              onClick={() => setWaMenuOpen(prev => !prev)}
            >
              <i className="bi bi-whatsapp"></i>
              <span>Notificar WhatsApp</span>
            </button>
            <ul
              className={`dropdown-menu dropdown-menu-end shadow-sm ${waMenuOpen ? 'show' : ''}`}
              style={waMenuOpen ? { position: 'absolute', right: 0, top: '100%', zIndex: 1050 } : undefined}
            >
              <li>
                <button className="dropdown-item small" type="button" onClick={() => { setWaMenuOpen(false); sendWhatsAppMsg('recepcion'); }}>
                  <i className="bi bi-box-arrow-in-down me-2 text-primary"></i> Aviso: Equipo Recibido
                </button>
              </li>
              <li>
                <button className="dropdown-item small" type="button" onClick={() => { setWaMenuOpen(false); sendWhatsAppMsg('presupuesto'); }}>
                  <i className="bi bi-file-earmark-check me-2 text-warning"></i> Aviso: Presupuesto Listo
                </button>
              </li>
              <li>
                <button className="dropdown-item small" type="button" onClick={() => { setWaMenuOpen(false); sendWhatsAppMsg('retiro'); }}>
                  <i className="bi bi-check-circle-fill me-2 text-success"></i> Aviso: Listo para Retirar
                </button>
              </li>
              <li><hr className="dropdown-divider my-1" /></li>
              <li>
                <button className="dropdown-item small text-primary" type="button" onClick={() => { setWaMenuOpen(false); copyTrackingUrl(); }}>
                  <i className="bi bi-link-45deg me-2"></i> Copiar Link de Seguimiento
                </button>
              </li>
            </ul>
          </div>

          <button onClick={() => navigate(-1)} className="btn btn-light">
            <i className="bi bi-arrow-left me-1"></i> Volver
          </button>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-11 mx-auto">
          {/* Alerta SLA */}
          {esSlaCritico && (
            <div className="alert alert-warning d-flex align-items-center gap-3 p-3 rounded-3 mb-4 shadow-sm">
              <i className="bi bi-exclamation-triangle-fill fs-3 text-warning"></i>
              <div>
                <strong>Alerta de SLA / Demora en Taller:</strong>
                <div className="small">
                  Este equipo lleva {diasAbierta} días en taller sin finalizar. Requiere prioridad técnica o actualización al cliente.
                </div>
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="paper-container mb-4 shadow-lg">
            {/* Cabecera Sontech */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <img src={logoUrl} alt="Sontech" width={180} />
              <div className="text-end">
                <span className={`badge mb-2 status-${orden.status} text-uppercase`}>
                  {orden.status.replace('_', ' ')}
                </span>
                <h1 className="h4 mb-0 fw-bold text-primary">ORDEN DE TRABAJO</h1>
                <p className="text-muted small mb-0 fw-bold font-mono">OT-{orden.codigo || id?.slice(0, 8)}</p>
                {esGarantiaRMA && (
                  <span className="badge bg-danger mt-1 d-inline-block">REINGRESO POR GARANTÍA (RMA)</span>
                )}
                {(orden.esBeneficioPromo ||
                  orden.presupuestoId === 'BENEFICIO-PROMO' ||
                  Boolean(orden.codigo && orden.codigo.startsWith('SON-LIMP'))) && (
                  <span className="badge bg-success mt-1 ms-1 d-inline-block">
                    <i className="bi bi-gift-fill me-1"></i>BENEFICIO PROMO: LIMPIEZA 100% BONIFICADA
                  </span>
                )}
              </div>
            </div>

            {/* Info Cliente & Equipo */}
            <div className="row mb-4 g-3">
              <div className="col-md-6">
                <div className="bg-light p-3 border rounded h-100 border-start border-primary border-3">
                  <label className="x-small fw-bold text-muted mb-1 d-block text-uppercase">Información del Cliente</label>
                  <div className="fs-5 fw-bold mb-1">{orden.cliente}</div>
                  <div className="text-muted small">
                    {orden.clienteTelefono && <span><i className="bi bi-whatsapp text-success me-1"></i>{orden.clienteTelefono}</span>}
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="bg-light p-3 border rounded h-100 border-start border-info border-3">
                  <label className="x-small fw-bold text-muted mb-1 d-block text-uppercase">Equipo en Servicio</label>
                  <div className="fw-bold fs-6">{orden.equipo?.marca} {orden.equipo?.modelo}</div>
                  <div className="text-muted small font-mono">
                    SN/IMEI: {orden.equipo?.imeiSerie || 'N/A'} {orden.equipo?.pass ? `| PIN: ${orden.equipo.pass}` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen Financiero Rápido */}
            <div className="info-box-premium mb-4 border">
              <div className="stats-grid-compact">
                <div className="stat-item">
                  <label>Total Final</label>
                  <div className="value font-mono">${(orden.totalFinal ?? orden.totalEstimado ?? 0).toLocaleString()}</div>
                </div>
                <div className="stat-item">
                  <label>Pagado</label>
                  <div className="value text-success font-mono">${(orden.pagado ?? 0).toLocaleString()}</div>
                </div>
                <div className="stat-item">
                  <label>Saldo Pendiente</label>
                  <div className={`value font-mono ${(orden.saldo ?? 0) > 0 ? 'balance-negative' : 'balance-positive'}`}>
                    ${(orden.saldo ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="stat-item">
                  <label>Estado de Orden</label>
                  <select {...register("status")} className="form-control form-control-sm mt-1">
                    <option value="pendiente">Pendiente (Ingresado)</option>
                    <option value="en_progreso">En Diagnóstico / Banco</option>
                    <option value="esperando_repuestos">Esperando Repuestos</option>
                    <option value="pausado">Pausado</option>
                    <option value="completado">Completado (Listo p/ Retiro)</option>
                    <option value="entregado">Entregado al Cliente</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Navegación por Pestañas Técnicas de la Orden */}
            <ul className="nav nav-tabs mb-4">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${activeTab === 'taller' ? 'active text-primary' : 'text-muted'}`}
                  onClick={() => setActiveTab('taller')}
                >
                  <i className="bi bi-tools me-1"></i> Diagnóstico & Trabajos
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${activeTab === 'checkin' ? 'active text-primary' : 'text-muted'}`}
                  onClick={() => setActiveTab('checkin')}
                >
                  <i className="bi bi-box-arrow-in-down me-1"></i> Recepción & Check-in
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${activeTab === 'qa' ? 'active text-primary' : 'text-muted'}`}
                  onClick={() => setActiveTab('qa')}
                >
                  <i className="bi bi-check2-all me-1"></i> QA Checklists
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${activeTab === 'bitacora' ? 'active text-primary' : 'text-muted'}`}
                  onClick={() => setActiveTab('bitacora')}
                >
                  <i className="bi bi-shield-lock me-1"></i> Bitácora Interna ({bitacora.length})
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${activeTab === 'rma_sla' ? 'active text-primary' : 'text-muted'}`}
                  onClick={() => setActiveTab('rma_sla')}
                >
                  <i className="bi bi-shield-check me-1"></i> Garantía, RMA & SLA
                </button>
              </li>
            </ul>

            {/* TAB 1: TALLER & REPARACIÓN */}
            {activeTab === 'taller' && (
              <>
                <div className="row mb-4">
                  <div className="col-12 mb-3">
                    <label className="small fw-bold text-muted text-uppercase mb-2 d-block">
                      Informe Técnico / Diagnóstico de Banco
                    </label>
                    <textarea
                      {...register("diagnostico")}
                      rows={3}
                      className="form-control"
                      placeholder="Detalla las mediciones en placa, voltajes, fallas de componentes y trabajo a realizar..."
                    />
                  </div>
                  <div className="col-12">
                    <label className="small fw-bold text-muted text-uppercase mb-2 d-block">
                      Notas para el Cliente (Visible en informe de entrega)
                    </label>
                    <textarea
                      {...register("notasEntrega")}
                      rows={2}
                      className="form-control"
                      placeholder="Recomendaciones de cuidado, advertencias o detalles de la entrega..."
                    />
                  </div>
                </div>

                {/* Trabajos Realizados */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h3 className="h6 fw-bold text-uppercase m-0">Trabajos & Mano de Obra</h3>
                    <button
                      type="button"
                      onClick={() => appendTrabajo({ id: crypto.randomUUID(), descripcion: '', precio: 0 })}
                      className="btn btn-soft-primary btn-sm"
                    >
                      <i className="bi bi-plus-circle me-1"></i> Agregar Trabajo
                    </button>
                  </div>

                  <div className="items-container-vertical">
                    {trabajoFields.map((field, index) => (
                      <div key={field.id} className="item-card p-3">
                        <div className="row g-2 align-items-center">
                          <div className="col-md-7">
                            <input
                              {...register(`trabajos.${index}.descripcion`)}
                              placeholder="Ej: Micro-soldadura conector de carga, limpieza ultrasónica..."
                              className="form-control form-control-sm"
                            />
                          </div>
                          <div className="col-md-2">
                            <input
                              type="number"
                              {...register(`trabajos.${index}.horas`)}
                              placeholder="Hs"
                              className="form-control form-control-sm font-mono"
                            />
                          </div>
                          <div className="col-md-2">
                            <input
                              type="number"
                              {...register(`trabajos.${index}.precio`)}
                              placeholder="Precio $"
                              className="form-control form-control-sm font-mono"
                            />
                          </div>
                          <div className="col-md-1 text-end">
                            <button
                              type="button"
                              onClick={() => removeTrabajo(index)}
                              className="btn btn-sm btn-link text-danger p-0 border-0"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {trabajoFields.length === 0 && (
                      <div className="text-center py-3 text-muted small bg-light rounded">
                        No hay tareas adicionales registradas aún.
                      </div>
                    )}
                  </div>
                </div>

                {/* Repuestos & Materiales */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h3 className="h6 fw-bold text-uppercase m-0">Repuestos & Materiales Utilizados</h3>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        onClick={() => setModalRepuestoPicker(true)}
                        className="btn btn-outline-primary btn-sm"
                      >
                        <i className="bi bi-box-seam me-1"></i> Desde Inventario
                      </button>
                      <button
                        type="button"
                        onClick={() => appendRepuesto({ id: crypto.randomUUID(), descripcion: '', cantidad: 1, precio: 0 })}
                        className="btn btn-soft-primary btn-sm"
                      >
                        <i className="bi bi-plus-circle me-1"></i> Manual
                      </button>
                    </div>
                  </div>

                  <div className="items-container-vertical">
                    {repuestoFields.map((field, index) => (
                      <div key={field.id} className="item-card p-3">
                        <div className="row g-2 align-items-center">
                          <div className="col-md-7">
                            <input
                              {...register(`repuestos.${index}.descripcion`)}
                              placeholder="Ej: Pantalla OLED, Batería 3000mAh..."
                              className="form-control form-control-sm"
                            />
                          </div>
                          <div className="col-md-2">
                            <input
                              type="number"
                              {...register(`repuestos.${index}.cantidad`)}
                              placeholder="Cant."
                              className="form-control form-control-sm font-mono"
                            />
                          </div>
                          <div className="col-md-2">
                            <input
                              type="number"
                              {...register(`repuestos.${index}.precio`)}
                              placeholder="Precio $"
                              className="form-control form-control-sm font-mono"
                            />
                          </div>
                          <div className="col-md-1 text-end">
                            <button
                              type="button"
                              onClick={() => removeRepuesto(index)}
                              className="btn btn-sm btn-link text-danger p-0 border-0"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {repuestoFields.length === 0 && (
                      <div className="text-center py-3 text-muted small bg-light rounded">
                        No hay repuestos adicionales cargados.
                      </div>
                    )}
                  </div>
                </div>

                {/* Pagos Realizados */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h3 className="h6 fw-bold text-uppercase m-0">Pagos & Cobros Registrados</h3>
                    <button type="button" onClick={handlePagar} className="btn btn-sm btn-soft-success">
                      + Cobrar Pago
                    </button>
                  </div>
                  <div className="table-responsive bg-light p-2 rounded">
                    <table className="table table-sm table-borderless m-0 bg-transparent">
                      <thead className="x-small text-muted text-uppercase">
                        <tr>
                          <th>Fecha</th>
                          <th>Método</th>
                          <th className="text-end">Monto</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody className="small">
                        {pagos.map((p) => (
                          <tr key={p.id}>
                            <td className="font-mono text-muted">{new Date(p.createdAt).toLocaleDateString()}</td>
                            <td><span className="badge bg-white text-dark border">{p.metodo}</span></td>
                            <td className="text-end fw-bold font-mono">${p.monto.toLocaleString()}</td>
                            <td className="text-end">
                              <button
                                type="button"
                                onClick={() => handleEliminarPago(p.id)}
                                className="btn btn-sm btn-link text-danger p-0 border-0"
                              >
                                <i className="bi bi-x"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                        {pagos.length === 0 && (
                          <tr><td colSpan={4} className="text-center py-3 text-muted">No hay pagos registrados aún</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: RECEPCIÓN & CHECK-IN */}
            {activeTab === 'checkin' && (
              <div className="space-y-4">
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-bold">Falla Declarada por el Cliente</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={fallaDeclarada}
                      onChange={(e) => setFallaDeclarada(e.target.value)}
                      placeholder="Ej: Se cayó, no da imagen pero vibra al encender."
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-bold">Comportamiento Inicial Observado en Recepción</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={comportamientoInicial}
                      onChange={(e) => setComportamientoInicial(e.target.value)}
                      placeholder="Ej: Se conecta a fuente, consumo 0.05A constante. Cristal astillado."
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold">Estado Estético Detallado</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={estadoEstetico}
                      onChange={(e) => setEstadoEstetico(e.target.value)}
                      placeholder="Rayones en tapa trasera, bisagra derecha floja, falta 1 tornillo en chasis inferior..."
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold d-block mb-2">Accesorios Recibidos en Mano</label>
                    <div className="d-flex flex-wrap gap-2">
                      {accesoriosPredefinidos.map((acc) => {
                        const checked = accesoriosRecibidos.includes(acc);
                        return (
                          <button
                            key={acc}
                            type="button"
                            className={`btn btn-sm ${checked ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => handleToggleAccesorio(acc)}
                          >
                            <i className={`bi ${checked ? 'bi-check-circle-fill' : 'bi-plus'} me-1`}></i>
                            {acc}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: QA CHECKLISTS */}
            {activeTab === 'qa' && (
              <div>
                <p className="text-muted small mb-3">
                  Verifica cada punto de control al ingresar el equipo y al finalizar el servicio para garantizar que no existan reclamos posteriores.
                </p>
                <div className="table-responsive">
                  <table className="table table-bordered align-middle">
                    <thead className="table-light small text-uppercase">
                      <tr>
                        <th>Punto de Control</th>
                        <th className="text-center" style={{ width: '220px' }}>QA Entrada (Recepción)</th>
                        <th className="text-center" style={{ width: '220px' }}>QA Salida (Entrega)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qaItems.map((item) => (
                        <tr key={item.key}>
                          <td className="fw-semibold small">{item.label}</td>
                          <td className="text-center">
                            <div className="btn-group btn-group-sm">
                              <button
                                type="button"
                                className={`btn ${qaEntrada[item.key] === 'ok' ? 'btn-success' : 'btn-outline-secondary'}`}
                                onClick={() => handleSetQA('entrada', item.key, 'ok')}
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                className={`btn ${qaEntrada[item.key] === 'falla' ? 'btn-danger' : 'btn-outline-secondary'}`}
                                onClick={() => handleSetQA('entrada', item.key, 'falla')}
                              >
                                Falla
                              </button>
                              <button
                                type="button"
                                className={`btn ${qaEntrada[item.key] === 'na' ? 'btn-dark' : 'btn-outline-secondary'}`}
                                onClick={() => handleSetQA('entrada', item.key, 'na')}
                              >
                                N/A
                              </button>
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="btn-group btn-group-sm">
                              <button
                                type="button"
                                className={`btn ${qaSalida[item.key] === 'ok' ? 'btn-success' : 'btn-outline-secondary'}`}
                                onClick={() => handleSetQA('salida', item.key, 'ok')}
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                className={`btn ${qaSalida[item.key] === 'falla' ? 'btn-danger' : 'btn-outline-secondary'}`}
                                onClick={() => handleSetQA('salida', item.key, 'falla')}
                              >
                                Falla
                              </button>
                              <button
                                type="button"
                                className={`btn ${qaSalida[item.key] === 'na' ? 'btn-dark' : 'btn-outline-secondary'}`}
                                onClick={() => handleSetQA('salida', item.key, 'na')}
                              >
                                N/A
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: BITÁCORA INTERNA */}
            {activeTab === 'bitacora' && (
              <div>
                <div className="alert alert-info d-flex align-items-center gap-2 p-2 small mb-3">
                  <i className="bi bi-lock-fill fs-5"></i>
                  <span>
                    <strong>Notas Privadas del Taller:</strong> Esta información es exclusivamente para el equipo técnico interno y NO se imprimirá en el informe del cliente.
                  </span>
                </div>

                <div className="card border-0 bg-light p-3 mb-4">
                  <div className="row g-2">
                    <div className="col-12 col-md-4">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Nombre de técnico..."
                        value={tecnicoBitacora}
                        onChange={(e) => setTecnicoBitacora(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-8">
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Escribir nota técnica interna..."
                          value={nuevaNotaBitacora}
                          onChange={(e) => setNuevaNotaBitacora(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAgregarNotaBitacora();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-dark"
                          onClick={handleAgregarNotaBitacora}
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {bitacora.length === 0 ? (
                    <div className="text-center py-4 text-muted small">No hay notas internas cargadas.</div>
                  ) : (
                    bitacora.map((n) => (
                      <div key={n.id} className="p-3 bg-white border rounded shadow-sm">
                        <div className="d-flex justify-content-between align-items-center small text-muted mb-1">
                          <strong><i className="bi bi-person me-1"></i>{n.tecnico}</strong>
                          <span className="font-mono">{formatDateTime(n.fecha)}</span>
                        </div>
                        <div className="small text-dark">{n.nota}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: RMA, GARANTÍA & SLA */}
            {activeTab === 'rma_sla' && (
              <div className="space-y-4">
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded border h-100">
                      <h6 className="fw-bold mb-3">Política de Garantía & Reingreso (RMA)</h6>
                      <div className="form-check form-switch mb-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="rmaCheck"
                          checked={esGarantiaRMA}
                          onChange={(e) => setEsGarantiaRMA(e.target.checked)}
                        />
                        <label className="form-check-label fw-bold text-danger" htmlFor="rmaCheck">
                          ¿Es un Reingreso por Garantía (RMA)?
                        </label>
                      </div>

                      {esGarantiaRMA && (
                        <div className="mb-3">
                          <label className="form-label small fw-bold">Código de Orden Original</label>
                          <input
                            type="text"
                            className="form-control font-mono"
                            placeholder="Ej: OT-2026-0004"
                            value={ordenOrigenCodigo}
                            onChange={(e) => setOrdenOrigenCodigo(e.target.value)}
                          />
                        </div>
                      )}

                      <div>
                        <label className="form-label small fw-bold">Garantía Otorgada al Cliente (Días)</label>
                        <input
                          type="number"
                          className="form-control font-mono"
                          value={garantiaDias}
                          onChange={(e) => setGarantiaDias(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="p-3 bg-light rounded border h-100">
                      <h6 className="fw-bold mb-3">Asignación de Responsable & Taller</h6>
                      <div className="mb-3">
                        <label className="form-label small fw-bold">Técnico Principal Asignado</label>
                        <select
                          className="form-select"
                          value={tecnicoAsignado}
                          onChange={(e) => setTecnicoAsignado(e.target.value)}
                        >
                          <option value="Técnico 1">Técnico 1 (Laboratorio Central)</option>
                          <option value="Técnico 2">Técnico 2 (Microelectrónica)</option>
                          <option value="Técnico 3">Técnico 3 (Software & Redes)</option>
                          <option value="Tercerizado">Taller Tercerizado</option>
                        </select>
                      </div>

                      <div className="form-check form-switch mb-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="tercerizadoCheck"
                          checked={esTercerizado}
                          onChange={(e) => setEsTercerizado(e.target.checked)}
                        />
                        <label className="form-check-label small fw-bold" htmlFor="tercerizadoCheck">
                          Servicio o Laboratorio Tercerizado
                        </label>
                      </div>

                      {esTercerizado && (
                        <div>
                          <label className="form-label small fw-bold">Nombre del Taller / Proveedor Tercerizado</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Ej: Laboratorio BGA Express"
                            value={proveedorTercerizadoNombre}
                            onChange={(e) => setProveedorTercerizadoNombre(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Acciones Finales (FIJAS AL FONDO) */}
          <div className="sticky-action-bar print-hide">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-light text-muted me-auto">
              Volver
            </button>
            <button type="button" onClick={handlePagar} className="btn btn-soft-success">
              <i className="bi bi-cash-stack me-1"></i> Registrar Pago
            </button>
            <button type="button" onClick={handleImprimir} className="btn btn-soft-info">
              <i className="bi bi-file-earmark-pdf me-1"></i> Informe PDF
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              className="btn btn-primary px-5"
              disabled={saving}
            >
              {saving ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>
              ) : (
                <><i className="bi bi-check-lg me-1"></i> Guardar Todo</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Selector de Repuestos de Inventario */}
      {modalRepuestoPicker && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">Seleccionar Repuesto de Inventario</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalRepuestoPicker(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="list-group" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {productosDb.map((p) => (
                    <div
                      key={p.id}
                      className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3 cursor-pointer"
                      onClick={() => handleAddRepuestoCatalogo(p)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <div className="fw-bold">{p.nombre}</div>
                        <div className="small text-muted font-mono">
                          SKU: {p.codigo} | Stock: {p.stock} | Ubicación: {p.ubicacionTaller || '-'}
                        </div>
                      </div>
                      <div className="text-end">
                        <span className="fw-bold font-mono text-primary fs-6">
                          {formatCurrency(p.precioVenta)}
                        </span>
                        <div className="small text-muted">+ Usar en OT</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setModalRepuestoPicker(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
