import { Component, OnInit, OnDestroy, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PedidoService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { ComandaPrintService } from '../../core/services/comanda-print.service';
import { Pedido, EstadoPedido } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-cola-pedidos',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-6 animate-fade-up">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color: rgb(var(--color-on-surface))">
            Cola de Pedidos
          </h1>
          <p class="text-sm" style="color: rgb(var(--color-on-surface)/0.5)">
            {{ pedidos().length }} pedidos activos · Se actualiza automáticamente cada 15 segundos
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1.5 text-sm" style="color: rgb(var(--color-on-surface)/0.5)">
            <span class="w-2 h-2 rounded-full bg-success animate-pulse-dot inline-block"></span>
            En vivo
          </span>
          <button (click)="cargarPedidos()" class="btn-secondary">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      <!-- Stats rápidas -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        @for (col of columnas; track col.estado) {
          <div class="stat-card">
            <div class="flex items-center justify-between">
              <span class="text-2xl"><iconify-icon [attr.icon]="col.icon" width="22" height="22" style="color:currentColor"></iconify-icon></span>
              <span class="badge" [ngClass]="col.badgeClass">{{ getPedidosPorEstado(col.estado).length }}</span>
            </div>
            <p class="stat-label mt-2">{{ col.label }}</p>
          </div>
        }
      </div>

      <!-- Kanban board -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        @for (col of columnasCocina; track col.estado) {
          <div class="card p-0 overflow-hidden">

            <!-- Header columna -->
            <div class="flex items-center justify-between px-4 py-3"
                 style="border-bottom: 1px solid rgb(var(--color-border))">
              <div class="flex items-center gap-2">
                <span class="text-xl"><iconify-icon [attr.icon]="col.icon" width="18" height="18" style="color:currentColor"></iconify-icon></span>
                <span class="font-semibold text-sm" style="color: rgb(var(--color-on-surface))">
                  {{ col.label }}
                </span>
              </div>
              <span class="badge" [ngClass]="col.badgeClass">
                {{ getPedidosPorEstado(col.estado).length }}
              </span>
            </div>

            <!-- Lista de pedidos -->
            <div class="p-3 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">

              @if (loading()) {
                @for (i of [1,2,3]; track i) {
                  <div class="skeleton h-28 rounded-xl"></div>
                }
              }

              @for (pedido of getPedidosPorEstado(col.estado); track pedido.id) {
                <div class="card p-3 space-y-2 animate-fade-up hover:shadow-card-lg transition-all duration-200">

                  <!-- ID + tiempo -->
                  <div class="flex items-center justify-between">
                    <span class="font-mono text-xs font-bold"
                          style="color: rgb(var(--color-primary))">#{{ pedido.id }}</span>
                    <span class="text-xs" style="color: rgb(var(--color-on-surface)/0.4)">
                      {{ tiempoTranscurrido(pedido.creadoEn) }}
                    </span>
                  </div>

                  <!-- Cliente -->
                  <p class="text-sm font-medium" style="color: rgb(var(--color-on-surface))">
                    {{ pedido.cliente?.nombre ?? pedido.pensionado?.nombre + ' ' + pedido.pensionado?.apellido ?? 'Cliente anónimo' }}
                  </p>

                  <!-- Detalles del pedido -->
                  <div class="space-y-1">
                    @for (d of pedido.detalles; track d.id) {
                      <div class="flex items-center justify-between text-xs"
                           style="color: rgb(var(--color-on-surface)/0.7)">
                        <span>{{ d.plato.nombre }}</span>
                        <span class="font-semibold font-mono"
                              style="color: rgb(var(--color-accent))">x{{ d.cantidad }}</span>
                      </div>
                      @if (d.sopaSeleccionada || d.segundoSeleccionado) {
                        <div class="text-[11px] pl-2" style="color: rgb(var(--color-on-surface)/0.5)">
                          @if (d.sopaSeleccionada) { <div>· Sopa: {{ d.sopaSeleccionada.nombre }}</div> }
                          @if (d.segundoSeleccionado) { <div>· Segundo: {{ d.segundoSeleccionado.nombre }}</div> }
                        </div>
                      }
                    }
                  </div>

                  <!-- Observaciones -->
                  @if (pedido.observaciones) {
                    <p class="text-xs px-2 py-1 rounded-lg inline-flex items-center gap-1"
                       style="background: rgb(var(--color-warning)/0.1); color: rgb(var(--color-warning))">
                      <iconify-icon icon="tabler:file-text" width="12" height="12" style="color:currentColor"></iconify-icon>
                      {{ pedido.observaciones }}
                    </p>
                  }

                  <!-- Acciones -->
                  <div class="flex gap-2 pt-1">
                    @if (col.estado === 'PENDIENTE') {
                      <button (click)="cambiarEstado(pedido, 'EN_PREPARACION')"
                              class="btn-primary flex-1 justify-center text-xs py-1.5 inline-flex items-center gap-1">
                        <iconify-icon icon="tabler:flame" width="14" height="14" style="color:currentColor"></iconify-icon>
                        Iniciar preparación
                      </button>
                    }
                    @if (col.estado === 'EN_PREPARACION') {
                      <button (click)="cambiarEstado(pedido, 'LISTO')"
                              class="btn-primary flex-1 justify-center text-xs py-1.5 inline-flex items-center gap-1"
                              style="background: rgb(var(--color-success))">
                        <iconify-icon icon="tabler:circle-check" width="14" height="14" style="color:currentColor"></iconify-icon>
                        Marcar listo
                      </button>
                    }
                    <button (click)="imprimir(pedido)"
                            class="btn-secondary text-xs py-1.5 px-3" title="Imprimir comanda">
                      <iconify-icon icon="tabler:printer" width="14" height="14" style="color:currentColor"></iconify-icon>
                    </button>
                    @if (col.estado !== 'LISTO') {
                      <button (click)="cancelar(pedido)"
                              class="btn-danger text-xs py-1.5 px-3">
                        <iconify-icon icon="tabler:x" width="14" height="14" style="color:currentColor"></iconify-icon>
                      </button>
                    }
                  </div>

                </div>
              }

              @if (!loading() && getPedidosPorEstado(col.estado).length === 0) {
                <div class="flex flex-col items-center justify-center py-12 text-center">
                  <span class="text-4xl mb-2 opacity-30"><iconify-icon [attr.icon]="col.icon" width="36" height="36" style="color:currentColor"></iconify-icon></span>
                  <p class="text-xs" style="color: rgb(var(--color-on-surface)/0.3)">
                    Sin pedidos en este estado
                  </p>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ColaPedidosComponent implements OnInit, OnDestroy {
  pedidos   = signal<Pedido[]>([]);
  loading   = signal(true);
  private intervalId?: ReturnType<typeof setInterval>;
  private realtimeSub?: Subscription;

  columnas = [
    { estado: 'PENDIENTE'      as EstadoPedido, label: 'Pendientes',   icon: 'tabler:hourglass',     badgeClass: 'badge-warning' },
    { estado: 'EN_PREPARACION' as EstadoPedido, label: 'Preparando',   icon: 'tabler:flame',          badgeClass: 'badge bg-primary/15 text-primary' },
    { estado: 'LISTO'          as EstadoPedido, label: 'Listos',        icon: 'tabler:circle-check',   badgeClass: 'badge-success' },
    { estado: 'ENTREGADO'      as EstadoPedido, label: 'Entregados',    icon: 'tabler:shopping-bag',   badgeClass: 'badge-info' },
  ];

  columnasCocina = this.columnas.slice(0, 3);

  constructor(
    private pedidoService: PedidoService,
    private toastSvc: ToastService,
    private auth: AuthService,
    private realtime: RealtimeService,
    private comandaPrint: ComandaPrintService,
  ) {}

  ngOnInit(): void {
    this.cargarPedidos();
    this.intervalId = setInterval(() => this.cargarPedidos(), 15_000);

    const sucursalId = this.auth.sucursalActiva();
    if (sucursalId != null) {
      this.realtimeSub = this.realtime.pedidosSucursal$(sucursalId).subscribe(evento => {
        this.cargarPedidos();
        if (evento.tipo === 'PEDIDO_NUEVO') {
          this.reproducirBeep();
          this.toastSvc.info(`Nuevo pedido #${evento.pedido.id}`);
          this.comandaPrint.imprimir(evento.pedido);
        }
      });
    }
  }

  imprimir(pedido: Pedido): void {
    this.comandaPrint.imprimir(pedido);
  }

  private reproducirBeep(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Silencioso si el navegador bloquea audio sin interacción previa del usuario
    }
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.realtimeSub?.unsubscribe();
  }

  cargarPedidos(): void {
    const estados: EstadoPedido[] = ['PENDIENTE', 'EN_PREPARACION', 'LISTO'];
    const sucursalId = this.auth.sucursalActiva();
    let loaded = 0;
    const temp: Pedido[] = [];

    estados.forEach(estado => {
      this.pedidoService.listarPorEstado(estado, sucursalId).subscribe({
        next: ps => {
          temp.push(...ps);
          if (++loaded === estados.length) {
            this.pedidos.set(temp);
            this.loading.set(false);
          }
        },
        error: () => { loaded++; this.loading.set(false); }
      });
    });
  }

  getPedidosPorEstado(estado: EstadoPedido): Pedido[] {
    return this.pedidos().filter(p => p.estado === estado)
      .sort((a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime());
  }

  cambiarEstado(pedido: Pedido, nuevoEstado: EstadoPedido): void {
    this.pedidoService.cambiarEstado(pedido.id, nuevoEstado).subscribe({
      next: updated => {
        this.pedidos.update(ps => ps.map(p => p.id === updated.id ? updated : p));
        this.toastSvc.success(`Pedido #${pedido.id} actualizado`);
      },
      error: () => this.toastSvc.error('Error al actualizar el pedido'),
    });
  }

  cancelar(pedido: Pedido): void {
    if (!confirm(`¿Cancelar pedido #${pedido.id}?`)) return;
    this.pedidoService.cancelar(pedido.id).subscribe({
      next: () => {
        this.pedidos.update(ps => ps.filter(p => p.id !== pedido.id));
        this.toastSvc.success(`Pedido #${pedido.id} cancelado`);
      },
      error: () => this.toastSvc.error('Error al cancelar el pedido'),
    });
  }

  tiempoTranscurrido(fecha: string): string {
    const diff = Date.now() - new Date(fecha).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1)  return 'ahora';
    if (min < 60) return `${min}m`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  }
}
