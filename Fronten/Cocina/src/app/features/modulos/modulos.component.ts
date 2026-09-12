import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModuloMenuService } from '../../core/services/api.service';
import { ModuloMenuDto } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { ICONOS_DISPONIBLES } from '../../core/icons/app-icons.provider';

@Component({
  selector: 'app-modulos',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-5 animate-fade-up">
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Módulos y Menús
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ modulos().length }} registros · Administración de las pantallas del sistema, rutas de acceso y menú sidebar
          </p>
        </div>
        <div class="flex gap-2 w-full sm:w-auto">
          <input [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event); pagina.set(1)"
                 class="input w-full sm:w-48 text-sm" placeholder="Buscar módulo..."
                 maxlength="100">
          <button (click)="abrirCrearModal()" class="btn-primary text-sm py-2 px-3 whitespace-nowrap">
            + Nuevo Módulo
          </button>
        </div>
      </div>

      <!-- Tabla de Módulos -->
      <div class="card p-0 overflow-hidden">
        <div class="table-wrapper" style="border:none;border-radius:0">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th class="cursor-pointer select-none" (click)="sortBy('codigo')">
                  Código {{ si('codigo') }}
                </th>
                <th class="cursor-pointer select-none" (click)="sortBy('nombre')">
                  Nombre {{ si('nombre') }}
                </th>
                <th>Icono</th>
                <th>Ruta Frontend</th>
                <th class="cursor-pointer select-none" (click)="sortBy('sistema')">
                  Sistema {{ si('sistema') }}
                </th>
                <th>Módulo Padre</th>
                <th class="cursor-pointer select-none" (click)="sortBy('orden')">
                  Orden {{ si('orden') }}
                </th>
                <th class="cursor-pointer select-none" (click)="sortBy('activo')">
                  Estado {{ si('activo') }}
                </th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (cargando()) {
                @for (i of [1,2,3,4,5]; track i) {
                  <tr>
                    @for (j of [1,2,3,4,5,6,7,8,9,10]; track j) {
                      <td><div class="skeleton h-5 rounded"></div></td>
                    }
                  </tr>
                }
              }

              @for (mod of modulosPaginados(); track mod.id) {
                <tr [style.opacity]="mod.activo ? '1' : '0.5'">
                  <td class="font-mono text-xs">{{ mod.id }}</td>
                  <td class="font-mono text-xs font-semibold">{{ mod.codigo }}</td>
                  <td>
                    <p class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">
                      {{ mod.nombre }}
                    </p>
                  </td>
                  <td class="text-sm text-center">
                    @if (iconoValido(mod.icono)) {
                      <iconify-icon [attr.icon]="mod.icono" [attr.title]="mod.icono" width="20" height="20" class="inline-block" style="color:currentColor"></iconify-icon>
                    } @else {
                      <iconify-icon icon="tabler:tag" [attr.title]="mod.icono + ' (no reconocido)'" width="20" height="20" class="inline-block opacity-40" style="color:currentColor"></iconify-icon>
                    }
                  </td>
                  <td class="font-mono text-xs">{{ mod.ruta || '—' }}</td>
                  <td>
                    <span class="badge"
                          [class.badge-info]="mod.sistema === 'COCINA'"
                          [class.badge-success]="mod.sistema === 'VENTAS'"
                          [class.badge-warning]="mod.sistema === 'ADMIN'">
                      {{ mod.sistema }}
                    </span>
                  </td>
                  <td class="text-xs">
                    {{ getNombrePadre(mod.padreId) || '—' }}
                  </td>
                  <td class="font-mono text-xs">{{ mod.orden }}</td>
                  <td>
                    @if (mod.activo) {
                      <span class="badge-success text-[10px]">Activo</span>
                    } @else {
                      <span class="badge-danger text-[10px]">Inactivo</span>
                    }
                  </td>
                  <td>
                    <div class="flex gap-1.5">
                      <button (click)="abrirEditarModal(mod)" class="text-xs py-1 px-2 rounded-lg border border-border bg-surface hover:border-primary/50 text-on-surface/75 inline-flex items-center gap-1">
                        <iconify-icon icon="line-md:edit" width="14" height="14" style="color:currentColor"></iconify-icon> Editar
                      </button>
                      @if (mod.activo) {
                        <button (click)="desactivarModulo(mod)" class="text-xs py-1 px-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 inline-flex items-center gap-1">
                          <iconify-icon icon="line-md:close" width="14" height="14" style="color:currentColor"></iconify-icon> Baja
                        </button>
                      } @else {
                        <button (click)="activarModulo(mod)" class="text-xs py-1 px-2 rounded-lg bg-success/10 text-success border border-success/30 hover:bg-success/20 inline-flex items-center gap-1">
                          <iconify-icon icon="line-md:confirm-circle" width="14" height="14" style="color:currentColor"></iconify-icon> Alta
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }

              @if (!cargando() && modulosFiltrados().length === 0) {
                <tr>
                  <td colspan="10" class="text-center py-12 text-on-surface/40">
                    <iconify-icon icon="tabler:settings" width="36" height="36" class="inline-block mb-2 opacity-60" style="color:currentColor"></iconify-icon>
                    <p>No se encontraron módulos de menú</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <app-pagination
        [total]="modulosFiltrados().length"
        [pagina]="pagina()"
        [pageSize]="pageSize"
        (pageChange)="pagina.set($event)" />
    </div>

    <!-- Modal Formulario -->
    @if (modalAbierto()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
           (click)="cerrarModal()">
        <div class="card max-w-md w-full space-y-4 animate-fade-up max-h-[90vh] overflow-y-auto"
             (click)="$event.stopPropagation()">

          <div class="flex items-center justify-between">
            <h3 class="font-display font-bold text-lg inline-flex items-center gap-2" style="color:rgb(var(--color-on-surface))">
              <iconify-icon [attr.icon]="modoEditar() ? 'line-md:edit' : 'tabler:settings'" width="20" height="20" style="color:currentColor"></iconify-icon>
              {{ modoEditar() ? 'Editar Módulo' : 'Registrar Nuevo Módulo' }}
            </h3>
            <button (click)="cerrarModal()" class="btn-ghost p-1">
              <iconify-icon icon="line-md:close" width="16" height="16" style="color:currentColor"></iconify-icon>
            </button>
          </div>

          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="input-label">Código Único *</label>
                <input [(ngModel)]="formMod.codigo" class="input text-sm"
                       placeholder="Ej: MOD_REPORTES" [disabled]="modoEditar()" maxlength="20">
              </div>
              <div>
                <label class="input-label">Nombre del Menú *</label>
                <input [(ngModel)]="formMod.nombre" class="input text-sm"
                       placeholder="Ej: Reportes de Venta" maxlength="100">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="input-label">Ruta Frontend</label>
                <input [(ngModel)]="formMod.ruta" class="input text-sm"
                       placeholder="Ej: /admin/reportes" maxlength="200">
              </div>
              <div>
                <label class="input-label">Ícono (icon-sets.iconify.design)</label>
                <input [(ngModel)]="formMod.icono" class="input text-sm"
                       placeholder="Ej: tabler:chart-bar" maxlength="50">
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div class="col-span-2">
                <label class="input-label">Sistema *</label>
                <select [(ngModel)]="formMod.sistema" class="input text-sm">
                  <option value="">Seleccione...</option>
                  <option value="COCINA">COCINA</option>
                  <option value="VENTAS">VENTAS</option>
                  <option value="ADMIN">ADMINISTRACIÓN</option>
                </select>
              </div>
              <div>
                <label class="input-label">Orden *</label>
                <input [(ngModel)]="formMod.orden" type="number" min="0" class="input text-sm">
              </div>
            </div>

            <div>
              <label class="input-label">Módulo Padre</label>
              <select [(ngModel)]="formMod.padreId" class="input text-sm">
                <option value="">Ninguno (Módulo Raíz)</option>
                @for (padre of modulosPadre(); track padre.id) {
                  <option [value]="padre.id">[{{ padre.sistema }}] {{ padre.nombre }}</option>
                }
              </select>
            </div>

            @if (modoEditar()) {
              <label class="flex items-center gap-2 text-xs cursor-pointer select-none text-on-surface/85 pt-1">
                <input type="checkbox" [(ngModel)]="formMod.activo" class="rounded text-primary border-border w-4 h-4">
                El módulo está activo e incorporado en los roles autorizados
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
            <button (click)="guardarModulo()" [disabled]="guardando()" class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else {
                Guardar Módulo
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ModulosComponent implements OnInit {
  modulos      = signal<ModuloMenuDto[]>([]);
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

  formMod = {
    codigo: '',
    nombre: '',
    icono: '',
    ruta: '',
    orden: 0,
    sistema: '',
    padreId: '' as string | number,
    activo: true
  };

  modulosFiltrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    let lista = !q ? this.modulos() : this.modulos().filter(m =>
      m.nombre.toLowerCase().includes(q) ||
      m.codigo.toLowerCase().includes(q) ||
      (m.ruta && m.ruta.toLowerCase().includes(q)) ||
      (m.sistema && m.sistema.toLowerCase().includes(q))
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

  modulosPaginados = computed(() => {
    const lista = this.modulosFiltrados();
    return lista.slice((this.pagina() - 1) * this.pageSize, this.pagina() * this.pageSize);
  });

  modulosPadre = computed(() => {
    // Solo módulos sin padre para servir como categoría
    return this.modulos().filter(m => !m.padreId && m.activo && m.id !== this.idEditando());
  });

  constructor(
    private moduloService: ModuloMenuService,
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
    this.moduloService.listarGestion().subscribe({
      next: ms => {
        this.modulos.set(ms);
        this.cargando.set(false);
      },
      error: () => {
        this.moduloService.listarActivos().subscribe({
          next: ms => {
            this.modulos.set(ms);
            this.cargando.set(false);
          },
          error: () => this.cargando.set(false)
        });
      }
    });
  }

  getNombrePadre(padreId: number | null): string {
    if (!padreId) return '';
    return this.modulos().find(m => m.id === padreId)?.nombre || '';
  }

  iconoValido(icono: string): boolean {
    return ICONOS_DISPONIBLES.has(icono);
  }

  abrirCrearModal(): void {
    this.modoEditar.set(false);
    this.idEditando.set(null);
    this.errorForm.set('');
    this.formMod = {
      codigo: '',
      nombre: '',
      icono: '',
      ruta: '',
      orden: 0,
      sistema: '',
      padreId: '',
      activo: true
    };
    this.modalAbierto.set(true);
  }

  abrirEditarModal(mod: ModuloMenuDto): void {
    this.modoEditar.set(true);
    this.idEditando.set(mod.id);
    this.errorForm.set('');
    this.formMod = {
      codigo: mod.codigo,
      nombre: mod.nombre,
      icono: mod.icono || '',
      ruta: mod.ruta || '',
      orden: mod.orden,
      sistema: mod.sistema || '',
      padreId: mod.padreId || '',
      activo: mod.activo ?? true
    };
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.errorForm.set('');
  }

  guardarModulo(): void {
    if (!this.formMod.codigo.trim() || !this.formMod.nombre.trim() || !this.formMod.sistema) {
      this.errorForm.set('Por favor, rellene todos los campos obligatorios (*)');
      return;
    }

    this.guardando.set(true);
    this.errorForm.set('');

    const body: any = {
      codigo: this.formMod.codigo,
      nombre: this.formMod.nombre,
      icono: this.formMod.icono || null,
      ruta: this.formMod.ruta || null,
      orden: this.formMod.orden,
      sistema: this.formMod.sistema,
      activo: this.formMod.activo,
      padre: this.formMod.padreId ? { id: Number(this.formMod.padreId) } : null
    };

    const observer = {
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.toastSvc.success(this.modoEditar() ? 'Módulo actualizado exitosamente' : 'Módulo registrado exitosamente');
        this.cargar();
      },
      error: (err: any) => {
        this.guardando.set(false);
        this.errorForm.set(err?.error?.mensaje ?? 'Error al guardar el módulo.');
      }
    };

    if (this.modoEditar()) {
      this.moduloService.actualizar(this.idEditando()!, body).subscribe(observer);
    } else {
      this.moduloService.crear(body).subscribe(observer);
    }
  }

  desactivarModulo(mod: ModuloMenuDto): void {
    if (confirm(`¿Está seguro de dar de baja al módulo "${mod.nombre}"?`)) {
      this.moduloService.desactivar(mod.id).subscribe({
        next: () => {
          this.toastSvc.success('Módulo dado de baja correctamente');
          this.cargar();
        },
        error: () => this.toastSvc.error('Error al dar de baja el módulo')
      });
    }
  }

  activarModulo(mod: ModuloMenuDto): void {
    const body: any = {
      codigo: mod.codigo,
      nombre: mod.nombre,
      icono: mod.icono,
      ruta: mod.ruta,
      orden: mod.orden,
      sistema: mod.sistema,
      activo: true,
      padre: mod.padreId ? { id: mod.padreId } : null
    };

    this.moduloService.actualizar(mod.id, body).subscribe({
      next: () => {
        this.toastSvc.success('Módulo reactivado correctamente');
        this.cargar();
      },
      error: () => this.toastSvc.error('Error al reactivar el módulo')
    });
  }
}
