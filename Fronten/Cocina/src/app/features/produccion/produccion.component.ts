import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProduccionService, PlatoService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ProduccionDia, LineaProduccion, EstadoProduccion, TipoLineaProduccion, Plato } from '../../core/models';

@Component({
  selector: 'app-produccion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5 animate-slide-up">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color: rgb(var(--color-on-surface))">
            Producción del día
          </h1>
          <p class="text-sm mt-0.5" style="color: rgb(var(--color-on-surface)/0.5)">
            {{ fechaHoy() }}
          </p>
        </div>
        @if (!produccionHoy()) {
          <button (click)="abrirNuevoPlan()" class="btn-primary">
            + Planificar día
          </button>
        } @else {
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold"
                  [style.background]="estadoBg(produccionHoy()!.estado)"
                  [style.color]="estadoColor(produccionHoy()!.estado)">
              {{ estadoLabel(produccionHoy()!.estado) }}
            </span>
            @if (produccionHoy()!.estado === 'PLANIFICADO') {
              <button (click)="cambiarEstado('EN_CURSO')" class="btn-primary text-sm">
                ▶ Iniciar producción
              </button>
            }
            @if (produccionHoy()!.estado === 'EN_CURSO') {
              <button (click)="cambiarEstado('CERRADO')" class="btn-ghost text-sm">
                Cerrar día
              </button>
            }
          </div>
        }
      </div>

      <!-- Sin plan -->
      @if (!cargando() && !produccionHoy()) {
        <div class="card flex flex-col items-center justify-center py-16 text-center gap-4">
          <span class="text-6xl opacity-30">🍳</span>
          <div>
            <p class="font-semibold" style="color: rgb(var(--color-on-surface))">
              No hay plan de producción para hoy
            </p>
            <p class="text-sm mt-1" style="color: rgb(var(--color-on-surface)/0.5)">
              Crea el plan del día con las sopas y segundos a preparar
            </p>
          </div>
          <button (click)="abrirNuevoPlan()" class="btn-primary">
            + Planificar día de hoy
          </button>
        </div>
      }

      <!-- Skeleton carga -->
      @if (cargando()) {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (i of [1,2,3,4]; track i) {
            <div class="skeleton h-24 rounded-2xl"></div>
          }
        </div>
      }

      <!-- Plan del día -->
      @if (!cargando() && produccionHoy()) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <!-- Resumen -->
          <div class="card flex flex-col gap-3">
            <h3 class="font-display font-semibold text-sm"
                style="color: rgb(var(--color-on-surface)/0.6)">RESUMEN DEL DÍA</h3>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span style="color: rgb(var(--color-on-surface)/0.6)">Sopas planificadas</span>
                <span class="font-bold">{{ totalPorTipo('SOPA').planificado }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span style="color: rgb(var(--color-on-surface)/0.6)">Sopas producidas</span>
                <span class="font-bold" style="color: rgb(var(--color-success))">
                  {{ totalPorTipo('SOPA').producido }}
                </span>
              </div>
              <div class="flex justify-between text-sm">
                <span style="color: rgb(var(--color-on-surface)/0.6)">Sopas vendidas</span>
                <span class="font-bold" style="color: rgb(var(--color-primary))">
                  {{ totalPorTipo('SOPA').vendido }}
                </span>
              </div>
              <div style="border-top: 1px solid rgb(var(--color-border))" class="pt-2 mt-2">
                <div class="flex justify-between text-sm">
                  <span style="color: rgb(var(--color-on-surface)/0.6)">Segundos planificados</span>
                  <span class="font-bold">{{ totalPorTipo('SEGUNDO').planificado }}</span>
                </div>
                <div class="flex justify-between text-sm mt-1">
                  <span style="color: rgb(var(--color-on-surface)/0.6)">Segundos producidos</span>
                  <span class="font-bold" style="color: rgb(var(--color-success))">
                    {{ totalPorTipo('SEGUNDO').producido }}
                  </span>
                </div>
                <div class="flex justify-between text-sm mt-1">
                  <span style="color: rgb(var(--color-on-surface)/0.6)">Segundos vendidos</span>
                  <span class="font-bold" style="color: rgb(var(--color-primary))">
                    {{ totalPorTipo('SEGUNDO').vendido }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Ingredientes calculados (receta activa) -->
          <div class="card flex flex-col gap-3">
            <h3 class="font-display font-semibold text-sm"
                style="color: rgb(var(--color-on-surface)/0.6)">INGREDIENTES TOTALES</h3>
            @if (ingredientesAgregados().length === 0) {
              <p class="text-sm" style="color: rgb(var(--color-on-surface)/0.4)">
                Sin recetas activas asociadas a los platos
              </p>
            } @else {
              <div class="space-y-1.5 overflow-y-auto max-h-48">
                @for (ing of ingredientesAgregados(); track ing.nombre) {
                  <div class="flex justify-between items-center text-sm">
                    <span style="color: rgb(var(--color-on-surface)/0.8)">{{ ing.nombre }}</span>
                    <span class="font-mono font-semibold text-xs px-2 py-0.5 rounded-full"
                          style="background: rgb(var(--color-primary)/0.1); color: rgb(var(--color-primary))">
                      {{ ing.cantidad.toFixed(2) }} {{ ing.unidad }}
                    </span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Especiales -->
          <div class="card flex flex-col gap-3">
            <h3 class="font-display font-semibold text-sm"
                style="color: rgb(var(--color-on-surface)/0.6)">PLATOS ESPECIALES</h3>
            @if (lineasPorTipo('ESPECIAL').length === 0) {
              <p class="text-sm" style="color: rgb(var(--color-on-surface)/0.4)">
                Sin especiales planificados
              </p>
            } @else {
              <div class="space-y-2">
                @for (l of lineasPorTipo('ESPECIAL'); track l.id) {
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm font-medium truncate" style="color: rgb(var(--color-on-surface))">
                      {{ l.plato.nombre }}
                    </span>
                    <div class="flex items-center gap-1 shrink-0">
                      <span class="text-xs" style="color: rgb(var(--color-on-surface)/0.5)">
                        {{ l.cantidadVendida }}/{{ l.cantidadProducida }}
                      </span>
                      @if (produccionHoy()!.estado === 'EN_CURSO') {
                        <button (click)="editarLinea(l)"
                                class="text-xs px-2 py-0.5 rounded-lg"
                                style="background: rgb(var(--color-primary)/0.1); color: rgb(var(--color-primary))">
                          Editar
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Tabla sopas -->
        <div class="card">
          <h3 class="font-display font-semibold mb-4" style="color: rgb(var(--color-on-surface))">
            🍵 Sopas del día
          </h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Sopa</th>
                  <th class="text-center">Planificado</th>
                  <th class="text-center">Producido</th>
                  <th class="text-center">Vendido</th>
                  <th class="text-center">Disponible</th>
                  @if (produccionHoy()!.estado === 'EN_CURSO') {
                    <th class="text-center">Acción</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (l of lineasPorTipo('SOPA'); track l.id) {
                  <tr>
                    <td class="font-medium">{{ l.plato.nombre }}</td>
                    <td class="text-center font-mono text-sm">{{ l.cantidadPlanificada }}</td>
                    <td class="text-center font-mono text-sm"
                        [style.color]="l.cantidadProducida >= l.cantidadPlanificada
                          ? 'rgb(var(--color-success))' : 'rgb(var(--color-warning))'">
                      {{ l.cantidadProducida }}
                    </td>
                    <td class="text-center font-mono text-sm"
                        style="color: rgb(var(--color-primary))">
                      {{ l.cantidadVendida }}
                    </td>
                    <td class="text-center">
                      <span class="font-mono text-sm font-bold px-2 py-0.5 rounded-full"
                            [style.background]="l.cantidadDisponible > 0
                              ? 'rgb(var(--color-success)/0.1)' : 'rgb(var(--color-danger)/0.1)'"
                            [style.color]="l.cantidadDisponible > 0
                              ? 'rgb(var(--color-success))' : 'rgb(var(--color-danger))'">
                        {{ l.cantidadDisponible }}
                      </span>
                    </td>
                    @if (produccionHoy()!.estado === 'EN_CURSO') {
                      <td class="text-center">
                        <button (click)="editarLinea(l)"
                                class="text-xs px-3 py-1 rounded-lg font-semibold transition-all"
                                style="background: rgb(var(--color-primary)/0.1); color: rgb(var(--color-primary))">
                          Actualizar
                        </button>
                      </td>
                    }
                  </tr>
                }
                @if (lineasPorTipo('SOPA').length === 0) {
                  <tr>
                    <td colspan="6" class="text-center py-6"
                        style="color: rgb(var(--color-on-surface)/0.4)">
                      Sin sopas en el plan de hoy
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tabla segundos -->
        <div class="card">
          <h3 class="font-display font-semibold mb-4" style="color: rgb(var(--color-on-surface))">
            🥘 Segundos del día
          </h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Segundo</th>
                  <th class="text-center">Planificado</th>
                  <th class="text-center">Producido</th>
                  <th class="text-center">Vendido</th>
                  <th class="text-center">Disponible</th>
                  @if (produccionHoy()!.estado === 'EN_CURSO') {
                    <th class="text-center">Acción</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (l of lineasPorTipo('SEGUNDO'); track l.id) {
                  <tr>
                    <td class="font-medium">{{ l.plato.nombre }}</td>
                    <td class="text-center font-mono text-sm">{{ l.cantidadPlanificada }}</td>
                    <td class="text-center font-mono text-sm"
                        [style.color]="l.cantidadProducida >= l.cantidadPlanificada
                          ? 'rgb(var(--color-success))' : 'rgb(var(--color-warning))'">
                      {{ l.cantidadProducida }}
                    </td>
                    <td class="text-center font-mono text-sm"
                        style="color: rgb(var(--color-primary))">
                      {{ l.cantidadVendida }}
                    </td>
                    <td class="text-center">
                      <span class="font-mono text-sm font-bold px-2 py-0.5 rounded-full"
                            [style.background]="l.cantidadDisponible > 0
                              ? 'rgb(var(--color-success)/0.1)' : 'rgb(var(--color-danger)/0.1)'"
                            [style.color]="l.cantidadDisponible > 0
                              ? 'rgb(var(--color-success))' : 'rgb(var(--color-danger))'">
                        {{ l.cantidadDisponible }}
                      </span>
                    </td>
                    @if (produccionHoy()!.estado === 'EN_CURSO') {
                      <td class="text-center">
                        <button (click)="editarLinea(l)"
                                class="text-xs px-3 py-1 rounded-lg font-semibold transition-all"
                                style="background: rgb(var(--color-primary)/0.1); color: rgb(var(--color-primary))">
                          Actualizar
                        </button>
                      </td>
                    }
                  </tr>
                }
                @if (lineasPorTipo('SEGUNDO').length === 0) {
                  <tr>
                    <td colspan="6" class="text-center py-6"
                        style="color: rgb(var(--color-on-surface)/0.4)">
                      Sin segundos en el plan de hoy
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>

    <!-- ── Modal: nuevo plan ──────────────────────────────────── -->
    @if (modalNuevoPlan()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background: rgb(0 0 0 / 0.6)">
        <div class="card w-full max-w-2xl animate-pop flex flex-col gap-5 max-h-[92vh] overflow-y-auto">

          <div class="flex items-center justify-between">
            <h3 class="font-display text-lg font-bold" style="color: rgb(var(--color-on-surface))">
              Planificar producción — {{ fechaHoy() }}
            </h3>
            <button (click)="modalNuevoPlan.set(false)" class="btn-ghost text-lg leading-none">✕</button>
          </div>

          <!-- Sopas -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm font-semibold" style="color: rgb(var(--color-on-surface)/0.7)">
                🍵 Sopas
              </p>
              <button (click)="agregarLinea('SOPA')" class="text-xs px-3 py-1 rounded-lg font-semibold"
                      style="background: rgb(var(--color-primary)/0.1); color: rgb(var(--color-primary))">
                + Agregar
              </button>
            </div>
            <div class="space-y-2">
              @for (l of lineasNuevasSopa(); track $index) {
                <div class="flex items-center gap-3 p-3 rounded-xl"
                     style="border: 1px solid rgb(var(--color-border))">
                  <select [(ngModel)]="l.platoId" class="input flex-1 text-sm">
                    <option value="">Seleccionar sopa...</option>
                    @for (p of platosPorTipo('SOPA'); track p.id) {
                      <option [value]="p.id">{{ p.nombre }}</option>
                    }
                  </select>
                  <div class="flex items-center gap-2 shrink-0">
                    <label class="text-xs" style="color: rgb(var(--color-on-surface)/0.5)">Cant.</label>
                    <input type="number" [(ngModel)]="l.cantidadPlanificada"
                           class="input w-20 text-sm text-center" min="1">
                  </div>
                  <button (click)="quitarLinea(l)" class="text-danger btn-ghost text-sm px-2">✕</button>
                </div>
              }
              @if (lineasNuevasSopa().length === 0) {
                <p class="text-xs text-center py-2" style="color: rgb(var(--color-on-surface)/0.3)">
                  Sin sopas — pulsa + Agregar
                </p>
              }
            </div>
          </div>

          <!-- Segundos -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm font-semibold" style="color: rgb(var(--color-on-surface)/0.7)">
                🥘 Segundos
              </p>
              <button (click)="agregarLinea('SEGUNDO')" class="text-xs px-3 py-1 rounded-lg font-semibold"
                      style="background: rgb(var(--color-primary)/0.1); color: rgb(var(--color-primary))">
                + Agregar
              </button>
            </div>
            <div class="space-y-2">
              @for (l of lineasNuevasSegundo(); track $index) {
                <div class="flex items-center gap-3 p-3 rounded-xl"
                     style="border: 1px solid rgb(var(--color-border))">
                  <select [(ngModel)]="l.platoId" class="input flex-1 text-sm">
                    <option value="">Seleccionar segundo...</option>
                    @for (p of platosPorTipo('SEGUNDO'); track p.id) {
                      <option [value]="p.id">{{ p.nombre }}</option>
                    }
                  </select>
                  <div class="flex items-center gap-2 shrink-0">
                    <label class="text-xs" style="color: rgb(var(--color-on-surface)/0.5)">Cant.</label>
                    <input type="number" [(ngModel)]="l.cantidadPlanificada"
                           class="input w-20 text-sm text-center" min="1">
                  </div>
                  <button (click)="quitarLinea(l)" class="text-danger btn-ghost text-sm px-2">✕</button>
                </div>
              }
              @if (lineasNuevasSegundo().length === 0) {
                <p class="text-xs text-center py-2" style="color: rgb(var(--color-on-surface)/0.3)">
                  Sin segundos — pulsa + Agregar
                </p>
              }
            </div>
          </div>

          <!-- Especiales -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm font-semibold" style="color: rgb(var(--color-on-surface)/0.7)">
                ⭐ Especiales (opcional)
              </p>
              <button (click)="agregarLinea('ESPECIAL')" class="text-xs px-3 py-1 rounded-lg font-semibold"
                      style="background: rgb(var(--color-primary)/0.1); color: rgb(var(--color-primary))">
                + Agregar
              </button>
            </div>
            <div class="space-y-2">
              @for (l of lineasNuevasEspecial(); track $index) {
                <div class="flex items-center gap-3 p-3 rounded-xl"
                     style="border: 1px solid rgb(var(--color-border))">
                  <select [(ngModel)]="l.platoId" class="input flex-1 text-sm">
                    <option value="">Seleccionar plato...</option>
                    @for (p of platosPorTipo('ESPECIAL'); track p.id) {
                      <option [value]="p.id">{{ p.nombre }}</option>
                    }
                  </select>
                  <div class="flex items-center gap-2 shrink-0">
                    <label class="text-xs" style="color: rgb(var(--color-on-surface)/0.5)">Cant.</label>
                    <input type="number" [(ngModel)]="l.cantidadPlanificada"
                           class="input w-20 text-sm text-center" min="1">
                  </div>
                  <button (click)="quitarLinea(l)" class="text-danger btn-ghost text-sm px-2">✕</button>
                </div>
              }
            </div>
          </div>

          @if (errorPlan()) {
            <p class="text-xs p-2 rounded-lg"
               style="background: rgb(var(--color-danger)/0.1); color: rgb(var(--color-danger))">
              {{ errorPlan() }}
            </p>
          }

          <div class="flex gap-3">
            <button (click)="modalNuevoPlan.set(false)" class="btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button (click)="guardarPlan()" [disabled]="guardando()"
                    class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else {
                Guardar plan
              }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── Modal: actualizar cantidad producida ───────────────── -->
    @if (lineaEditando()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background: rgb(0 0 0 / 0.6)">
        <div class="card w-full max-w-sm animate-pop flex flex-col gap-4">
          <h3 class="font-display font-semibold" style="color: rgb(var(--color-on-surface))">
            Actualizar producción
          </h3>
          <p class="text-sm" style="color: rgb(var(--color-on-surface)/0.6)">
            {{ lineaEditando()!.plato.nombre }}
            <span class="ml-2 text-xs"
                  style="color: rgb(var(--color-on-surface)/0.4)">
              Planificado: {{ lineaEditando()!.cantidadPlanificada }}
            </span>
          </p>
          <div>
            <label class="input-label">Cantidad producida real</label>
            <input type="number" [(ngModel)]="cantidadProducidaInput"
                   class="input text-center text-lg font-bold" min="0">
          </div>
          @if (errorEdicion()) {
            <p class="text-xs p-2 rounded-lg"
               style="background: rgb(var(--color-danger)/0.1); color: rgb(var(--color-danger))">
              {{ errorEdicion() }}
            </p>
          }
          <div class="flex gap-3">
            <button (click)="lineaEditando.set(null)" class="btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button (click)="guardarProducida()" [disabled]="guardando()"
                    class="btn-primary flex-1 justify-center">
              Guardar
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ProduccionComponent implements OnInit {
  cargando        = signal(true);
  produccionHoy   = signal<ProduccionDia | null>(null);
  todosLosPlatos  = signal<Plato[]>([]);

  modalNuevoPlan  = signal(false);
  nuevasLineas    = signal<{ tipo: TipoLineaProduccion; platoId: number | ''; cantidadPlanificada: number }[]>([]);
  guardando       = signal(false);
  errorPlan       = signal('');

  lineasNuevasSopa     = computed(() => this.nuevasLineas().filter(l => l.tipo === 'SOPA'));
  lineasNuevasSegundo  = computed(() => this.nuevasLineas().filter(l => l.tipo === 'SEGUNDO'));
  lineasNuevasEspecial = computed(() => this.nuevasLineas().filter(l => l.tipo === 'ESPECIAL'));

  lineaEditando         = signal<LineaProduccion | null>(null);
  cantidadProducidaInput = 0;
  errorEdicion          = signal('');

  constructor(
    private produccionService: ProduccionService,
    private platoService: PlatoService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.platoService.listar().subscribe({ next: ps => this.todosLosPlatos.set(ps) });
    this.cargarHoy();
  }

  private cargarHoy(): void {
    const sucursalId = this.auth.sucursalActiva();
    if (sucursalId == null) { this.cargando.set(false); return; }
    this.cargando.set(true);
    this.produccionService.hoy(sucursalId).subscribe({
      next: p => { this.produccionHoy.set(p); this.cargando.set(false); },
      error: () => { this.produccionHoy.set(null); this.cargando.set(false); },
    });
  }

  fechaHoy(): string {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  lineasPorTipo(tipo: TipoLineaProduccion): LineaProduccion[] {
    return this.produccionHoy()?.lineas.filter(l => l.tipo === tipo) ?? [];
  }

  totalPorTipo(tipo: TipoLineaProduccion): { planificado: number; producido: number; vendido: number } {
    const lineas = this.lineasPorTipo(tipo);
    return {
      planificado: lineas.reduce((s, l) => s + l.cantidadPlanificada, 0),
      producido:   lineas.reduce((s, l) => s + l.cantidadProducida, 0),
      vendido:     lineas.reduce((s, l) => s + l.cantidadVendida, 0),
    };
  }

  ingredientesAgregados(): { nombre: string; cantidad: number; unidad: string }[] {
    // Usa las recetas ya calculadas en costoEstimado — aquí mostramos un indicador
    // de que la funcionalidad existe pero requiere endpoint de cálculo adicional
    return [];
  }

  platosPorTipo(tipo: string): Plato[] {
    return this.todosLosPlatos().filter(p => p.activo && p.tipo === tipo);
  }

  estadoBg(e: EstadoProduccion): string {
    const m: Record<string, string> = {
      PLANIFICADO: 'rgb(var(--color-info)/0.15)',
      EN_CURSO:    'rgb(var(--color-warning)/0.15)',
      CERRADO:     'rgb(var(--color-success)/0.15)',
    };
    return m[e] ?? 'rgb(var(--color-surface-2))';
  }

  estadoColor(e: EstadoProduccion): string {
    const m: Record<string, string> = {
      PLANIFICADO: 'rgb(var(--color-info))',
      EN_CURSO:    'rgb(var(--color-warning))',
      CERRADO:     'rgb(var(--color-success))',
    };
    return m[e] ?? 'rgb(var(--color-on-surface))';
  }

  estadoLabel(e: EstadoProduccion): string {
    return { PLANIFICADO: 'Planificado', EN_CURSO: 'En curso', CERRADO: 'Cerrado' }[e] ?? e;
  }

  cambiarEstado(nuevoEstado: EstadoProduccion): void {
    const p = this.produccionHoy();
    if (!p) return;
    this.produccionService.cambiarEstado(p.id, nuevoEstado).subscribe({
      next: updated => this.produccionHoy.set(updated),
    });
  }

  // ── Nuevo plan ──────────────────────────────────────────────

  abrirNuevoPlan(): void {
    this.nuevasLineas.set([]);
    this.errorPlan.set('');
    this.modalNuevoPlan.set(true);
  }

  agregarLinea(tipo: TipoLineaProduccion): void {
    this.nuevasLineas.update(ls => [...ls, { tipo, platoId: '', cantidadPlanificada: 10 }]);
  }

  quitarLinea(linea: { tipo: TipoLineaProduccion; platoId: number | ''; cantidadPlanificada: number }): void {
    this.nuevasLineas.update(ls => ls.filter(l => l !== linea));
  }

  guardarPlan(): void {
    const lineas = this.nuevasLineas();
    if (lineas.length === 0) {
      this.errorPlan.set('Agrega al menos una línea de producción.');
      return;
    }
    const invalidas = lineas.filter(l => !l.platoId || l.cantidadPlanificada < 1);
    if (invalidas.length > 0) {
      this.errorPlan.set('Completa el plato y la cantidad de todas las líneas.');
      return;
    }

    const sucursalId = this.auth.sucursalActiva();
    if (sucursalId == null) {
      this.errorPlan.set('Selecciona una sucursal antes de planificar.');
      return;
    }

    this.guardando.set(true);
    this.errorPlan.set('');

    const body = {
      fecha:       new Date().toISOString().substring(0, 10),
      sucursalId,
      lineas:      lineas.map(l => ({
        platoId:            Number(l.platoId),
        tipo:               l.tipo,
        cantidadPlanificada: l.cantidadPlanificada,
      })),
    };

    this.produccionService.crear(body).subscribe({
      next: p => {
        this.produccionHoy.set(p);
        this.modalNuevoPlan.set(false);
        this.guardando.set(false);
      },
      error: err => {
        this.errorPlan.set(err?.error?.mensaje ?? 'Error al guardar el plan');
        this.guardando.set(false);
      },
    });
  }

  // ── Editar cantidad producida ───────────────────────────────

  editarLinea(linea: LineaProduccion): void {
    this.lineaEditando.set(linea);
    this.cantidadProducidaInput = linea.cantidadProducida;
    this.errorEdicion.set('');
  }

  guardarProducida(): void {
    const linea = this.lineaEditando();
    if (!linea) return;
    this.guardando.set(true);
    this.produccionService.actualizarProducida(linea.id, this.cantidadProducidaInput).subscribe({
      next: updated => {
        this.produccionHoy.update(p => {
          if (!p) return p;
          return {
            ...p,
            lineas: p.lineas.map(l => l.id === updated.id ? { ...l, ...updated } : l),
          };
        });
        this.lineaEditando.set(null);
        this.guardando.set(false);
      },
      error: err => {
        this.errorEdicion.set(err?.error?.mensaje ?? 'Error al guardar');
        this.guardando.set(false);
      },
    });
  }
}
