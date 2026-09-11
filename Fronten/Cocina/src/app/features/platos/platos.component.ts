import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatoService, CategoriaService } from '../../core/services/api.service';
import { Plato, CategoriaPlato } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-platos',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-5 animate-fade-up">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Platos y Menú
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ platos().length }} registros · {{ totalActivos() }} platos activos
          </p>
        </div>
        <div class="flex gap-2 w-full sm:w-auto">
          <input [(ngModel)]="busqueda" (ngModelChange)="pagina.set(1)" maxlength="100" class="input w-full sm:w-48 text-sm" placeholder="Buscar plato...">
          <button (click)="abrirCrearModal()" class="btn-primary text-sm py-2 px-3 whitespace-nowrap">
            + Nuevo Plato
          </button>
        </div>
      </div>

      <!-- Filtros por tipo -->
      <div class="flex gap-2 flex-wrap">
        @for (t of tipos; track t.valor) {
          <button (click)="tipoFiltro.set(t.valor)"
                  class="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  [style.background]="tipoFiltro() === t.valor
                    ? 'rgb(var(--color-primary))' : 'rgb(var(--color-surface-2))'"
                  [style.color]="tipoFiltro() === t.valor
                    ? 'rgb(var(--color-on-primary))' : 'rgb(var(--color-on-surface)/0.6)'"
                  [style.border]="'1px solid rgb(var(--color-border))'">
            {{ t.emoji }} {{ t.label }}
          </button>
        }
      </div>

      <!-- Grid de platos -->
      @if (cargando()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          @for (i of [1,2,3,4,5,6,7,8]; track i) {
            <div class="skeleton h-48 rounded-xl2"></div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          @for (plato of platosPaginados(); track plato.id) {
            <div class="card flex flex-col justify-between space-y-3"
                 [style.opacity]="plato.activo ? '1' : '0.6'">

              <!-- Badge y Tipo -->
              <div class="flex items-start justify-between">
                <span class="text-3xl">{{ getTipoEmoji(plato.tipo) }}</span>
                <div class="flex items-center gap-1">
                  @if (!plato.activo) {
                    <span class="badge-danger text-[10px]">Inactivo</span>
                  } @else {
                    <span class="badge-success text-[10px]">Activo</span>
                  }
                </div>
              </div>

              <!-- Información principal -->
              <div>
                <p class="font-semibold text-sm leading-snug" style="color:rgb(var(--color-on-surface))">
                  {{ plato.nombre }}
                </p>
                <p class="text-[11px] font-mono" style="color:rgb(var(--color-on-surface)/0.4)">
                  {{ plato.codigo }}
                </p>
                <p class="text-xs mt-1 line-clamp-2" style="color:rgb(var(--color-on-surface)/0.6)">
                  {{ plato.descripcion || 'Sin descripción' }}
                </p>

                <!-- Categorías -->
                <div class="flex flex-wrap gap-1 mt-2">
                  @for (cat of plato.categorias; track cat.id) {
                    <span class="badge-neutral text-[9px] px-1.5 py-0.5">{{ cat.nombre }}</span>
                  }
                </div>
              </div>

              <!-- Precios y Costos -->
              <div class="pt-2" style="border-top:1px solid rgb(var(--color-border))">
                <div class="flex items-center justify-between text-xs mb-1">
                  <span style="color:rgb(var(--color-on-surface)/0.4)">Venta:</span>
                  <span class="font-bold font-display" style="color:rgb(var(--color-primary))">
                    Bs {{ plato.precioVenta | number:'1.2-2' }}
                  </span>
                </div>
                <div class="flex items-center justify-between text-xs mb-1">
                  <span style="color:rgb(var(--color-on-surface)/0.4)">Costo:</span>
                  <span class="font-mono text-on-surface/70">
                    Bs {{ plato.costoEstimado | number:'1.2-2' }}
                  </span>
                </div>
                <div class="flex items-center justify-between text-xs font-semibold">
                  <span style="color:rgb(var(--color-on-surface)/0.4)">Ganancia:</span>
                  <span [style.color]="(plato.precioVenta - plato.costoEstimado) > 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-danger))'">
                    Bs {{ (plato.precioVenta - plato.costoEstimado) | number:'1.2-2' }}
                  </span>
                </div>
              </div>

              <!-- Acciones -->
              <div class="flex gap-2 pt-2" style="border-top:1px dashed rgb(var(--color-border))">
                <button (click)="abrirEditarModal(plato)" class="btn-secondary text-xs py-1.5 px-2 flex-1 justify-center inline-flex items-center gap-1">
                  <iconify-icon icon="line-md:edit" width="14" height="14" style="color:currentColor"></iconify-icon> Editar
                </button>
                @if (plato.activo) {
                  <button (click)="desactivarPlato(plato)" class="btn-danger text-xs py-1.5 px-2 flex-1 justify-center bg-danger/10 text-danger hover:bg-danger/20 inline-flex items-center gap-1">
                    <iconify-icon icon="tabler:x" width="14" height="14" style="color:currentColor"></iconify-icon> Dar Baja
                  </button>
                } @else {
                  <button (click)="activarPlato(plato)" class="btn-secondary text-xs py-1.5 px-2 flex-1 justify-center bg-success/10 text-success border-success/30 hover:bg-success/20 inline-flex items-center gap-1">
                    <iconify-icon icon="tabler:check" width="14" height="14" style="color:currentColor"></iconify-icon> Reactivar
                  </button>
                }
              </div>
            </div>
          }
          @if (platosFiltrados().length === 0) {
            <div class="col-span-full text-center py-16 card" style="color:rgb(var(--color-on-surface)/0.35)">
              <iconify-icon icon="tabler:tools-kitchen-2" width="40" height="40" style="color:currentColor" class="mb-2 inline-block"></iconify-icon>
              <p>Sin platos que coincidan con la búsqueda o tipo seleccionado</p>
            </div>
          }
        </div>

        <app-pagination
          [total]="platosFiltrados().length"
          [pagina]="pagina()"
          [pageSize]="pageSize"
          (pageChange)="pagina.set($event)" />
      }
    </div>

    <!-- Modal de Formulario (Crear / Editar) -->
    @if (modalAbierto()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
           (click)="cerrarModal()">
        <div class="card max-w-md w-full space-y-4 animate-fade-up max-h-[90vh] overflow-y-auto"
             (click)="$event.stopPropagation()">

          <div class="flex items-center justify-between">
            <h3 class="font-display font-bold text-lg inline-flex items-center gap-1.5" style="color:rgb(var(--color-on-surface))">
              @if (modoEditar()) {
                <iconify-icon icon="line-md:edit" width="18" height="18" style="color:currentColor"></iconify-icon> Editar Plato
              } @else {
                <iconify-icon icon="tabler:tools-kitchen-2" width="18" height="18" style="color:currentColor"></iconify-icon> Registrar Nuevo Plato
              }
            </h3>
            <button (click)="cerrarModal()" class="btn-ghost p-1">
              <iconify-icon icon="tabler:x" width="16" height="16" style="color:currentColor"></iconify-icon>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="input-label">Código del Plato *</label>
              <input [(ngModel)]="formPlato.codigo" maxlength="20" class="input text-sm" placeholder="Ej: PL-001" [disabled]="modoEditar()">
            </div>
            <div>
              <label class="input-label">Nombre del Plato *</label>
              <input [(ngModel)]="formPlato.nombre" maxlength="100" class="input text-sm" placeholder="Ej: Silpancho Cochabambino">
            </div>
            <div>
              <label class="input-label">Descripción</label>
              <textarea [(ngModel)]="formPlato.descripcion" maxlength="250" class="input text-sm h-20" placeholder="Detalles de la preparación, guarniciones..."></textarea>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="input-label">Precio de Venta (Bs) *</label>
                <input [(ngModel)]="formPlato.precioVenta" type="number" min="0" step="0.5" class="input text-sm" placeholder="0.00">
              </div>
              <div>
                <label class="input-label">Tipo de Plato *</label>
                <select [(ngModel)]="formPlato.tipo" class="input text-sm">
                  <option value="">Seleccione...</option>
                  @for (t of tiposForm; track t.valor) {
                    <option [value]="t.valor">{{ t.emoji }} {{ t.label }}</option>
                  }
                </select>
              </div>
            </div>

            <!-- Categorías -->
            <div>
              <label class="input-label">Categorías</label>
              <div class="grid grid-cols-2 gap-2 p-3 bg-surface rounded-xl border border-border">
                @for (cat of categorias(); track cat.id) {
                  <label class="flex items-center gap-2 text-xs cursor-pointer select-none text-on-surface/85">
                    <input type="checkbox"
                           [checked]="formPlato.categoriaIds.includes(cat.id)"
                           (change)="toggleCategoria(cat.id)"
                           class="rounded text-primary border-border focus:ring-primary/40 w-4 h-4">
                    {{ cat.nombre }}
                  </label>
                }
                @if (categorias().length === 0) {
                  <p class="col-span-2 text-center text-xs py-2 text-on-surface/40">Cargando categorías...</p>
                }
              </div>
            </div>

            <!-- Estado Activo -->
            @if (modoEditar()) {
              <label class="flex items-center gap-2 text-xs cursor-pointer select-none text-on-surface/85 mt-2">
                <input type="checkbox" [(ngModel)]="formPlato.activo" class="rounded text-primary border-border w-4 h-4">
                El plato está activo y disponible para la venta
              </label>
            }
          </div>

          @if (errorForm()) {
            <p class="text-xs p-2.5 rounded-lg inline-flex items-center gap-1.5" style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              <iconify-icon icon="tabler:alert-triangle" width="14" height="14" style="color:currentColor"></iconify-icon> {{ errorForm() }}
            </p>
          }

          <div class="flex gap-2 pt-2">
            <button (click)="cerrarModal()" class="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button (click)="guardarPlato()" [disabled]="guardando()" class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else {
                Guardar Plato
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PlatosComponent implements OnInit {
  platos       = signal<Plato[]>([]);
  categorias   = signal<CategoriaPlato[]>([]);
  cargando     = signal(true);
  busqueda     = '';
  tipoFiltro   = signal('TODOS');

  pagina       = signal(1);
  readonly pageSize = 10;

  sortCol = signal<string>('');
  sortDir = signal<'asc' | 'desc'>('asc');

  modalAbierto = signal(false);
  modoEditar   = signal(false);
  idEditando   = signal<number | null>(null);
  guardando    = signal(false);
  errorForm    = signal('');

  tipos = [
    { valor: 'TODOS',    label: 'Todos',      emoji: '🍽️' },
    { valor: 'ALMUERZO', label: 'Almuerzos',  emoji: '🍲' },
    { valor: 'SOPA',     label: 'Sopas',      emoji: '🍵' },
    { valor: 'SEGUNDO',  label: 'Segundos',   emoji: '🥘' },
    { valor: 'ESPECIAL', label: 'Especiales', emoji: '⭐' },
    { valor: 'EMPANADA', label: 'Empanadas',  emoji: '🥟' },
    { valor: 'TUCUMANA', label: 'Tucumanas',  emoji: '🫔' },
    { valor: 'LICUADO',  label: 'Licuados',   emoji: '🥤' },
    { valor: 'REFRESCO', label: 'Refrescos',  emoji: '🧃' },
  ];

  tiposForm = [
    { valor: 'ALMUERZO', label: 'Almuerzo (combo fijo)',  emoji: '🍲' },
    { valor: 'SOPA',     label: 'Sopa (producción)',      emoji: '🍵' },
    { valor: 'SEGUNDO',  label: 'Segundo (producción)',   emoji: '🥘' },
    { valor: 'ESPECIAL', label: 'Especial (producción)',  emoji: '⭐' },
    { valor: 'EMPANADA', label: 'Empanada',               emoji: '🥟' },
    { valor: 'TUCUMANA', label: 'Tucumana',               emoji: '🫔' },
    { valor: 'LICUADO',  label: 'Licuado',                emoji: '🥤' },
    { valor: 'REFRESCO', label: 'Refresco',               emoji: '🧃' },
  ];

  formPlato = {
    codigo: '',
    nombre: '',
    descripcion: '',
    precioVenta: 0,
    costoEstimado: 0,
    tipo: '',
    activo: true,
    categoriaIds: [] as number[]
  };

  platosFiltrados = computed(() => {
    let lista = this.platos();
    if (this.tipoFiltro() !== 'TODOS') {
      lista = lista.filter(p => p.tipo === this.tipoFiltro());
    }
    const q = this.busqueda.trim().toLowerCase();
    if (q) {
      lista = lista.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(q))
      );
    }
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

  totalActivos = computed(() => this.platos().filter(p => p.activo).length);

  constructor(
    private platoService: PlatoService,
    private categoriaService: CategoriaService,
    private toastSvc: ToastService
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.cargarCategorias();
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

  cargar(): void {
    this.cargando.set(true);
    this.platoService.listarTodos().subscribe({
      next: ps => {
        this.platos.set(ps);
        this.cargando.set(false);
      },
      error: () => {
        // fallback a activos si falla el endpoint de todos
        this.platoService.listar().subscribe({
          next: ps => {
            this.platos.set(ps);
            this.cargando.set(false);
          },
          error: () => this.cargando.set(false)
        });
      }
    });
  }

  cargarCategorias(): void {
    this.categoriaService.listarCategoriasPlato().subscribe({
      next: cs => this.categorias.set(cs),
      error: () => {}
    });
  }

  getTipoEmoji(tipo: string): string {
    const map: Record<string, string> = {
      ALMUERZO:'🍲', SOPA:'🍵', SEGUNDO:'🥘',
      ESPECIAL:'⭐', EMPANADA:'🥟', TUCUMANA:'🫔',
      LICUADO:'🥤', REFRESCO:'🧃',
    };
    return map[tipo] ?? '🍽️';
  }

  abrirCrearModal(): void {
    this.modoEditar.set(false);
    this.idEditando.set(null);
    this.errorForm.set('');
    this.formPlato = {
      codigo: '',
      nombre: '',
      descripcion: '',
      precioVenta: 0,
      costoEstimado: 0,
      tipo: '',
      activo: true,
      categoriaIds: []
    };
    this.modalAbierto.set(true);
  }

  abrirEditarModal(plato: Plato): void {
    this.modoEditar.set(true);
    this.idEditando.set(plato.id);
    this.errorForm.set('');
    this.formPlato = {
      codigo: plato.codigo,
      nombre: plato.nombre,
      descripcion: plato.descripcion || '',
      precioVenta: plato.precioVenta,
      costoEstimado: plato.costoEstimado,
      tipo: plato.tipo,
      activo: plato.activo,
      categoriaIds: plato.categorias.map(c => c.id)
    };
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.errorForm.set('');
  }

  toggleCategoria(id: number): void {
    const idx = this.formPlato.categoriaIds.indexOf(id);
    if (idx > -1) {
      this.formPlato.categoriaIds.splice(idx, 1);
    } else {
      this.formPlato.categoriaIds.push(id);
    }
  }

  guardarPlato(): void {
    if (!this.formPlato.codigo.trim() || !this.formPlato.nombre.trim() || this.formPlato.precioVenta < 0 || !this.formPlato.tipo) {
      this.errorForm.set('Por favor, rellene todos los campos obligatorios (*)');
      return;
    }

    this.guardando.set(true);
    this.errorForm.set('');

    const observer = {
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.toastSvc.success(this.modoEditar() ? 'Plato actualizado exitosamente' : 'Plato registrado exitosamente');
        this.cargar();
      },
      error: (err: any) => {
        this.guardando.set(false);
        this.errorForm.set(err?.error?.mensaje ?? 'Error al guardar el plato. Verifique los datos.');
      }
    };

    if (this.modoEditar()) {
      this.platoService.actualizar(this.idEditando()!, this.formPlato).subscribe(observer);
    } else {
      this.platoService.crear(this.formPlato).subscribe(observer);
    }
  }

  desactivarPlato(plato: Plato): void {
    if (confirm(`¿Está seguro de dar de baja al plato "${plato.nombre}"? No aparecerá en el menú de ventas.`)) {
      this.platoService.desactivar(plato.id).subscribe({
        next: () => {
          this.toastSvc.success('Plato dado de baja correctamente');
          this.cargar();
        },
        error: () => this.toastSvc.error('Error al dar de baja el plato')
      });
    }
  }

  activarPlato(plato: Plato): void {
    this.platoService.actualizar(plato.id, {
      codigo: plato.codigo,
      nombre: plato.nombre,
      descripcion: plato.descripcion || '',
      precioVenta: plato.precioVenta,
      costoEstimado: plato.costoEstimado,
      tipo: plato.tipo,
      activo: true,
      categoriaIds: plato.categorias.map(c => c.id)
    }).subscribe({
      next: () => {
        this.toastSvc.success('Plato reactivado correctamente');
        this.cargar();
      },
      error: () => this.toastSvc.error('Error al reactivar el plato')
    });
  }
}
