import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RolService, ModuloMenuService } from '../../core/services/api.service';
import { Rol, ModuloMenuDto } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <div class="space-y-5 animate-fade-up">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Roles y Permisos
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ roles().length }} registros · Define roles y asigna módulos de acceso al sistema
          </p>
        </div>
        <div class="flex gap-2 items-center flex-wrap">
          <input [(ngModel)]="busqueda" (ngModelChange)="pagina.set(1)"
                 class="input w-48 text-sm" placeholder="🔍 Buscar rol..." maxlength="100">
          <button (click)="abrirModal()" class="btn-primary">+ Nuevo rol</button>
        </div>
      </div>

      <!-- Lista de roles -->
      <div class="grid gap-3">
        @if (cargando()) {
          @for (i of [1,2,3]; track i) {
            <div class="card animate-pulse h-24"></div>
          }
        }
        @for (rol of rolesPaginados(); track rol.id) {
          <div class="card" [style.opacity]="rol.activo ? '1' : '0.55'">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                     style="background:rgb(var(--color-primary)/0.12)">🛡️</div>
                <div>
                  <p class="font-bold text-sm" style="color:rgb(var(--color-on-surface))">{{ rol.nombre }}</p>
                  <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">{{ rol.descripcion || 'Sin descripción' }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                @if (rol.activo) {
                  <span class="badge-success text-[10px]">Activo</span>
                } @else {
                  <span class="badge-danger text-[10px]">Inactivo</span>
                }
                <button (click)="abrirEditar(rol)"
                        class="text-xs py-1 px-2 rounded-lg border border-border bg-surface hover:border-primary/50 text-on-surface/75">
                  ✏️ Editar
                </button>
                @if (rol.activo) {
                  <button (click)="desactivar(rol)"
                          class="text-xs py-1 px-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20">
                    ✕ Baja
                  </button>
                }
              </div>
            </div>
            <!-- Módulos asignados -->
            @if (rol.modulos && rol.modulos.length > 0) {
              <div class="mt-3 flex flex-wrap gap-1.5">
                @for (m of rol.modulos; track m.id) {
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style="background:rgb(var(--color-primary)/0.1);color:rgb(var(--color-primary))">
                    {{ m.nombre }}
                  </span>
                }
              </div>
            } @else {
              <p class="mt-2 text-xs" style="color:rgb(var(--color-on-surface)/0.35)">Sin módulos asignados</p>
            }
          </div>
        }
        @if (!cargando() && rolesFiltrados().length === 0) {
          <div class="card text-center py-12" style="color:rgb(var(--color-on-surface)/0.35)">
            <p class="text-3xl mb-2">🛡️</p>
            <p>No hay roles registrados</p>
          </div>
        }
      </div>

      <app-pagination
        [total]="rolesFiltrados().length"
        [pagina]="pagina()"
        [pageSize]="pageSize"
        (pageChange)="pagina.set($event)" />
    </div>

    <!-- Modal -->
    @if (modal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
           (click)="cerrar()">
        <div class="card max-w-lg w-full space-y-4 animate-fade-up max-h-[90vh] overflow-y-auto"
             (click)="$event.stopPropagation()">

          <div class="flex items-center justify-between">
            <h3 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
              {{ editandoId() ? '✏️ Editar Rol' : '🛡️ Nuevo Rol' }}
            </h3>
            <button (click)="cerrar()" class="btn-ghost p-1">✕</button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="input-label">Nombre del rol *</label>
              <input [(ngModel)]="form.nombre" class="input text-sm"
                     placeholder="Ej: CAJERO, JEFE_COCINA" maxlength="80">
            </div>
            <div>
              <label class="input-label">Descripción</label>
              <input [(ngModel)]="form.descripcion" class="input text-sm"
                     placeholder="Descripción del rol..." maxlength="250">
            </div>

            <!-- Módulos -->
            <div>
              <label class="input-label mb-2 block">Módulos de acceso</label>
              @if (cargandoModulos()) {
                <div class="skeleton h-32 rounded-xl"></div>
              } @else {
                <div class="rounded-xl border border-border p-3 space-y-1.5 max-h-56 overflow-y-auto"
                     style="background:rgb(var(--color-surface))">
                  @for (mod of modulos(); track mod.id) {
                    <label class="flex items-center gap-2 text-xs cursor-pointer select-none py-1"
                           style="color:rgb(var(--color-on-surface)/0.85)">
                      <input type="checkbox"
                             [checked]="moduloSeleccionado(mod.id)"
                             (change)="toggleModulo(mod.id)"
                             class="rounded border-border w-4 h-4 flex-shrink-0">
                      <span class="font-semibold">{{ mod.nombre }}</span>
                      <span style="color:rgb(var(--color-on-surface)/0.4)">— {{ mod.codigo }}</span>
                    </label>
                  }
                </div>
                <p class="text-[10px] mt-1" style="color:rgb(var(--color-on-surface)/0.4)">
                  {{ modulosSeleccionados().size }} módulo(s) seleccionado(s)
                </p>
              }
            </div>
          </div>

          @if (error()) {
            <p class="text-xs p-2.5 rounded-lg"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              ⚠️ {{ error() }}
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
export class RolesComponent implements OnInit {
  roles            = signal<Rol[]>([]);
  modulos          = signal<ModuloMenuDto[]>([]);
  cargando         = signal(true);
  cargandoModulos  = signal(true);
  modal            = signal(false);
  editandoId       = signal<number | null>(null);
  guardando        = signal(false);
  error            = signal('');
  busqueda         = '';
  modulosSeleccionados = signal<Set<number>>(new Set());

  pagina   = signal(1);
  readonly pageSize = 10;

  sortCol = signal<string>('');
  sortDir = signal<'asc' | 'desc'>('asc');

  form = { nombre: '', descripcion: '' };

  rolesFiltrados = computed(() => {
    let lista = this.roles();
    const q = this.busqueda.trim().toLowerCase();
    if (q) lista = lista.filter(r =>
      r.nombre.toLowerCase().includes(q) ||
      (r.descripcion ?? '').toLowerCase().includes(q)
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

  rolesPaginados = computed(() => {
    const lista = this.rolesFiltrados();
    return lista.slice((this.pagina() - 1) * this.pageSize, this.pagina() * this.pageSize);
  });

  moduloSeleccionado(id: number): boolean {
    return this.modulosSeleccionados().has(id);
  }

  constructor(
    private rolSvc: RolService,
    private moduloSvc: ModuloMenuService,
    private toastSvc: ToastService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.cargarModulos();
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
    this.rolSvc.listar().subscribe({
      next: rs => { this.roles.set(rs); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
  }

  cargarModulos(): void {
    this.cargandoModulos.set(true);
    this.moduloSvc.listarActivos().subscribe({
      next: ms => { this.modulos.set(ms); this.cargandoModulos.set(false); },
      error: () => this.cargandoModulos.set(false),
    });
  }

  toggleModulo(id: number): void {
    this.modulosSeleccionados.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  abrirModal(): void {
    this.editandoId.set(null);
    this.form = { nombre: '', descripcion: '' };
    this.modulosSeleccionados.set(new Set());
    this.error.set('');
    this.modal.set(true);
  }

  abrirEditar(rol: Rol): void {
    this.editandoId.set(rol.id);
    this.form = { nombre: rol.nombre, descripcion: rol.descripcion ?? '' };
    this.modulosSeleccionados.set(new Set((rol.modulos ?? []).map(m => m.id)));
    this.error.set('');
    this.modal.set(true);
  }

  cerrar(): void { this.modal.set(false); this.error.set(''); }

  guardar(): void {
    if (!this.form.nombre.trim()) { this.error.set('El nombre del rol es obligatorio.'); return; }
    this.guardando.set(true);
    const body = {
      nombre: this.form.nombre.trim().toUpperCase(),
      descripcion: this.form.descripcion,
      moduloIds: Array.from(this.modulosSeleccionados()),
    };
    const id = this.editandoId();
    const obs = id ? this.rolSvc.actualizar(id, body) : this.rolSvc.crear(body);
    obs.subscribe({
      next: r => {
        this.guardando.set(false);
        this.cerrar();
        this.roles.update(list => id ? list.map(x => x.id === id ? r : x) : [...list, r]);
        this.toastSvc.success(id ? '✅ Rol actualizado' : '✅ Rol creado');
      },
      error: err => {
        this.guardando.set(false);
        this.error.set(err?.error?.mensaje ?? 'Error al guardar');
      },
    });
  }

  desactivar(rol: Rol): void {
    if (!confirm(`¿Desactivar el rol "${rol.nombre}"?`)) return;
    this.rolSvc.desactivar(rol.id).subscribe({
      next: () => {
        this.roles.update(list => list.map(r => r.id === rol.id ? { ...r, activo: false } : r));
        this.toastSvc.success('✕ Rol desactivado');
      },
      error: err => this.toastSvc.error(err?.error?.mensaje ?? '❌ Error al desactivar'),
    });
  }
}
