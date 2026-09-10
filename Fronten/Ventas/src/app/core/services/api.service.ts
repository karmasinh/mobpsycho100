import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Cliente, EstadoCliente, Pensionado, Venta,
  CobroMensual, AsistenciaPensionado, Pedido, Plato, AlertaSistema,
  Proveedor, Rol, Empleado, CategoriaPlato, ModuloMenuDto,
  Sucursal, TipoAlmuerzo, Insumo, AuditoriaLog, TopProductoDto,
  LineaProduccion, ProduccionDia, TipoLineaProduccion, EstadoProduccion,
  CierreCaja, RentabilidadPlato, VentaPorSucursal, MovimientoCaja, TipoMovimientoCaja,
  Empresa
} from '../models';

const API = environment.apiUrl;

// ── Clientes ─────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ClienteService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Cliente[]>                           { return this.http.get<Cliente[]>(`${API}/clientes`); }
  listarPorEstado(estado: EstadoCliente): Observable<Cliente[]> { return this.http.get<Cliente[]>(`${API}/clientes/estado/${estado}`); }
  obtener(id: number): Observable<Cliente>                  { return this.http.get<Cliente>(`${API}/clientes/${id}`); }
  crear(body: Partial<Cliente>): Observable<Cliente>        { return this.http.post<Cliente>(`${API}/clientes`, body); }
  actualizar(id: number, body: Partial<Cliente>): Observable<Cliente> { return this.http.put<Cliente>(`${API}/clientes/${id}`, body); }
}

// ── Empresa ───────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class EmpresaService {
  constructor(private http: HttpClient) {}

  obtener(): Observable<Empresa>                            { return this.http.get<Empresa>(`${API}/empresa`); }
  guardar(body: Partial<Empresa>): Observable<Empresa>      { return this.http.put<Empresa>(`${API}/empresa`, body); }
}

// ── Pensionados ───────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class PensionadoService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Pensionado[]>                        { return this.http.get<Pensionado[]>(`${API}/pensionados`); }
  obtener(id: number): Observable<Pensionado>               { return this.http.get<Pensionado>(`${API}/pensionados/${id}`); }
  registrar(body: any): Observable<Pensionado>              { return this.http.post<Pensionado>(`${API}/pensionados`, body); }
  baja(id: number): Observable<void>                        { return this.http.patch<void>(`${API}/pensionados/${id}/baja`, null); }
  reactivar(id: number): Observable<void>                   { return this.http.patch<void>(`${API}/pensionados/${id}/reactivar`, null); }

  registrarAsistencia(id: number, fecha?: string): Observable<any> {
    let params = new HttpParams();
    if (fecha) params = params.set('fecha', fecha);
    return this.http.post(`${API}/pensionados/${id}/asistencia`, null, { params });
  }

  listarAsistencias(id: number): Observable<AsistenciaPensionado[]> { return this.http.get<AsistenciaPensionado[]>(`${API}/pensionados/${id}/asistencia`); }
  generarCobro(id: number, mes: number, anio: number): Observable<CobroMensual> {
    return this.http.post<CobroMensual>(`${API}/pensionados/${id}/cobro/generar`, null, { params: { mes, anio } });
  }
  listarCobros(id: number): Observable<CobroMensual[]>      { return this.http.get<CobroMensual[]>(`${API}/pensionados/${id}/cobros`); }
  cobrosPendientes(): Observable<CobroMensual[]>            { return this.http.get<CobroMensual[]>(`${API}/pensionados/cobros/pendientes`); }
  cobrosPorMes(mes: number, anio: number): Observable<CobroMensual[]> { return this.http.get<CobroMensual[]>(`${API}/pensionados/cobros/por-mes`, { params: { mes, anio } }); }
  registrarPago(body: any): Observable<CobroMensual>        { return this.http.post<CobroMensual>(`${API}/pensionados/cobro/pagar`, body); }
}

// ── Pedidos ───────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class PedidoService {
  constructor(private http: HttpClient) {}

  crear(body: any): Observable<Pedido>                          { return this.http.post<Pedido>(`${API}/pedidos`, body); }
  obtener(id: number): Observable<Pedido>                       { return this.http.get<Pedido>(`${API}/pedidos/${id}`); }
  listarPorCliente(id: number): Observable<Pedido[]>            { return this.http.get<Pedido[]>(`${API}/pedidos/cliente/${id}`); }
  listarPorEstado(estado: string, sucursalId?: number | null): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${API}/pedidos/estado/${estado}`,
      { params: sucursalId != null ? { sucursalId } : {} });
  }
  cambiarEstado(id: number, nuevoEstado: string): Observable<Pedido> {
    return this.http.patch<Pedido>(`${API}/pedidos/${id}/estado`, null, { params: { nuevoEstado } });
  }
  cancelar(id: number): Observable<void>                        { return this.http.patch<void>(`${API}/pedidos/${id}/cancelar`, null); }
}

// ── Ventas ────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class VentaService {
  constructor(private http: HttpClient) {}

  cobrar(pedidoId: number, montoRecibido: number, formaPago: string): Observable<Venta> {
    return this.http.post<Venta>(
      `${API}/ventas/cobrar/${pedidoId}`, null,
      { params: { montoRecibido, formaPago } }
    );
  }

  listar(desde: string, hasta: string, sucursalId?: number | null): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${API}/ventas`, { params: this.conSucursal({ desde, hasta }, sucursalId) });
  }

  total(desde: string, hasta: string, sucursalId?: number | null): Observable<{ total: number }> {
    return this.http.get<{ total: number }>(`${API}/ventas/total`, { params: this.conSucursal({ desde, hasta }, sucursalId) });
  }

  obtener(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${API}/ventas/${id}`);
  }

  anular(id: number, motivo: string): Observable<void> {
    return this.http.patch<void>(`${API}/ventas/${id}/anular`, { motivo });
  }

  topProductos(desde: string, hasta: string, limit = 10, sucursalId?: number | null): Observable<TopProductoDto[]> {
    return this.http.get<TopProductoDto[]>(`${API}/ventas/top-productos`, { params: this.conSucursal({ desde, hasta, limit }, sucursalId) });
  }

  rentabilidad(desde: string, hasta: string, sucursalId?: number | null): Observable<RentabilidadPlato[]> {
    return this.http.get<RentabilidadPlato[]>(`${API}/ventas/rentabilidad`, { params: this.conSucursal({ desde, hasta }, sucursalId) });
  }

  private conSucursal(params: Record<string, any>, sucursalId?: number | null): Record<string, any> {
    return sucursalId != null ? { ...params, sucursalId } : params;
  }

  comparativoSucursales(desde: string, hasta: string): Observable<VentaPorSucursal[]> {
    return this.http.get<VentaPorSucursal[]>(`${API}/ventas/comparativo-sucursales`, { params: { desde, hasta } });
  }
}

// ── Cierre de caja ──────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class CierreCajaService {
  constructor(private http: HttpClient) {}

  abrir(montoInicial: number, sucursalId?: number | null): Observable<CierreCaja> {
    let params = new HttpParams().set('montoInicial', montoInicial);
    if (sucursalId != null) params = params.set('sucursalId', sucursalId);
    return this.http.post<CierreCaja>(`${API}/cierres-caja/abrir`, null, { params });
  }

  cerrar(id: number, montoFinalDeclarado: number, observaciones?: string): Observable<CierreCaja> {
    return this.http.patch<CierreCaja>(`${API}/cierres-caja/${id}/cerrar`, { montoFinalDeclarado, observaciones });
  }

  obtenerAbierto(): Observable<CierreCaja | null> {
    return this.http.get<CierreCaja>(`${API}/cierres-caja/abierto`);
  }

  listarPorSucursal(sucursalId: number): Observable<CierreCaja[]> {
    return this.http.get<CierreCaja[]>(`${API}/cierres-caja/sucursal/${sucursalId}`);
  }

  registrarMovimiento(cierreCajaId: number, tipo: TipoMovimientoCaja, monto: number, motivo?: string): Observable<MovimientoCaja> {
    return this.http.post<MovimientoCaja>(`${API}/cierres-caja/${cierreCajaId}/movimientos`, { tipo, monto, motivo });
  }

  listarMovimientos(cierreCajaId: number): Observable<MovimientoCaja[]> {
    return this.http.get<MovimientoCaja[]>(`${API}/cierres-caja/${cierreCajaId}/movimientos`);
  }

  revertirMovimiento(movimientoId: number, motivo: string): Observable<MovimientoCaja> {
    return this.http.patch<MovimientoCaja>(`${API}/cierres-caja/movimientos/${movimientoId}/revertir`, { motivo });
  }
}

// ── Platos ────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class PlatoService {
  constructor(private http: HttpClient) {}
  listar(): Observable<Plato[]>                              { return this.http.get<Plato[]>(`${API}/platos`); }
  listarPorTipo(tipo: string): Observable<Plato[]>           { return this.http.get<Plato[]>(`${API}/platos/tipo/${tipo}`); }
}

// ── Proveedores ──────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ProveedorService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Proveedor[]>                       { return this.http.get<Proveedor[]>(`${API}/proveedores`); }
  listarTodos(): Observable<Proveedor[]>                  { return this.http.get<Proveedor[]>(`${API}/proveedores/todos`); }
  obtener(id: number): Observable<Proveedor>              { return this.http.get<Proveedor>(`${API}/proveedores/${id}`); }
  crear(body: Partial<Proveedor>): Observable<Proveedor>  { return this.http.post<Proveedor>(`${API}/proveedores`, body); }
  actualizar(id: number, body: Partial<Proveedor>): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${API}/proveedores/${id}`, body);
  }
  desactivar(id: number): Observable<void>                { return this.http.delete<void>(`${API}/proveedores/${id}`); }
}

// ── Categorias Plato (CRUD completo) ─────────────────────────
@Injectable({ providedIn: 'root' })
export class CategoriaPlatoService {
  constructor(private http: HttpClient) {}

  listar(): Observable<CategoriaPlato[]>                       { return this.http.get<CategoriaPlato[]>(`${API}/categorias-plato`); }
  listarTodas(): Observable<CategoriaPlato[]>                  { return this.http.get<CategoriaPlato[]>(`${API}/categorias-plato/todas`); }
  crear(body: Partial<CategoriaPlato>): Observable<CategoriaPlato> {
    return this.http.post<CategoriaPlato>(`${API}/categorias-plato`, body);
  }
  actualizar(id: number, body: Partial<CategoriaPlato>): Observable<CategoriaPlato> {
    return this.http.put<CategoriaPlato>(`${API}/categorias-plato/${id}`, body);
  }
  desactivar(id: number): Observable<void>                     { return this.http.delete<void>(`${API}/categorias-plato/${id}`); }
}

// ── Roles (Admin) ─────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class RolService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Rol[]>                             { return this.http.get<Rol[]>(`${API}/roles`); }
  obtener(id: number): Observable<Rol>                    { return this.http.get<Rol>(`${API}/roles/${id}`); }
  crear(body: { nombre: string; descripcion?: string; moduloIds?: number[] }): Observable<Rol> {
    return this.http.post<Rol>(`${API}/roles`, body);
  }
  actualizar(id: number, body: { nombre: string; descripcion?: string; moduloIds?: number[] }): Observable<Rol> {
    return this.http.put<Rol>(`${API}/roles/${id}`, body);
  }
  desactivar(id: number): Observable<void>                { return this.http.delete<void>(`${API}/roles/${id}`); }
}

// ── Módulos Menu ──────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ModuloMenuService {
  constructor(private http: HttpClient) {}

  listarActivos(): Observable<ModuloMenuDto[]>            { return this.http.get<ModuloMenuDto[]>(`${API}/modulos`); }
}

// ── Usuarios / Empleados Admin ────────────────────────────────
@Injectable({ providedIn: 'root' })
export class EmpleadoAdminService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Empleado[]>                        { return this.http.get<Empleado[]>(`${API}/empleados`); }
  asignarRol(usuarioId: number, rolId: number): Observable<void> {
    return this.http.patch<void>(`${API}/empleados/usuarios/${usuarioId}/rol/${rolId}`, null);
  }
  desbloquear(usuarioId: number): Observable<void> {
    return this.http.patch<void>(`${API}/empleados/usuarios/${usuarioId}/desbloquear`, null);
  }
  cambiarPassword(usuarioId: number, password: string): Observable<void> {
    return this.http.patch<void>(`${API}/empleados/usuarios/${usuarioId}/password`, { password });
  }
}

// ── Sucursales ───────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class SucursalService {
  constructor(private http: HttpClient) {}
  listar(): Observable<Sucursal[]>                          { return this.http.get<Sucursal[]>(`${API}/sucursales`); }
  listarTodas(): Observable<Sucursal[]>                     { return this.http.get<Sucursal[]>(`${API}/sucursales/todas`); }
  obtener(id: number): Observable<Sucursal>                 { return this.http.get<Sucursal>(`${API}/sucursales/${id}`); }
  crear(body: Partial<Sucursal>): Observable<Sucursal>      { return this.http.post<Sucursal>(`${API}/sucursales`, body); }
  actualizar(id: number, body: Partial<Sucursal>): Observable<Sucursal> {
    return this.http.put<Sucursal>(`${API}/sucursales/${id}`, body);
  }
  desactivar(id: number): Observable<void>                  { return this.http.delete<void>(`${API}/sucursales/${id}`); }
}

// ── Tipos de Almuerzo ─────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class TipoAlmuerzoPensionadosService {
  constructor(private http: HttpClient) {}
  listar(): Observable<TipoAlmuerzo[]>                           { return this.http.get<TipoAlmuerzo[]>(`${API}/tipos-almuerzo`); }
  listarTodos(): Observable<TipoAlmuerzo[]>                      { return this.http.get<TipoAlmuerzo[]>(`${API}/tipos-almuerzo/todos`); }
  obtener(id: number): Observable<TipoAlmuerzo>                  { return this.http.get<TipoAlmuerzo>(`${API}/tipos-almuerzo/${id}`); }
  crear(body: Partial<TipoAlmuerzo>): Observable<TipoAlmuerzo>   { return this.http.post<TipoAlmuerzo>(`${API}/tipos-almuerzo`, body); }
  actualizar(id: number, body: Partial<TipoAlmuerzo>): Observable<TipoAlmuerzo> {
    return this.http.put<TipoAlmuerzo>(`${API}/tipos-almuerzo/${id}`, body);
  }
  desactivar(id: number): Observable<void>                       { return this.http.delete<void>(`${API}/tipos-almuerzo/${id}`); }
}

// ── Alertas ──────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AlertaService {
  constructor(private http: HttpClient) {}
  listarNoLeidas(): Observable<AlertaSistema[]>              { return this.http.get<AlertaSistema[]>(`${API}/alertas`); }
  contarNoLeidas(): Observable<{ total: number }>            { return this.http.get<{ total: number }>(`${API}/alertas/count`); }
  marcarLeida(id: number): Observable<void>                  { return this.http.patch<void>(`${API}/alertas/${id}/leer`, null); }
  marcarTodasLeidas(): Observable<void>                      { return this.http.patch<void>(`${API}/alertas/leer-todas`, null); }
}

// ── Auditoría ─────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  constructor(private http: HttpClient) {}
  listar(): Observable<AuditoriaLog[]>                                   { return this.http.get<AuditoriaLog[]>(`${API}/auditoria`); }
  porUsuario(username: string): Observable<AuditoriaLog[]>               { return this.http.get<AuditoriaLog[]>(`${API}/auditoria/usuario/${username}`); }
  porEntidad(entidad: string, id: number): Observable<AuditoriaLog[]>    { return this.http.get<AuditoriaLog[]>(`${API}/auditoria/entidad/${entidad}/${id}`); }
}

// ── Insumos ───────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class InsumoService {
  constructor(private http: HttpClient) {}
  listar(): Observable<Insumo[]>    { return this.http.get<Insumo[]>(`${API}/insumos`); }
  listarTodos(): Observable<Insumo[]> { return this.http.get<Insumo[]>(`${API}/insumos/todos`); }
}

// ── Recetas ───────────────────────────────────────────────────
export interface RecetaResumen {
  platoId: number; platoNombre: string; platoCodigo: string; platoTipo: string | null;
  precioVenta: number; costoEstimado: number; margen: number;
  tieneReceta: boolean; recetaId?: number; version?: number;
  costoTotal?: number; notas?: string | null;
}

export interface IngredienteDetalle {
  id: number; insumoId: number; insumoNombre: string; insumoUnidad: string;
  precioUnitario: number; cantidad: number; unidadMedida: string; costoIngrediente: number;
}

export interface RecetaDetalle {
  id: number; platoId: number; platoNombre: string; platoCodigo: string;
  platoTipo: string | null; precioVenta: number; version: number; activa: boolean;
  notas: string | null; costoTotal: number; creadoEn: string;
  ingredientes: IngredienteDetalle[];
}

@Injectable({ providedIn: 'root' })
export class RecetaService {
  constructor(private http: HttpClient) {}
  listar(): Observable<RecetaResumen[]>                         { return this.http.get<RecetaResumen[]>(`${API}/recetas`); }
  getActiva(platoId: number): Observable<RecetaDetalle>         { return this.http.get<RecetaDetalle>(`${API}/recetas/plato/${platoId}/activa`); }
  getVersiones(platoId: number): Observable<RecetaDetalle[]>    { return this.http.get<RecetaDetalle[]>(`${API}/recetas/plato/${platoId}`); }
  crear(platoId: number, body: any): Observable<RecetaDetalle>  { return this.http.post<RecetaDetalle>(`${API}/recetas/plato/${platoId}`, body); }
  activar(id: number): Observable<RecetaDetalle>                { return this.http.put<RecetaDetalle>(`${API}/recetas/${id}/activar`, null); }
}

// ── Producción del día ────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ProduccionService {
  constructor(private http: HttpClient) {}

  crear(body: any): Observable<ProduccionDia> {
    return this.http.post<ProduccionDia>(`${API}/produccion`, body);
  }

  obtener(id: number): Observable<ProduccionDia> {
    return this.http.get<ProduccionDia>(`${API}/produccion/${id}`);
  }

  hoy(sucursalId: number): Observable<ProduccionDia | null> {
    return this.http.get<ProduccionDia>(`${API}/produccion/hoy`, { params: { sucursalId } });
  }

  listar(sucursalId: number): Observable<ProduccionDia[]> {
    return this.http.get<ProduccionDia[]>(`${API}/produccion/sucursal/${sucursalId}`);
  }

  cambiarEstado(id: number, nuevoEstado: EstadoProduccion): Observable<ProduccionDia> {
    return this.http.patch<ProduccionDia>(`${API}/produccion/${id}/estado`, null, { params: { nuevoEstado } });
  }

  actualizarProducida(lineaId: number, cantidad: number): Observable<LineaProduccion> {
    return this.http.patch<LineaProduccion>(`${API}/produccion/lineas/${lineaId}/producida`, null, { params: { cantidad } });
  }

  disponiblesHoy(sucursalId: number, tipo: TipoLineaProduccion): Observable<LineaProduccion[]> {
    return this.http.get<LineaProduccion[]>(`${API}/produccion/hoy/disponibles`, { params: { sucursalId, tipo } });
  }
}

