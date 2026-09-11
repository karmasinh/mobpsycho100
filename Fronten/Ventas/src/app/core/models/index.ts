// ============================================================
// MODELOS COMPARTIDOS — conectados al backend Spring Boot
// ============================================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface ModuloMenuDto {
  id: number;
  codigo: string;
  nombre: string;
  icono: string;
  ruta: string;
  orden: number;
  padreId: number | null;
  sistema?: string;
  activo?: boolean;
}

export interface LoginResponse {
  token: string;
  tipo: string;
  usuarioId: number;
  username: string;
  rol: string;
  sistema: 'COCINA' | 'VENTAS' | 'ADMIN';
  sucursalId: number | null;
  sucursalNombre: string | null;
  modulos: ModuloMenuDto[];
}

export interface Usuario {
  id: number;
  username: string;
  activo: boolean;
  intentosFallidos: number;
  ultimoAcceso: string | null;
  rol: Rol;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  modulos: ModuloMenuDto[];
}

export interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  ci: string;
  telefono: string;
  correo: string;
  cargo: string;
  turno: 'MANANA' | 'TARDE' | 'NOCHE' | 'COMPLETO';
  fechaIngreso: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO' | 'ELIMINADO';
  sucursalId: number | null;
  sucursalNombre: string | null;
  usuarioId: number | null;
  username: string | null;
  rolNombre: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Pedido {
  id: number;
  estado: EstadoPedido;
  total: number;
  observaciones: string;
  cliente?: { id: number; nombre: string };
  pensionado?: { id: number; nombre: string; apellido: string };
  cajero?: { id: number; nombre: string; apellido: string };
  detalles: DetallePedido[];
  creadoEn: string;
  actualizadoEn: string;
}

export type EstadoPedido =
  | 'PENDIENTE'
  | 'EN_PREPARACION'
  | 'LISTO'
  | 'ENTREGADO'
  | 'CANCELADO';

export interface DetallePedido {
  id: number;
  plato: { id: number; nombre: string; tipo: string };
  sopaSeleccionada?: { id: number; nombre: string };
  segundoSeleccionado?: { id: number; nombre: string };
  cantidad: number;
  precioUnitario: number;
  observaciones: string;
}

export type TipoLineaProduccion = 'SOPA' | 'SEGUNDO' | 'ESPECIAL';
export type EstadoProduccion = 'PLANIFICADO' | 'EN_CURSO' | 'CERRADO';

export interface LineaProduccion {
  id: number;
  plato: Plato;
  tipo: TipoLineaProduccion;
  cantidadPlanificada: number;
  cantidadProducida: number;
  cantidadVendida: number;
  cantidadDisponible: number;
}

export interface ProduccionDia {
  id: number;
  fecha: string;
  estado: EstadoProduccion;
  sucursal: { id: number; nombre: string };
  lineas: LineaProduccion[];
  creadoEn: string;
}

export interface Plato {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  precioVenta: number;
  costoEstimado: number;
  tipo: string;
  activo: boolean;
  categorias: CategoriaPlato[];
}

export interface CategoriaPlato {
  id: number;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

export interface Insumo {
  id: number;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  precioUnitario: number;
  perecedero: boolean;
  activo: boolean;
  categoria: { id: number; nombre: string };
}

export interface LoteInsumo {
  id: number;
  numeroLote: string;
  insumo: Insumo;
  cantidadDisponible: number;
  precioUnitario: number;
  fechaVencimiento: string | null;
  fechaIngreso: string;
  activo: boolean;
}

export interface AuditoriaLog {
  id: number;
  accion: string;
  entidad: string;
  entidadId: number | null;
  username: string;
  ip: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  creadoEn: string;
}

export interface AlertaSistema {
  id: number;
  tipo: TipoAlerta;
  mensaje: string;
  entidadReferenciaNombre: string;
  leida: boolean;
  creadoEn: string;
}

export type TipoAlerta =
  | 'VENCIMIENTO_15_DIAS'
  | 'VENCIMIENTO_7_DIAS'
  | 'VENCIMIENTO_3_DIAS'
  | 'STOCK_MINIMO'
  | 'CLIENTE_INACTIVO'
  | 'PENSIONADO_BAJA'
  | 'LOGIN_BLOQUEADO';

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  correo: string;
  estado: EstadoCliente;
  fechaRegistro: string;
  ultimaCompra: string | null;
}

export interface Empresa {
  id: number;
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  logoUrl: string | null;
}

export type EstadoCliente =
  | 'CLIENTE_NUEVO'
  | 'POSIBLE_ACTIVO'
  | 'POSIBLE_INACTIVO'
  | 'ACTIVO'
  | 'INACTIVO'
  | 'RECUPERADO'
  | 'ELIMINADO'
  | 'BLOQUEADO';

export interface Pensionado {
  id: number;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono?: string;
  correo?: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'BAJA_VOLUNTARIA' | 'BAJA_AUTOMATICA' | 'REACTIVADO';
  tipoAlmuerzo?: { id: number; nombre: string; precioMensual: number };
  sucursal?: { id: number; nombre: string } | null;
  saldoPendiente?: number;
  fechaInscripcion: string;
}

export interface CobroMensual {
  id: number;
  pensionadoId: number;
  pensionadoNombre: string;
  pensionadoApellido: string;
  mes: number;
  anio: number;
  montoBase: number;
  saldoAnterior: number;
  totalCobrado: number;
  montoPagado: number;
  saldoRestante: number;
  diasAsistidos: number;
  pagado: boolean;
  fechaPago: string | null;
  formaPago: string | null;
  creadoEn: string;
}

export interface AsistenciaPensionado {
  id: number;
  pensionadoId: number;
  fecha: string;
  asistio: boolean;
  creadoEn: string;
}

export interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  activo: boolean;
  creadoEn: string;
}

export interface TipoAlmuerzo {
  id: number;
  nombre: string;
  precioMensual: number;
  descripcion: string;
  diasDisponibles: string;
  activo: boolean;
}

export interface Venta {
  id: number;
  pedido: Pedido;
  totalCobrado: number;
  montoRecibido: number;
  vuelto: number;
  formaPago: 'EFECTIVO' | 'QR' | 'MIXTO' | 'CREDITO_CUENTA';
  anulada: boolean;
  motivoAnulacion?: string;
  numeroTicket?: string;
  cajero?: { id: number; username: string };
  usuarioAnulacion?: { id: number; username: string };
  creadoEn: string;
  anuladaEn?: string;
}

export interface ConfiguracionTicket {
  id: number | null;
  sucursal: { id: number; nombre: string };
  razonSocial: string | null;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  logoBase64: string | null;
  mostrarCajero: boolean;
  mostrarCliente: boolean;
  mostrarFormaPago: boolean;
  mostrarObservaciones: boolean;
  mostrarNumeroPedido: boolean;
  mensajePie: string | null;
  leyendaLegal: string | null;
  anchoMm: number;
  copias: number;
  imprimirAutomatico: boolean;
  correlativoActual: number;
  prefijo: string | null;
}

// ── Facturación electrónica SIAT (cimientos, sin conexión real al SIN) ──

export type AmbienteFacturacion = 'PRUEBAS' | 'PRODUCCION';

export interface ConfiguracionFacturacion {
  id: number | null;
  sucursal: { id: number; nombre: string };
  nit: string | null;
  razonSocial: string | null;
  municipio: string | null;
  leyendaFactura: string | null;
  ambiente: AmbienteFacturacion;
  facturacionHabilitada: boolean;
  cuis: string | null;
  cuisVigenteHasta: string | null;
  cufd: string | null;
  cufdCodigoControl: string | null;
  cufdDireccion: string | null;
  cufdVigenteHasta: string | null;
  numeroFacturaActual: number;
  actualizadoEn: string | null;
  estadoHabilitacion: 'DESHABILITADA' | 'FALTA_NIT' | 'FALTA_CUIS' | 'CUFD_VENCIDO' | 'LISTA';
}

export interface EstadoFacturacionDto {
  sucursalId: number;
  habilitada: boolean;
  conexionSin: boolean;
  estado: string;
  ambiente: AmbienteFacturacion;
  cuisVigente: boolean;
  cufdVigente: boolean;
  mensaje: string;
}

export type EstadoFactura = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'ANULADA';

export interface Factura {
  id: number;
  venta: { id: number };
  sucursal?: { id: number; nombre: string };
  cuf: string | null;
  numeroFactura: number;
  fechaEmision: string;
  nitCliente: string;
  tipoDocumento: number | null;
  razonSocialCliente: string;
  complemento: string | null;
  correoCliente: string | null;
  montoTotal: number;
  estado: EstadoFactura;
  motivoAnulacionCodigo: number | null;
  motivoAnulacionDetalle: string | null;
  anuladaEn: string | null;
  creadoEn: string;
}

export type EstadoCierreCaja = 'ABIERTO' | 'CERRADO';

export interface CierreCaja {
  id: number;
  sucursal: { id: number; nombre: string };
  cajero: { id: number; username: string };
  fechaApertura: string;
  fechaCierre: string | null;
  montoInicial: number;
  montoFinalDeclarado: number | null;
  totalVentasEfectivo: number;
  totalVentasQr: number;
  totalVentasMixto: number;
  totalVentasCredito: number;
  totalVentasGeneral: number;
  cantidadVentas: number;
  totalIngresos: number;
  totalRetiros: number;
  montoEsperadoEfectivo: number | null;
  diferencia: number | null;
  observaciones: string | null;
  estado: EstadoCierreCaja;
  creadoEn: string;
}

export type TipoMovimientoCaja = 'INGRESO' | 'RETIRO';

export interface MovimientoCaja {
  id: number;
  tipo: TipoMovimientoCaja;
  monto: number;
  motivo: string | null;
  usuario?: { id: number; username: string };
  revierteId?: number | null;
  creadoEn: string;
}

export type TipoSolicitud = 'ANULACION_VENTA' | 'REVERSION_MOVIMIENTO_CAJA';
export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface SolicitudAprobacion {
  id: number;
  tipo: TipoSolicitud;
  entidadId: number;
  sucursal?: { id: number; nombre: string };
  motivo: string;
  estado: EstadoSolicitud;
  solicitante?: { id: number; username: string };
  resueltoPor?: { id: number; username: string };
  motivoRechazo?: string | null;
  creadoEn: string;
  resueltoEn?: string | null;
}

export interface Proveedor {
  id: number;
  nit: string;
  nombre: string;
  direccion: string;
  telefono: string;
  correo: string;
  contacto: string;
  activo: boolean;
  creadoEn: string;
}

export interface CategoriaInsumo {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

// ── Tema ─────────────────────────────────────────────────────
export type ThemeName = 'fuego' | 'brasa' | 'hielo' | 'vapor';

export interface Theme {
  id: ThemeName;
  nombre: string;
  descripcion: string;
  emoji: string;
}

// ── API Error ─────────────────────────────────────────────────
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  mensaje: string;
  ruta: string;
  detalle?: Record<string, string>;
}

export interface TopProductoDto {
  platoId: number;
  platoNombre: string;
  cantidadVendida: number;
  totalIngresos: number;
}

export interface RentabilidadPlato {
  platoId: number;
  platoNombre: string;
  cantidadVendida: number;
  totalIngresos: number;
  costoUnitarioEstimado: number;
  costoTotalEstimado: number;
  margenTotal: number;
  margenPct: number;
}

export interface VentaPorSucursal {
  sucursalId: number;
  sucursalNombre: string;
  total: number;
  cantidad: number;
}

// ── Paginación ────────────────────────────────────────────────
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
