import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, interval, Subscription } from 'rxjs';
import { PedidoService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { Pedido, EstadoPedido } from '../../core/models';

type Vista = 'activos' | 'completados' | 'todos';
type SortCol = 'fecha' | 'total' | 'estado';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <div class="space-y-5 animate-slide-up">

      <!-- Cabecera -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Pedidos
          </h1>
          <p class="text-sm mt-0.5" style="color:rgb(var(--color-on-surface)/0.5)">
            Seguimiento y gestión de pedidos
          </p>
        </div>
        <div class="flex items-center gap-2">
          @if (cargando()) {
            <span class="text-xs animate-pulse" style="color:rgb(var(--color-on-surface)/0.4)">
              Actualizando...
            </span>
          }
          <button (click)="cargar()" class="btn-secondary text-sm">↻ Actualizar</button>
        </div>
      </div>

      <!-- Stats rápidas -->
      <div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
        @for (e of estadosInfo; track e.estado) {
          <div class="card py-3 text-center cursor-pointer transition-all"
               [style.outline]="filtroEstado() === e.estado
                 ? '2px solid rgb(var(--color-primary))' : 'none'"
               (click)="toggleEstado(e.estado)">
            <p class="text-xl">{{ e.emoji }}</p>
            <p class="font-bold text-lg mt-1"
               [style.color]="contarEstado(e.estado) > 0 ? e.color : 'rgb(var(--color-on-surface)/0.3)'">
              {{ contarEstado(e.estado) }}
            </p>
            <p class="text-xs mt-0.5" style="color:rgb(var(--color-on-surface)/0.45)">
              {{ e.label }}
            </p>
          </div>
        }
      </div>

      <!-- Tabs + búsqueda -->
      <div class="card space-y-3">
        <div class="flex flex-wrap items-center gap-3 justify-between">
          <div class="flex gap-1 p-1 rounded-xl" style="background:rgb(var(--color-surface-2))">
            @for (v of vistas; track v.id) {
              <button (click)="vista.set(v.id); pagina.set(1)"
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      [style.background]="vista() === v.id ? 'rgb(var(--color-surface))' : 'transparent'"
                      [style.color]="vista() === v.id ? 'rgb(var(--color-primary))' : 'rgb(var(--color-on-surface)/0.5)'"
                      [style.boxShadow]="vista() === v.id ? '0 1px 3px rgb(0 0 0/0.1)' : 'none'">
                {{ v.label }}
                <span class="ml-1 font-mono">({{ contarVista(v.id) }})</span>
              </button>
            }
          </div>
          <input [(ngModel)]="busqueda" (ngModelChange)="pagina.set(1)"
                 class="input w-52 text-sm"
                 placeholder="🔍 Buscar cliente, #ID..." maxlength="100">
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th class="cursor-pointer select-none" (click)="sortBy('fecha')">
                  Fecha {{ si('fecha') }}
                </th>
                <th>Cliente</th>
                <th>Platos</th>
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
              @if (cargando() && pedidosPaginados().length === 0) {
                @for (i of [1,2,3,4]; track i) {
                  <tr>
                    @for (j of [1,2,3,4,5,6,7]; track j) {
                      <td><div class="skeleton h-4 rounded w-full"></div></td>
                    }
                  </tr>
                }
              } @else if (pedidosPaginados().length === 0) {
                <tr>
                  <td colspan="7" class="text-center py-12">
                    <p class="text-4xl mb-2 opacity-20">📋</p>
                    <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.4)">
                      No hay pedidos en esta vista
                    </p>
                  </td>
                </tr>
              } @else {
                @for (p of pedidosPaginados(); track p.id) {
                  <tr>
                    <td class="font-mono text-xs font-bold"
                        style="color:rgb(var(--color-primary))">#{{ p.id }}</td>
                    <td class="text-xs whitespace-nowrap font-mono">
                      {{ p.creadoEn | date:'dd/MM/yy' }}<br>
                      <span style="color:rgb(var(--color-on-surface)/0.4)">
                        {{ p.creadoEn | date:'HH:mm' }}
                      </span>
                    </td>
                    <td class="text-sm">
                      @if (p.cliente) {
                        {{ p.cliente.nombre }}
                      } @else if (p.pensionado) {
                        <span style="color:rgb(var(--color-primary)/0.8)">
                          {{ p.pensionado.nombre }} {{ p.pensionado.apellido }}
                        </span>
                      } @else {
                        <span style="color:rgb(var(--color-on-surface)/0.3)">Sin cliente</span>
                      }
                    </td>
                    <td class="text-sm">
                      <span class="font-mono">{{ p.detalles?.length ?? 0 }}</span>
                      <span style="color:rgb(var(--color-on-surface)/0.4)" class="text-xs"> platos</span>
                    </td>
                    <td class="text-right font-mono font-bold text-sm"
                        style="color:rgb(var(--color-primary))">
                      Bs {{ p.total | number:'1.2-2' }}
                    </td>
                    <td>
                      <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                            [style.background]="estadoBg(p.estado)"
                            [style.color]="estadoColor(p.estado)">
                        {{ estadoLabel(p.estado) }}
                      </span>
                    </td>
                    <td>
                      <div class="flex gap-1">
                        <button (click)="verDetalle(p)"
                                class="btn-ghost text-xs px-2 py-1" title="Ver detalle">
                          👁️
                        </button>
                        @if (p.estado === 'LISTO') {
                          <button (click)="marcarEntregado(p)"
                                  class="btn-ghost text-xs px-2 py-1 text-success"
                                  title="Marcar como entregado"
                                  [disabled]="procesando()">
                            ✓
                          </button>
                        }
                        @if (p.estado === 'PENDIENTE') {
                          <button (click)="confirmarCancelar(p)"
                                  class="btn-ghost text-xs px-2 py-1 text-danger"
                                  title="Cancelar pedido"
                                  [disabled]="procesando()">
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
          [total]="pedidosFiltrados().length"
          [pageSize]="pageSize"
          [pagina]="pagina()"
          (pageChange)="pagina.set($event)" />
      </div>
    </div>

    <!-- Modal detalle -->
    @if (pedidoDetalle()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.5)" (click)="pedidoDetalle.set(null)">
        <div class="card max-w-md w-full max-h-[80vh] overflow-y-auto space-y-4 animate-pop"
             (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h3 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
              Pedido #{{ pedidoDetalle()!.id }}
            </h3>
            <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                  [style.background]="estadoBg(pedidoDetalle()!.estado)"
                  [style.color]="estadoColor(pedidoDetalle()!.estado)">
              {{ estadoLabel(pedidoDetalle()!.estado) }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p class="input-label">Fecha</p>
              <p>{{ pedidoDetalle()!.creadoEn | date:'dd/MM/yyyy HH:mm' }}</p>
            </div>
            <div>
              <p class="input-label">Cliente</p>
              <p>{{ pedidoDetalle()!.cliente?.nombre ?? pedidoDetalle()!.pensionado?.nombre ?? '—' }}</p>
            </div>
          </div>
          @if (pedidoDetalle()!.detalles?.length) {
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Plato</th>
                    <th class="text-center">Cant.</th>
                    <th class="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  @for (d of pedidoDetalle()!.detalles; track d.id) {
                    <tr>
                      <td class="text-sm">{{ d.plato?.nombre ?? '—' }}</td>
                      <td class="text-center font-mono">{{ d.cantidad }}</td>
                      <td class="text-right font-mono text-sm">
                        Bs {{ (d.precioUnitario * d.cantidad) | number:'1.2-2' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          <div class="flex justify-between font-bold pt-2"
               style="border-top:1px solid rgb(var(--color-border))">
            <span>Total</span>
            <span class="font-mono" style="color:rgb(var(--color-primary))">
              Bs {{ pedidoDetalle()!.total | number:'1.2-2' }}
            </span>
          </div>
          <button (click)="pedidoDetalle.set(null)" class="btn-secondary w-full justify-center">
            Cerrar
          </button>
        </div>
      </div>
    }

    <!-- Modal confirmar cancelar -->
    @if (pedidoCancelar()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.5)">
        <div class="card max-w-sm w-full space-y-4 animate-pop">
          <h3 class="font-display font-bold text-lg" style="color:rgb(var(--color-danger))">
            Cancelar pedido #{{ pedidoCancelar()!.id }}
          </h3>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.6)">
            ¿Confirmás la cancelación de este pedido? Esta acción no se puede deshacer.
          </p>
          <div class="flex gap-2">
            <button (click)="pedidoCancelar.set(null)"
                    class="btn-secondary flex-1 justify-center" [disabled]="procesando()">
              No, volver
            </button>
            <button (click)="ejecutarCancelar()"
                    class="btn-danger flex-1 justify-center" [disabled]="procesando()">
              @if (procesando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              }
              Sí, cancelar
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PedidosComponent implements OnInit, OnDestroy {

  pedidos    = signal<Pedido[]>([]);
  cargando   = signal(true);
  procesando = signal(false);

  vista        = signal<Vista>('activos');
  filtroEstado = signal<EstadoPedido | null>(null);
  busqueda     = '';
  sortCol      = signal<SortCol | ''>('fecha');
  sortDir      = signal<'asc' | 'desc'>('desc');
  pagina       = signal(1);
  pageSize     = 15;

  pedidoDetalle  = signal<Pedido | null>(null);
  pedidoCancelar = signal<Pedido | null>(null);

  private refreshSub?: Subscription;

  vistas = [
    { id: 'activos' as Vista,     label: 'Activos' },
    { id: 'completados' as Vista, label: 'Completados' },
    { id: 'todos' as Vista,       label: 'Todos' },
  ];

  estadosInfo = [
    { estado: 'PENDIENTE' as EstadoPedido,     label: 'Pendiente',    emoji: '⏳', color: 'rgb(var(--color-warning))' },
    { estado: 'EN_PREPARACION' as EstadoPedido, label: 'En cocina',   emoji: '🍳', color: 'rgb(var(--color-primary))' },
    { estado: 'LISTO' as EstadoPedido,          label: 'Listo',        emoji: '✅', color: 'rgb(var(--color-success))' },
    { estado: 'ENTREGADO' as EstadoPedido,      label: 'Entregado',    emoji: '🛍️', color: 'rgb(var(--color-on-surface)/0.4)' },
    { estado: 'CANCELADO' as EstadoPedido,      label: 'Cancelado',    emoji: '✕',  color: 'rgb(var(--color-danger))' },
  ];

  private realtimeSub?: Subscription;

  constructor(
    private pedidoService: PedidoService,
    private toastSvc: ToastService,
    private auth: AuthService,
    private realtime: RealtimeService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.refreshSub = interval(30_000).subscribe(() => this.cargar());

    const sucursalId = this.auth.sucursalActiva();
    if (sucursalId != null) {
      this.realtimeSub = this.realtime.pedidosSucursal$(sucursalId).subscribe(() => this.cargar());
    }
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.realtimeSub?.unsubscribe();
  }

  cargar(): void {
    this.cargando.set(true);
    const sucursalId = this.auth.sucursalActiva();
    forkJoin({
      pendiente:     this.pedidoService.listarPorEstado('PENDIENTE', sucursalId),
      enPreparacion: this.pedidoService.listarPorEstado('EN_PREPARACION', sucursalId),
      listo:         this.pedidoService.listarPorEstado('LISTO', sucursalId),
      entregado:     this.pedidoService.listarPorEstado('ENTREGADO', sucursalId),
      cancelado:     this.pedidoService.listarPorEstado('CANCELADO', sucursalId),
    }).subscribe({
      next: r => {
        this.pedidos.set([
          ...r.pendiente, ...r.enPreparacion, ...r.listo,
          ...r.entregado, ...r.cancelado,
        ]);
        this.cargando.set(false);
      },
      error: () => {
        this.toastSvc.error('Error al cargar pedidos');
        this.cargando.set(false);
      },
    });
  }

  pedidosFiltrados = computed(() => {
    let list = this.pedidos();

    if (this.vista() === 'activos')
      list = list.filter(p => ['PENDIENTE','EN_PREPARACION','LISTO'].includes(p.estado));
    else if (this.vista() === 'completados')
      list = list.filter(p => ['ENTREGADO','CANCELADO'].includes(p.estado));

    if (this.filtroEstado())
      list = list.filter(p => p.estado === this.filtroEstado());

    const q = this.busqueda.toLowerCase().trim();
    if (q) {
      list = list.filter(p =>
        String(p.id).includes(q) ||
        p.cliente?.nombre?.toLowerCase().includes(q) ||
        p.pensionado?.nombre?.toLowerCase().includes(q)
      );
    }

    const col = this.sortCol();
    if (col) {
      list = [...list].sort((a, b) => {
        let av: any, bv: any;
        if (col === 'fecha')  { av = a.creadoEn; bv = b.creadoEn; }
        if (col === 'total')  { av = a.total;    bv = b.total; }
        if (col === 'estado') { av = a.estado;   bv = b.estado; }
        if (av < bv) return this.sortDir() === 'asc' ? -1 : 1;
        if (av > bv) return this.sortDir() === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  });

  pedidosPaginados = computed(() => {
    const start = (this.pagina() - 1) * this.pageSize;
    return this.pedidosFiltrados().slice(start, start + this.pageSize);
  });

  contarEstado(e: EstadoPedido): number { return this.pedidos().filter(p => p.estado === e).length; }
  contarVista(v: Vista): number {
    if (v === 'activos') return this.pedidos().filter(p => ['PENDIENTE','EN_PREPARACION','LISTO'].includes(p.estado)).length;
    if (v === 'completados') return this.pedidos().filter(p => ['ENTREGADO','CANCELADO'].includes(p.estado)).length;
    return this.pedidos().length;
  }

  toggleEstado(e: EstadoPedido): void {
    this.filtroEstado.set(this.filtroEstado() === e ? null : e);
    this.pagina.set(1);
  }

  sortBy(col: SortCol): void {
    if (this.sortCol() === col) this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    else { this.sortCol.set(col); this.sortDir.set('desc'); }
    this.pagina.set(1);
  }

  si(col: string): string {
    if (this.sortCol() !== col) return '⇅';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  verDetalle(p: Pedido): void {
    this.pedidoService.obtener(p.id).subscribe({
      next: full => this.pedidoDetalle.set(full),
      error: ()   => this.pedidoDetalle.set(p),
    });
  }

  confirmarCancelar(p: Pedido): void { this.pedidoCancelar.set(p); }

  ejecutarCancelar(): void {
    this.procesando.set(true);
    this.pedidoService.cancelar(this.pedidoCancelar()!.id).subscribe({
      next: () => {
        this.pedidos.update(list =>
          list.map(p => p.id === this.pedidoCancelar()!.id
            ? { ...p, estado: 'CANCELADO' as EstadoPedido } : p)
        );
        this.toastSvc.success('Pedido cancelado');
        this.pedidoCancelar.set(null);
        this.procesando.set(false);
      },
      error: () => {
        this.toastSvc.error('No se pudo cancelar el pedido');
        this.procesando.set(false);
      },
    });
  }

  marcarEntregado(p: Pedido): void {
    this.procesando.set(true);
    this.pedidoService.cambiarEstado(p.id, 'ENTREGADO').subscribe({
      next: () => {
        this.pedidos.update(list =>
          list.map(x => x.id === p.id ? { ...x, estado: 'ENTREGADO' as EstadoPedido } : x)
        );
        this.toastSvc.success(`Pedido #${p.id} marcado como entregado`);
        this.procesando.set(false);
      },
      error: () => {
        this.toastSvc.error('No se pudo actualizar el pedido');
        this.procesando.set(false);
      },
    });
  }

  estadoLabel(e: EstadoPedido): string {
    const m: Record<string, string> = {
      PENDIENTE: 'Pendiente', EN_PREPARACION: 'En cocina',
      LISTO: 'Listo', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado',
    };
    return m[e] ?? e;
  }

  estadoBg(e: EstadoPedido): string {
    const m: Record<string, string> = {
      PENDIENTE:      'rgb(var(--color-warning)/0.15)',
      EN_PREPARACION: 'rgb(var(--color-primary)/0.12)',
      LISTO:          'rgb(var(--color-success)/0.12)',
      ENTREGADO:      'rgb(var(--color-on-surface)/0.08)',
      CANCELADO:      'rgb(var(--color-danger)/0.12)',
    };
    return m[e] ?? '';
  }

  estadoColor(e: EstadoPedido): string {
    const m: Record<string, string> = {
      PENDIENTE:      'rgb(var(--color-warning))',
      EN_PREPARACION: 'rgb(var(--color-primary))',
      LISTO:          'rgb(var(--color-success))',
      ENTREGADO:      'rgb(var(--color-on-surface)/0.5)',
      CANCELADO:      'rgb(var(--color-danger))',
    };
    return m[e] ?? '';
  }
}
