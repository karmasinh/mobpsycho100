import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProveedorService } from '../../core/services/api.service';
import { Proveedor } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-5 animate-slide-up">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Proveedores
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ proveedores().length }} registros · Gestión de proveedores de insumos
          </p>
        </div>
        <div class="flex gap-2 w-full sm:w-auto">
          <input [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event); pagina.set(1)"
                 class="input w-full sm:w-52 text-sm" maxlength="100"
                 placeholder="Buscar proveedor...">
          <button (click)="abrirModal()" class="btn-primary whitespace-nowrap">+ Nuevo</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-3">
        <div class="stat-card">
          <p class="stat-value">{{ activos() }}</p>
          <p class="stat-label">Activos</p>
        </div>
        <div class="stat-card">
          <p class="stat-value">{{ proveedores().length }}</p>
          <p class="stat-label">Total registrados</p>
        </div>
      </div>

      <!-- Tabla -->
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th (click)="sortBy('nombre')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">Proveedor <span class="text-xs opacity-40">{{ si('nombre') }}</span></div>
              </th>
              <th (click)="sortBy('nit')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">NIT <span class="text-xs opacity-40">{{ si('nit') }}</span></div>
              </th>
              <th (click)="sortBy('contacto')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">Contacto <span class="text-xs opacity-40">{{ si('contacto') }}</span></div>
              </th>
              <th>Teléfono</th>
              <th (click)="sortBy('activo')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">Estado <span class="text-xs opacity-40">{{ si('activo') }}</span></div>
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (cargando()) {
              @for (i of [1,2,3,4]; track i) {
                <tr>@for (j of [1,2,3,4,5,6]; track j){
                  <td><div class="skeleton h-4 rounded"></div></td>
                }</tr>
              }
            }
            @for (p of filtradosPaginados(); track p.id) {
              <tr [style.opacity]="p.activo ? '1' : '0.5'">
                <td>
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                         style="background:rgb(var(--color-primary)/0.12);color:rgb(var(--color-primary))">
                      {{ p.nombre.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <p class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">{{ p.nombre }}</p>
                      <p class="text-[11px]" style="color:rgb(var(--color-on-surface)/0.45)">{{ p.correo || '—' }}</p>
                    </div>
                  </div>
                </td>
                <td class="font-mono text-xs">{{ p.nit }}</td>
                <td class="text-sm">{{ p.contacto || '—' }}</td>
                <td class="font-mono text-sm">{{ p.telefono || '—' }}</td>
                <td>
                  @if (p.activo) {
                    <span class="badge-success">Activo</span>
                  } @else {
                    <span class="badge-neutral">Inactivo</span>
                  }
                </td>
                <td>
                  <div class="flex gap-1.5">
                    <button (click)="abrirEditar(p)"
                            class="text-xs py-1 px-2 rounded-lg border inline-flex items-center gap-1"
                            style="border-color:rgb(var(--color-border));background:rgb(var(--color-surface));color:rgb(var(--color-on-surface)/0.7)">
                      <iconify-icon icon="line-md:edit" width="14" height="14" style="color:currentColor"></iconify-icon> Editar
                    </button>
                    @if (p.activo) {
                      <button (click)="desactivar(p)"
                              class="text-xs py-1 px-2 rounded-lg inline-flex items-center gap-1"
                              style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
                        <iconify-icon icon="tabler:x" width="14" height="14" style="color:currentColor"></iconify-icon> Baja
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
            @if (!cargando() && filtrados().length === 0) {
              <tr>
                <td colspan="6" class="text-center py-12" style="color:rgb(var(--color-on-surface)/0.35)">
                  <p class="mb-2 flex justify-center"><iconify-icon icon="tabler:building-warehouse" width="36" height="36" style="color:currentColor"></iconify-icon></p>
                  <p>No se encontraron proveedores</p>
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

    <!-- Modal -->
    @if (modal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.5)" (click)="cerrar()">
        <div class="card max-w-lg w-full space-y-4 animate-pop" (click)="$event.stopPropagation()">

          <h3 class="font-display font-bold inline-flex items-center gap-1.5" style="color:rgb(var(--color-on-surface))">
            @if (editandoId()) {
              <iconify-icon icon="line-md:edit" width="18" height="18" style="color:currentColor"></iconify-icon> Editar Proveedor
            } @else {
              <iconify-icon icon="tabler:building-warehouse" width="18" height="18" style="color:currentColor"></iconify-icon> Nuevo Proveedor
            }
          </h3>

          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2">
              <label class="input-label">Nombre *</label>
              <input [(ngModel)]="form.nombre" class="input text-sm"
                     placeholder="Nombre del proveedor" maxlength="100">
            </div>
            <div>
              <label class="input-label">NIT *</label>
              <input [(ngModel)]="form.nit" class="input text-sm"
                     placeholder="12345678" maxlength="20">
            </div>
            <div>
              <label class="input-label">Teléfono</label>
              <input [(ngModel)]="form.telefono" class="input text-sm"
                     type="tel" placeholder="79xxxxxx" maxlength="15">
            </div>
            <div>
              <label class="input-label">Correo</label>
              <input [(ngModel)]="form.correo" class="input text-sm"
                     type="email" placeholder="correo@proveedor.com" maxlength="150">
            </div>
            <div>
              <label class="input-label">Persona de contacto</label>
              <input [(ngModel)]="form.contacto" class="input text-sm"
                     placeholder="Nombre del contacto" maxlength="100">
            </div>
            <div class="col-span-2">
              <label class="input-label">Dirección</label>
              <input [(ngModel)]="form.direccion" class="input text-sm"
                     placeholder="Dirección del proveedor" maxlength="200">
            </div>
          </div>

          @if (error()) {
            <p class="text-xs p-2 rounded-lg inline-flex items-center gap-1.5"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              <iconify-icon icon="tabler:alert-triangle" width="14" height="14" style="color:currentColor"></iconify-icon> {{ error() }}
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
export class ProveedoresComponent implements OnInit {
  proveedores = signal<Proveedor[]>([]);
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

  form = { nombre: '', nit: '', telefono: '', correo: '', contacto: '', direccion: '' };

  activos   = computed(() => this.proveedores().filter(p => p.activo).length);

  filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    let lista = q
      ? this.proveedores().filter(p =>
          p.nombre.toLowerCase().includes(q) ||
          p.nit.toLowerCase().includes(q) ||
          (p.contacto ?? '').toLowerCase().includes(q)
        )
      : this.proveedores();
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

  constructor(private svc: ProveedorService, private toastSvc: ToastService) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.svc.listarTodos().subscribe({
      next: ps => { this.proveedores.set(ps); this.cargando.set(false); },
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
    this.form = { nombre: '', nit: '', telefono: '', correo: '', contacto: '', direccion: '' };
    this.error.set('');
    this.modal.set(true);
  }

  abrirEditar(p: Proveedor): void {
    this.editandoId.set(p.id);
    this.form = {
      nombre: p.nombre, nit: p.nit,
      telefono: p.telefono ?? '', correo: p.correo ?? '',
      contacto: p.contacto ?? '', direccion: p.direccion ?? '',
    };
    this.error.set('');
    this.modal.set(true);
  }

  cerrar(): void { this.modal.set(false); this.error.set(''); }

  guardar(): void {
    if (!this.form.nombre.trim()) { this.error.set('El nombre es obligatorio.'); return; }
    if (!this.form.nit.trim())    { this.error.set('El NIT es obligatorio.'); return; }
    this.guardando.set(true);
    const id  = this.editandoId();
    const obs = id ? this.svc.actualizar(id, this.form) : this.svc.crear(this.form);
    obs.subscribe({
      next: p => {
        this.guardando.set(false);
        this.cerrar();
        this.proveedores.update(list => id ? list.map(x => x.id === id ? p : x) : [...list, p]);
        this.toastSvc.success(id ? 'Proveedor actualizado' : 'Proveedor registrado');
      },
      error: err => {
        this.guardando.set(false);
        this.error.set(err?.error?.mensaje ?? 'Error al guardar');
      },
    });
  }

  desactivar(p: Proveedor): void {
    if (!confirm(`¿Dar de baja a "${p.nombre}"?`)) return;
    this.svc.desactivar(p.id).subscribe({
      next: () => {
        this.proveedores.update(list => list.map(x => x.id === p.id ? { ...x, activo: false } : x));
        this.toastSvc.success('Proveedor dado de baja');
      },
      error: () => this.toastSvc.error('Error al dar de baja'),
    });
  }
}
