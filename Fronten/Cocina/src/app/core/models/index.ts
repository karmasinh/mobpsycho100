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

export interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  activo: boolean;
  creadoEn: string;
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
  // Planos, no anidados
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
  sucursal?: { id: number; nombre: string };
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

export type TipoEventoPedido = 'PEDIDO_NUEVO' | 'PEDIDO_ACTUALIZADO';

export interface PedidoEvento {
  tipo: TipoEventoPedido;
  pedido: Pedido;
}

export interface DetallePedido {
  id: number;
  plato: { id: number; nombre: string; tipo: string };
  cantidad: number;
  precioUnitario: number;
  observaciones: string;
  sopaSeleccionada?: { id: number; nombre: string };
  segundoSeleccionado?: { id: number; nombre: string };
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

/** Stock "vivo" de un insumo en la sucursal activa (catálogo + cantidad disponible ahí) */
export interface StockInsumo {
  insumoId: number;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  precioUnitario: number;
  perecedero: boolean;
  categoriaId: number | null;
  categoriaNombre: string | null;
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
  telefono: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'BAJA_VOLUNTARIA' | 'BAJA_AUTOMATICA' | 'REACTIVADO';
  tipoAlmuerzo: { id: number; nombre: string; precioMensual: number };
  saldoPendiente: number;
  fechaInscripcion: string;
}

export interface CobroMensual {
  id: number;
  pensionado: Pick<Pensionado, 'id' | 'nombre' | 'apellido'>;
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
}

export interface Venta {
  id: number;
  pedido: Pedido;
  totalCobrado: number;
  montoRecibido: number;
  vuelto: number;
  formaPago: 'EFECTIVO' | 'QR' | 'MIXTO' | 'CREDITO_CUENTA';
  anulada: boolean;
  creadoEn: string;
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
export type ThemeName = 'entrerriana' | 'fuego' | 'nocturno' | 'aurora' | 'nube' | 'rosa' | 'carbon';

export interface Theme {
  id: ThemeName;
  nombre: string;
  descripcion: string;
  emoji: string;
  color: string;
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

// ── Paginación ────────────────────────────────────────────────
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface MovimientoInventario {
  id: number;
  insumo: Insumo;
  tipo: TipoMovimientoInventario;
  cantidad: number;
  stockAnterior: number;
  stockPosterior: number;
  motivo: string;
  creadoEn: string;
}

export type TipoMovimientoInventario =
  | 'INGRESO_COMPRA'
  | 'CONSUMO_PRODUCCION'
  | 'MERMA'
  | 'VENCIMIENTO'
  | 'AJUSTE_MANUAL'
  | 'DEVOLUCION_PROVEEDOR';

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