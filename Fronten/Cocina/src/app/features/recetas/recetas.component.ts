import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  InsumoService, RecetaService, SugerenciaIaService,
  RecetaResumen, RecetaDetalle, IngredienteDetalle,
} from '../../core/services/api.service';
import { Insumo } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';

interface IngredienteForm {
  insumoId: number;
  insumoNombre: string;
  insumoUnidad: string;
  precioUnitario: number;
  cantidad: number;
  unidadMedida: string;
  costoCalculado: number;
}

@Component({
  selector: 'app-recetas',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="flex flex-col gap-5 h-full animate-slide-up">

      <!-- ── Header ──────────────────────────────────────────── -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Recetas de Platos
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ platos().length }} registros · {{ platosSinReceta() }} platos sin receta · {{ platosConReceta() }} con receta activa
          </p>
        </div>
        <input [(ngModel)]="busquedaPlato" (ngModelChange)="pagina.set(1)"
               maxlength="100"
               class="input text-sm w-56"
               placeholder="Buscar plato...">
      </div>

      <!-- ── Layout: lista + panel ────────────────────────────── -->
      <div class="flex flex-col md:flex-row gap-4 flex-1 min-h-0">

        <!-- Lista de platos -->
        <div [class]="panelAbierto() ? 'w-full md:w-96 flex-shrink-0 flex flex-col gap-2 overflow-y-auto' : 'flex-1 overflow-y-auto'">

          @if (cargando()) {
            @for (i of [1,2,3,4,5]; track i) {
              <div class="card h-16 animate-pulse"></div>
            }
          }

          @for (p of platosPaginados(); track p.platoId) {
            <div (click)="abrirEditor(p)"
                 class="card cursor-pointer transition-all hover:scale-[1.01]"
                 [style.border]="platoSeleccionado()?.platoId === p.platoId
                   ? '2px solid rgb(var(--color-primary))'
                   : '2px solid transparent'">

              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-3 min-w-0">
                  <!-- Tipo badge -->
                  <span class="text-xs px-2 py-0.5 rounded-full font-mono flex-shrink-0"
                        style="background:rgb(var(--color-primary)/0.12);color:rgb(var(--color-primary))">
                    {{ p.platoTipo ?? '—' }}
                  </span>
                  <div class="min-w-0">
                    <p class="font-semibold text-sm truncate" style="color:rgb(var(--color-on-surface))">
                      {{ p.platoNombre }}
                    </p>
                    <p class="text-xs font-mono" style="color:rgb(var(--color-on-surface)/0.45)">
                      {{ p.platoCodigo }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-3 flex-shrink-0 text-right">
                  @if (p.tieneReceta) {
                    <div>
                      <p class="text-[10px]" style="color:rgb(var(--color-on-surface)/0.4)">Costo</p>
                      <p class="text-xs font-mono font-bold" style="color:rgb(var(--color-warning))">
                        Bs {{ p.costoTotal! | number:'1.2-2' }}
                      </p>
                    </div>
                    <div>
                      <p class="text-[10px]" style="color:rgb(var(--color-on-surface)/0.4)">Margen</p>
                      <p class="text-xs font-mono font-bold" style="color:rgb(var(--color-success))">
                        Bs {{ p.margen | number:'1.2-2' }}
                      </p>
                    </div>
                    <span class="badge-success text-[10px]">v{{ p.version }}</span>
                  } @else {
                    <span class="badge-neutral text-[10px]">Sin receta</span>
                  }
                </div>
              </div>
            </div>
          }

          @if (!cargando() && platosFiltrados().length === 0) {
            <div class="card text-center py-12" style="color:rgb(var(--color-on-surface)/0.35)">
              <iconify-icon icon="tabler:tools-kitchen-2" width="32" height="32" style="color:currentColor" class="mb-2 inline-block"></iconify-icon>
              <p>No hay platos</p>
            </div>
          }

          @if (!panelAbierto()) {
            <app-pagination
              [total]="platosFiltrados().length"
              [pagina]="pagina()"
              [pageSize]="pageSize"
              (pageChange)="pagina.set($event)" />
          }
        </div>

        <!-- ── Panel editor ──────────────────────────────────── -->
        @if (panelAbierto()) {
          <div class="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto">

            <!-- Header del panel -->
            <div class="card flex items-center justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xs px-2 py-0.5 rounded-full font-mono"
                        style="background:rgb(var(--color-primary)/0.12);color:rgb(var(--color-primary))">
                    {{ platoSeleccionado()!.platoTipo ?? '—' }}
                  </span>
                  <h2 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
                    {{ platoSeleccionado()!.platoNombre }}
                  </h2>
                </div>
                <p class="text-xs mt-0.5" style="color:rgb(var(--color-on-surface)/0.45)">
                  Precio venta: <strong>Bs {{ platoSeleccionado()!.precioVenta | number:'1.2-2' }}</strong>
                  @if (costoTotal() > 0) {
                    · Costo actual: <strong>Bs {{ costoTotal() | number:'1.2-2' }}</strong>
                    · Margen: <strong style="color:rgb(var(--color-success))">
                      Bs {{ (platoSeleccionado()!.precioVenta - costoTotal()) | number:'1.2-2' }}
                    </strong>
                  }
                </p>
              </div>
              <div class="flex items-center gap-2">
                @if (recetaActiva()) {
                  <span class="badge-success text-xs">v{{ recetaActiva()!.version }} activa</span>
                }
                <button (click)="cerrarEditor()" class="btn-ghost p-1.5 text-sm">
                  <iconify-icon icon="tabler:x" width="14" height="14" style="color:currentColor"></iconify-icon>
                </button>
              </div>
            </div>

            <!-- Pestañas: Ingredientes / IA -->
            <div class="flex gap-1 p-1 rounded-xl w-fit"
                 style="background:rgb(var(--color-surface-2))">
              <button (click)="tab.set('ingredientes')"
                      class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                      [style.background]="tab() === 'ingredientes' ? 'rgb(var(--color-surface-3))' : 'transparent'"
                      [style.color]="tab() === 'ingredientes' ? 'rgb(var(--color-on-surface))' : 'rgb(var(--color-on-surface)/0.5)'">
                <span class="inline-flex items-center gap-1.5">
                  <iconify-icon icon="tabler:tools-kitchen-2" width="15" height="15" style="color:currentColor"></iconify-icon> Ingredientes
                </span>
              </button>
              <button (click)="tab.set('gemini')"
                      class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                      [style.background]="tab() === 'gemini' ? 'rgb(var(--color-surface-3))' : 'transparent'"
                      [style.color]="tab() === 'gemini' ? 'rgb(var(--color-on-surface))' : 'rgb(var(--color-on-surface)/0.5)'">
                ✨ Sugerencia IA
              </button>
            </div>

            <!-- ── Tab Ingredientes ────────────────────────── -->
            @if (tab() === 'ingredientes') {
              <div class="flex flex-col md:flex-row gap-4 flex-1 min-h-0">

                <!-- Selector de insumos -->
                <div class="w-full md:w-72 flex-shrink-0 card flex flex-col gap-3">
                  <p class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">
                    Insumos disponibles
                  </p>
                  <input [(ngModel)]="busquedaInsumo"
                         maxlength="100"
                         class="input text-xs"
                         placeholder="Buscar insumo...">
                  <div class="flex-1 overflow-y-auto space-y-1" style="max-height:350px">
                    @if (cargandoInsumos()) {
                      <div class="text-xs text-center py-6" style="color:rgb(var(--color-on-surface)/0.35)">
                        Cargando...
                      </div>
                    }
                    @for (ins of insumosFiltrados(); track ins.id) {
                      <button (click)="agregarIngrediente(ins)"
                              class="w-full text-left px-2.5 py-2 rounded-lg transition-all text-xs"
                              [style.background]="yaEstaEnForm(ins.id) ? 'rgb(var(--color-primary)/0.12)' : 'rgb(var(--color-surface-2))'"
                              [style.color]="yaEstaEnForm(ins.id) ? 'rgb(var(--color-primary))' : 'rgb(var(--color-on-surface)/0.75)'"
                              [disabled]="yaEstaEnForm(ins.id)">
                        <span class="font-medium">{{ ins.nombre }}</span>
                        <span class="float-right font-mono text-[10px]" style="color:rgb(var(--color-on-surface)/0.4)">
                          Bs {{ ins.precioUnitario | number:'1.2-2' }}/{{ ins.unidadMedida }}
                        </span>
                        @if (yaEstaEnForm(ins.id)) {
                          <span class="block text-[10px] mt-0.5 inline-flex items-center gap-1" style="color:rgb(var(--color-primary)/0.7)">
                            <iconify-icon icon="tabler:check" width="12" height="12" style="color:currentColor"></iconify-icon> Agregado
                          </span>
                        }
                      </button>
                    }
                    @if (insumosFiltrados().length === 0 && !cargandoInsumos()) {
                      <p class="text-xs text-center py-4" style="color:rgb(var(--color-on-surface)/0.35)">
                        Sin resultados
                      </p>
                    }
                  </div>
                </div>

                <!-- Ingredientes seleccionados -->
                <div class="flex-1 card flex flex-col gap-3">
                  <div class="flex items-center justify-between">
                    <p class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">
                      Ingredientes de la receta
                    </p>
                    <span class="text-xs font-mono font-bold" style="color:rgb(var(--color-primary))">
                      Costo total: Bs {{ costoTotal() | number:'1.2-2' }}
                    </span>
                  </div>

                  @if (ingredientesForm().length === 0) {
                    <div class="flex-1 flex flex-col items-center justify-center py-8"
                         style="color:rgb(var(--color-on-surface)/0.3)">
                      <iconify-icon icon="tabler:bowl" width="32" height="32" style="color:currentColor" class="mb-2 inline-block"></iconify-icon>
                      <p class="text-sm">Selecciona insumos del panel izquierdo</p>
                    </div>
                  } @else {
                    <div class="overflow-y-auto overflow-x-auto flex-1">
                      <table class="w-full text-xs" style="min-width:420px">
                        <thead>
                          <tr style="color:rgb(var(--color-on-surface)/0.45)">
                            <th class="text-left pb-2 font-medium">Ingrediente</th>
                            <th class="text-center pb-2 font-medium">Cantidad</th>
                            <th class="text-center pb-2 font-medium">Unidad</th>
                            <th class="text-right pb-2 font-medium">Costo</th>
                            <th class="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody class="divide-y" style="border-color:rgb(var(--color-border))">
                          @for (ing of ingredientesForm(); track ing.insumoId; let i = $index) {
                            <tr>
                              <td class="py-2 pr-2">
                                <p class="font-medium" style="color:rgb(var(--color-on-surface))">
                                  {{ ing.insumoNombre }}
                                </p>
                                <p class="text-[10px]" style="color:rgb(var(--color-on-surface)/0.4)">
                                  Bs {{ ing.precioUnitario | number:'1.2-2' }}/{{ ing.insumoUnidad }}
                                </p>
                              </td>
                              <td class="py-2 px-2">
                                <input type="number" min="0" step="0.1"
                                       [value]="ing.cantidad"
                                       (input)="actualizarCantidad(i, $any($event.target).value)"
                                       class="input text-xs text-center w-20 py-1 px-2">
                              </td>
                              <td class="py-2 px-2">
                                <input type="text"
                                       maxlength="20"
                                       [value]="ing.unidadMedida"
                                       (input)="actualizarUnidad(i, $any($event.target).value)"
                                       class="input text-xs text-center w-16 py-1 px-2">
                              </td>
                              <td class="py-2 pl-2 text-right font-mono font-semibold"
                                  style="color:rgb(var(--color-warning))">
                                Bs {{ ing.costoCalculado | number:'1.2-2' }}
                              </td>
                              <td class="py-2 pl-1">
                                <button (click)="quitarIngrediente(i)"
                                        class="text-[10px] px-1.5 py-0.5 rounded"
                                        style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
                                  <iconify-icon icon="tabler:x" width="10" height="10" style="color:currentColor"></iconify-icon>
                                </button>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }

                  <!-- Notas -->
                  <div>
                    <label class="input-label text-xs">Notas / Instrucciones de preparación</label>
                    <textarea [(ngModel)]="notas"
                              maxlength="250"
                              class="input text-xs resize-none"
                              rows="3"
                              placeholder="Pasos de preparación, temperaturas, tiempos..."></textarea>
                  </div>

                  <!-- Acciones -->
                  <div class="flex gap-2 pt-1 flex-wrap">
                    <button (click)="tab.set('gemini'); sugerirConGemini()"
                            class="btn-secondary text-sm flex items-center gap-1.5"
                            [disabled]="ingredientesForm().length === 0">
                      ✨ Sugerir con IA
                    </button>
                    <div class="flex-1"></div>
                    <button (click)="descargarPDF()"
                            [disabled]="ingredientesForm().length === 0"
                            class="btn-secondary text-sm inline-flex items-center gap-1.5">
                      <iconify-icon icon="tabler:file-text" width="14" height="14" style="color:currentColor"></iconify-icon> PDF
                    </button>
                    <button (click)="guardar()"
                            [disabled]="guardando() || ingredientesForm().length === 0"
                            class="btn-primary text-sm">
                      @if (guardando()) {
                        <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
                      } @else { 💾 Guardar receta }
                    </button>
                  </div>

                  @if (errorMsg()) {
                    <p class="text-xs px-3 py-2 rounded-lg inline-flex items-center gap-1.5"
                       style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
                      <iconify-icon icon="tabler:alert-triangle" width="14" height="14" style="color:currentColor"></iconify-icon> {{ errorMsg() }}
                    </p>
                  }
                </div>
              </div>
            }

            <!-- ── Tab Sugerencia IA ───────────────────────────── -->
            @if (tab() === 'gemini') {
              <div class="card flex-1 flex flex-col gap-4">
                <div class="flex items-center justify-between flex-wrap gap-2">
                  <p class="font-semibold" style="color:rgb(var(--color-on-surface))">
                    ✨ Sugerencia por IA
                  </p>
                  <div class="flex items-center gap-2">
                    <select [(ngModel)]="proveedorIa" class="input text-xs py-1.5" style="width:auto">
                      @for (p of proveedoresIa(); track p) {
                        <option [value]="p">{{ etiquetaProveedor(p) }}</option>
                      }
                      @if (proveedoresIa().length === 0) {
                        <option value="">Sin proveedores configurados</option>
                      }
                    </select>
                    <button (click)="sugerirConGemini()"
                            [disabled]="cargandoGemini() || ingredientesForm().length === 0 || !proveedorIa"
                            class="btn-primary text-sm">
                      @if (cargandoGemini()) {
                        <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block mr-1"></span>
                        Consultando IA...
                      } @else {
                        <span class="inline-flex items-center gap-1.5">
                          <iconify-icon icon="tabler:refresh" width="14" height="14" style="color:currentColor"></iconify-icon>
                          {{ geminiRespuesta() ? 'Regenerar' : 'Sugerir receta' }}
                        </span>
                      }
                    </button>
                  </div>
                </div>

                @if (ingredientesForm().length === 0) {
                  <div class="flex-1 flex flex-col items-center justify-center py-12"
                       style="color:rgb(var(--color-on-surface)/0.35)">
                    <p class="text-3xl mb-2">🤖</p>
                    <p class="text-sm">Primero agrega ingredientes en la pestaña anterior</p>
                  </div>
                } @else if (cargandoGemini()) {
                  <div class="flex-1 flex flex-col items-center justify-center py-12">
                    <div class="w-10 h-10 rounded-full border-4 animate-spin mb-4"
                         style="border-color:rgb(var(--color-border));border-top-color:rgb(var(--color-primary))"></div>
                    <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
                      {{ etiquetaProveedor(proveedorIa) }} está analizando tus ingredientes...
                    </p>
                  </div>
                } @else if (geminiRespuesta()) {
                  <div class="flex-1 overflow-y-auto">
                    <div class="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap"
                         style="color:rgb(var(--color-on-surface)/0.8)">{{ geminiRespuesta() }}</div>
                  </div>
                  <div class="flex gap-2 pt-2 border-t" style="border-color:rgb(var(--color-border))">
                    <button (click)="usarComoNotas()"
                            class="btn-secondary text-xs inline-flex items-center gap-1.5">
                      <iconify-icon icon="tabler:file-text" width="14" height="14" style="color:currentColor"></iconify-icon> Usar como notas
                    </button>
                    <button (click)="descargarPDF()"
                            class="btn-secondary text-xs inline-flex items-center gap-1.5">
                      <iconify-icon icon="tabler:file-text" width="14" height="14" style="color:currentColor"></iconify-icon> Descargar PDF con sugerencia
                    </button>
                  </div>
                } @else {
                  <div class="flex-1 flex flex-col items-center justify-center py-12"
                       style="color:rgb(var(--color-on-surface)/0.35)">
                    <p class="text-3xl mb-2">✨</p>
                    <p class="text-sm">Presiona "Sugerir receta" para obtener ideas de la IA</p>
                  </div>
                }

                @if (errorGemini()) {
                  <p class="text-xs px-3 py-2 rounded-lg inline-flex items-center gap-1.5"
                     style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
                    <iconify-icon icon="tabler:alert-triangle" width="14" height="14" style="color:currentColor"></iconify-icon> {{ errorGemini() }}
                  </p>
                }
              </div>
            }
          </div>
        }

        @if (!panelAbierto() && !cargando()) {
          <div class="hidden lg:flex flex-col items-center justify-center flex-1 py-20"
               style="color:rgb(var(--color-on-surface)/0.2)">
            <p class="text-6xl mb-4">👈</p>
            <p class="text-lg font-medium">Selecciona un plato para gestionar su receta</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class RecetasComponent implements OnInit {
  // ── estado lista ──────────────────────────────────────────────
  platos        = signal<RecetaResumen[]>([]);
  cargando      = signal(true);
  busquedaPlato = '';

  pagina        = signal(1);
  readonly pageSize = 10;

  sortCol = signal<string>('');
  sortDir = signal<'asc' | 'desc'>('asc');

  platosFiltrados = computed(() => {
    const q = this.busquedaPlato.toLowerCase();
    let lista = q
      ? this.platos().filter(p => p.platoNombre.toLowerCase().includes(q) || (p.platoCodigo ?? '').toLowerCase().includes(q))
      : this.platos();
    const col = this.sortCol();
    if (col) {
      const dir = this.sortDir() === 'asc' ? 1 : -1;
      lista = [...lista].sort((a, b) => {
        const va = (a as any)[col]; const vb = (b as any)[col];
        if (typeof va === 'string') return dir * va.localeCompare(vb);
        return dir * (va - vb);
      });
    }
    return lista;
  });

  platosPaginados = computed(() => {
    const lista = this.platosFiltrados();
    return lista.slice((this.pagina() - 1) * this.pageSize, this.pagina() * this.pageSize);
  });

  platosConReceta  = computed(() => this.platos().filter(p => p.tieneReceta).length);
  platosSinReceta  = computed(() => this.platos().filter(p => !p.tieneReceta).length);

  // ── estado editor ─────────────────────────────────────────────
  platoSeleccionado = signal<RecetaResumen | null>(null);
  recetaActiva      = signal<RecetaDetalle | null>(null);
  panelAbierto      = computed(() => this.platoSeleccionado() !== null);
  tab               = signal<'ingredientes' | 'gemini'>('ingredientes');

  // ── ingredientes ──────────────────────────────────────────────
  insumos         = signal<Insumo[]>([]);
  cargandoInsumos = signal(false);
  busquedaInsumo  = '';

  insumosFiltrados = computed(() => {
    const q = this.busquedaInsumo.toLowerCase();
    return q
      ? this.insumos().filter(i => i.nombre.toLowerCase().includes(q))
      : this.insumos();
  });

  ingredientesForm = signal<IngredienteForm[]>([]);
  notas            = '';

  costoTotal = computed(() =>
    this.ingredientesForm().reduce((s, i) => s + i.costoCalculado, 0)
  );

  // ── sugerencia por IA ────────────────────────────────────────────
  geminiRespuesta = signal('');
  cargandoGemini  = signal(false);
  errorGemini     = signal('');
  proveedoresIa   = signal<string[]>([]);
  proveedorIa     = '';

  // ── acciones ──────────────────────────────────────────────────
  guardando = signal(false);
  errorMsg  = signal('');

  constructor(
    private recetaSvc: RecetaService,
    private insumoSvc: InsumoService,
    private iaSvc: SugerenciaIaService,
    private toastSvc: ToastService,
  ) {}

  etiquetaProveedor(codigo: string): string {
    const map: Record<string, string> = { GEMINI: 'Gemini', CLAUDE: 'Claude', OPENAI: 'ChatGPT' };
    return map[codigo] ?? codigo;
  }

  ngOnInit(): void {
    this.cargarPlatos();
    this.cargarInsumos();
    this.iaSvc.proveedoresDisponibles().subscribe({
      next: lista => {
        this.proveedoresIa.set(lista);
        if (lista.length > 0) this.proveedorIa = lista[0];
      },
      error: () => {},
    });
  }

  sortBy(col: string): void {
    if (this.sortCol() === col) this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    else { this.sortCol.set(col); this.sortDir.set('asc'); }
    this.pagina.set(1);
  }

  si(col: string): string {
    if (this.sortCol() !== col) return '⇅';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  cargarPlatos(): void {
    this.cargando.set(true);
    this.recetaSvc.listar().subscribe({
      next: ps => { this.platos.set(ps); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
  }

  cargarInsumos(): void {
    this.cargandoInsumos.set(true);
    this.insumoSvc.listar().subscribe({
      next: is => { this.insumos.set(is); this.cargandoInsumos.set(false); },
      error: () => this.cargandoInsumos.set(false),
    });
  }

  abrirEditor(plato: RecetaResumen): void {
    this.platoSeleccionado.set(plato);
    this.tab.set('ingredientes');
    this.geminiRespuesta.set('');
    this.errorMsg.set('');
    this.errorGemini.set('');
    this.notas = '';
    this.ingredientesForm.set([]);

    if (plato.tieneReceta) {
      this.recetaSvc.getActiva(plato.platoId).subscribe({
        next: r => {
          this.recetaActiva.set(r);
          this.notas = r.notas ?? '';
          this.ingredientesForm.set(r.ingredientes.map(ing => this.detalleAForm(ing)));
        },
      });
    } else {
      this.recetaActiva.set(null);
    }
  }

  cerrarEditor(): void {
    this.platoSeleccionado.set(null);
    this.recetaActiva.set(null);
    this.ingredientesForm.set([]);
  }

  // ── ingredientes ──────────────────────────────────────────────

  yaEstaEnForm(insumoId: number): boolean {
    return this.ingredientesForm().some(i => i.insumoId === insumoId);
  }

  agregarIngrediente(ins: Insumo): void {
    if (this.yaEstaEnForm(ins.id)) return;
    this.ingredientesForm.update(list => [...list, {
      insumoId:      ins.id,
      insumoNombre:  ins.nombre,
      insumoUnidad:  ins.unidadMedida,
      precioUnitario: ins.precioUnitario,
      cantidad:      1,
      unidadMedida:  ins.unidadMedida,
      costoCalculado: ins.precioUnitario,
    }]);
  }

  quitarIngrediente(idx: number): void {
    this.ingredientesForm.update(list => list.filter((_, i) => i !== idx));
  }

  actualizarCantidad(idx: number, val: string): void {
    const cantidad = parseFloat(val) || 0;
    this.ingredientesForm.update(list =>
      list.map((ing, i) => i === idx
        ? { ...ing, cantidad, costoCalculado: cantidad * ing.precioUnitario }
        : ing
      )
    );
  }

  actualizarUnidad(idx: number, val: string): void {
    this.ingredientesForm.update(list =>
      list.map((ing, i) => i === idx ? { ...ing, unidadMedida: val } : ing)
    );
  }

  // ── guardar ───────────────────────────────────────────────────

  guardar(): void {
    const plato = this.platoSeleccionado();
    if (!plato) return;
    if (this.ingredientesForm().length === 0) {
      this.errorMsg.set('Agrega al menos un ingrediente.'); return;
    }
    this.guardando.set(true);
    this.errorMsg.set('');

    const body = {
      notas: this.notas.trim() || null,
      ingredientes: this.ingredientesForm().map(ing => ({
        insumoId: ing.insumoId,
        cantidad: ing.cantidad,
        unidadMedida: ing.unidadMedida,
      })),
    };

    this.recetaSvc.crear(plato.platoId, body).subscribe({
      next: r => {
        this.guardando.set(false);
        this.recetaActiva.set(r);
        // Actualizar resumen en la lista
        this.platos.update(ps => ps.map(p =>
          p.platoId === plato.platoId
            ? { ...p, tieneReceta: true, recetaId: r.id, version: r.version, costoTotal: r.costoTotal, notas: r.notas }
            : p
        ));
        this.platoSeleccionado.update(p => p ? { ...p, tieneReceta: true, version: r.version, costoTotal: r.costoTotal } : p);
        this.toastSvc.success(`Receta v${r.version} guardada — Costo: Bs ${r.costoTotal.toFixed(2)}`);
      },
      error: err => {
        this.guardando.set(false);
        this.errorMsg.set(err?.error?.mensaje ?? 'Error al guardar receta');
      },
    });
  }

  // ── sugerencia por IA ────────────────────────────────────────────

  sugerirConGemini(): void {
    const plato = this.platoSeleccionado();
    if (!plato || this.ingredientesForm().length === 0 || !this.proveedorIa) return;
    this.cargandoGemini.set(true);
    this.geminiRespuesta.set('');
    this.errorGemini.set('');

    const ingredientesIA = this.ingredientesForm().map(i => ({
      nombre: i.insumoNombre,
      cantidad: i.cantidad,
      unidad: i.unidadMedida,
    }));

    this.iaSvc.sugerirReceta(plato.platoNombre, ingredientesIA, this.costoTotal(), this.proveedorIa).subscribe({
      next: texto => {
        this.geminiRespuesta.set(texto);
        this.cargandoGemini.set(false);
      },
      error: err => {
        this.cargandoGemini.set(false);
        this.errorGemini.set(err?.error?.mensaje ?? 'Error al contactar la IA');
      },
    });
  }

  usarComoNotas(): void {
    this.notas = this.geminiRespuesta();
    this.tab.set('ingredientes');
    this.toastSvc.success('Sugerencia copiada a Notas');
  }

  // ── PDF ───────────────────────────────────────────────────────

  async descargarPDF(): Promise<void> {
    const plato = this.platoSeleccionado();
    if (!plato || this.ingredientesForm().length === 0) return;

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');

    const MARGEN  = 20;
    const ANCHO   = 170;
    const CENTRO  = 105;

    // ── Encabezado ──────────────────────────────────────────────
    doc.setFillColor(45, 45, 55);
    doc.rect(0, 0, 210, 36, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('RECETA DE COCINA', CENTRO, 16, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(plato.platoNombre.toUpperCase(), CENTRO, 26, { align: 'center' });

    // ── Meta info ────────────────────────────────────────────────
    doc.setTextColor(80, 80, 90);
    doc.setFontSize(9);
    const version = this.recetaActiva()?.version;
    doc.text(`Versión: ${version ? `v${version} (nueva versión al guardar)` : 'Nueva'}`, MARGEN, 45);
    doc.text(`Tipo: ${plato.platoTipo ?? '—'}`, MARGEN, 51);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-BO')}`, 190, 45, { align: 'right' });
    doc.text(`Precio venta: Bs ${plato.precioVenta.toFixed(2)}`, 190, 51, { align: 'right' });

    doc.setDrawColor(220, 220, 230);
    doc.line(MARGEN, 56, 190, 56);

    // ── Ingredientes ─────────────────────────────────────────────
    let y = 64;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 40);
    doc.text('INGREDIENTES', MARGEN, y);
    y += 7;

    // Encabezado tabla
    doc.setFillColor(245, 245, 250);
    doc.rect(MARGEN, y - 4, ANCHO, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 95);
    doc.text('Ingrediente', MARGEN + 2, y);
    doc.text('Cantidad', 115, y, { align: 'right' });
    doc.text('Unidad', 138, y, { align: 'right' });
    doc.text('Costo (Bs)', 190, y, { align: 'right' });
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    for (const ing of this.ingredientesForm()) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setTextColor(30, 30, 40);
      doc.text(ing.insumoNombre, MARGEN + 2, y);
      doc.text(ing.cantidad.toString(), 115, y, { align: 'right' });
      doc.text(ing.unidadMedida, 138, y, { align: 'right' });
      doc.setTextColor(180, 120, 0);
      doc.text(`${ing.costoCalculado.toFixed(2)}`, 190, y, { align: 'right' });
      doc.setDrawColor(235, 235, 240);
      doc.line(MARGEN, y + 2, 190, y + 2);
      y += 8;
    }

    // ── Totales ──────────────────────────────────────────────────
    y += 3;
    doc.setDrawColor(180, 180, 195);
    doc.line(115, y - 1, 190, y - 1);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 40);
    doc.text('COSTO TOTAL:', 140, y + 5);
    doc.setTextColor(180, 120, 0);
    doc.text(`Bs ${this.costoTotal().toFixed(2)}`, 190, y + 5, { align: 'right' });

    doc.setTextColor(30, 30, 40);
    doc.text('PRECIO VENTA:', 140, y + 12);
    doc.setTextColor(30, 130, 60);
    doc.text(`Bs ${plato.precioVenta.toFixed(2)}`, 190, y + 12, { align: 'right' });

    const margen = plato.precioVenta - this.costoTotal();
    const pct    = this.costoTotal() > 0 ? (margen / plato.precioVenta * 100) : 0;
    doc.setTextColor(30, 30, 40);
    doc.text('MARGEN:', 140, y + 19);
    doc.setTextColor(margen >= 0 ? 30 : 200, margen >= 0 ? 130 : 50, margen >= 0 ? 60 : 50);
    doc.text(`Bs ${margen.toFixed(2)} (${pct.toFixed(1)}%)`, 190, y + 19, { align: 'right' });
    y += 30;

    // ── Notas / Preparación ──────────────────────────────────────
    if (this.notas.trim()) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setDrawColor(220, 220, 230);
      doc.line(MARGEN, y, 190, y);
      y += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 40);
      doc.text('PREPARACIÓN / NOTAS', MARGEN, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 65);
      const notasLines = doc.splitTextToSize(this.notas.trim(), ANCHO);
      doc.text(notasLines, MARGEN, y);
      y += notasLines.length * 5 + 8;
    }

    // ── Sugerencia IA ────────────────────────────────────────────
    if (this.geminiRespuesta()) {
      if (y > 230) { doc.addPage(); y = 20; }
      doc.setDrawColor(220, 220, 230);
      doc.line(MARGEN, y, 190, y);
      y += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(80, 40, 140);
      doc.text('SUGERENCIA GEMINI IA', MARGEN, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 40, 80);
      const iaLines = doc.splitTextToSize(this.geminiRespuesta(), ANCHO);
      if (y + iaLines.length * 4.5 > 270) { doc.addPage(); y = 20; }
      doc.text(iaLines, MARGEN, y);
    }

    // ── Footer ───────────────────────────────────────────────────
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(160, 160, 175);
      doc.text('Sistema Nenas · Receta generada automáticamente', CENTRO, 290, { align: 'center' });
      if (total > 1) doc.text(`Pág. ${i} / ${total}`, 190, 290, { align: 'right' });
    }

    const nombre = plato.platoNombre.replace(/\s+/g, '-').toLowerCase();
    doc.save(`receta-${nombre}.pdf`);
  }

  // ── helpers ───────────────────────────────────────────────────

  private detalleAForm(ing: IngredienteDetalle): IngredienteForm {
    return {
      insumoId:       ing.insumoId,
      insumoNombre:   ing.insumoNombre,
      insumoUnidad:   ing.insumoUnidad,
      precioUnitario: ing.precioUnitario,
      cantidad:       ing.cantidad,
      unidadMedida:   ing.unidadMedida,
      costoCalculado: ing.costoIngrediente,
    };
  }
}
