import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriaService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-categorias-insumo',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-5 animate-fade-up">
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Categorías de Insumos
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ categorias().length }} registros · Administra las categorías para organizar los insumos de cocina
          </p>
        </div>
        <div class="flex gap-2 w-full sm:w-auto">
          <input [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event); pagina.set(1)"
                 class="input w-full sm:w-48 text-sm" placeholder="Buscar categoría..."
                 maxlength="100">
          <button (click)="abrirCrearModal()" class="btn-primary text-sm py-2 px-3 whitespace-nowrap">
            + Nueva Categoría
          </button>
        </div>
      </div>

      <!-- Tabla de Categorías -->
      <div class="card p-0 overflow-hidden">
        <div class="table-wrapper" style="border:none;border-radius:0">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th class="cursor-pointer select-none" (click)="sortBy('nombre')">
                  Nombre {{ si('nombre') }}
                </th>
                <th>Descripción</th>
                <th class="cursor-pointer select-none" (click)="sortBy('activo')">
                  Estado {{ si('activo') }}
                </th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (cargando()) {
                @for (i of [1,2,3,4]; track i) {
                  <tr>
                    @for (j of [1,2,3,4,5]; track j) {
                      <td><div class="skeleton h-5 rounded"></div></td>
                    }
                  </tr>
                }
              }

              @for (cat of categoriasPaginadas(); track cat.id) {
                <tr [style.opacity]="cat.activo ? '1' : '0.5'">
                  <td class="font-mono text-xs">{{ cat.id }}</td>
                  <td>
                    <p class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">
                      {{ cat.nombre }}
                    </p>
                  </td>
                  <td class="text-xs text-on-surface/75">{{ cat.descripcion || 'Sin descripción' }}</td>
                  <td>
                    @if (cat.activo) {
                      <span class="badge-success text-[10px]">Activo</span>
                    } @else {
                      <span class="badge-danger text-[10px]">Inactivo</span>
                    }
                  </td>
                  <td>
                    <div class="flex gap-1.5">
                      <button (click)="abrirEditarModal(cat)" class="text-xs py-1 px-2 rounded-lg border border-border bg-surface hover:border-primary/50 text-on-surface/75 inline-flex items-center gap-1">
                        <iconify-icon icon="line-md:edit" width="14" height="14" style="color:currentColor"></iconify-icon>
                        Editar
                      </button>
                      @if (cat.activo) {
                        <button (click)="desactivarCategoria(cat)" class="text-xs py-1 px-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 inline-flex items-center gap-1">
                          <iconify-icon icon="line-md:minus-circle" width="14" height="14" style="color:currentColor"></iconify-icon>
                          Baja
                        </button>
                      } @else {
                        <button (click)="activarCategoria(cat)" class="text-xs py-1 px-2 rounded-lg bg-success/10 text-success border border-success/30 hover:bg-success/20 inline-flex items-center gap-1">
                          <iconify-icon icon="line-md:plus-circle" width="14" height="14" style="color:currentColor"></iconify-icon>
                          Alta
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }

              @if (!cargando() && categoriasFiltradas().length === 0) {
                <tr>
                  <td colspan="5" class="text-center py-12 text-on-surface/40">
                    <iconify-icon icon="tabler:tag" width="30" height="30" class="mb-2 inline-block" style="color:currentColor"></iconify-icon>
                    <p>No se encontraron categorías de insumos</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <app-pagination
        [total]="categoriasFiltradas().length"
        [pagina]="pagina()"
        [pageSize]="pageSize"
        (pageChange)="pagina.set($event)" />
    </div>

    <!-- Modal Formulario -->
    @if (modalAbierto()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
           (click)="cerrarModal()">
        <div class="card max-w-md w-full space-y-4 animate-fade-up"
             (click)="$event.stopPropagation()">

          <div class="flex items-center justify-between">
            <h3 class="font-display font-bold text-lg inline-flex items-center gap-2" style="color:rgb(var(--color-on-surface))">
              <iconify-icon [attr.icon]="modoEditar() ? 'line-md:edit' : 'tabler:tag'" width="20" height="20" style="color:currentColor"></iconify-icon>
              {{ modoEditar() ? 'Editar Categoría' : 'Registrar Nueva Categoría' }}
            </h3>
            <button (click)="cerrarModal()" class="btn-ghost p-1">
              <iconify-icon icon="line-md:close" width="16" height="16" style="color:currentColor"></iconify-icon>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="input-label">Nombre de la Categoría *</label>
              <input [(ngModel)]="formCat.nombre" class="input text-sm"
                     placeholder="Ej: Verduras, Carnes, Abarrotes" maxlength="100">
            </div>

            <div>
              <label class="input-label">Descripción</label>
              <textarea [(ngModel)]="formCat.descripcion" class="input text-sm h-20"
                        placeholder="Detalles de la categoría..." maxlength="250"></textarea>
            </div>

            @if (modoEditar()) {
              <label class="flex items-center gap-2 text-xs cursor-pointer select-none text-on-surface/85 pt-1">
                <input type="checkbox" [(ngModel)]="formCat.activo" class="rounded text-primary border-border w-4 h-4">
                La categoría está activa y disponible
              </label>
            }
          </div>

          @if (errorForm()) {
            <p class="text-xs p-2.5 rounded-lg inline-flex items-center gap-1.5" style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              <iconify-icon icon="tabler:alert-triangle" width="14" height="14" style="color:currentColor"></iconify-icon>
              {{ errorForm() }}
            </p>
          }

          <div class="flex gap-2 pt-2">
            <button (click)="cerrarModal()" class="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button (click)="guardarCategoria()" [disabled]="guardando()" class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else {
                Guardar Categoría
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CategoriasInsumoComponent implements OnInit {
  categorias   = signal<any[]>([]);
  cargando     = signal(true);
  busqueda     = signal('');

  modalAbierto = signal(false);
  modoEditar   = signal(false);
  idEditando   = signal<number | null>(null);
  guardando    = signal(false);
  errorForm    = signal('');

  pagina   = signal(1);
  readonly pageSize = 10;

  sortCol = signal<string>('');
  sortDir = signal<'asc' | 'desc'>('asc');

  formCat = {
    nombre: '',
    descripcion: '',
    activo: true
  };

  categoriasFiltradas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    let lista = !q ? this.categorias() : this.categorias().filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      (c.descripcion && c.descripcion.toLowerCase().includes(q))
    );
    const col = this.sortCol();
    if (col) {
      const dir = this.sortDir() === 'asc' ? 1 : -1;
      lista = [...lista].sort((a, b) => {
        const va = (a as any)[col]; const vb = (b as any)[col];
        if (typeof va === 'string') return dir * va.localeCompare(vb);
        return dir * ((va ?? 0) - (vb ?? 0));
      });
    }
    return lista;
  });

  categoriasPaginadas = computed(() => {
    const lista = this.categoriasFiltradas();
    return lista.slice((this.pagina() - 1) * this.pageSize, this.pagina() * this.pageSize);
  });

  constructor(
    private categoriaService: CategoriaService,
    private toastSvc: ToastService,
  ) {}

  ngOnInit(): void {
    this.cargar();
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
    this.categoriaService.listarCategoriasInsumoTodas().subscribe({
      next: cs => {
        this.categorias.set(cs);
        this.cargando.set(false);
      },
      error: () => {
        this.categoriaService.listarCategoriasInsumo().subscribe({
          next: cs => {
            this.categorias.set(cs);
            this.cargando.set(false);
          },
          error: () => this.cargando.set(false)
        });
      }
    });
  }

  abrirCrearModal(): void {
    this.modoEditar.set(false);
    this.idEditando.set(null);
    this.errorForm.set('');
    this.formCat = {
      nombre: '',
      descripcion: '',
      activo: true
    };
    this.modalAbierto.set(true);
  }

  abrirEditarModal(cat: any): void {
    this.modoEditar.set(true);
    this.idEditando.set(cat.id);
    this.errorForm.set('');
    this.formCat = {
      nombre: cat.nombre,
      descripcion: cat.descripcion || '',
      activo: cat.activo
    };
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.errorForm.set('');
  }

  guardarCategoria(): void {
    if (!this.formCat.nombre.trim()) {
      this.errorForm.set('El nombre de la categoría es obligatorio.');
      return;
    }

    this.guardando.set(true);
    this.errorForm.set('');

    const observer = {
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.toastSvc.success(this.modoEditar() ? 'Categoría actualizada exitosamente' : 'Categoría registrada exitosamente');
        this.cargar();
      },
      error: (err: any) => {
        this.guardando.set(false);
        this.errorForm.set(err?.error?.mensaje ?? 'Error al guardar la categoría.');
      }
    };

    if (this.modoEditar()) {
      this.categoriaService.actualizarCategoriaInsumo(this.idEditando()!, this.formCat).subscribe(observer);
    } else {
      this.categoriaService.crearCategoriaInsumo(this.formCat).subscribe(observer);
    }
  }

  desactivarCategoria(cat: any): void {
    if (confirm(`¿Está seguro de dar de baja la categoría "${cat.nombre}"?`)) {
      this.categoriaService.desactivarCategoriaInsumo(cat.id).subscribe({
        next: () => {
          this.toastSvc.success('Categoría dada de baja correctamente');
          this.cargar();
        },
        error: () => this.toastSvc.error('Error al dar de baja la categoría')
      });
    }
  }

  activarCategoria(cat: any): void {
    this.categoriaService.actualizarCategoriaInsumo(cat.id, {
      nombre: cat.nombre,
      descripcion: cat.descripcion || '',
      activo: true
    }).subscribe({
      next: () => {
        this.toastSvc.success('Categoría reactivada correctamente');
        this.cargar();
      },
      error: () => this.toastSvc.error('Error al reactivar la categoría')
    });
  }
}
