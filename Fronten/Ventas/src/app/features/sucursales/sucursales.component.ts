import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SucursalService } from '../../core/services/api.service';
import { Sucursal } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-sucursales',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-5 animate-slide-up">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Sucursales
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ sucursales().length }} registros · {{ activas() }} activas
          </p>
        </div>
        <div class="flex gap-2 w-full sm:w-auto">
          <input [(ngModel)]="busqueda" (ngModelChange)="pagina.set(1)"
                 class="input w-full sm:w-48 text-sm" maxlength="100"
                 placeholder="Buscar sucursal...">
          <button (click)="abrirModal()" class="btn-primary whitespace-nowrap">+ Nueva sucursal</button>
        </div>
      </div>

      <!-- Cards -->
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        @if (cargando()) {
          @for (i of [1,2,3]; track i) {
            <div class="card animate-pulse h-32"></div>
          }
        }
        @for (s of sucursalesPaginadas(); track s.id) {
          <div class="card" [style.opacity]="s.activo ? '1' : '0.55'">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                     style="background:rgb(var(--color-primary)/0.12);color:rgb(var(--color-primary))">
                  <iconify-icon icon="tabler:building-store" width="22" height="22" style="color:currentColor"></iconify-icon>
                </div>
                <div>
                  <p class="font-bold text-sm" style="color:rgb(var(--color-on-surface))">{{ s.nombre }}</p>
                  <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.45)">{{ s.direccion || 'Sin dirección' }}</p>
                </div>
              </div>
              <span [class]="s.activo ? 'badge-success text-[10px]' : 'badge-neutral text-[10px]'">
                {{ s.activo ? 'Activa' : 'Inactiva' }}
              </span>
            </div>
            @if (s.telefono) {
              <p class="mt-3 text-xs inline-flex items-center gap-1" style="color:rgb(var(--color-on-surface)/0.5)">
                <iconify-icon icon="tabler:phone" width="14" height="14" style="color:currentColor"></iconify-icon> {{ s.telefono }}
              </p>
            }
            <div class="mt-3 flex gap-2">
              <button (click)="abrirEditar(s)"
                      class="text-xs py-1 px-2 rounded-lg border border-border bg-surface hover:border-primary/50 text-on-surface/75 inline-flex items-center gap-1">
                <iconify-icon icon="line-md:edit" width="14" height="14" style="color:currentColor"></iconify-icon> Editar
              </button>
              @if (s.activo) {
                <button (click)="desactivar(s)"
                        class="text-xs py-1 px-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 inline-flex items-center gap-1">
                  <iconify-icon icon="tabler:x" width="14" height="14" style="color:currentColor"></iconify-icon> Desactivar
                </button>
              }
            </div>
          </div>
        }
        @if (!cargando() && sucursalesFiltradas().length === 0) {
          <div class="card text-center py-12 md:col-span-3" style="color:rgb(var(--color-on-surface)/0.35)">
            <p class="mb-2 flex justify-center"><iconify-icon icon="tabler:building-store" width="36" height="36" style="color:currentColor"></iconify-icon></p>
            <p>No hay sucursales registradas</p>
          </div>
        }
      </div>

      <app-pagination
        [total]="sucursalesFiltradas().length"
        [pagina]="pagina()"
        [pageSize]="pageSize"
        (pageChange)="pagina.set($event)" />
    </div>

    <!-- Modal -->
    @if (modal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
           (click)="cerrar()">
        <div class="card max-w-md w-full space-y-4 animate-pop" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h3 class="font-display font-bold text-lg inline-flex items-center gap-1.5" style="color:rgb(var(--color-on-surface))">
              @if (editandoId()) {
                <iconify-icon icon="line-md:edit" width="18" height="18" style="color:currentColor"></iconify-icon> Editar Sucursal
              } @else {
                <iconify-icon icon="tabler:building-store" width="18" height="18" style="color:currentColor"></iconify-icon> Nueva Sucursal
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
                     placeholder="Sucursal Centro, Sucursal Norte..." maxlength="100">
            </div>
            <div>
              <label class="input-label">Dirección</label>
              <input [(ngModel)]="form.direccion" class="input text-sm"
                     placeholder="Av. Principal #123" maxlength="200">
            </div>
            <div>
              <label class="input-label">Teléfono</label>
              <input [(ngModel)]="form.telefono" class="input text-sm"
                     type="tel" placeholder="79xxxxxx" maxlength="15">
            </div>
          </div>

          @if (error()) {
            <p class="text-xs p-2.5 rounded-lg inline-flex items-center gap-1.5"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              <iconify-icon icon="tabler:alert-triangle" width="14" height="14" style="color:currentColor"></iconify-icon> {{ error() }}
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
export class SucursalesComponent implements OnInit {
  sucursales  = signal<Sucursal[]>([]);
  cargando    = signal(true);
  modal       = signal(false);
  editandoId  = signal<number | null>(null);
  guardando   = signal(false);
  error       = signal('');

  busqueda    = '';
  pagina      = signal(1);
  readonly pageSize = 10;
  sortCol     = signal<string>('');
  sortDir     = signal<'asc'|'desc'>('asc');

  activas = computed(() => this.sucursales().filter(s => s.activo).length);

  sucursalesFiltradas = computed(() => {
    let lista = this.sucursales();
    const q = this.busqueda.trim().toLowerCase();
    if (q) lista = lista.filter(s =>
      s.nombre.toLowerCase().includes(q) ||
      (s.direccion ?? '').toLowerCase().includes(q)
    );
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

  sucursalesPaginadas = computed(() => {
    const lista = this.sucursalesFiltradas();
    return lista.slice((this.pagina() - 1) * this.pageSize, this.pagina() * this.pageSize);
  });

  form = { nombre: '', direccion: '', telefono: '' };

  constructor(private svc: SucursalService, private toastSvc: ToastService) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.svc.listarTodas().subscribe({
      next: ss => { this.sucursales.set(ss); this.cargando.set(false); },
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
    this.form = { nombre: '', direccion: '', telefono: '' };
    this.error.set('');
    this.modal.set(true);
  }

  abrirEditar(s: Sucursal): void {
    this.editandoId.set(s.id);
    this.form = { nombre: s.nombre, direccion: s.direccion ?? '', telefono: s.telefono ?? '' };
    this.error.set('');
    this.modal.set(true);
  }

  cerrar(): void { this.modal.set(false); this.error.set(''); }

  guardar(): void {
    if (!this.form.nombre.trim()) { this.error.set('El nombre es obligatorio.'); return; }
    this.guardando.set(true);
    const id = this.editandoId();
    const obs = id
      ? this.svc.actualizar(id, this.form)
      : this.svc.crear(this.form);
    obs.subscribe({
      next: s => {
        this.guardando.set(false);
        this.cerrar();
        this.sucursales.update(list => id ? list.map(x => x.id === id ? s : x) : [...list, s]);
        this.toastSvc.success(id ? 'Sucursal actualizada' : 'Sucursal creada');
      },
      error: err => {
        this.guardando.set(false);
        this.error.set(err?.error?.mensaje ?? 'Error al guardar');
      },
    });
  }

  desactivar(s: Sucursal): void {
    if (!confirm(`¿Desactivar la sucursal "${s.nombre}"?`)) return;
    this.svc.desactivar(s.id).subscribe({
      next: () => {
        this.sucursales.update(list => list.map(x => x.id === s.id ? { ...x, activo: false } : x));
        this.toastSvc.success('Sucursal desactivada');
      },
      error: err => this.toastSvc.error(err?.error?.mensaje ?? 'Error'),
    });
  }
}
