import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VentaService, PensionadoService, ClienteService, AlertaService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Venta, VentaPorSucursal, TopProductoDto, AlertaSistema } from '../../core/models';

interface DiaTendencia { etiqueta: string; total: number; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
            <iconify-icon [attr.icon]="acc.icon" width="32" height="32"
                          class="group-hover:scale-110 transition-transform duration-200"
                          style="color:currentColor"></iconify-icon>
            <span class="text-xs font-semibold"
                  style="color: rgb(var(--color-on-surface)/0.7)">{{ acc.label }}</span>
          </a>
        }
      </div>

      <!-- Stats grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="stat-card">
          <div class="flex items-center justify-between mb-2">
            <iconify-icon icon="tabler:currency-dollar" width="24" height="24" style="color:currentColor"></iconify-icon>
            @if (!cargando()) { <span class="badge-success badge">Hoy</span> }
          </div>
          @if (cargando()) {
            <div class="skeleton h-8 w-32 rounded-lg"></div>
            <div class="skeleton h-3 w-20 rounded mt-1"></div>
          } @else {
            <p class="stat-value">Bs {{ totalHoy() | number:'1.2-2' }}</p>
            <p class="stat-label">Ventas del día</p>
          }
        </div>

        <div class="stat-card">
          <div class="flex items-center justify-between mb-2">
            <iconify-icon icon="tabler:home" width="24" height="24" style="color:currentColor"></iconify-icon>
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

        <div class="stat-card">
          <div class="flex items-center justify-between mb-2">
            <iconify-icon icon="tabler:receipt" width="24" height="24" style="color:currentColor"></iconify-icon>
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

        <div class="stat-card">
          <div class="flex items-center justify-between mb-2">
            <iconify-icon icon="tabler:users" width="24" height="24" style="color:currentColor"></iconify-icon>
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

      <!-- ══ ADMIN: comparativo entre sucursales + alertas críticas ══ -->
      @if (esAdmin()) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="card space-y-3">
            <h3 class="font-display font-semibold inline-flex items-center gap-1.5" style="color:rgb(var(--color-on-surface))">
              <iconify-icon icon="tabler:building-store" width="18" height="18" style="color:currentColor"></iconify-icon> Ventas por sucursal (últimos 7 días)
            </h3>
            @if (cargandoBi()) {
              <div class="skeleton h-24 rounded-xl"></div>
            } @else if (comparativoSucursal().length === 0) {
              <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.4)">Sin datos en el período.</p>
            } @else {
              <div class="space-y-2">
                @for (c of comparativoSucursal(); track c.sucursalId) {
                  <div class="flex items-center gap-3">
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-semibold" style="color:rgb(var(--color-on-surface))">{{ c.sucursalNombre }}</p>
                      <div class="mt-1 h-1.5 rounded-full overflow-hidden" style="background:rgb(var(--color-surface-2))">
                        <div class="h-full rounded-full" style="background:rgb(var(--color-primary))"
                             [style.width]="(c.total / maxComparativoSucursal()) * 100 + '%'"></div>
                      </div>
                    </div>
                    <p class="font-mono text-xs font-bold flex-shrink-0" style="color:rgb(var(--color-primary))">
                      Bs {{ c.total | number:'1.0-0' }}
                    </p>
                  </div>
                }
              </div>
            }
          </div>

          <div class="card space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-display font-semibold inline-flex items-center gap-1.5" style="color:rgb(var(--color-on-surface))">
                <iconify-icon icon="tabler:bell" width="18" height="18" style="color:currentColor"></iconify-icon> Alertas recientes
              </h3>
              <a [routerLink]="['/alertas']" class="text-xs font-semibold" style="color:rgb(var(--color-primary))">Ver todas →</a>
            </div>
            @if (alertasRecientes().length === 0) {
              <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.4)">No hay alertas sin leer.</p>
            } @else {
              <div class="space-y-2">
                @for (a of alertasRecientes(); track a.id) {
                  <div class="text-xs p-2 rounded-lg" style="background:rgb(var(--color-surface-2))">
                    {{ a.mensaje }}
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- ══ GERENTE_SUCURSAL: tendencia de su sucursal + top productos ══ -->
      @if (esGerente()) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="card space-y-3">
            <h3 class="font-display font-semibold inline-flex items-center gap-1.5" style="color:rgb(var(--color-on-surface))">
              <iconify-icon icon="tabler:trending-up" width="18" height="18" style="color:currentColor"></iconify-icon> Tendencia de ventas (7 días)
            </h3>
            @if (cargandoBi()) {
              <div class="skeleton h-24 rounded-xl"></div>
            } @else {
              <div class="flex items-end gap-2 h-28">
                @for (d of tendencia7Dias(); track d.etiqueta) {
                  <div class="flex-1 flex flex-col items-center justify-end gap-1">
                    <div class="w-full rounded-t-md" style="background:rgb(var(--color-primary))"
                         [style.height]="alturaBarra(d.total) + '%'"
                         [title]="'Bs ' + d.total.toFixed(2)"></div>
                    <span class="text-[10px]" style="color:rgb(var(--color-on-surface)/0.5)">{{ d.etiqueta }}</span>
                  </div>
                }
              </div>
            }
          </div>

          <div class="card space-y-3">
            <h3 class="font-display font-semibold inline-flex items-center gap-1.5" style="color:rgb(var(--color-on-surface))">
              <iconify-icon icon="tabler:tools-kitchen-2" width="18" height="18" style="color:currentColor"></iconify-icon> Top productos de la semana
            </h3>
            @if (cargandoBi()) {
              <div class="skeleton h-24 rounded-xl"></div>
            } @else if (topProductos().length === 0) {
              <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.4)">Sin ventas en el período.</p>
            } @else {
              <div class="space-y-2">
                @for (p of topProductos(); track p.platoId) {
                  <div class="flex items-center gap-3">
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-semibold truncate" style="color:rgb(var(--color-on-surface))">{{ p.platoNombre }}</p>
                      <div class="mt-1 h-1.5 rounded-full overflow-hidden" style="background:rgb(var(--color-surface-2))">
                        <div class="h-full rounded-full" style="background:rgb(var(--color-success))"
                             [style.width]="(p.cantidadVendida / maxTopProducto()) * 100 + '%'"></div>
                      </div>
                    </div>
                    <p class="font-mono text-xs font-bold flex-shrink-0" style="color:rgb(var(--color-on-surface)/0.7)">
                      {{ p.cantidadVendida }}
                    </p>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Cobros pendientes urgentes -->
      @if (listaCobros().length > 0) {
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-display font-semibold inline-flex items-center gap-1.5"
                style="color: rgb(var(--color-on-surface))">
              <iconify-icon icon="tabler:receipt" width="18" height="18" style="color:currentColor"></iconify-icon> Cobros pendientes de este mes
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
                      {{ c.pensionadoNombre }} {{ c.pensionadoApellido }}
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
  cargandoBi        = signal(true);
  totalHoy          = signal(0);
  pensionadosActivos = signal(0);
  cobrosPendientes  = signal(0);
  clientesActivos   = signal(0);
  listaCobros       = signal<any[]>([]);

  // BI: ADMIN
  comparativoSucursal = signal<VentaPorSucursal[]>([]);
  maxComparativoSucursal = computed(() => Math.max(...this.comparativoSucursal().map(c => c.total), 1));
  alertasRecientes  = signal<AlertaSistema[]>([]);

  // BI: GERENTE_SUCURSAL
  tendencia7Dias    = signal<DiaTendencia[]>([]);
  topProductos      = signal<TopProductoDto[]>([]);
  maxTopProducto    = computed(() => Math.max(...this.topProductos().map(p => p.cantidadVendida), 1));

  accesosRapidos = [
    { ruta: '/caja',             label: 'Nueva Venta',  icon: 'tabler:credit-card' },
    { ruta: '/pensionados',      label: 'Pensionados',  icon: 'tabler:home' },
    { ruta: '/clientes',         label: 'Clientes',     icon: 'tabler:users' },
    { ruta: '/cobros',           label: 'Cobros',       icon: 'tabler:receipt' },
    { ruta: '/pedidos',          label: 'Pedidos',      icon: 'tabler:shopping-bag' },
    { ruta: '/historial-ventas', label: 'Historial',    icon: 'tabler:chart-bar' },
    { ruta: '/reportes',         label: 'Reportes',     icon: 'tabler:trending-up' },
    { ruta: '/alertas',          label: 'Alertas',      icon: 'tabler:bell' },
  ];

  constructor(
    private ventaService: VentaService,
    private pensionadoService: PensionadoService,
    private clienteService: ClienteService,
    private alertaService: AlertaService,
    public authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarDatosBi();
  }

  esAdmin(): boolean {
    return this.authService.rol() === 'ADMIN';
  }

  esGerente(): boolean {
    return this.authService.rol() === 'GERENTE_SUCURSAL';
  }

  fechaHoy(): string {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  alturaBarra(total: number): number {
    const max = Math.max(...this.tendencia7Dias().map(d => d.total), 1);
    return Math.max((total / max) * 100, total > 0 ? 4 : 0);
  }

  private cargarDatos(): void {
    const hoy   = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString();

    // Total ventas de hoy (respeta la sucursal activa seleccionada por ADMIN/multi-sucursal)
    this.ventaService.total(desde, hasta, this.authService.sucursalActiva()).subscribe({
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

  /** Secciones de inteligencia de negocio (BI) por rol — sin backend nuevo, agregación client-side igual que reportes.component.ts. */
  private cargarDatosBi(): void {
    if (this.esAdmin()) {
      const hoy = new Date();
      const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 6).toISOString();
      const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString();
      this.ventaService.comparativoSucursales(desde, hasta).subscribe({
        next: cs => { this.comparativoSucursal.set(cs); this.cargandoBi.set(false); },
        error: () => this.cargandoBi.set(false),
      });
      this.alertaService.listarNoLeidas().subscribe({
        next: as => this.alertasRecientes.set(as.slice(0, 5)),
        error: () => {},
      });
    } else if (this.esGerente()) {
      const hoy = new Date();
      const desdeSemana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 6);
      const desde = desdeSemana.toISOString();
      const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString();
      const sucursalId = this.authService.sucursalActiva();

      this.ventaService.listar(desde, hasta, sucursalId).subscribe({
        next: ventas => { this.tendencia7Dias.set(this.agruparPorDia(ventas, desdeSemana)); this.cargandoBi.set(false); },
        error: () => this.cargandoBi.set(false),
      });
      this.ventaService.topProductos(desde, hasta, 5, sucursalId).subscribe({
        next: ps => this.topProductos.set(ps),
        error: () => {},
      });
    } else {
      this.cargandoBi.set(false);
    }
  }

  private agruparPorDia(ventas: Venta[], desde: Date): DiaTendencia[] {
    const dias: DiaTendencia[] = [];
    const etiquetas = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + i);
      const totalDia = ventas
        .filter(v => !v.anulada && this.mismoDia(new Date(v.creadoEn), fecha))
        .reduce((sum, v) => sum + v.totalCobrado, 0);
      dias.push({ etiqueta: etiquetas[fecha.getDay()], total: totalDia });
    }
    return dias;
  }

  private mismoDia(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
}
