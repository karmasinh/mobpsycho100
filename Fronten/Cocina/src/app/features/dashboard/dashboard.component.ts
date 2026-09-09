import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PedidoService, InventarioService, AlertaService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6 animate-fade-up">

      <div>
        <h1 class="font-display text-2xl font-bold"
            style="color: rgb(var(--color-on-surface))">Dashboard Cocina</h1>
        <p class="text-sm mt-0.5" style="color: rgb(var(--color-on-surface)/0.5)">
          {{ fechaHoy() }}
        </p>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div class="stat-card">
          <span class="text-2xl">⏳</span>
          <p class="stat-value mt-2">{{ pendientes() }}</p>
          <p class="stat-label">Pendientes</p>
        </div>

        <div class="stat-card">
          <span class="text-2xl">🍳</span>
          <p class="stat-value mt-2">{{ enPreparacion() }}</p>
          <p class="stat-label">En preparación</p>
        </div>

        <div class="stat-card">
          <span class="text-2xl">📦</span>
          <p class="stat-value mt-2"
             [style.color]="stockBajoCount() > 0 ? 'rgb(var(--color-danger))' : 'inherit'">
            {{ stockBajoCount() }}
          </p>
          <p class="stat-label">Insumos bajo mínimo</p>
        </div>

        <div class="stat-card">
          <span class="text-2xl">⚠️</span>
          <p class="stat-value mt-2"
             [style.color]="vencimientoCount() > 0 ? 'rgb(var(--color-warning))' : 'inherit'">
            {{ vencimientoCount() }}
          </p>
          <p class="stat-label">Próximos a vencer</p>
        </div>
      </div>

      <!-- Accesos rápidos -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        @for (a of accesos; track a.ruta) {
          <a [routerLink]="a.ruta" class="card-hover flex items-center gap-3">
            <span class="text-3xl">{{ a.emoji }}</span>
            <div>
              <p class="font-semibold text-sm" style="color: rgb(var(--color-on-surface))">
                {{ a.label }}
              </p>
              <p class="text-xs" style="color: rgb(var(--color-on-surface)/0.5)">
                {{ a.desc }}
              </p>
            </div>
          </a>
        }
      </div>

      <!-- Alertas de vencimiento -->
      @if (alertasVenc().length > 0) {
        <div class="card"
             style="border-color: rgb(var(--color-warning)/0.4);
                    background: rgb(var(--color-warning)/0.05)">
          <h3 class="font-display font-semibold mb-3"
              style="color: rgb(var(--color-warning))">
            ⚠️ Alertas de inventario ({{ alertasVenc().length }})
          </h3>
          <div class="space-y-2">
            @for (a of alertasVenc().slice(0,5); track a.id) {
              <div class="flex items-start gap-2 text-sm"
                   style="color: rgb(var(--color-on-surface)/0.8)">
                <span class="mt-0.5">{{ getTipoAlertaEmoji(a.tipo) }}</span>
                <span class="flex-1">{{ a.mensaje }}</span>
                <button (click)="marcarLeida(a.id)"
                        class="text-xs opacity-50 hover:opacity-100 flex-shrink-0">✕</button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  pendientes      = signal(0);
  enPreparacion   = signal(0);
  stockBajoCount  = signal(0);
  vencimientoCount = signal(0);
  alertasVenc     = signal<any[]>([]);

  accesos = [
    { ruta: '/produccion', label: 'Producción del día', desc: 'Plan diario de sopas y segundos', emoji: '🍳' },
    { ruta: '/pedidos',    label: 'Cola de pedidos',    desc: 'Ver y gestionar pedidos',         emoji: '📋' },
    { ruta: '/inventario', label: 'Inventario',          desc: 'Stock y lotes FEFO',              emoji: '📦' },
    { ruta: '/platos',     label: 'Platos y recetas',    desc: 'Menú del restaurante',            emoji: '🍽️' },
  ];

  constructor(
    private pedidoService: PedidoService,
    private inventarioService: InventarioService,
    private alertaService: AlertaService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.pedidoService.listarPorEstado('PENDIENTE').subscribe({
      next: ps => this.pendientes.set(ps.length), error: () => {}
    });
    this.pedidoService.listarPorEstado('EN_PREPARACION').subscribe({
      next: ps => this.enPreparacion.set(ps.length), error: () => {}
    });
    const sucursalId = this.auth.sucursalActiva();
    if (sucursalId != null) {
      this.inventarioService.stockBajo(sucursalId).subscribe({
        next: is => this.stockBajoCount.set(is.length), error: () => {}
      });
      this.inventarioService.vencimientos(15, sucursalId).subscribe({
        next: ls => this.vencimientoCount.set(ls.length), error: () => {}
      });
    }
    this.alertaService.listarNoLeidas().subscribe({
      next: as => this.alertasVenc.set(as), error: () => {}
    });
  }

  fechaHoy(): string {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  getTipoAlertaEmoji(tipo: string): string {
    if (tipo.includes('VENCIMIENTO')) return '📅';
    if (tipo.includes('STOCK'))       return '📦';
    return '🔔';
  }

  marcarLeida(id: number): void {
    this.alertaService.marcarLeida(id).subscribe({
      next: () => this.alertasVenc.update(as => as.filter(a => a.id !== id)),
      error: () => {}
    });
  }
}
