import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriaPlatoService } from '../../core/services/api.service';
import { CategoriaPlato } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-categorias-plato',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-5 animate-slide-up">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Categorías de Platos
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ categorias().length }} registros · Organiza el menú por categorías
          </p>
        </div>
        <div class="flex gap-2 w-full sm:w-auto">
          <input [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event); pagina.set(1)"
                 class="input w-full sm:w-48 text-sm" maxlength="100"
                 placeholder="Buscar categoría...">
          <button (click)="abrirModal()" class="btn-primary whitespace-nowrap">+ Nueva</button>
        </div>
      </div>

      <!-- Tarjetas de categorías -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        @if (cargando()) {
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="card animate-pulse h-24"></div>
          }
        }
        @for (cat of filtradaspaginadas(); track cat.id) {
          <div class="card flex flex-col gap-2" [style.opacity]="cat.activo ? '1' : '0.5'">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                <iconify-icon icon="tabler:tag" width="22" height="22" style="color:currentColor"></iconify-icon>
                <div>
                  <p class="font-bold text-sm" style="color:rgb(var(--color-on-surface))">{{ cat.nombre }}</p>
                  <p class="text-[11px]" style="color:rgb(var(--color-on-surface)/0.45)">
                    {{ cat.descripcion || 'Sin descripción' }}
                  </p>
                </div>
              </div>
              @if (cat.activo) {
                <span class="badge-success text-[10px] flex-shrink-0">Activo</span>
              } @else {
                <span class="badge-neutral text-[10px] flex-shrink-0">Inactivo</span>
              }
            </div>
            <div class="flex gap-1.5 mt-1">
              <button (click)="abrirEditar(cat)"
                      class="flex-1 text-xs py-1.5 rounded-lg border text-center inline-flex items-center justify-center gap-1"
                      style="border-color:rgb(var(--color-border));color:rgb(var(--color-on-surface)/0.7)">
                <iconify-icon icon="line-md:edit" width="14" height="14" style="color:currentColor"></iconify-icon> Editar
              </button>
              @if (cat.activo) {
                <button (click)="desactivar(cat)"
                        class="flex-1 text-xs py-1.5 rounded-lg text-center inline-flex items-center justify-center gap-1"
                        style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
                  <iconify-icon icon="line-md:close" width="14" height="14" style="color:currentColor"></iconify-icon> Baja
                </button>
              } @else {
                <button (click)="activar(cat)"
                        class="flex-1 text-xs py-1.5 rounded-lg text-center inline-flex items-center justify-center gap-1"
                        style="background:rgb(var(--color-success)/0.1);color:rgb(var(--color-success))">
                  <iconify-icon icon="tabler:check" width="14" height="14" style="color:currentColor"></iconify-icon> Alta
                </button>
              }
            </div>
          </div>
        }
        @if (!cargando() && filtradas().length === 0) {
          <div class="card col-span-full text-center py-12" style="color:rgb(var(--color-on-surface)/0.35)">
            <p class="mb-2 flex justify-center"><iconify-icon icon="tabler:tag" width="30" height="30" style="color:currentColor"></iconify-icon></p>
            <p>No se encontraron categorías</p>
          </div>
        }
      </div>

      <app-pagination
        [total]="filtradas().length"
        [pagina]="pagina()"
        [pageSize]="pageSize"
        (pageChange)="pagina.set($event)" />
    </div>

    <!-- Modal -->
    @if (modal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.5)" (click)="cerrar()">
        <div class="card max-w-sm w-full space-y-4 animate-pop" (click)="$event.stopPropagation()">

          <h3 class="font-display font-bold inline-flex items-center gap-1.5" style="color:rgb(var(--color-on-surface))">
            @if (editandoId()) {
              <iconify-icon icon="line-md:edit" width="18" height="18" style="color:currentColor"></iconify-icon>
              Editar Categoría
            } @else {
              <iconify-icon icon="tabler:tag" width="18" height="18" style="color:currentColor"></iconify-icon>
              Nueva Categoría de Plato
            }
          </h3>

          <div class="space-y-3">
            <div>
              <label class="input-label">Nombre *</label>
              <input [(ngModel)]="form.nombre" class="input text-sm"
                     placeholder="Ej: Almuerzos, Bebidas, Antojos de la tarde" maxlength="100">
            </div>
            <div>
              <label class="input-label">Descripción</label>
              <textarea [(ngModel)]="form.descripcion" class="input text-sm h-20"
                        placeholder="Descripción de la categoría..." maxlength="250"></textarea>
            </div>
            @if (editandoId()) {
              <label class="flex items-center gap-2 text-xs cursor-pointer select-none"
                     style="color:rgb(var(--color-on-surface)/0.8)">
                <input type="checkbox" [(ngModel)]="form.activo" class="w-4 h-4 rounded">
                Categoría activa y visible en el menú
              </label>
            }
          </div>

          @if (error()) {
            <p class="text-xs p-2 rounded-lg inline-flex items-center gap-1.5"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              <iconify-icon icon="tabler:alert-triangle" width="14" height="14" style="color:currentColor"></iconify-icon>
              {{ error() }}
            </p>
          }

          <div class="flex gap-2">
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
export class CategoriasplatoComponent implements OnInit {
  categorias  = signal<CategoriaPlato[]>([]);
  cargando    = signal(true);
  busqueda    = signal('');
  modal       = signal(false);
  editandoId  = signal<number | null>(null);
  guardando   = signal(false);
  error       = signal('');

  pagina      = signal(1);
  readonly pageSize = 10;
  sortCol     = signal<string>('');
  sortDir     = signal<'asc'|'desc'>('asc');

  form = { nombre: '', descripcion: '', activo: true };

  filtradas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    let lista = q
      ? this.categorias().filter(c =>
          c.nombre.toLowerCase().includes(q) ||
          (c.descripcion ?? '').toLowerCase().includes(q)
        )
      : this.categorias();
    const col = this.sortCol();
    if (col) {
      const dir = this.sortDir() === 'asc' ? 1 : -1;
      lista = [...lista].sort((a, b) => {
        const va = (a as any)[col]; const vb = (b as any)[col];
        if (typeof va === 'string') return dir * va.localeCompare(vb ?? '');
        return dir * ((va ?? 0) - (vb ?? 0));
      });
    }
    return lista;
  });

  filtradaspaginadas = computed(() => {
    const lista = this.filtradas();
    return lista.slice((this.pagina() - 1) * this.pageSize, this.pagina() * this.pageSize);
  });

  constructor(private svc: CategoriaPlatoService, private toastSvc: ToastService) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.svc.listarTodas().subscribe({
      next: cs => { this.categorias.set(cs); this.cargando.set(false); },
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

  abrirModal(): void {
    this.editandoId.set(null);
    this.form = { nombre: '', descripcion: '', activo: true };
    this.error.set('');
    this.modal.set(true);
  }

  abrirEditar(cat: CategoriaPlato): void {
    this.editandoId.set(cat.id);
    this.form = { nombre: cat.nombre, descripcion: cat.descripcion ?? '', activo: cat.activo ?? true };
    this.error.set('');
    this.modal.set(true);
  }

  cerrar(): void { this.modal.set(false); this.error.set(''); }

  guardar(): void {
    if (!this.form.nombre.trim()) { this.error.set('El nombre es obligatorio.'); return; }
    this.guardando.set(true);
    const id  = this.editandoId();
    const obs = id ? this.svc.actualizar(id, this.form) : this.svc.crear(this.form);
    obs.subscribe({
      next: c => {
        this.guardando.set(false);
        this.cerrar();
        this.categorias.update(list => id ? list.map(x => x.id === id ? c : x) : [...list, c]);
        this.toastSvc.success(id ? 'Categoría actualizada' : 'Categoría creada');
      },
      error: err => {
        this.guardando.set(false);
        this.error.set(err?.error?.mensaje ?? 'Error al guardar');
      },
    });
  }

  desactivar(cat: CategoriaPlato): void {
    if (!confirm(`¿Dar de baja la categoría "${cat.nombre}"?`)) return;
    this.svc.desactivar(cat.id).subscribe({
      next: () => {
        this.categorias.update(list => list.map(x => x.id === cat.id ? { ...x, activo: false } : x));
        this.toastSvc.success('Categoría dada de baja');
      },
      error: () => this.toastSvc.error('Error al dar de baja'),
    });
  }

  activar(cat: CategoriaPlato): void {
    this.svc.actualizar(cat.id, { nombre: cat.nombre, descripcion: cat.descripcion, activo: true }).subscribe({
      next: c => {
        this.categorias.update(list => list.map(x => x.id === cat.id ? c : x));
        this.toastSvc.success('Categoría reactivada');
      },
      error: () => this.toastSvc.error('Error al reactivar'),
    });
  }
}
