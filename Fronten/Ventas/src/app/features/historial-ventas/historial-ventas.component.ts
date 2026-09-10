import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentaService, SolicitudAprobacionService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { Venta } from '../../core/models';

type SortCol = 'fecha' | 'total' | 'formaPago' | 'estado';

@Component({
  selector: 'app-historial-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <div class="space-y-5 animate-slide-up">

      <!-- Cabecera -->
      <div>
        <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
          Historial de ventas
        </h1>
        <p class="text-sm mt-0.5" style="color:rgb(var(--color-on-surface)/0.5)">
          Consulta y gestión de ventas registradas
        </p>
      </div>

      <!-- Filtros de fecha -->
      <div class="card flex flex-wrap gap-3 items-end">
        <div class="flex flex-col gap-1">
          <label class="input-label">Desde *</label>
          <input type="date" [(ngModel)]="desde" class="input" [max]="hasta">
        </div>
        <div class="flex flex-col gap-1">
          <label class="input-label">Hasta *</label>
          <input type="date" [(ngModel)]="hasta" class="input" [min]="desde" [max]="hoyStr()">
        </div>
        <button (click)="buscar()" [disabled]="cargando()" class="btn-primary">
          @if (cargando()) {
            <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
          } @else { 🔍 }
          Buscar
        </button>
        <button (click)="setHoy()" class="btn-secondary text-sm">Hoy</button>
        <button (click)="setEsteMes()" class="btn-secondary text-sm">Este mes</button>
        <button (click)="setMesAnterior()" class="btn-secondary text-sm">Mes anterior</button>
      </div>

      <!-- Stats -->
      @if (ventas().length > 0 || buscado()) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="stat-card">
            <p class="stat-label">Total recaudado</p>
            <p class="stat-value">Bs {{ totalVigente() | number:'1.2-2' }}</p>
            <p class="text-xs mt-1" style="color:rgb(var(--color-on-surface)/0.4)">
              {{ ventasVigentes() }} ventas vigentes
            </p>
          </div>
          <div class="stat-card">
            <p class="stat-label">Total ventas</p>
            <p class="stat-value">{{ ventas().length }}</p>
            <p class="text-xs mt-1" style="color:rgb(var(--color-on-surface)/0.4)">
              en el período
            </p>
          </div>
          <div class="stat-card">
            <p class="stat-label">Promedio por venta</p>
            <p class="stat-value">Bs {{ promedio() | number:'1.2-2' }}</p>
          </div>
          <div class="stat-card">
            <p class="stat-label">Anuladas</p>
            <p class="stat-value"
               [style.color]="ventasAnuladas() > 0 ? 'rgb(var(--color-danger))' : 'inherit'">
              {{ ventasAnuladas() }}
            </p>
            @if (ventasAnuladas() > 0) {
              <p class="text-xs mt-1" style="color:rgb(var(--color-danger)/0.7)">
                Bs {{ totalAnulado() | number:'1.2-2' }} anulado
              </p>
            }
          </div>
        </div>
      }

      <!-- Tabla -->
      <div class="card space-y-3">
        <div class="flex flex-wrap items-center gap-3 justify-between">
          <input [(ngModel)]="busqueda" class="input w-56 text-sm"
                 placeholder="🔍 Buscar por cliente, cajero..."
                 maxlength="100">
          <div class="flex gap-2">
            <button (click)="setFiltroEstado('')"
                    class="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                    [style.background]="filtroEstado() === '' ? 'rgb(var(--color-primary))' : 'rgb(var(--color-surface-2))'"
                    [style.color]="filtroEstado() === '' ? 'rgb(var(--color-on-primary))' : 'rgb(var(--color-on-surface)/0.6)'">
              Todos
            </button>
            <button (click)="setFiltroEstado('vigente')"
                    class="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                    [style.background]="filtroEstado() === 'vigente' ? 'rgb(var(--color-success))' : 'rgb(var(--color-surface-2))'"
                    [style.color]="filtroEstado() === 'vigente' ? 'white' : 'rgb(var(--color-on-surface)/0.6)'">
              Vigentes
            </button>
            <button (click)="setFiltroEstado('anulada')"
                    class="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                    [style.background]="filtroEstado() === 'anulada' ? 'rgb(var(--color-danger))' : 'rgb(var(--color-surface-2))'"
                    [style.color]="filtroEstado() === 'anulada' ? 'white' : 'rgb(var(--color-on-surface)/0.6)'">
              Anuladas
            </button>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th class="cursor-pointer select-none" (click)="sortBy('fecha')">
                  Fecha y hora {{ si('fecha') }}
                </th>
                <th>Cliente</th>
                <th>Cajero</th>
                <th class="cursor-pointer select-none" (click)="sortBy('formaPago')">
                  Forma pago {{ si('formaPago') }}
                </th>
                <th class="cursor-pointer select-none text-right" (click)="sortBy('total')">
                  Total {{ si('total') }}
                </th>
                <th class="cursor-pointer select-none" (click)="sortBy('estado')">
                  Estado {{ si('estado') }}
                </th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (cargando()) {
                @for (i of [1,2,3,4,5]; track i) {
                  <tr>
                    @for (j of [1,2,3,4,5,6,7]; track j) {
                      <td><div class="skeleton h-4 rounded w-full"></div></td>
                    }
                  </tr>
                }
              } @else if (ventasPaginadas().length === 0) {
                <tr>
                  <td colspan="7" class="text-center py-12">
                    <p class="text-4xl mb-2 opacity-20">💰</p>
                    <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.4)">
                      {{ buscado() ? 'No se encontraron ventas en el período' : 'Selecciona un rango de fechas y presiona Buscar' }}
                    </p>
                  </td>
                </tr>
              } @else {
                @for (v of ventasPaginadas(); track v.id) {
                  <tr>
                    <td class="font-mono text-xs whitespace-nowrap">
                      {{ v.creadoEn | date:'dd/MM/yyyy' }}<br>
                      <span style="color:rgb(var(--color-on-surface)/0.45)">
                        {{ v.creadoEn | date:'HH:mm' }}
                      </span>
                    </td>
                    <td class="text-sm">
                      @if (v.pedido?.cliente) {
                        {{ v.pedido.cliente!.nombre }}
                      } @else if (v.pedido?.pensionado) {
                        <span style="color:rgb(var(--color-info))">
                          {{ v.pedido.pensionado!.nombre }} {{ v.pedido.pensionado!.apellido }}
                        </span>
                      } @else {
                        <span style="color:rgb(var(--color-on-surface)/0.3)">—</span>
                      }
                    </td>
                    <td class="text-sm font-mono">
                      {{ v.cajero?.username ?? '—' }}
                    </td>
                    <td>
                      <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                            [style.background]="fpBg(v.formaPago)"
                            [style.color]="fpColor(v.formaPago)">
                        {{ fpLabel(v.formaPago) }}
                      </span>
                    </td>
                    <td class="text-right font-mono font-bold text-sm"
                        [style.color]="v.anulada ? 'rgb(var(--color-on-surface)/0.3)' : 'inherit'"
                        [style.textDecoration]="v.anulada ? 'line-through' : 'none'">
                      Bs {{ v.totalCobrado | number:'1.2-2' }}
                    </td>
                    <td>
                      @if (v.anulada) {
                        <span class="badge-danger text-xs">Anulada</span>
                      } @else {
                        <span class="badge-success text-xs">Vigente</span>
                      }
                    </td>
                    <td>
                      <div class="flex gap-1">
                        <button (click)="verDetalle(v)"
                                class="btn-ghost text-xs px-2 py-1"
                                title="Ver detalle">
                          👁️
                        </button>
                        @if (!v.anulada && puedeAnular()) {
                          <button (click)="abrirAnular(v)"
                                  class="btn-ghost text-xs px-2 py-1 text-danger"
                                  [title]="esAdmin() ? 'Anular venta' : 'Solicitar anulación'">
                            ✕
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <app-pagination
          [total]="filtradas().length"
          [pageSize]="pageSize"
          [pagina]="pagina()"
          (pageChange)="pagina.set($event)" />
      </div>
    </div>

    <!-- ── Modal detalle ─────────────────────────────────────── -->
    @if (ventaDetalle()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.5)" (click)="ventaDetalle.set(null)">
        <div class="card max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-4 animate-pop"
             (click)="$event.stopPropagation()">

          <div class="flex items-center justify-between">
            <h3 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
              Venta #{{ ventaDetalle()!.id }}
            </h3>
            <button (click)="ventaDetalle.set(null)"
                    class="btn-ghost text-lg leading-none">✕</button>
          </div>

          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p class="input-label">Fecha</p>
              <p>{{ ventaDetalle()!.creadoEn | date:'dd/MM/yyyy HH:mm' }}</p>
            </div>
            <div>
              <p class="input-label">Cajero</p>
              <p>{{ ventaDetalle()!.cajero?.username ?? '—' }}</p>
            </div>
            <div>
              <p class="input-label">Forma de pago</p>
              <p>{{ fpLabel(ventaDetalle()!.formaPago) }}</p>
            </div>
            <div>
              <p class="input-label">Estado</p>
              @if (ventaDetalle()!.anulada) {
                <span class="badge-danger text-xs">Anulada</span>
              } @else {
                <span class="badge-success text-xs">Vigente</span>
              }
            </div>
            @if (ventaDetalle()!.pedido?.cliente) {
              <div>
                <p class="input-label">Cliente</p>
                <p>{{ ventaDetalle()!.pedido.cliente!.nombre }}</p>
              </div>
            }
            @if (ventaDetalle()!.anulada && ventaDetalle()!.motivoAnulacion) {
              <div class="col-span-2">
                <p class="input-label">Motivo de anulación</p>
                <p class="text-danger">{{ ventaDetalle()!.motivoAnulacion }}</p>
              </div>
            }
          </div>

          <!-- Detalles del pedido -->
          @if (ventaDetalle()!.pedido?.detalles?.length) {
            <div>
              <p class="input-label mb-2">Detalle de platos</p>
              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Plato</th>
                      <th class="text-center">Cant.</th>
                      <th class="text-right">Precio</th>
                      <th class="text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (d of ventaDetalle()!.pedido.detalles; track d.id) {
                      <tr>
                        <td class="text-sm">{{ d.plato?.nombre ?? '—' }}</td>
                        <td class="text-center font-mono">{{ d.cantidad }}</td>
                        <td class="text-right font-mono text-sm">
                          Bs {{ d.precioUnitario | number:'1.2-2' }}
                        </td>
                        <td class="text-right font-mono font-semibold text-sm">
                          Bs {{ (d.precioUnitario * d.cantidad) | number:'1.2-2' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- Totales -->
          <div class="space-y-1 pt-3 text-sm"
               style="border-top:1px solid rgb(var(--color-border))">
            <div class="flex justify-between">
              <span style="color:rgb(var(--color-on-surface)/0.5)">Subtotal</span>
              <span class="font-mono">Bs {{ ventaDetalle()!.totalCobrado | number:'1.2-2' }}</span>
            </div>
            <div class="flex justify-between">
              <span style="color:rgb(var(--color-on-surface)/0.5)">Recibido</span>
              <span class="font-mono">Bs {{ ventaDetalle()!.montoRecibido | number:'1.2-2' }}</span>
            </div>
            @if ((ventaDetalle()!.vuelto ?? 0) > 0) {
              <div class="flex justify-between" style="color:rgb(var(--color-success))">
                <span>Vuelto</span>
                <span class="font-mono font-bold">Bs {{ ventaDetalle()!.vuelto | number:'1.2-2' }}</span>
              </div>
            }
            <div class="flex justify-between font-bold text-base pt-1"
                 style="border-top:1px solid rgb(var(--color-border))">
              <span>Total cobrado</span>
              <span class="font-mono" style="color:rgb(var(--color-primary))">
                Bs {{ ventaDetalle()!.totalCobrado | number:'1.2-2' }}
              </span>
            </div>
          </div>

          <button (click)="ventaDetalle.set(null)" class="btn-secondary w-full justify-center">
            Cerrar
          </button>
        </div>
      </div>
    }

    <!-- ── Modal anular ──────────────────────────────────────── -->
    @if (modalAnular()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.5)">
        <div class="card max-w-sm w-full space-y-4 animate-pop">
          <h3 class="font-display font-bold text-lg" style="color:rgb(var(--color-danger))">
            {{ esAdmin() ? 'Anular' : 'Solicitar anulación de' }} venta #{{ ventaAnular()?.id }}
          </h3>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.6)">
            @if (esAdmin()) {
              Esta acción no se puede deshacer. Ingresá el motivo de anulación.
            } @else {
              La anulación queda pendiente hasta que un administrador la apruebe. Ingresá el motivo.
            }
          </p>
          <div>
            <label class="input-label">Motivo de anulación *</label>
            <textarea [(ngModel)]="motivoAnulacion"
                      class="input w-full resize-none"
                      rows="3"
                      maxlength="255"
                      placeholder="Describe el motivo de la anulación..."></textarea>
            @if (errMotivo()) {
              <p class="text-xs mt-1" style="color:rgb(var(--color-danger))">
                {{ errMotivo() }}
              </p>
            }
          </div>
          <div class="flex gap-2">
            <button (click)="modalAnular.set(false)" class="btn-secondary flex-1 justify-center"
                    [disabled]="procesando()">
              Cancelar
            </button>
            <button (click)="confirmarAnular()" class="btn-danger flex-1 justify-center"
                    [disabled]="procesando()">
              @if (procesando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              }
              {{ esAdmin() ? 'Anular venta' : 'Enviar solicitud' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class HistorialVentasComponent implements OnInit {

  ventas    = signal<Venta[]>([]);
  cargando  = signal(false);
  procesando = signal(false);
  buscado   = signal(false);

  desde = '';
  hasta = '';
  busqueda = '';

  filtroEstado = signal<'' | 'vigente' | 'anulada'>('');
  sortCol      = signal<SortCol | ''>('fecha');
  sortDir      = signal<'asc' | 'desc'>('desc');
  pagina       = signal(1);
  pageSize     = 15;

  ventaDetalle = signal<Venta | null>(null);
  modalAnular  = signal(false);
  ventaAnular  = signal<Venta | null>(null);
  motivoAnulacion = '';
  errMotivo    = signal('');

  constructor(
    private ventaService: VentaService,
    private solicitudService: SolicitudAprobacionService,
    public auth: AuthService,
    private toastSvc: ToastService,
  ) {}

  ngOnInit(): void {
    this.setEsteMes();
    this.buscar();
  }

  hoyStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  setHoy(): void {
    const hoy = this.hoyStr();
    this.desde = hoy;
    this.hasta = hoy;
    this.buscar();
  }

  setEsteMes(): void {
    const hoy = new Date();
    this.desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    this.hasta = this.hoyStr();
  }

  setMesAnterior(): void {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    this.desde = primerDia.toISOString().split('T')[0];
    this.hasta = ultimoDia.toISOString().split('T')[0];
    this.buscar();
  }

  buscar(): void {
    if (!this.desde || !this.hasta) return;
    this.cargando.set(true);
    this.pagina.set(1);
    const desdeISO = `${this.desde}T00:00:00`;
    const hastaISO = `${this.hasta}T23:59:59`;
    this.ventaService.listar(desdeISO, hastaISO).subscribe({
      next: vs => {
        this.ventas.set(vs);
        this.buscado.set(true);
        this.cargando.set(false);
      },
      error: () => {
        this.toastSvc.error('No se pudo cargar el historial de ventas');
        this.cargando.set(false);
      },
    });
  }

  setFiltroEstado(v: '' | 'vigente' | 'anulada'): void {
    this.filtroEstado.set(v);
    this.pagina.set(1);
  }

  filtradas = computed(() => {
    let list = this.ventas();

    if (this.filtroEstado() === 'vigente') list = list.filter(v => !v.anulada);
    if (this.filtroEstado() === 'anulada') list = list.filter(v => v.anulada);

    const q = this.busqueda.toLowerCase().trim();
    if (q) {
      list = list.filter(v =>
        v.cajero?.username?.toLowerCase().includes(q) ||
        v.pedido?.cliente?.nombre?.toLowerCase().includes(q) ||
        v.pedido?.pensionado?.nombre?.toLowerCase().includes(q) ||
        v.formaPago?.toLowerCase().includes(q) ||
        String(v.id).includes(q)
      );
    }

    const col = this.sortCol();
    if (col) {
      list = [...list].sort((a, b) => {
        let av: any, bv: any;
        if (col === 'fecha')     { av = a.creadoEn; bv = b.creadoEn; }
        if (col === 'total')     { av = a.totalCobrado; bv = b.totalCobrado; }
        if (col === 'formaPago') { av = a.formaPago; bv = b.formaPago; }
        if (col === 'estado')    { av = a.anulada ? 1 : 0; bv = b.anulada ? 1 : 0; }
        if (av < bv) return this.sortDir() === 'asc' ? -1 : 1;
        if (av > bv) return this.sortDir() === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  });

  ventasPaginadas = computed(() => {
    const start = (this.pagina() - 1) * this.pageSize;
    return this.filtradas().slice(start, start + this.pageSize);
  });

  totalVigente  = computed(() => this.ventas().filter(v => !v.anulada).reduce((s, v) => s + v.totalCobrado, 0));
  ventasVigentes = computed(() => this.ventas().filter(v => !v.anulada).length);
  ventasAnuladas = computed(() => this.ventas().filter(v => v.anulada).length);
  totalAnulado  = computed(() => this.ventas().filter(v => v.anulada).reduce((s, v) => s + v.totalCobrado, 0));
  promedio      = computed(() => {
    const vigentes = this.ventas().filter(v => !v.anulada);
    return vigentes.length ? this.totalVigente() / vigentes.length : 0;
  });

  puedeAnular(): boolean {
    const rol = this.auth.rol();
    return rol === 'ADMIN' || rol === 'GERENTE_SUCURSAL' || this.auth.tieneModulo('MOD_CAJA');
  }

  sortBy(col: SortCol): void {
    if (this.sortCol() === col) this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    else { this.sortCol.set(col); this.sortDir.set('asc'); }
    this.pagina.set(1);
  }

  si(col: string): string {
    if (this.sortCol() !== col) return '⇅';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  verDetalle(v: Venta): void {
    this.ventaService.obtener(v.id).subscribe({
      next: detalle => this.ventaDetalle.set(detalle),
      error: () => this.ventaDetalle.set(v),
    });
  }

  abrirAnular(v: Venta): void {
    this.ventaAnular.set(v);
    this.motivoAnulacion = '';
    this.errMotivo.set('');
    this.modalAnular.set(true);
  }

  /** ADMIN anula directo; cualquier otro rol con acceso (GERENTE_SUCURSAL/MOD_CAJA) solo puede solicitarlo — queda pendiente de aprobación. */
  esAdmin(): boolean {
    return this.auth.rol() === 'ADMIN';
  }

  confirmarAnular(): void {
    if (!this.motivoAnulacion.trim()) {
      this.errMotivo.set('El motivo es obligatorio');
      return;
    }
    const ventaId = this.ventaAnular()!.id;
    const motivo = this.motivoAnulacion.trim();
    this.procesando.set(true);

    if (this.esAdmin()) {
      this.ventaService.anular(ventaId, motivo).subscribe({
        next: () => {
          this.ventas.update(list =>
            list.map(v => v.id === ventaId ? { ...v, anulada: true, motivoAnulacion: motivo } : v)
          );
          this.toastSvc.success(`Venta #${ventaId} anulada correctamente`);
          this.modalAnular.set(false);
          this.procesando.set(false);
        },
        error: () => {
          this.toastSvc.error('No se pudo anular la venta');
          this.procesando.set(false);
        },
      });
    } else {
      this.solicitudService.solicitar('ANULACION_VENTA', ventaId, motivo).subscribe({
        next: () => {
          this.toastSvc.success(`Solicitud enviada — pendiente de aprobación de un administrador`);
          this.modalAnular.set(false);
          this.procesando.set(false);
        },
        error: () => {
          this.toastSvc.error('No se pudo enviar la solicitud de anulación');
          this.procesando.set(false);
        },
      });
    }
  }

  fpLabel(fp: string): string {
    const m: Record<string, string> = {
      EFECTIVO: 'Efectivo', QR: 'QR', MIXTO: 'Mixto', CREDITO_CUENTA: 'Crédito'
    };
    return m[fp] ?? fp;
  }

  fpBg(fp: string): string {
    const m: Record<string, string> = {
      EFECTIVO:       'rgb(var(--color-success)/0.12)',
      QR:             'rgb(var(--color-primary)/0.12)',
      MIXTO:          'rgb(var(--color-warning)/0.15)',
      CREDITO_CUENTA: 'rgb(var(--color-info, var(--color-primary))/0.12)',
    };
    return m[fp] ?? 'rgb(var(--color-surface-2))';
  }

  fpColor(fp: string): string {
    const m: Record<string, string> = {
      EFECTIVO:       'rgb(var(--color-success))',
      QR:             'rgb(var(--color-primary))',
      MIXTO:          'rgb(var(--color-warning))',
      CREDITO_CUENTA: 'rgb(var(--color-primary))',
    };
    return m[fp] ?? 'rgb(var(--color-on-surface))';
  }
}
