import type { WorkStatus, PayStatus, Currency } from "./common";
import type { ItemPresupuesto } from "./presupuesto";
import type { Pago } from "./pago";

export type Equipo = {
  tipo?: "Celular" | "Notebook/PC" | "Tablet" | "Impresora" | "Otro" | string;
  marca?: string;
  modelo?: string;
  imeiSerie?: string;
  pass?: string; // contraseña o PIN facilitado
  accesorios?: string; // ej: funda, cargador, sim
};

export type TrabajoHecho = {
  id: string;
  descripcion: string;
  horas?: number;
  precio?: number;
  tecnico?: string;
};

export type RepuestoUsado = {
  id: string;
  productoId?: string; // vínculo al catálogo de productos
  descripcion: string;
  cantidad: number;
  costo?: number;
  precio?: number;
  serieLote?: string;
  proveedorId?: string;
  proveedorNombre?: string;
  garantiaDiasProveedor?: number;
  garantiaDiasCliente?: number;
};

export interface OrdenCheckin {
  estadoEstetico: string; // marcas, rayones, bisagras, faltante de tornillos
  accesoriosRecibidos: string[]; // ej: cargador original, genérico, funda, cable power, dongle
  fallaDeclarada: string;
  comportamientoInicial: string;
  fotosRecepcionUrls?: string[];
}

export type QAResult = "ok" | "falla" | "na";

export interface QAChecklist {
  pantalla?: QAResult;
  tecladoTouch?: QAResult;
  puertosUsbAudio?: QAResult;
  camaraMic?: QAResult;
  wifiBluetooth?: QAResult;
  bateriaCarga?: QAResult;
  saludDiscosSMART?: QAResult;
  temperaturasStress?: QAResult;
  observaciones?: string;
}

export interface BitacoraNota {
  id: string;
  fecha: number;
  tecnico: string;
  nota: string; // Nota interna confidencial, no visible en informe cliente
}

export interface VisitaTecnica {
  fecha: string;
  franjaHoraria: string;
  direccion: string;
  tecnico: string;
  contacto?: string;
  telefono?: string;
  notas?: string;
  completada?: boolean;
}

export type Orden = {
  id: string;
  presupuestoId: string;
  cliente: string;
  clienteId?: string;
  clienteTelefono?: string;
  clienteEmail?: string;

  equipo: Equipo;
  equipoId?: string; // Referencia a CMDB 'equipos'

  /** Check-in y recepción física */
  checkin?: OrdenCheckin;

  /** Trazabilidad de QA */
  qaEntrada?: QAChecklist;
  qaSalida?: QAChecklist;

  /** Bitácora interna de técnicos */
  bitacora?: BitacoraNota[];

  /** Diagnóstico formal */
  diagnostico?: string;
  trabajos: TrabajoHecho[];
  repuestos: RepuestoUsado[];

  /** Snapshot del presupuesto al momento de aceptar (trazabilidad) */
  itemsPresupuesto?: ItemPresupuesto[];
  moneda?: Currency;

  /** Estado de la orden y del pago */
  status: WorkStatus; // 'pendiente' | 'en_progreso' | 'esperando_repuestos' | 'pausado' | 'completado' | 'entregado'
  payStatus: PayStatus; // 'impago' | 'parcial' | 'pagado' | 'reembolsado'

  garantiaDias?: number;
  /** Notas internas o mensaje que se imprime en el Informe de Servicio */
  notasEntrega?: string;
  /** Comentarios/observaciones generales (opcional) */
  notas?: string;

  /** Control de Garantía y RMA */
  esGarantiaRMA?: boolean;
  ordenOrigenId?: string;
  ordenOrigenCodigo?: string;

  /** Asignación de taller & SLA */
  tecnicoAsignado?: string;
  esTercerizado?: boolean;
  proveedorTercerizadoNombre?: string;
  slaLimiteDiagnostico?: number; // timestamp límite para diagnóstico
  slaLimiteRepuestos?: number;   // timestamp límite si espera repuestos

  /** Visita técnica / Servicio in-situ */
  visitaTecnica?: VisitaTecnica;

  /** Token seguro para el Portal Público de Tracking */
  tokenTracking?: string;

  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  deliveredAt?: number;
  updatedAt?: number;

  /** Importes */
  totalEstimado?: number; // tomado del presupuesto
  totalFinal?: number; // si cambia (repuestos extra/horas)
  saldo?: number; // totalFinal o estimado - pagos
  pagado?: number; // total pagado acumulado

  /** Numeración */
  codigo?: string;
  anio?: number;
  numero?: number;

  /** Pagos embebidos (opcional) */
  pagos?: Pago[];
};
