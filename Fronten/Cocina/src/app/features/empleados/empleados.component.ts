import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Empleado, Rol } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';

interface EmpleadoForm {
  nombre: string;
  apellido: string;
  ci: string;
  telefono: string;
  correo: string;
  cargo: string;
  turno: string;
  fechaIngreso: string;
  sucursalId: number | null;
  rolId: number | null;
  usernamePersonalizado: string;
  passwordInicial: string;
}

@Component({
  selector: 'app-empleados',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-5 animate-fade-up">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold"
              style="color:rgb(var(--color-on-surface))">Empleados</h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ empleados().length }} registros · Creación de usuario automática
          </p>
        </div>
        <button (click)="abrirModal()" class="btn-primary"
                *ngIf="puedeCrear()">
          + Nuevo empleado
        </button>
      </div>

      <!-- Filtros -->
      <div class="flex gap-3 flex-wrap">
        <input [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event); pagina.set(1)" class="input w-48 text-sm"
               placeholder="Buscar nombre o CI..." maxlength="100">
        <select [(ngModel)]="filtroTurno" (ngModelChange)="pagina.set(1)" class="input w-40 text-sm">
          <option value="">Todos los turnos</option>
          <option value="MANANA">Mañana</option>
          <option value="TARDE">Tarde</option>
          <option value="NOCHE">Noche</option>
          <option value="COMPLETO">Completo</option>
        </select>
      </div>

      <!-- Tabla -->
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th class="cursor-pointer select-none" (click)="sortBy('nombre')">
                Empleado {{ si('nombre') }}
              </th>
              <th class="cursor-pointer select-none" (click)="sortBy('ci')">
                CI {{ si('ci') }}
              </th>
              <th class="cursor-pointer select-none" (click)="sortBy('cargo')">
                Cargo {{ si('cargo') }}
              </th>
              <th>Turno</th>
              <th>Usuario sistema</th>
              <th class="cursor-pointer select-none" (click)="sortBy('estado')">
                Estado {{ si('estado') }}
              </th>
              <th *ngIf="puedeCrear()">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (cargando()) {
              @for (i of [1,2,3,4]; track i) {
                <tr>
                  @for (j of [1,2,3,4,5,6]; track j) {
                    <td><div class="skeleton h-4 rounded"></div></td>
                  }
                </tr>
              }
            }
            @for (e of empleadosPaginados(); track e.id) {
              <tr>
                <td>
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center
                                text-sm font-bold flex-shrink-0"
                         style="background:rgb(var(--color-primary)/0.15);
                                color:rgb(var(--color-primary))">
                      {{ e.nombre.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <p class="font-semibold text-sm"
                         style="color:rgb(var(--color-on-surface))">
                        {{ e.nombre }} {{ e.apellido }}
                      </p>
                      <p class="text-xs"
                         style="color:rgb(var(--color-on-surface)/0.4)">
                        {{ e.correo }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="font-mono text-sm">{{ e.ci }}</td>
                <td class="text-sm">{{ e.cargo }}</td>
                <td>
                  <span class="badge-neutral">{{ getTurnoLabel(e.turno) }}</span>
                </td>
                <td class="font-mono text-xs"
                    style="color:rgb(var(--color-on-surface)/0.5)">
                  {{ getUsername(e) || '—' }}
                </td>
                <td>
                  <span [class]="e.estado === 'ACTIVO' ? 'badge-success' : 'badge-neutral'">
                    {{ e.estado }}
                  </span>
                </td>
                <td *ngIf="puedeCrear()">
                  <div class="flex gap-1">
                    <button (click)="editarEmpleado(e)"
                            class="text-xs py-1 px-2 rounded-lg transition-all"
                            style="background:rgb(var(--color-primary)/0.1);
                                   color:rgb(var(--color-primary))">
                      Editar
                    </button>
                    <button (click)="cambiarRol(e)"
                            class="text-xs py-1 px-2 rounded-lg transition-all"
                            style="background:rgb(var(--color-info)/0.1);
                                   color:rgb(var(--color-info))">
                      Rol
                    </button>
                    <button (click)="desactivar(e)"
                            *ngIf="e.estado === 'ACTIVO'"
                            class="text-xs py-1 px-2 rounded-lg transition-all"
                            style="background:rgb(var(--color-danger)/0.1);
                                   color:rgb(var(--color-danger))">
                      Desactivar
                    </button>
                  </div>
                </td>
              </tr>
            }
            @if (!cargando() && empleadosFiltrados().length === 0) {
              <tr>
                <td colspan="7" class="text-center py-10"
                    style="color:rgb(var(--color-on-surface)/0.35)">
                  Sin empleados registrados
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <app-pagination
        [total]="empleadosFiltrados().length"
        [pagina]="pagina()"
        [pageSize]="pageSize"
        (pageChange)="pagina.set($event)" />
    </div>

    <!-- Modal crear/editar empleado -->
    @if (modal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.6)"
           (click)="cerrarModal()">
        <div class="card max-w-2xl w-full animate-fade-up max-h-[90vh] overflow-y-auto"
             (click)="$event.stopPropagation()">

          <div class="flex items-center justify-between mb-5">
            <h3 class="font-display font-bold text-lg inline-flex items-center gap-2"
                style="color:rgb(var(--color-on-surface))">
              <iconify-icon [attr.icon]="editando() ? 'line-md:edit' : 'tabler:id-badge'" width="20" height="20" style="color:currentColor"></iconify-icon>
              {{ editando() ? 'Editar empleado' : 'Nuevo empleado' }}
            </h3>
            <button (click)="cerrarModal()" class="btn-ghost p-1 text-xl">
              <iconify-icon icon="line-md:close" width="18" height="18" style="color:currentColor"></iconify-icon>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

            <!-- Nombre -->
            <div>
              <label class="input-label">Nombre *</label>
              <input [(ngModel)]="form.nombre" class="input text-sm"
                     placeholder="Juan" maxlength="100">
            </div>
            <div>
              <label class="input-label">Apellido *</label>
              <input [(ngModel)]="form.apellido" class="input text-sm"
                     placeholder="Pérez" maxlength="100">
            </div>

            <!-- CI -->
            <div>
              <label class="input-label">Cédula de identidad *</label>
              <input [(ngModel)]="form.ci" class="input text-sm"
                     placeholder="12345678" maxlength="20">
            </div>
            <div>
              <label class="input-label">Teléfono</label>
              <input [(ngModel)]="form.telefono" class="input text-sm"
                     type="tel" placeholder="79xxxxxx" maxlength="15">
            </div>

            <!-- Correo -->
            <div class="md:col-span-2">
              <label class="input-label">Correo electrónico</label>
              <input [(ngModel)]="form.correo" class="input text-sm"
                     type="email" placeholder="juan@ejemplo.com" maxlength="150">
            </div>

            <!-- Cargo -->
            <div>
              <label class="input-label">Cargo *</label>
              <input [(ngModel)]="form.cargo" class="input text-sm"
                     placeholder="Cocinero, Cajero, etc." maxlength="80">
            </div>

            <!-- Turno -->
            <div>
              <label class="input-label">Turno *</label>
              <select [(ngModel)]="form.turno" class="input text-sm">
                <option value="MANANA">Mañana</option>
                <option value="TARDE">Tarde</option>
                <option value="NOCHE">Noche</option>
                <option value="COMPLETO">Completo</option>
              </select>
            </div>

            <!-- Fecha ingreso -->
            <div>
              <label class="input-label">Fecha de ingreso *</label>
              <input [(ngModel)]="form.fechaIngreso" class="input text-sm"
                     type="date">
            </div>

            <!-- Sucursal -->
            <div>
              <label class="input-label">Sucursal *</label>
              <select [(ngModel)]="form.sucursalId" class="input text-sm">
                <option [value]="null">Seleccionar...</option>
                @for (s of sucursales(); track s.id) {
                  <option [value]="s.id">{{ s.nombre }}</option>
                }
              </select>
            </div>

            <!-- Rol -->
            <div>
              <label class="input-label">Rol del sistema *</label>
              <select [(ngModel)]="form.rolId" class="input text-sm">
                <option [value]="null">Seleccionar rol...</option>
                @for (r of roles(); track r.id) {
                  <option [value]="r.id">{{ r.nombre }}</option>
                }
              </select>
              <p class="text-xs mt-1" style="color:rgb(var(--color-on-surface)/0.4)">
                El rol define a qué módulos accede el empleado
              </p>
            </div>

            <!-- Separador usuario -->
            @if (!editando()) {
              <div class="md:col-span-2 mt-2">
                <div class="h-px" style="background:rgb(var(--color-border))"></div>
                <p class="text-xs mt-3 mb-1 font-semibold uppercase tracking-wider"
                   style="color:rgb(var(--color-on-surface)/0.4)">
                  Acceso al sistema (se crea automáticamente)
                </p>
              </div>

              <!-- Username -->
              <div>
                <label class="input-label">
                  Username personalizado
                  <span style="color:rgb(var(--color-on-surface)/0.35)">
                    (opcional)
                  </span>
                </label>
                <input [(ngModel)]="form.usernamePersonalizado"
                       class="input text-sm font-mono"
                       placeholder="Auto: nombre.apellido" maxlength="50">
                <p class="text-xs mt-1"
                   style="color:rgb(var(--color-on-surface)/0.35)">
                  Si está vacío se genera como
                  <strong>{{ previewUsername() }}</strong>
                </p>
              </div>

              <!-- Password -->
              <div>
                <label class="input-label">Contraseña inicial *</label>
                <input [(ngModel)]="form.passwordInicial" class="input text-sm"
                       type="password" placeholder="Mínimo 6 caracteres" maxlength="100">
              </div>
            }
          </div>

          @if (errorModal()) {
            <div class="mt-4 p-3 rounded-xl text-sm"
                 style="background:rgb(var(--color-danger)/0.1);
                        color:rgb(var(--color-danger));
                        border:1px solid rgb(var(--color-danger)/0.3)">
              {{ errorModal() }}
            </div>
          }

          <div class="flex gap-2 mt-5">
            <button (click)="cerrarModal()" class="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button (click)="guardar()" [disabled]="guardando()"
                    class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30
                             border-t-white animate-spin inline-block"></span>
                Guardando...
              } @else {
                {{ editando() ? 'Actualizar' : 'Crear empleado y usuario' }}
              }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal cambiar rol -->
    @if (modalRol()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.6)"
           (click)="modalRol.set(false)">
        <div class="card max-w-sm w-full animate-fade-up"
             (click)="$event.stopPropagation()">
          <h3 class="font-display font-bold mb-4 inline-flex items-center gap-2"
              style="color:rgb(var(--color-on-surface))">
            <iconify-icon icon="tabler:shield" width="18" height="18" style="color:currentColor"></iconify-icon>
            Cambiar rol — {{ empleadoSeleccionado()?.nombre }}
            {{ empleadoSeleccionado()?.apellido }}
          </h3>
          <div class="space-y-2 mb-4">
            @for (r of roles(); track r.id) {
              <button (click)="confirmarCambioRol(r.id)"
                      class="w-full text-left px-4 py-3 rounded-xl transition-all"
                      style="background:rgb(var(--color-surface));
                             border:1px solid rgb(var(--color-border))">
                <p class="font-semibold text-sm"
                   style="color:rgb(var(--color-on-surface))">
                  {{ r.nombre }}
                </p>
                <p class="text-xs mt-0.5"
                   style="color:rgb(var(--color-on-surface)/0.4)">
                  {{ r.descripcion }}
                </p>
              </button>
            }
          </div>
          <button (click)="modalRol.set(false)" class="btn-secondary w-full justify-center">
            Cancelar
          </button>
        </div>
      </div>
    }
  `,
})
export class EmpleadosComponent implements OnInit {

  empleados        = signal<any[]>([]);
  roles            = signal<Rol[]>([]);
  sucursales       = signal<any[]>([]);
  usuariosMap      = signal<Record<number, string>>({});
  cargando         = signal(true);
  modal            = signal(false);
  modalRol         = signal(false);
  editando         = signal(false);
  guardando        = signal(false);
  errorModal       = signal('');
  busqueda         = signal('');
  filtroTurno      = '';
  empleadoSeleccionado = signal<any>(null);

  pagina   = signal(1);
  readonly pageSize = 10;

  sortCol = signal<string>('');
  sortDir = signal<'asc' | 'desc'>('asc');

  form: EmpleadoForm = this.formVacio();

  empleadosFiltrados = computed(() => {
    let lista = this.empleados();
    const q = this.busqueda().toLowerCase();
    if (q) lista = lista.filter((e: any) =>
      `${e.nombre} ${e.apellido} ${e.ci}`.toLowerCase().includes(q)
    );
    if (this.filtroTurno) lista = lista.filter((e: any) => e.turno === this.filtroTurno);
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

  empleadosPaginados = computed(() => {
    const lista = this.empleadosFiltrados();
    return lista.slice((this.pagina() - 1) * this.pageSize, this.pagina() * this.pageSize);
  });

  previewUsername = computed(() => {
    if (this.form.usernamePersonalizado) return this.form.usernamePersonalizado;
    return `${this.form.nombre}.${this.form.apellido}`
      .toLowerCase().replace(/\s+/g, '')
      .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e')
      .replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o')
      .replace(/[úùü]/g, 'u').replace(/[ñ]/g, 'n') || 'nombre.apellido';
  });

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private toastSvc: ToastService,
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
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

  puedeCrear(): boolean {
    const rol = this.authService.rol().replace('ROLE_', '');
    return ['ADMIN', 'GERENTE_SUCURSAL'].includes(rol) || this.authService.tieneModulo('MOD_EMPLEADOS');
  }

  cargarDatos(): void {
    this.cargando.set(true);

    this.http.get<Empleado[]>(`${environment.apiUrl}/empleados`).subscribe({
      next: es => { this.empleados.set(es); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });

    this.http.get<Rol[]>(`${environment.apiUrl}/roles`).subscribe({
      next: rs => this.roles.set(rs),
      error: () => {},
    });

    this.http.get<any[]>(`${environment.apiUrl}/sucursales`).subscribe({
      next: ss => this.sucursales.set(ss),
      error: () => {},
    });
  }

  getUsername(empleado: Empleado): string {
    return empleado.username ?? '—';
  }

  abrirModal(): void {
    this.form = this.formVacio();
    this.editando.set(false);
    this.errorModal.set('');
    this.modal.set(true);
  }

  editarEmpleado(e: Empleado): void {
    this.form = {
      nombre: e.nombre,
      apellido: e.apellido,
      ci: e.ci,
      telefono: e.telefono ?? '',
      correo: e.correo ?? '',
      cargo: e.cargo,
      turno: e.turno,
      fechaIngreso: e.fechaIngreso,
      sucursalId: e.sucursalId,
      rolId: null,
      usernamePersonalizado: '',
      passwordInicial: '',
    };
    this.empleadoSeleccionado.set(e);
    this.editando.set(true);
    this.errorModal.set('');
    this.modal.set(true);
  }

  guardar(): void {
    if (!this.form.nombre || !this.form.apellido || !this.form.ci
        || !this.form.cargo || !this.form.turno || !this.form.fechaIngreso
        || !this.form.sucursalId || !this.form.rolId) {
      this.errorModal.set('Complete todos los campos obligatorios (*).');
      return;
    }
    if (!this.editando() && !this.form.passwordInicial) {
      this.errorModal.set('La contraseña inicial es obligatoria.');
      return;
    }

    this.guardando.set(true);
    this.errorModal.set('');

    const url = this.editando()
      ? `${environment.apiUrl}/empleados/${this.empleadoSeleccionado()!.id}`
      : `${environment.apiUrl}/empleados`;

    const metodo = this.editando() ? 'put' : 'post';

    this.http[metodo](url, this.form).subscribe({
      next: () => {
        this.guardando.set(false);
        this.modal.set(false);
        this.toastSvc.success(
          this.editando()
            ? 'Empleado actualizado'
            : `Empleado creado · Usuario: ${this.previewUsername()}`
        );
        this.cargarDatos();
      },
      error: err => {
        this.guardando.set(false);
        this.errorModal.set(err?.error?.mensaje ?? 'Error al guardar');
      }
    });
  }

  cambiarRol(e: any): void {
    this.empleadoSeleccionado.set(e);
    this.modalRol.set(true);
  }

  confirmarCambioRol(rolId: number): void {
    const emp = this.empleadoSeleccionado();
    if (!emp || !emp.usuarioId) {
      this.toastSvc.error('No se encontró usuario para este empleado');
      this.modalRol.set(false);
      return;
    }

    this.http.patch<void>(
      `${environment.apiUrl}/empleados/usuarios/${emp.usuarioId}/rol/${rolId}`,
      null
    ).subscribe({
      next: () => {
        this.modalRol.set(false);
        this.toastSvc.success('Rol actualizado correctamente');
        this.cargarDatos();
      },
      error: err => {
        this.modalRol.set(false);
        this.toastSvc.error(err?.error?.mensaje ?? 'Error al cambiar rol');
      }
    });
  }

  desactivar(e: any): void {
    if (!confirm(`¿Desactivar a ${e.nombre} ${e.apellido}? Su usuario también quedará inactivo.`)) return;
    this.http.delete<void>(`${environment.apiUrl}/empleados/${e.id}`).subscribe({
      next: () => {
        this.toastSvc.success('Empleado desactivado');
        this.cargarDatos();
      },
      error: err => this.toastSvc.error(err?.error?.mensaje ?? 'Error'),
    });
  }

  cerrarModal(): void {
    this.modal.set(false);
    this.errorModal.set('');
  }

  getTurnoLabel(turno: string): string {
    const map: Record<string, string> = {
      MANANA: 'Mañana', TARDE: 'Tarde',
      NOCHE: 'Noche', COMPLETO: 'Completo',
    };
    return map[turno] ?? turno;
  }

  private formVacio(): EmpleadoForm {
    return {
      nombre: '', apellido: '', ci: '', telefono: '', correo: '',
      cargo: '', turno: 'MANANA',
      fechaIngreso: new Date().toISOString().split('T')[0],
      sucursalId: null, rolId: null,
      usernamePersonalizado: '', passwordInicial: '',
    };
  }
}
