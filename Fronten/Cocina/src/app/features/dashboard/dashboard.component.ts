import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PedidoService, InventarioService, AlertaService, ProduccionService, MermaService, Merma } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { LineaProduccion } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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

        @if (!esAlmacenero()) {
          <div class="stat-card">
            <iconify-icon icon="tabler:hourglass" width="24" height="24" style="color:currentColor"></iconify-icon>
            <p class="stat-value mt-2">{{ pendientes() }}</p>
            <p class="stat-label">Pendientes</p>
          </div>

          <div class="stat-card">
            <iconify-icon icon="tabler:chef-hat" width="24" height="24" style="color:currentColor"></iconify-icon>
            <p class="stat-value mt-2">{{ enPreparacion() }}</p>
            <p class="stat-label">En preparación</p>
          </div>
        }

        <div class="stat-card">
          <iconify-icon icon="tabler:package" width="24" height="24" style="color:currentColor"></iconify-icon>
          <p class="stat-value mt-2"
             [style.color]="stockBajoCount() > 0 ? 'rgb(var(--color-danger))' : 'inherit'">
            {{ stockBajoCount() }}
          </p>
          <p class="stat-label">Insumos bajo mínimo</p>
        </div>

        <div class="stat-card">
          <iconify-icon icon="tabler:alert-triangle" width="24" height="24" style="color:currentColor"></iconify-icon>
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
            <iconify-icon [attr.icon]="a.icono" width="30" height="30" style="color:currentColor"></iconify-icon>
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

      <!-- ══ ADMIN/JEFE_COCINA/COCINERO: avance de producción del día ══ -->
      @if (!esAlmacenero()) {
        <div class="card space-y-3">
          <h3 class="font-display font-semibold inline-flex items-center gap-2" style="color: rgb(var(--color-on-surface))">
            <iconify-icon icon="tabler:chef-hat" width="18" height="18" style="color:currentColor"></iconify-icon>
            Avance de producción de hoy
          </h3>
          @if (cargandoBi()) {
            <div class="skeleton h-20 rounded-xl"></div>
          } @else if (lineasProduccion().length === 0) {
            <p class="text-xs" style="color: rgb(var(--color-on-surface)/0.4)">No hay plan de producción para hoy.</p>
          } @else {
            <div class="space-y-2">
              @for (l of lineasProduccion(); track l.id) {
                <div class="flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold truncate" style="color: rgb(var(--color-on-surface))">{{ l.plato.nombre }}</p>
                    <div class="mt-1 h-1.5 rounded-full overflow-hidden" style="background: rgb(var(--color-surface-2))">
                      <div class="h-full rounded-full"
                           [style.width]="(l.cantidadProducida / l.cantidadPlanificada) * 100 + '%'"
                           [style.background]="l.cantidadProducida >= l.cantidadPlanificada ? 'rgb(var(--color-success))' : 'rgb(var(--color-primary))'">
                      </div>
                    </div>
                  </div>
                  <p class="font-mono text-xs font-bold flex-shrink-0" style="color: rgb(var(--color-on-surface)/0.7)">
                    {{ l.cantidadProducida }}/{{ l.cantidadPlanificada }}
                  </p>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- ══ ADMIN/JEFE_COCINA/ALMACENERO: mermas del mes ══ -->
      @if (esInventario()) {
        <div class="card space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-display font-semibold inline-flex items-center gap-2" style="color: rgb(var(--color-on-surface))">
              <iconify-icon icon="tabler:trash" width="18" height="18" style="color:currentColor"></iconify-icon>
              Mermas del mes
            </h3>
            <a [routerLink]="['/mermas']" class="text-xs font-semibold" style="color: rgb(var(--color-primary))">Ver todas →</a>
          </div>
          @if (cargandoBi()) {
            <div class="skeleton h-16 rounded-xl"></div>
          } @else if (mermasMes().length === 0) {
            <p class="text-xs" style="color: rgb(var(--color-on-surface)/0.4)">Sin mermas registradas este mes.</p>
          } @else {
            <p class="text-xs" style="color: rgb(var(--color-on-surface)/0.6)">
              {{ mermasMes().length }} merma(s) — valor total
              <span class="font-mono font-bold" style="color: rgb(var(--color-danger))">Bs {{ valorTotalMermas() | number:'1.2-2' }}</span>
            </p>
            <div class="space-y-1">
              @for (m of mermasMes().slice(0, 5); track m.id) {
                <div class="flex items-center justify-between text-xs p-2 rounded-lg" style="background: rgb(var(--color-surface-2))">
                  <span>{{ m.insumoNombre }} — {{ m.causa }}</span>
                  <span class="font-mono">{{ m.cantidad }} {{ m.insumoUnidad }}</span>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Alertas de vencimiento -->
      @if (alertasVenc().length > 0) {
        <div class="card"
             style="border-color: rgb(var(--color-warning)/0.4);
                    background: rgb(var(--color-warning)/0.05)">
          <h3 class="font-display font-semibold mb-3 inline-flex items-center gap-2"
              style="color: rgb(var(--color-warning))">
            <iconify-icon icon="tabler:alert-triangle" width="18" height="18" style="color:currentColor"></iconify-icon>
            Alertas de inventario ({{ alertasVenc().length }})
          </h3>
          <div class="space-y-2">
            @for (a of alertasVenc().slice(0,5); track a.id) {
              <div class="flex items-start gap-2 text-sm"
                   style="color: rgb(var(--color-on-surface)/0.8)">
                <iconify-icon [attr.icon]="getTipoAlertaIcono(a.tipo)" width="16" height="16" class="mt-0.5" style="color:currentColor"></iconify-icon>
                <span class="flex-1">{{ a.mensaje }}</span>
                <button (click)="marcarLeida(a.id)"
                        class="text-xs opacity-50 hover:opacity-100 flex-shrink-0">
                  <iconify-icon icon="line-md:close" width="14" height="14" style="color:currentColor"></iconify-icon>
                </button>
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

  cargandoBi        = signal(true);
  lineasProduccion  = signal<LineaProduccion[]>([]);
  mermasMes         = signal<Merma[]>([]);
  valorTotalMermas  = computed(() => this.mermasMes().reduce((s, m) => s + (m.valorEconomico ?? 0), 0));

  accesos = [
    { ruta: '/produccion', label: 'Producción del día', desc: 'Plan diario de sopas y segundos', icono: 'tabler:chef-hat' },
    { ruta: '/pedidos',    label: 'Cola de pedidos',    desc: 'Ver y gestionar pedidos',         icono: 'tabler:clipboard-list' },
    { ruta: '/inventario', label: 'Inventario',          desc: 'Stock y lotes FEFO',              icono: 'tabler:package' },
    { ruta: '/platos',     label: 'Platos y recetas',    desc: 'Menú del restaurante',            icono: 'tabler:bowl' },
  ];

  constructor(
    private pedidoService: PedidoService,
    private inventarioService: InventarioService,
    private alertaService: AlertaService,
    private produccionService: ProduccionService,
    private mermaService: MermaService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    const sucursalId = this.auth.sucursalActiva();

    if (!this.esAlmacenero()) {
      this.pedidoService.listarPorEstado('PENDIENTE', sucursalId).subscribe({
        next: ps => this.pendientes.set(ps.length), error: () => {}
      });
      this.pedidoService.listarPorEstado('EN_PREPARACION', sucursalId).subscribe({
        next: ps => this.enPreparacion.set(ps.length), error: () => {}
      });
    }
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

    this.cargarDatosBi(sucursalId);
  }

  esAlmacenero(): boolean {
    return this.auth.rol() === 'ALMACENERO';
  }

  /** Roles con foco en inventario/mermas (además de cocina). */
  esInventario(): boolean {
    return ['ADMIN', 'JEFE_COCINA', 'ALMACENERO'].includes(this.auth.rol());
  }

  /** Secciones de inteligencia de negocio (BI) por rol — sin backend nuevo. */
  private cargarDatosBi(sucursalId: number | null): void {
    let pendientesCargas = 0;
    const listo = () => { if (--pendientesCargas <= 0) this.cargandoBi.set(false); };

    if (!this.esAlmacenero() && sucursalId != null) {
      pendientesCargas++;
      this.produccionService.hoy(sucursalId).subscribe({
        next: p => { this.lineasProduccion.set(p?.lineas ?? []); listo(); },
        error: () => listo(),
      });
    }
    if (this.esInventario()) {
      pendientesCargas++;
      const hoy = new Date();
      this.mermaService.listar(sucursalId).subscribe({
        next: ms => {
          const esteMes = ms.filter(m => {
            const f = new Date(m.fecha);
            return f.getFullYear() === hoy.getFullYear() && f.getMonth() === hoy.getMonth();
          });
          this.mermasMes.set(esteMes);
          listo();
        },
        error: () => listo(),
      });
    }
    if (pendientesCargas === 0) this.cargandoBi.set(false);
  }

  fechaHoy(): string {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  getTipoAlertaIcono(tipo: string): string {
    if (tipo.includes('VENCIMIENTO')) return 'tabler:calendar-check';
    if (tipo.includes('STOCK'))       return 'tabler:package';
    return 'tabler:bell';
  }

  marcarLeida(id: number): void {
    this.alertaService.marcarLeida(id).subscribe({
      next: () => this.alertasVenc.update(as => as.filter(a => a.id !== id)),
      error: () => {}
    });
  }
}
