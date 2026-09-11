import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TipoAlmuerzoPensionadosService } from '../../core/services/api.service';
import { TipoAlmuerzo } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';

const DIAS_SEMANA = [
  { key: 'LUNES',     label: 'L' },
  { key: 'MARTES',    label: 'M' },
  { key: 'MIERCOLES', label: 'X' },
  { key: 'JUEVES',    label: 'J' },
  { key: 'VIERNES',   label: 'V' },
  { key: 'SABADO',    label: 'S' },
  { key: 'DOMINGO',   label: 'D' },
];

@Component({
  selector: 'app-tipos-almuerzo',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-5 animate-slide-up">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Tipos de Almuerzo
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ lista().length }} registros · {{ activos() }} activos
          </p>
        </div>
        <div class="flex gap-2 w-full sm:w-auto">
          <input [(ngModel)]="busqueda" (ngModelChange)="pagina.set(1)"
                 class="input w-full sm:w-48 text-sm" maxlength="100"
                 placeholder="Buscar plan...">
          <button (click)="abrirCrear()" class="btn-primary whitespace-nowrap">+ Nuevo plan</button>
        </div>
      </div>

      <!-- Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @if (cargando()) {
          @for (i of [1,2,3]; track i) {
            <div class="card h-44 animate-pulse"></div>
          }
        }

        @for (t of listaFiltradaPaginada(); track t.id) {
          <div class="card space-y-3" [style.opacity]="t.activo ? '1' : '0.55'">
            <!-- Header card -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                     style="background:rgb(var(--color-primary)/0.12);color:rgb(var(--color-primary))">
                  <iconify-icon icon="tabler:soup" width="22" height="22" style="color:currentColor"></iconify-icon>
                </div>
                <div>
                  <p class="font-bold text-sm leading-snug" style="color:rgb(var(--color-on-surface))">
                    {{ t.nombre }}
                  </p>
                  <p class="text-lg font-bold font-mono mt-0.5" style="color:rgb(var(--color-primary))">
                    Bs {{ t.precioMensual | number:'1.2-2' }}<span class="text-xs font-normal opacity-60">/mes</span>
                  </p>
                </div>
              </div>
              <span [class]="t.activo ? 'badge-success text-[10px]' : 'badge-neutral text-[10px]'">
                {{ t.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </div>

            <!-- Descripción -->
            @if (t.descripcion) {
              <p class="text-xs leading-relaxed" style="color:rgb(var(--color-on-surface)/0.55)">
                {{ t.descripcion }}
              </p>
            }

            <!-- Días disponibles -->
            @if (t.diasDisponibles) {
              <div class="flex flex-wrap gap-1">
                @for (d of diasArray; track d.key) {
                  <span class="w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center"
                        [style.background]="esDiaActivo(t, d.key) ? 'rgb(var(--color-primary))' : 'rgb(var(--color-surface-2))'"
                        [style.color]="esDiaActivo(t, d.key) ? 'rgb(var(--color-on-primary))' : 'rgb(var(--color-on-surface)/0.3)'">
                    {{ d.label }}
                  </span>
                }
              </div>
            }

            <!-- Acciones -->
            <div class="flex gap-2 pt-1">
              <button (click)="abrirEditar(t)"
                      class="text-xs py-1 px-2 rounded-lg border inline-flex items-center gap-1"
                      style="border-color:rgb(var(--color-border));color:rgb(var(--color-on-surface)/0.7)">
                <iconify-icon icon="line-md:edit" width="14" height="14" style="color:currentColor"></iconify-icon> Editar
              </button>
              @if (t.activo) {
                <button (click)="desactivar(t)"
                        class="text-xs py-1 px-2 rounded-lg inline-flex items-center gap-1"
                        style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
                  <iconify-icon icon="tabler:x" width="14" height="14" style="color:currentColor"></iconify-icon> Desactivar
                </button>
              }
            </div>
          </div>
        }

        @if (!cargando() && listaFiltrada().length === 0) {
          <div class="card text-center py-14 sm:col-span-2 lg:col-span-3"
               style="color:rgb(var(--color-on-surface)/0.35)">
            <p class="mb-2 flex justify-center"><iconify-icon icon="tabler:soup" width="36" height="36" style="color:currentColor"></iconify-icon></p>
            <p>No hay planes de almuerzo registrados</p>
          </div>
        }
      </div>

      <app-pagination
        [total]="listaFiltrada().length"
        [pagina]="pagina()"
        [pageSize]="pageSize"
        (pageChange)="pagina.set($event)" />
    </div>

    <!-- ── MODAL CREAR / EDITAR ─────────────────────────────── -->
    @if (modal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
           (click)="cerrar()">
        <div class="card max-w-md w-full space-y-4 animate-pop max-h-[90vh] overflow-y-auto"
             (click)="$event.stopPropagation()">

          <div class="flex items-center justify-between">
            <h3 class="font-display font-bold text-lg inline-flex items-center gap-1.5" style="color:rgb(var(--color-on-surface))">
              @if (editandoId()) {
                <iconify-icon icon="line-md:edit" width="18" height="18" style="color:currentColor"></iconify-icon> Editar plan
              } @else {
                <iconify-icon icon="tabler:soup" width="18" height="18" style="color:currentColor"></iconify-icon> Nuevo plan de almuerzo
              }
            </h3>
            <button (click)="cerrar()" class="btn-ghost p-1">
              <iconify-icon icon="line-md:close" width="16" height="16" style="color:currentColor"></iconify-icon>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="input-label">Nombre *</label>
              <input [(ngModel)]="form.nombre" class="input text-sm"
                     placeholder="Ej: Plan Completo, Plan Básico..." maxlength="100">
            </div>

            <div>
              <label class="input-label">Precio mensual (Bs) *</label>
              <input [(ngModel)]="form.precioMensual" type="number" min="0" step="0.5"
                     class="input text-sm font-mono" placeholder="0.00">
            </div>

            <div>
              <label class="input-label">Descripción</label>
              <textarea [(ngModel)]="form.descripcion" class="input text-sm resize-none" rows="2"
                        placeholder="Descripción opcional del plan..." maxlength="250"></textarea>
            </div>

            <div>
              <label class="input-label">Días disponibles</label>
              <div class="flex flex-wrap gap-2 mt-1">
                @for (d of diasArray; track d.key) {
                  <button type="button"
                          (click)="toggleDia(d.key)"
                          class="w-9 h-9 rounded-xl text-xs font-bold transition-all"
                          [style.background]="formDiasSet.has(d.key) ? 'rgb(var(--color-primary))' : 'rgb(var(--color-surface-2))'"
                          [style.color]="formDiasSet.has(d.key) ? 'rgb(var(--color-on-primary))' : 'rgb(var(--color-on-surface)/0.45)'"
                          [style.outline]="formDiasSet.has(d.key) ? '2px solid rgb(var(--color-primary)/0.4)' : 'none'">
                    {{ d.label }}
                  </button>
                }
              </div>
              <p class="text-[11px] mt-1.5" style="color:rgb(var(--color-on-surface)/0.4)">
                {{ formDiasSet.size === 0 ? 'Sin restricción de días' : diasSeleccionadosTexto() }}
              </p>
            </div>
          </div>

          @if (errorModal()) {
            <p class="text-xs p-2.5 rounded-lg inline-flex items-center gap-1.5"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              <iconify-icon icon="tabler:alert-triangle" width="14" height="14" style="color:currentColor"></iconify-icon> {{ errorModal() }}
            </p>
          }

          <div class="flex gap-2 pt-1">
            <button (click)="cerrar()" class="btn-secondary flex-1 justify-center">Cancelar</button>
            <button (click)="guardar()" [disabled]="guardando()" class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else { Guardar }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class TiposAlmuerzoPensionadosComponent implements OnInit {
  lista       = signal<TipoAlmuerzo[]>([]);
  cargando    = signal(true);
  modal       = signal(false);
  editandoId  = signal<number | null>(null);
  guardando   = signal(false);
  errorModal  = signal('');

  busqueda    = '';
  pagina      = signal(1);
  readonly pageSize = 10;
  sortCol     = signal<string>('');
  sortDir     = signal<'asc'|'desc'>('asc');

  activos = computed(() => this.lista().filter(t => t.activo).length);

  listaFiltrada = computed(() => {
    let items = this.lista();
    const q = this.busqueda.trim().toLowerCase();
    if (q) items = items.filter(t =>
      t.nombre.toLowerCase().includes(q) ||
      (t.descripcion ?? '').toLowerCase().includes(q)
    );
    const col = this.sortCol();
    if (col) {
      const dir = this.sortDir() === 'asc' ? 1 : -1;
      items = [...items].sort((a, b) => {
        const va = (a as any)[col]; const vb = (b as any)[col];
        if (typeof va === 'string') return dir * va.localeCompare(vb ?? '');
        return dir * ((va ?? 0) - (vb ?? 0));
      });
    }
    return items;
  });

  listaFiltradaPaginada = computed(() => {
    const items = this.listaFiltrada();
    return items.slice((this.pagina() - 1) * this.pageSize, this.pagina() * this.pageSize);
  });

  diasArray = DIAS_SEMANA;
  formDiasSet = new Set<string>();

  form = {
    nombre: '',
    precioMensual: 0,
    descripcion: '',
  };

  constructor(private svc: TipoAlmuerzoPensionadosService, private toastSvc: ToastService) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.svc.listarTodos().subscribe({
      next: ts => { this.lista.set(ts); this.cargando.set(false); },
      error: () => this.cargando.set(false),
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

  abrirCrear(): void {
    this.editandoId.set(null);
    this.form = { nombre: '', precioMensual: 0, descripcion: '' };
    this.formDiasSet = new Set();
    this.errorModal.set('');
    this.modal.set(true);
  }

  abrirEditar(t: TipoAlmuerzo): void {
    this.editandoId.set(t.id);
    this.form = {
      nombre: t.nombre,
      precioMensual: t.precioMensual,
      descripcion: t.descripcion ?? '',
    };
    this.formDiasSet = t.diasDisponibles
      ? new Set(t.diasDisponibles.split(',').map(d => d.trim()))
      : new Set();
    this.errorModal.set('');
    this.modal.set(true);
  }

  cerrar(): void { this.modal.set(false); this.errorModal.set(''); }

  toggleDia(dia: string): void {
    if (this.formDiasSet.has(dia)) this.formDiasSet.delete(dia);
    else this.formDiasSet.add(dia);
    // forzar detección de cambios en el Set
    this.formDiasSet = new Set(this.formDiasSet);
  }

  diasSeleccionadosTexto(): string {
    const ordenados = DIAS_SEMANA
      .filter(d => this.formDiasSet.has(d.key))
      .map(d => d.key.charAt(0) + d.key.slice(1).toLowerCase());
    return ordenados.join(', ');
  }

  esDiaActivo(t: TipoAlmuerzo, dia: string): boolean {
    return !!t.diasDisponibles?.includes(dia);
  }

  guardar(): void {
    if (!this.form.nombre.trim()) {
      this.errorModal.set('El nombre es obligatorio.'); return;
    }
    if (this.form.precioMensual < 0) {
      this.errorModal.set('El precio no puede ser negativo.'); return;
    }

    const body: any = {
      nombre: this.form.nombre.trim(),
      precioMensual: this.form.precioMensual,
      descripcion: this.form.descripcion.trim() || null,
      diasDisponibles: this.formDiasSet.size > 0
        ? [...this.formDiasSet].join(',')
        : null,
    };

    this.guardando.set(true);
    const id = this.editandoId();
    const obs = id ? this.svc.actualizar(id, body) : this.svc.crear(body);

    obs.subscribe({
      next: t => {
        this.guardando.set(false);
        this.cerrar();
        this.lista.update(list =>
          id ? list.map(x => x.id === id ? t : x) : [...list, t]
        );
        this.toastSvc.success(id ? 'Plan actualizado' : 'Plan creado');
      },
      error: err => {
        this.guardando.set(false);
        this.errorModal.set(err?.error?.mensaje ?? 'Error al guardar');
      },
    });
  }

  desactivar(t: TipoAlmuerzo): void {
    if (!confirm(`¿Desactivar "${t.nombre}"? Los pensionados asignados a este plan seguirán activos.`)) return;
    this.svc.desactivar(t.id).subscribe({
      next: () => {
        this.lista.update(list => list.map(x => x.id === t.id ? { ...x, activo: false } : x));
        this.toastSvc.success('Plan desactivado');
      },
      error: err => this.toastSvc.error(err?.error?.mensaje ?? 'Error'),
    });
  }
}
