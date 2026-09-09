import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InsumoService, CategoriaService } from '../../core/services/api.service';
import { Insumo } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-insumos',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <div class="space-y-5 animate-fade-up">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Gestión de Insumos
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ insumos().length }} registros · Define y edita la lista de insumos base del almacén y cocina
          </p>
        </div>
        <div class="flex gap-2 w-full sm:w-auto">
          <input [(ngModel)]="busqueda" (ngModelChange)="pagina.set(1)" maxlength="100" class="input w-full sm:w-48 text-sm" placeholder="🔍 Buscar insumo...">
          <button (click)="abrirCrearModal()" class="btn-primary text-sm py-2 px-3 whitespace-nowrap">
            + Nuevo Insumo
          </button>
        </div>
      </div>

      <!-- Tabla de Insumos -->
      <div class="card p-0 overflow-hidden">
        <div class="table-wrapper" style="border:none;border-radius:0">
          <table>
            <thead>
              <tr>
                <th (click)="sortBy('codigo')" class="cursor-pointer select-none">
                  <div class="flex items-center gap-1">Código <span class="text-xs opacity-40">{{ si('codigo') }}</span></div>
                </th>
                <th (click)="sortBy('nombre')" class="cursor-pointer select-none">
                  <div class="flex items-center gap-1">Nombre <span class="text-xs opacity-40">{{ si('nombre') }}</span></div>
                </th>
                <th>Medida</th>
                <th>Categoría</th>
                <th>Precio Unit.</th>
                <th>Vencimiento</th>
                <th (click)="sortBy('activo')" class="cursor-pointer select-none">
                  <div class="flex items-center gap-1">Estado <span class="text-xs opacity-40">{{ si('activo') }}</span></div>
                </th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (cargando()) {
                @for (i of [1,2,3,4,5]; track i) {
                  <tr>
                    @for (j of [1,2,3,4,5,6,7,8]; track j) {
                      <td><div class="skeleton h-5 rounded"></div></td>
                    }
                  </tr>
                }
              }

              @for (insumo of insumosPaginados(); track insumo.id) {
                <tr [style.opacity]="insumo.activo ? '1' : '0.5'">
                  <td class="font-mono text-xs font-semibold">{{ insumo.codigo }}</td>
                  <td>
                    <p class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">
                      {{ insumo.nombre }}
                    </p>
                  </td>
                  <td class="text-xs">{{ insumo.unidadMedida }}</td>
                  <td class="text-xs">
                    <span class="badge-neutral">{{ insumo.categoria?.nombre || 'Sin categoría' }}</span>
                  </td>
                  <td class="font-mono text-xs">Bs {{ insumo.precioUnitario | number:'1.2-2' }}</td>
                  <td class="text-xs">
                    @if (insumo.perecedero) {
                      <span class="badge-warning text-[10px]">📆 Perecedero</span>
                    } @else {
                      <span class="badge-neutral text-[10px]" style="opacity: 0.6;">No perecedero</span>
                    }
                  </td>
                  <td>
                    @if (insumo.activo) {
                      <span class="badge-success text-[10px]">Activo</span>
                    } @else {
                      <span class="badge-danger text-[10px]">Inactivo</span>
                    }
                  </td>
                  <td>
                    <div class="flex gap-1.5">
                      <button (click)="abrirEditarModal(insumo)" class="text-xs py-1 px-2 rounded-lg border border-border bg-surface hover:border-primary/50 text-on-surface/75">
                        ✏️ Editar
                      </button>
                      @if (insumo.activo) {
                        <button (click)="desactivarInsumo(insumo)" class="text-xs py-1 px-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20">
                          ✕ Baja
                        </button>
                      } @else {
                        <button (click)="activarInsumo(insumo)" class="text-xs py-1 px-2 rounded-lg bg-success/10 text-success border border-success/30 hover:bg-success/20">
                          ✓ Alta
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }

              @if (!cargando() && insumosFiltrados().length === 0) {
                <tr>
                  <td colspan="8" class="text-center py-12 text-on-surface/40">
                    <p class="text-3xl mb-2">📦</p>
                    <p>No se encontraron insumos</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <app-pagination
        [total]="insumosFiltrados().length"
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
            <h3 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
              {{ modoEditar() ? '✏️ Editar Insumo' : '📦 Registrar Nuevo Insumo' }}
            </h3>
            <button (click)="cerrarModal()" class="btn-ghost p-1">✕</button>
          </div>

          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="input-label">Código *</label>
                <input [(ngModel)]="formInsumo.codigo" maxlength="20" class="input text-sm" placeholder="Ej: INS-001" [disabled]="modoEditar()">
              </div>
              <div>
                <label class="input-label">Unidad Medida *</label>
                <input [(ngModel)]="formInsumo.unidadMedida" maxlength="20" class="input text-sm" placeholder="Ej: Kg, Litro, Unid.">
              </div>
            </div>

            <div>
              <label class="input-label">Nombre del Insumo *</label>
              <input [(ngModel)]="formInsumo.nombre" maxlength="100" class="input text-sm" placeholder="Ej: Arroz Grano de Oro">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="input-label">Categoría *</label>
                <select [(ngModel)]="formInsumo.categoriaId" class="input text-sm">
                  <option value="">Seleccione...</option>
                  @for (cat of categorias(); track cat.id) {
                    <option [value]="cat.id">{{ cat.nombre }}</option>
                  }
                </select>
              </div>
              @if (!modoEditar()) {
                <div>
                  <label class="input-label">Precio Unitario Inicial (Bs)</label>
                  <input [(ngModel)]="formInsumo.precioUnitario" type="number" min="0" step="0.1" class="input text-sm" placeholder="0.00">
                </div>
              }
            </div>
            <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.4)">
              El stock se maneja por sucursal en la pantalla de Inventario — acá solo se define el catálogo.
            </p>

            <!-- Checkboxes booleanos -->
            <div class="flex flex-col gap-2 pt-2">
              <label class="flex items-center gap-2 text-xs cursor-pointer select-none text-on-surface/85">
                <input type="checkbox" [(ngModel)]="formInsumo.perecedero" class="rounded text-primary border-border w-4 h-4">
                El insumo es perecedero (tiene fecha de vencimiento)
              </label>

              @if (modoEditar()) {
                <label class="flex items-center gap-2 text-xs cursor-pointer select-none text-on-surface/85">
                  <input type="checkbox" [(ngModel)]="formInsumo.activo" class="rounded text-primary border-border w-4 h-4">
                  El insumo está activo y disponible
                </label>
              }
            </div>
          </div>

          @if (errorForm()) {
            <p class="text-xs p-2.5 rounded-lg" style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              ⚠️ {{ errorForm() }}
            </p>
          }

          <div class="flex gap-2 pt-2">
            <button (click)="cerrarModal()" class="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button (click)="guardarInsumo()" [disabled]="guardando()" class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else {
                Guardar Insumo
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class InsumosComponent implements OnInit {
  insumos      = signal<Insumo[]>([]);
  categorias   = signal<any[]>([]);
  cargando     = signal(true);
  busqueda     = '';

  pagina       = signal(1);
  readonly pageSize = 10;

  sortCol = signal<string>('');
  sortDir = signal<'asc' | 'desc'>('asc');

  modalAbierto = signal(false);
  modoEditar   = signal(false);
  idEditando   = signal<number | null>(null);
  guardando    = signal(false);
  errorForm    = signal('');

  formInsumo = {
    codigo: '',
    nombre: '',
    unidadMedida: '',
    precioUnitario: 0,
    perecedero: false,
    categoriaId: '' as string | number,
    activo: true
  };

  insumosFiltrados = computed(() => {
    const q = this.busqueda.trim().toLowerCase();
    let lista = q
      ? this.insumos().filter(i =>
          i.nombre.toLowerCase().includes(q) ||
          i.codigo.toLowerCase().includes(q) ||
          (i.categoria?.nombre && i.categoria.nombre.toLowerCase().includes(q))
        )
      : this.insumos();
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

  insumosPaginados = computed(() => {
    const lista = this.insumosFiltrados();
    return lista.slice((this.pagina() - 1) * this.pageSize, this.pagina() * this.pageSize);
  });

  constructor(
    private insumoService: InsumoService,
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
    this.insumoService.listarTodos().subscribe({
      next: is => {
        this.insumos.set(is);
        this.cargando.set(false);
      },
      error: () => {
        this.insumoService.listar().subscribe({
          next: is => {
            this.insumos.set(is);
            this.cargando.set(false);
          },
          error: () => this.cargando.set(false)
        });
      }
    });
  }

  cargarCategorias(): void {
    this.categoriaService.listarCategoriasInsumo().subscribe({
      next: cs => this.categorias.set(cs),
      error: () => {}
    });
  }

  abrirCrearModal(): void {
    this.modoEditar.set(false);
    this.idEditando.set(null);
    this.errorForm.set('');
    this.formInsumo = {
      codigo: '',
      nombre: '',
      unidadMedida: '',
      precioUnitario: 0,
      perecedero: false,
      categoriaId: '',
      activo: true
    };
    this.modalAbierto.set(true);
  }

  abrirEditarModal(insumo: Insumo): void {
    this.modoEditar.set(true);
    this.idEditando.set(insumo.id);
    this.errorForm.set('');
    this.formInsumo = {
      codigo: insumo.codigo,
      nombre: insumo.nombre,
      unidadMedida: insumo.unidadMedida,
      precioUnitario: insumo.precioUnitario,
      perecedero: insumo.perecedero,
      categoriaId: insumo.categoria?.id || '',
      activo: insumo.activo
    };
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.errorForm.set('');
  }

  guardarInsumo(): void {
    if (!this.formInsumo.codigo.trim() || !this.formInsumo.nombre.trim() || !this.formInsumo.unidadMedida.trim() || !this.formInsumo.categoriaId) {
      this.errorForm.set('Por favor, rellene todos los campos obligatorios (*)');
      return;
    }

    this.guardando.set(true);
    this.errorForm.set('');

    const body = {
      ...this.formInsumo,
      categoriaId: Number(this.formInsumo.categoriaId)
    };

    const observer = {
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.toastSvc.success(this.modoEditar() ? '✅ Insumo actualizado exitosamente' : '✅ Insumo registrado exitosamente');
        this.cargar();
      },
      error: (err: any) => {
        this.guardando.set(false);
        this.errorForm.set(err?.error?.mensaje ?? 'Error al guardar el insumo. Verifique los datos.');
      }
    };

    if (this.modoEditar()) {
      this.insumoService.actualizar(this.idEditando()!, body).subscribe(observer);
    } else {
      this.insumoService.crear(body).subscribe(observer);
    }
  }

  desactivarInsumo(insumo: Insumo): void {
    if (confirm(`¿Está seguro de dar de baja al insumo "${insumo.nombre}"?`)) {
      this.insumoService.desactivar(insumo.id).subscribe({
        next: () => {
          this.toastSvc.success('✕ Insumo dado de baja correctamente');
          this.cargar();
        },
        error: () => this.toastSvc.error('❌ Error al dar de baja el insumo')
      });
    }
  }

  activarInsumo(insumo: Insumo): void {
    this.insumoService.actualizar(insumo.id, {
      codigo: insumo.codigo,
      nombre: insumo.nombre,
      unidadMedida: insumo.unidadMedida,
      precioUnitario: insumo.precioUnitario,
      perecedero: insumo.perecedero,
      categoriaId: insumo.categoria?.id,
      activo: true
    }).subscribe({
      next: () => {
        this.toastSvc.success('✓ Insumo reactivado correctamente');
        this.cargar();
      },
      error: () => this.toastSvc.error('❌ Error al reactivar el insumo')
    });
  }
}
