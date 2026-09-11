import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadoAdminService, RolService } from '../../core/services/api.service';
import { Empleado, Rol } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-5 animate-slide-up">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Usuarios del Sistema
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ empleados().length }} registros · Gestión de empleados y sus accesos
          </p>
        </div>
        <input [(ngModel)]="busqueda" (ngModelChange)="pagina.set(1)"
               class="input w-full sm:w-52 text-sm" maxlength="100"
               placeholder="Buscar usuario...">
      </div>

      <!-- Stats rápidos -->
      <div class="grid grid-cols-3 gap-3">
        <div class="stat-card">
          <p class="stat-value">{{ totalActivos() }}</p>
          <p class="stat-label">Activos</p>
        </div>
        <div class="stat-card">
          <p class="stat-value text-danger">{{ totalBloqueados() }}</p>
          <p class="stat-label">Bloqueados</p>
        </div>
        <div class="stat-card">
          <p class="stat-value">{{ empleados().length }}</p>
          <p class="stat-label">Total</p>
        </div>
      </div>

      <!-- Tabla -->
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th (click)="sortBy('nombre')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">Empleado <span class="text-xs opacity-40">{{ si('nombre') }}</span></div>
              </th>
              <th (click)="sortBy('username')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">Usuario <span class="text-xs opacity-40">{{ si('username') }}</span></div>
              </th>
              <th (click)="sortBy('cargo')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">Cargo / Turno <span class="text-xs opacity-40">{{ si('cargo') }}</span></div>
              </th>
              <th (click)="sortBy('rolNombre')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">Rol <span class="text-xs opacity-40">{{ si('rolNombre') }}</span></div>
              </th>
              <th (click)="sortBy('estado')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">Estado <span class="text-xs opacity-40">{{ si('estado') }}</span></div>
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (cargando()) {
              @for (i of [1,2,3,4,5]; track i) {
                <tr>@for (j of [1,2,3,4,5,6]; track j){
                  <td><div class="skeleton h-4 rounded"></div></td>
                }</tr>
              }
            }
            @for (e of filtradosPaginados(); track e.id) {
              <tr>
                <td>
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                         style="background:rgb(var(--color-primary)/0.15);color:rgb(var(--color-primary))">
                      {{ e.nombre.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <p class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">
                        {{ e.nombre }} {{ e.apellido }}
                      </p>
                      <p class="text-[11px]" style="color:rgb(var(--color-on-surface)/0.45)">CI: {{ e.ci }}</p>
                    </div>
                  </div>
                </td>
                <td>
                  @if (e.username) {
                    <span class="font-mono text-xs px-2 py-0.5 rounded-lg"
                          style="background:rgb(var(--color-surface-2));color:rgb(var(--color-on-surface)/0.8)">
                      {{ e.username }}
                    </span>
                  } @else {
                    <span class="text-xs" style="color:rgb(var(--color-on-surface)/0.35)">Sin usuario</span>
                  }
                </td>
                <td>
                  <p class="text-sm">{{ e.cargo }}</p>
                  <p class="text-[11px]" style="color:rgb(var(--color-on-surface)/0.45)">{{ turnoLabel(e.turno) }}</p>
                </td>
                <td>
                  <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style="background:rgb(var(--color-primary)/0.1);color:rgb(var(--color-primary))">
                    {{ e.rolNombre || '—' }}
                  </span>
                </td>
                <td><span [class]="badgeEstado(e.estado)">{{ estadoLabel(e.estado) }}</span></td>
                <td>
                  <div class="flex gap-1 flex-wrap">
                    @if (e.usuarioId) {
                      <button (click)="abrirCambiarRol(e)"
                              class="text-xs py-1 px-2 rounded-lg border inline-flex items-center gap-1"
                              style="border-color:rgb(var(--color-border));color:rgb(var(--color-on-surface)/0.7)">
                        <iconify-icon icon="tabler:shield" width="14" height="14" style="color:currentColor"></iconify-icon> Rol
                      </button>
                      <button (click)="abrirPassword(e)"
                              class="text-xs py-1 px-2 rounded-lg border inline-flex items-center gap-1"
                              style="border-color:rgb(var(--color-border));color:rgb(var(--color-on-surface)/0.7)">
                        <iconify-icon icon="tabler:lock" width="14" height="14" style="color:currentColor"></iconify-icon> Pass
                      </button>
                      @if (e.estado === 'BLOQUEADO') {
                        <button (click)="desbloquear(e)"
                                class="text-xs py-1 px-2 rounded-lg"
                                style="background:rgb(var(--color-success)/0.1);color:rgb(var(--color-success))">
                          🔓 Desbloquear
                        </button>
                      }
                    }
                  </div>
                </td>
              </tr>
            }
            @if (!cargando() && filtrados().length === 0) {
              <tr>
                <td colspan="6" class="text-center py-12" style="color:rgb(var(--color-on-surface)/0.35)">
                  <p class="mb-2 flex justify-center"><iconify-icon icon="tabler:users" width="36" height="36" style="color:currentColor"></iconify-icon></p>
                  <p>No se encontraron usuarios</p>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <app-pagination
          [total]="filtrados().length"
          [pagina]="pagina()"
          [pageSize]="pageSize"
          (pageChange)="pagina.set($event)" />
      </div>
    </div>

    <!-- Modal Cambiar Rol -->
    @if (modalRol()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.5)" (click)="modalRol.set(false)">
        <div class="card max-w-sm w-full space-y-4 animate-pop" (click)="$event.stopPropagation()">
          <h3 class="font-display font-bold inline-flex items-center gap-1.5" style="color:rgb(var(--color-on-surface))">
            <iconify-icon icon="tabler:shield" width="18" height="18" style="color:currentColor"></iconify-icon> Cambiar Rol — {{ empleadoActivo()?.nombre }}
          </h3>
          <div>
            <label class="input-label">Nuevo rol</label>
            <select [(ngModel)]="rolSeleccionado" class="input text-sm">
              <option value="">— Seleccionar rol —</option>
              @for (r of roles(); track r.id) {
                <option [value]="r.id">{{ r.nombre }}</option>
              }
            </select>
          </div>
          @if (errorModal()) {
            <p class="text-xs p-2 rounded-lg inline-flex items-center gap-1.5"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              <iconify-icon icon="tabler:alert-triangle" width="14" height="14" style="color:currentColor"></iconify-icon> {{ errorModal() }}
            </p>
          }
          <div class="flex gap-2">
            <button (click)="modalRol.set(false)" class="btn-secondary flex-1 justify-center">Cancelar</button>
            <button (click)="guardarRol()" [disabled]="guardando()" class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else { Aplicar }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal Cambiar Password -->
    @if (modalPass()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.5)" (click)="modalPass.set(false)">
        <div class="card max-w-sm w-full space-y-4 animate-pop" (click)="$event.stopPropagation()">
          <h3 class="font-display font-bold inline-flex items-center gap-1.5" style="color:rgb(var(--color-on-surface))">
            <iconify-icon icon="tabler:lock" width="18" height="18" style="color:currentColor"></iconify-icon> Cambiar Contraseña — {{ empleadoActivo()?.username }}
          </h3>
          <div>
            <label class="input-label">Nueva contraseña *</label>
            <input [(ngModel)]="nuevaPass" type="password" class="input text-sm"
                   placeholder="Mínimo 8 caracteres" maxlength="100">
          </div>
          @if (errorModal()) {
            <p class="text-xs p-2 rounded-lg inline-flex items-center gap-1.5"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              <iconify-icon icon="tabler:alert-triangle" width="14" height="14" style="color:currentColor"></iconify-icon> {{ errorModal() }}
            </p>
          }
          <div class="flex gap-2">
            <button (click)="modalPass.set(false)" class="btn-secondary flex-1 justify-center">Cancelar</button>
            <button (click)="guardarPassword()" [disabled]="guardando()" class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else { Cambiar }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class UsuariosComponent implements OnInit {
  empleados      = signal<Empleado[]>([]);
  roles          = signal<Rol[]>([]);
  cargando       = signal(true);
  busqueda       = '';
  modalRol       = signal(false);
  modalPass      = signal(false);
  empleadoActivo = signal<Empleado | null>(null);
  rolSeleccionado = '';
  nuevaPass       = '';
  guardando      = signal(false);
  errorModal     = signal('');

  pagina         = signal(1);
  readonly pageSize = 10;
  sortCol        = signal<string>('');
  sortDir        = signal<'asc'|'desc'>('asc');

  totalActivos    = computed(() => this.empleados().filter(e => e.estado === 'ACTIVO').length);
  totalBloqueados = computed(() => this.empleados().filter(e => e.estado === 'BLOQUEADO').length);

  filtrados = computed(() => {
    const q = this.busqueda.trim().toLowerCase();
    let lista = q
      ? this.empleados().filter(e =>
          `${e.nombre} ${e.apellido}`.toLowerCase().includes(q) ||
          (e.username ?? '').toLowerCase().includes(q) ||
          (e.cargo ?? '').toLowerCase().includes(q)
        )
      : this.empleados();
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

  filtradosPaginados = computed(() => {
    const lista = this.filtrados();
    return lista.slice((this.pagina() - 1) * this.pageSize, this.pagina() * this.pageSize);
  });

  constructor(
    private empSvc: EmpleadoAdminService,
    private rolSvc: RolService,
    private toastSvc: ToastService,
  ) {}

  ngOnInit(): void {
    this.empSvc.listar().subscribe({
      next: es => { this.empleados.set(es); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
    this.rolSvc.listar().subscribe({ next: rs => this.roles.set(rs), error: () => {} });
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

  abrirCambiarRol(e: Empleado): void {
    this.empleadoActivo.set(e);
    this.rolSeleccionado = '';
    this.errorModal.set('');
    this.modalRol.set(true);
  }

  abrirPassword(e: Empleado): void {
    this.empleadoActivo.set(e);
    this.nuevaPass = '';
    this.errorModal.set('');
    this.modalPass.set(true);
  }

  guardarRol(): void {
    if (!this.rolSeleccionado) { this.errorModal.set('Selecciona un rol.'); return; }
    const e = this.empleadoActivo()!;
    this.guardando.set(true);
    this.empSvc.asignarRol(e.usuarioId!, +this.rolSeleccionado).subscribe({
      next: () => {
        const rolNombre = this.roles().find(r => r.id === +this.rolSeleccionado)?.nombre ?? '';
        this.empleados.update(list => list.map(x => x.id === e.id ? { ...x, rolNombre } : x));
        this.guardando.set(false);
        this.modalRol.set(false);
        this.toastSvc.success('Rol actualizado');
      },
      error: err => { this.guardando.set(false); this.errorModal.set(err?.error?.mensaje ?? 'Error'); },
    });
  }

  guardarPassword(): void {
    if (this.nuevaPass.length < 8) {
      this.errorModal.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    const e = this.empleadoActivo()!;
    this.guardando.set(true);
    this.empSvc.cambiarPassword(e.usuarioId!, this.nuevaPass).subscribe({
      next: () => {
        this.guardando.set(false);
        this.modalPass.set(false);
        this.toastSvc.success('Contraseña actualizada');
      },
      error: err => { this.guardando.set(false); this.errorModal.set(err?.error?.mensaje ?? 'Error'); },
    });
  }

  desbloquear(e: Empleado): void {
    this.empSvc.desbloquear(e.usuarioId!).subscribe({
      next: () => {
        this.empleados.update(list => list.map(x => x.id === e.id ? { ...x, estado: 'ACTIVO' as any } : x));
        this.toastSvc.success('Usuario desbloqueado');
      },
      error: () => this.toastSvc.error('Error al desbloquear'),
    });
  }

  badgeEstado(estado: string): string {
    const m: Record<string, string> = {
      ACTIVO: 'badge-success', INACTIVO: 'badge-neutral',
      BLOQUEADO: 'badge-danger', ELIMINADO: 'badge-danger',
    };
    return m[estado] ?? 'badge-neutral';
  }

  estadoLabel(estado: string): string {
    const m: Record<string, string> = {
      ACTIVO: 'Activo', INACTIVO: 'Inactivo',
      BLOQUEADO: 'Bloqueado', ELIMINADO: 'Eliminado',
    };
    return m[estado] ?? estado;
  }

  turnoLabel(turno: string): string {
    const m: Record<string, string> = {
      MANANA: 'Mañana', TARDE: 'Tarde', NOCHE: 'Noche', COMPLETO: 'Completo',
    };
    return m[turno] ?? turno;
  }
}
