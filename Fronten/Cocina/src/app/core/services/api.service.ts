import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Pedido, EstadoPedido, Insumo, StockInsumo, LoteInsumo,
  MovimientoInventario, Plato, AlertaSistema, ModuloMenuDto,
  Proveedor, Rol, Empleado, Sucursal,
  LineaProduccion, ProduccionDia, TipoLineaProduccion, EstadoProduccion,
  AuditoriaLog
} from '../models';

const API = environment.apiUrl;

// ── Pedidos ──────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class PedidoService {
  constructor(private http: HttpClient) {}

  listarPorEstado(estado: EstadoPedido, sucursalId?: number | null): Observable<Pedido[]> {
    let params = new HttpParams();
    if (sucursalId != null) params = params.set('sucursalId', sucursalId);
    return this.http.get<Pedido[]>(`${API}/pedidos/estado/${estado}`, { params });
  }

  listarActivos(sucursalId: number): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${API}/pedidos/activos/sucursal/${sucursalId}`);
  }

  obtener(id: number): Observable<Pedido> {
    return this.http.get<Pedido>(`${API}/pedidos/${id}`);
  }

  cambiarEstado(id: number, nuevoEstado: EstadoPedido): Observable<Pedido> {
    return this.http.patch<Pedido>(
      `${API}/pedidos/${id}/estado`,
      null,
      { params: { nuevoEstado } }
    );
  }

  cancelar(id: number): Observable<void> {
    return this.http.patch<void>(`${API}/pedidos/${id}/cancelar`, null);
  }
}

// ── Inventario ───────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class InventarioService {
  constructor(private http: HttpClient) {}

  stock(sucursalId: number): Observable<StockInsumo[]> {
    return this.http.get<StockInsumo[]>(`${API}/inventario/stock`, { params: { sucursalId } });
  }

  stockBajo(sucursalId: number): Observable<StockInsumo[]> {
    return this.http.get<StockInsumo[]>(`${API}/inventario/stock-bajo`, { params: { sucursalId } });
  }

  vencimientos(dias = 15, sucursalId?: number | null): Observable<LoteInsumo[]> {
    let params = new HttpParams().set('dias', dias);
    if (sucursalId != null) params = params.set('sucursalId', sucursalId);
    return this.http.get<LoteInsumo[]>(`${API}/inventario/vencimientos`, { params });
  }

  movimientos(insumoId: number, sucursalId?: number | null): Observable<MovimientoInventario[]> {
    let params = new HttpParams();
    if (sucursalId != null) params = params.set('sucursalId', sucursalId);
    return this.http.get<MovimientoInventario[]>(
      `${API}/inventario/insumos/${insumoId}/movimientos`, { params }
    );
  }

  ingresarLote(insumoId: number, sucursalId: number, params: {
    proveedorId?: number;
    numeroLote?: string;
    cantidad: number;
    precioUnitario: number;
    fechaVencimiento?: string;
  }): Observable<LoteInsumo> {
    let httpParams = new HttpParams()
      .set('sucursalId', sucursalId)
      .set('cantidad', params.cantidad)
      .set('precioUnitario', params.precioUnitario);
    if (params.proveedorId)      httpParams = httpParams.set('proveedorId', params.proveedorId);
    if (params.numeroLote)       httpParams = httpParams.set('numeroLote', params.numeroLote);
    if (params.fechaVencimiento) httpParams = httpParams.set('fechaVencimiento', params.fechaVencimiento);
    return this.http.post<LoteInsumo>(`${API}/inventario/insumos/${insumoId}/lote`, null, { params: httpParams });
  }

  consumirStock(insumoId: number, sucursalId: number, cantidad: number, motivo?: string): Observable<void> {
    let params = new HttpParams().set('sucursalId', sucursalId).set('cantidad', cantidad);
    if (motivo) params = params.set('motivo', motivo);
    return this.http.post<void>(`${API}/inventario/insumos/${insumoId}/consumir`, null, { params });
  }

  ajustarStock(insumoId: number, sucursalId: number, cantidad: number, motivo: string): Observable<void> {
    return this.http.patch<void>(`${API}/inventario/insumos/${insumoId}/ajustar`, { cantidad, motivo },
      { params: { sucursalId } });
  }

  ajustarStockMinimo(insumoId: number, sucursalId: number, valor: number): Observable<void> {
    return this.http.patch<void>(`${API}/inventario/insumos/${insumoId}/stock-minimo`, null,
      { params: { sucursalId, valor } });
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


// ── Platos ───────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class PlatoService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Plato[]> {
    return this.http.get<Plato[]>(`${API}/platos`);
  }

  listarTodos(): Observable<Plato[]> {
    return this.http.get<Plato[]>(`${API}/platos/todos`);
  }

  listarPorTipo(tipo: string): Observable<Plato[]> {
    return this.http.get<Plato[]>(`${API}/platos/tipo/${tipo}`);
  }

  obtener(id: number): Observable<Plato> {
    return this.http.get<Plato>(`${API}/platos/${id}`);
  }

  crear(plato: any): Observable<Plato> {
    return this.http.post<Plato>(`${API}/platos`, plato);
  }

  actualizar(id: number, plato: any): Observable<Plato> {
    return this.http.put<Plato>(`${API}/platos/${id}`, plato);
  }

  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/platos/${id}`);
  }
}

// ── Insumos ──────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class InsumoService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(`${API}/insumos`);
  }

  listarTodos(): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(`${API}/insumos/todos`);
  }

  obtener(id: number): Observable<Insumo> {
    return this.http.get<Insumo>(`${API}/insumos/${id}`);
  }

  crear(insumo: any): Observable<Insumo> {
    return this.http.post<Insumo>(`${API}/insumos`, insumo);
  }

  actualizar(id: number, insumo: any): Observable<Insumo> {
    return this.http.put<Insumo>(`${API}/insumos/${id}`, insumo);
  }

  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/insumos/${id}`);
  }
}

// ── Categorías ────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class CategoriaService {
  constructor(private http: HttpClient) {}

  listarCategoriasInsumo(): Observable<any[]> {
    return this.http.get<any[]>(`${API}/categorias-insumo`);
  }

  listarCategoriasInsumoTodas(): Observable<any[]> {
    return this.http.get<any[]>(`${API}/categorias-insumo/todas`);
  }

  crearCategoriaInsumo(categoria: any): Observable<any> {
    return this.http.post<any>(`${API}/categorias-insumo`, categoria);
  }

  actualizarCategoriaInsumo(id: number, categoria: any): Observable<any> {
    return this.http.put<any>(`${API}/categorias-insumo/${id}`, categoria);
  }

  desactivarCategoriaInsumo(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/categorias-insumo/${id}`);
  }

  listarCategoriasPlato(): Observable<any[]> {
    return this.http.get<any[]>(`${API}/categorias-plato`);
  }
}

// ── Alertas ──────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AlertaService {
  constructor(private http: HttpClient) {}

  listarNoLeidas(): Observable<AlertaSistema[]> {
    return this.http.get<AlertaSistema[]>(`${API}/alertas`);
  }

  contarNoLeidas(): Observable<{ total: number }> {
    return this.http.get<{ total: number }>(`${API}/alertas/count`);
  }

  marcarLeida(id: number): Observable<void> {
    return this.http.patch<void>(`${API}/alertas/${id}/leer`, null);
  }

  marcarTodasLeidas(): Observable<void> {
    return this.http.patch<void>(`${API}/alertas/leer-todas`, null);
  }
}

// ── Auditoría ─────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  constructor(private http: HttpClient) {}
  listar(): Observable<AuditoriaLog[]>                                   { return this.http.get<AuditoriaLog[]>(`${API}/auditoria`); }
  porUsuario(username: string): Observable<AuditoriaLog[]>               { return this.http.get<AuditoriaLog[]>(`${API}/auditoria/usuario/${username}`); }
  porEntidad(entidad: string, id: number): Observable<AuditoriaLog[]>    { return this.http.get<AuditoriaLog[]>(`${API}/auditoria/entidad/${entidad}/${id}`); }
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

// ── Usuarios / Empleados Admin ────────────────────────────────
@Injectable({ providedIn: 'root' })
export class EmpleadoAdminService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Empleado[]>                        { return this.http.get<Empleado[]>(`${API}/empleados`); }
  obtener(id: number): Observable<Empleado>               { return this.http.get<Empleado>(`${API}/empleados/${id}`); }
  crear(body: any): Observable<Empleado>                  { return this.http.post<Empleado>(`${API}/empleados`, body); }
  actualizar(id: number, body: any): Observable<Empleado> { return this.http.put<Empleado>(`${API}/empleados/${id}`, body); }
  desactivar(id: number): Observable<void>                { return this.http.delete<void>(`${API}/empleados/${id}`); }
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

// ── Mermas ───────────────────────────────────────────────────
export interface Merma {
  id: number;
  insumoId: number;
  insumoNombre: string;
  insumoUnidad: string;
  fecha: string;
  hora: string;
  cantidad: number;
  causa: string;
  observaciones: string;
  valorEconomico: number;
  usuario: string | null;
}

@Injectable({ providedIn: 'root' })
export class MermaService {
  constructor(private http: HttpClient) {}
  listar(sucursalId?: number | null): Observable<Merma[]> {
    let params = new HttpParams();
    if (sucursalId != null) params = params.set('sucursalId', sucursalId);
    return this.http.get<Merma[]>(`${API}/inventario/mermas`, { params });
  }
  listarPorInsumo(id: number, sucursalId?: number | null): Observable<Merma[]> {
    let params = new HttpParams();
    if (sucursalId != null) params = params.set('sucursalId', sucursalId);
    return this.http.get<Merma[]>(`${API}/inventario/insumos/${id}/mermas`, { params });
  }
  registrar(id: number, sucursalId: number, body: { cantidad: number; causa: string; observaciones?: string }): Observable<Merma> {
    return this.http.post<Merma>(`${API}/inventario/insumos/${id}/merma`, body, { params: { sucursalId } });
  }
}

// ── Kárdex ────────────────────────────────────────────────────
export interface KardexLinea {
  id: number;
  fechaHora: string;
  tipo: string;
  descripcion: string | null;
  observaciones: string | null;
  entradas: number;
  salidas: number;
  saldo: number;
  valorEconomico: number;
  usuario: string | null;
}

export interface KardexResponse {
  insumoId: number;
  insumoNombre: string;
  insumoUnidad: string;
  precioUnitario: number;
  desde: string;
  hasta: string;
  saldoInicial: number;
  totalEntradas: number;
  totalSalidas: number;
  saldoFinal: number;
  valorTotal: number;
  movimientos: KardexLinea[];
}

@Injectable({ providedIn: 'root' })
export class KardexService {
  constructor(private http: HttpClient) {}
  obtener(insumoId: number, sucursalId: number, desde: string, hasta: string): Observable<KardexResponse> {
    return this.http.get<KardexResponse>(`${API}/inventario/insumos/${insumoId}/kardex`, {
      params: { sucursalId, desde, hasta }
    });
  }
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

// ── Gemini IA ─────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class GeminiService {
  private readonly GEMINI_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  private http: HttpClient;

  constructor(handler: HttpBackend) {
    this.http = new HttpClient(handler);
  }

  sugerirReceta(
    platoNombre: string,
    ingredientes: { nombre: string; cantidad: number; unidad: string }[],
    costoTotal: number
  ): Observable<string> {
    const lista = ingredientes.map(i => `- ${i.nombre}: ${i.cantidad} ${i.unidad}`).join('\n');
    const prompt =
      `Eres un chef experto en cocina boliviana. Estoy preparando "${platoNombre}" con los siguientes ingredientes:\n\n` +
      `${lista}\n\nCosto total de ingredientes: Bs ${costoTotal.toFixed(2)}\n\n` +
      `Por favor proporciona:\n1. **Preparación paso a paso** (numerada)\n2. **Tiempo de preparación** estimado\n` +
      `3. **Porciones** sugeridas\n4. **Consejos del chef**\n\nResponde en español.`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    };

    return this.http
      .post<any>(`${this.GEMINI_URL}?key=${environment.geminiApiKey}`, body)
      .pipe(map(res => res?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sin respuesta de la IA.'));
  }
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

// ── Módulos y Menús ──────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ModuloMenuService {
  constructor(private http: HttpClient) {}

  listarActivos(): Observable<ModuloMenuDto[]> {
    return this.http.get<ModuloMenuDto[]>(`${API}/modulos`);
  }

  listarGestion(): Observable<ModuloMenuDto[]> {
    return this.http.get<ModuloMenuDto[]>(`${API}/modulos/gestion`);
  }

  listarPorSistema(sistema: string): Observable<ModuloMenuDto[]> {
    return this.http.get<ModuloMenuDto[]>(`${API}/modulos/sistema/${sistema}`);
  }

  crear(modulo: any): Observable<ModuloMenuDto> {
    return this.http.post<ModuloMenuDto>(`${API}/modulos`, modulo);
  }

  actualizar(id: number, modulo: any): Observable<ModuloMenuDto> {
    return this.http.put<ModuloMenuDto>(`${API}/modulos/${id}`, modulo);
  }

  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/modulos/${id}`);
  }
}
