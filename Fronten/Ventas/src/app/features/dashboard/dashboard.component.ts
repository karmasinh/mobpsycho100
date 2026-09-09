import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VentaService, PensionadoService, ClienteService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6 animate-slide-up">

      <!-- Bienvenida -->
      <div>
        <h1 class="font-display text-2xl font-bold"
            style="color: rgb(var(--color-on-surface))">Dashboard</h1>
        <p class="text-sm mt-0.5"
           style="color: rgb(var(--color-on-surface)/0.5)">
          Resumen del día — {{ fechaHoy() }}
        </p>
      </div>

      <!-- Accesos rápidos -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        @for (acc of accesosRapidos; track acc.ruta) {
          <a [routerLink]="acc.ruta"
             class="card-hover flex flex-col items-center gap-2 py-5 text-center group">
            <span class="text-3xl group-hover:scale-110 transition-transform duration-200">
              {{ acc.emoji }}
            </span>
            <span class="text-xs font-semibold"
                  style="color: rgb(var(--color-on-surface)/0.7)">{{ acc.label }}</span>
          </a>
        }
      </div>

      <!-- Stats grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <!-- Ventas de hoy -->
        <div class="stat-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-2xl">💰</span>
            @if (!cargando()) {
              <span class="badge-success badge">Hoy</span>
            }
          </div>
          @if (cargando()) {
            <div class="skeleton h-8 w-32 rounded-lg"></div>
            <div class="skeleton h-3 w-20 rounded mt-1"></div>
          } @else {
            <p class="stat-value">Bs {{ totalHoy() | number:'1.2-2' }}</p>
            <p class="stat-label">Ventas del día</p>
          }
        </div>

        <!-- Pensionados activos -->
        <div class="stat-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-2xl">🏠</span>
            <span class="badge-info badge">Total</span>
          </div>
          @if (cargando()) {
            <div class="skeleton h-8 w-16 rounded-lg"></div>
            <div class="skeleton h-3 w-24 rounded mt-1"></div>
          } @else {
            <p class="stat-value">{{ pensionadosActivos() }}</p>
            <p class="stat-label">Pensionados activos</p>
          }
        </div>

        <!-- Cobros pendientes -->
        <div class="stat-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-2xl">🧾</span>
            @if (cobrosPendientes() > 0) {
              <span class="badge-warning badge">{{ cobrosPendientes() }}</span>
            } @else {
              <span class="badge-success badge">✓</span>
            }
          </div>
          @if (cargando()) {
            <div class="skeleton h-8 w-16 rounded-lg"></div>
            <div class="skeleton h-3 w-24 rounded mt-1"></div>
          } @else {
            <p class="stat-value">{{ cobrosPendientes() }}</p>
            <p class="stat-label">Cobros pendientes</p>
          }
        </div>

        <!-- Clientes activos -->
        <div class="stat-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-2xl">👥</span>
            <span class="badge-neutral badge">Clientes</span>
          </div>
          @if (cargando()) {
            <div class="skeleton h-8 w-16 rounded-lg"></div>
            <div class="skeleton h-3 w-24 rounded mt-1"></div>
          } @else {
            <p class="stat-value">{{ clientesActivos() }}</p>
            <p class="stat-label">Clientes activos</p>
          }
        </div>
      </div>

      <!-- Cobros pendientes urgentes -->
      @if (listaCobros().length > 0) {
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-display font-semibold"
                style="color: rgb(var(--color-on-surface))">
              🧾 Cobros pendientes de este mes
            </h3>
            <a [routerLink]="['/cobros']"
               class="text-xs font-semibold"
               style="color: rgb(var(--color-primary))">Ver todos →</a>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Pensionado</th>
                  <th>Mes / Año</th>
                  <th>Total</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (c of listaCobros().slice(0,5); track c.id) {
                  <tr>
                    <td class="font-medium">
                      {{ c.pensionado.nombre }} {{ c.pensionado.apellido }}
                    </td>
                    <td class="font-mono text-xs">{{ c.mes }}/{{ c.anio }}</td>
                    <td class="font-mono font-semibold">Bs {{ c.totalCobrado | number:'1.2-2' }}</td>
                    <td class="font-mono"
                        [style.color]="c.saldoRestante > 0 ? 'rgb(var(--color-danger))' : 'rgb(var(--color-success))'">
                      Bs {{ c.saldoRestante | number:'1.2-2' }}
                    </td>
                    <td>
                      @if (c.pagado) {
                        <span class="badge-success">Pagado</span>
                      } @else if (c.saldoRestante > 0) {
                        <span class="badge-warning">Parcial</span>
                      } @else {
                        <span class="badge-danger">Pendiente</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

    </div>
  `,
})
export class DashboardComponent implements OnInit {
  cargando          = signal(true);
  totalHoy          = signal(0);
  pensionadosActivos = signal(0);
  cobrosPendientes  = signal(0);
  clientesActivos   = signal(0);
  listaCobros       = signal<any[]>([]);

  accesosRapidos = [
    { ruta: '/caja',             label: 'Nueva Venta',  emoji: '💳' },
    { ruta: '/pensionados',      label: 'Pensionados',  emoji: '🏠' },
    { ruta: '/clientes',         label: 'Clientes',     emoji: '👥' },
    { ruta: '/cobros',           label: 'Cobros',       emoji: '🧾' },
    { ruta: '/pedidos',          label: 'Pedidos',      emoji: '🛍️' },
    { ruta: '/historial-ventas', label: 'Historial',    emoji: '📊' },
    { ruta: '/reportes',         label: 'Reportes',     emoji: '📈' },
    { ruta: '/alertas',          label: 'Alertas',      emoji: '🔔' },
  ];

  constructor(
    private ventaService: VentaService,
    private pensionadoService: PensionadoService,
    private clienteService: ClienteService,
    public authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  fechaHoy(): string {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  private cargarDatos(): void {
    const hoy   = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString();

    // Total ventas de hoy
    this.ventaService.total(desde, hasta).subscribe({
      next: r => this.totalHoy.set(r.total ?? 0),
      error: () => {},
    });

    // Pensionados activos
    this.pensionadoService.listar().subscribe({
      next: ps => this.pensionadosActivos.set(ps.length),
      error: () => {},
    });

    // Cobros pendientes
    this.pensionadoService.cobrosPendientes().subscribe({
      next: cs => {
        this.listaCobros.set(cs);
        this.cobrosPendientes.set(cs.filter(c => !c.pagado).length);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });

    // Clientes activos
    this.clienteService.listarPorEstado('ACTIVO').subscribe({
      next: cs => this.clientesActivos.set(cs.length),
      error: () => {},
    });
  }
}
