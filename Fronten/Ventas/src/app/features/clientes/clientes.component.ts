import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClienteService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { Cliente, EstadoCliente } from '../../core/models';

type SortCol = 'nombre' | 'registro' | 'ultimaCompra' | 'estado';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <div class="space-y-5 animate-slide-up">

      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Clientes
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ clientes().length }} registros · {{ clientesFiltrados().length }} en vista actual
          </p>
        </div>
        <button (click)="abrirModal()" class="btn-primary">+ Nuevo cliente</button>
      </div>

      <!-- Stats de estados -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        @for (est of estadosStats(); track est.label) {
          <button (click)="cambiarFiltro(est.estado)"
                  class="stat-card text-left transition-all"
                  [style.outline]="filtroEstado() === est.estado
                    ? '2px solid rgb(var(--color-primary))' : 'none'">
            <div class="flex items-center justify-between">
              <span class="text-xl">{{ est.emoji }}</span>
              <span [class]="est.badgeClass">{{ est.count }}</span>
            </div>
            <p class="stat-value text-xl mt-1">{{ est.count }}</p>
            <p class="stat-label">{{ est.label }}</p>
          </button>
        }
      </div>

      <!-- Filtros rápidos -->
      <div class="flex gap-2 flex-wrap">
        <button (click)="cambiarFiltro('TODOS')"
                class="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                [style.background]="filtroEstado()==='TODOS' ? 'rgb(var(--color-primary))' : 'rgb(var(--color-surface-2))'"
                [style.color]="filtroEstado()==='TODOS' ? 'rgb(var(--color-on-primary))' : 'rgb(var(--color-on-surface)/0.6)'"
                style="border:1px solid rgb(var(--color-border))">
          Todos ({{ clientes().length }})
        </button>
        @for (est of estadosOpciones; track est.valor) {
          <button (click)="cambiarFiltro(est.valor)"
                  class="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  [style.background]="filtroEstado()===est.valor ? 'rgb(var(--color-primary))' : 'rgb(var(--color-surface-2))'"
                  [style.color]="filtroEstado()===est.valor ? 'rgb(var(--color-on-primary))' : 'rgb(var(--color-on-surface)/0.6)'"
                  style="border:1px solid rgb(var(--color-border))">
            {{ est.label }}
          </button>
        }
      </div>

      <!-- Búsqueda -->
      <input [(ngModel)]="busqueda" (ngModelChange)="pagina.set(1)" class="input max-w-xs text-sm"
             placeholder="🔍 Buscar por nombre o teléfono..."
             maxlength="100" aria-label="Buscar clientes">

      <!-- Tabla -->
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th (click)="sortBy('nombre')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">
                  Cliente
                  <span class="text-xs opacity-40">{{ sortIndicador('nombre') }}</span>
                </div>
              </th>
              <th>Teléfono</th>
              <th (click)="sortBy('registro')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">
                  Registro
                  <span class="text-xs opacity-40">{{ sortIndicador('registro') }}</span>
                </div>
              </th>
              <th (click)="sortBy('ultimaCompra')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">
                  Última compra
                  <span class="text-xs opacity-40">{{ sortIndicador('ultimaCompra') }}</span>
                </div>
              </th>
              <th (click)="sortBy('estado')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">
                  Estado
                  <span class="text-xs opacity-40">{{ sortIndicador('estado') }}</span>
                </div>
              </th>
              @if (puedeEditar()) { <th>Acciones</th> }
            </tr>
          </thead>
          <tbody>
            @if (cargando()) {
              @for (i of [1,2,3,4,5]; track i) {
                <tr>@for (j of [1,2,3,4,5]; track j){<td><div class="skeleton h-4 rounded"></div></td>}</tr>
              }
            }
            @for (c of clientesPaginados(); track c.id) {
              <tr>
                <td>
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                         style="background:rgb(var(--color-primary)/0.15);color:rgb(var(--color-primary))">
                      {{ c.nombre.charAt(0).toUpperCase() }}
                    </div>
                    <span class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">
                      {{ c.nombre }}
                    </span>
                  </div>
                </td>
                <td class="font-mono text-sm">{{ c.telefono || '—' }}</td>
                <td class="text-sm" style="color:rgb(var(--color-on-surface)/0.6)">
                  {{ c.fechaRegistro | date:'dd/MM/yyyy' }}
                </td>
                <td class="text-sm" style="color:rgb(var(--color-on-surface)/0.6)">
                  {{ c.ultimaCompra ? (c.ultimaCompra | date:'dd/MM/yyyy') : '—' }}
                </td>
                <td>
                  <span [class]="getBadgeEstado(c.estado)">
                    {{ getEstadoLabel(c.estado) }}
                  </span>
                </td>
                @if (puedeEditar()) {
                  <td>
                    <button (click)="abrirEdicion(c)" class="btn-ghost text-xs px-2 py-1">
                      ✏️ Editar
                    </button>
                  </td>
                }
              </tr>
            }
            @if (!cargando() && clientesFiltrados().length === 0) {
              <tr>
                <td [attr.colspan]="puedeEditar() ? 6 : 5" class="text-center py-10"
                    style="color:rgb(var(--color-on-surface)/0.35)">
                  Sin clientes con este filtro
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <app-pagination
        [total]="clientesFiltrados().length"
        [pagina]="pagina()"
        [pageSize]="pageSize"
        (pageChange)="pagina.set($event)" />

    </div>

    <!-- Modal nuevo cliente -->
    @if (modal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.5)" (click)="cerrarModal()">
        <div class="card max-w-sm w-full space-y-4 animate-pop"
             (click)="$event.stopPropagation()">
          <h3 class="font-display font-bold" style="color:rgb(var(--color-on-surface))">
            {{ editando() ? '✏️ Editar Cliente' : '👥 Nuevo Cliente' }}
          </h3>
          <div class="space-y-3">
            <div>
              <label class="input-label">Nombre <span class="text-danger">*</span></label>
              <input [(ngModel)]="formCliente.nombre" class="input text-sm"
                     placeholder="Nombre completo del cliente"
                     maxlength="100" required
                     [class.border-danger]="errNombre">
              @if (errNombre) {
                <p class="text-xs mt-1" style="color:rgb(var(--color-danger))">{{ errNombre }}</p>
              }
            </div>
            <div>
              <label class="input-label">
                Teléfono
                <span title="Formato: 7 u 8 dígitos (ej: 79123456)" class="cursor-help ml-1 opacity-50">(?)</span>
              </label>
              <input [(ngModel)]="formCliente.telefono" class="input text-sm"
                     placeholder="79xxxxxx" maxlength="15" type="tel"
                     [class.border-danger]="errTelefono">
              @if (errTelefono) {
                <p class="text-xs mt-1" style="color:rgb(var(--color-danger))">{{ errTelefono }}</p>
              }
            </div>
            <div>
              <label class="input-label">Correo electrónico</label>
              <input [(ngModel)]="formCliente.correo" class="input text-sm"
                     type="email" placeholder="correo@ejemplo.com"
                     maxlength="150"
                     [class.border-danger]="errCorreo">
              @if (errCorreo) {
                <p class="text-xs mt-1" style="color:rgb(var(--color-danger))">{{ errCorreo }}</p>
              }
            </div>
          </div>
          <div class="flex gap-2 pt-1">
            <button (click)="cerrarModal()" class="btn-secondary flex-1 justify-center">Cancelar</button>
            <button (click)="guardar()" [disabled]="guardando()" class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block mr-2"></span>
                Guardando…
              } @else { Guardar }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ClientesComponent implements OnInit {
  clientes     = signal<Cliente[]>([]);
  cargando     = signal(true);
  busqueda     = '';
  filtroEstado = signal<string>('TODOS');
  modal        = signal(false);
  guardando    = signal(false);
  editando     = signal<Cliente | null>(null);

  sortCol = signal<SortCol | ''>('');
  sortDir = signal<'asc' | 'desc'>('asc');
  pagina  = signal(1);
  readonly pageSize = 10;

  errNombre   = '';
  errTelefono = '';
  errCorreo   = '';
  formCliente = { nombre: '', telefono: '', correo: '' };

  estadosOpciones = [
    { valor: 'ACTIVO',           label: 'Activos'       },
    { valor: 'INACTIVO',         label: 'Inactivos'     },
    { valor: 'RECUPERADO',       label: 'Recuperados'   },
    { valor: 'CLIENTE_NUEVO',    label: 'Nuevos'        },
    { valor: 'POSIBLE_INACTIVO', label: 'Posible inact.'},
  ];

  estadosStats = computed(() => [
    { estado: 'ACTIVO',        label: 'Activos',     emoji: '✅', badgeClass: 'badge-success',
      count: this.clientes().filter(c => c.estado === 'ACTIVO').length },
    { estado: 'INACTIVO',      label: 'Inactivos',   emoji: '😴', badgeClass: 'badge-neutral',
      count: this.clientes().filter(c => c.estado === 'INACTIVO').length },
    { estado: 'RECUPERADO',    label: 'Recuperados', emoji: '🔄', badgeClass: 'badge-info',
      count: this.clientes().filter(c => c.estado === 'RECUPERADO').length },
    { estado: 'CLIENTE_NUEVO', label: 'Nuevos',      emoji: '⭐', badgeClass: 'badge-warning',
      count: this.clientes().filter(c => c.estado === 'CLIENTE_NUEVO').length },
  ]);

  clientesFiltrados = computed(() => {
    let lista = this.clientes();
    if (this.filtroEstado() !== 'TODOS')
      lista = lista.filter(c => c.estado === this.filtroEstado());
    const q = this.busqueda.toLowerCase().trim();
    if (q) lista = lista.filter(c =>
      c.nombre.toLowerCase().includes(q) || (c.telefono ?? '').includes(q)
    );
    const col = this.sortCol();
    if (col) {
      const dir = this.sortDir() === 'asc' ? 1 : -1;
      lista = [...lista].sort((a, b) => {
        if (col === 'nombre')      return dir * a.nombre.localeCompare(b.nombre);
        if (col === 'registro')    return dir * (a.fechaRegistro > b.fechaRegistro ? 1 : -1);
        if (col === 'ultimaCompra')return dir * ((a.ultimaCompra ?? '') > (b.ultimaCompra ?? '') ? 1 : -1);
        if (col === 'estado')      return dir * a.estado.localeCompare(b.estado);
        return 0;
      });
    }
    return lista;
  });

  clientesPaginados = computed(() => {
    const desde = (this.pagina() - 1) * this.pageSize;
    return this.clientesFiltrados().slice(desde, desde + this.pageSize);
  });

  constructor(
    private clienteService: ClienteService,
    private toastSvc: ToastService,
    public auth: AuthService,
  ) {}

  puedeEditar(): boolean {
    return this.auth.rol() === 'ADMIN' || this.auth.tieneModulo('MOD_CLIENTES');
  }

  ngOnInit(): void {
    this.clienteService.listar().subscribe({
      next: cs => { this.clientes.set(cs); this.cargando.set(false); },
      error: () => { this.cargando.set(false); this.toastSvc.error('No se pudo cargar los clientes'); },
    });
  }

  cambiarFiltro(estado: string): void {
    this.filtroEstado.set(estado);
    this.pagina.set(1);
  }

  sortBy(col: SortCol): void {
    if (this.sortCol() === col) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortCol.set(col);
      this.sortDir.set('asc');
    }
    this.pagina.set(1);
  }

  sortIndicador(col: string): string {
    if (this.sortCol() !== col) return '⇅';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  abrirModal(): void {
    this.editando.set(null);
    this.formCliente = { nombre: '', telefono: '', correo: '' };
    this.errNombre = this.errTelefono = this.errCorreo = '';
    this.modal.set(true);
  }

  abrirEdicion(c: Cliente): void {
    this.editando.set(c);
    this.formCliente = { nombre: c.nombre, telefono: c.telefono ?? '', correo: c.correo ?? '' };
    this.errNombre = this.errTelefono = this.errCorreo = '';
    this.modal.set(true);
  }

  cerrarModal(): void { this.modal.set(false); this.editando.set(null); }

  guardar(): void {
    this.errNombre = this.errTelefono = this.errCorreo = '';
    let valid = true;

    if (!this.formCliente.nombre.trim()) {
      this.errNombre = 'El nombre es obligatorio.'; valid = false;
    } else if (this.formCliente.nombre.trim().length < 2) {
      this.errNombre = 'El nombre debe tener al menos 2 caracteres.'; valid = false;
    }

    const tel = this.formCliente.telefono.trim();
    if (tel && !/^\d{7,15}$/.test(tel)) {
      this.errTelefono = 'Ingrese un teléfono válido (7 a 15 dígitos).'; valid = false;
    }

    const correo = this.formCliente.correo.trim();
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      this.errCorreo = 'Ingrese un correo electrónico válido.'; valid = false;
    }

    if (!valid) return;

    const editandoActual = this.editando();
    this.guardando.set(true);

    const obs = editandoActual
      ? this.clienteService.actualizar(editandoActual.id, this.formCliente)
      : this.clienteService.crear(this.formCliente);

    obs.subscribe({
      next: c => {
        if (editandoActual) {
          this.clientes.update(cs => cs.map(x => x.id === c.id ? c : x));
          this.toastSvc.success(`Cliente "${c.nombre}" actualizado correctamente`);
        } else {
          this.clientes.update(cs => [...cs, c]);
          this.toastSvc.success(`Cliente "${c.nombre}" registrado correctamente`);
        }
        this.guardando.set(false);
        this.modal.set(false);
        this.editando.set(null);
      },
      error: err => {
        this.guardando.set(false);
        const msg = err?.error?.mensaje ?? 'Error al guardar el cliente';
        this.toastSvc.error(msg);
      }
    });
  }

  getBadgeEstado(estado: EstadoCliente): string {
    const map: Record<string, string> = {
      CLIENTE_NUEVO:    'badge-warning',
      POSIBLE_ACTIVO:   'badge-info',
      ACTIVO:           'badge-success',
      POSIBLE_INACTIVO: 'badge-neutral',
      INACTIVO:         'badge-neutral',
      RECUPERADO:       'badge-info',
      BLOQUEADO:        'badge-danger',
      ELIMINADO:        'badge-danger',
    };
    return map[estado] ?? 'badge-neutral';
  }

  getEstadoLabel(estado: EstadoCliente): string {
    const map: Record<string, string> = {
      CLIENTE_NUEVO:    '⭐ Nuevo',
      POSIBLE_ACTIVO:   '📈 Posible activo',
      ACTIVO:           '✅ Activo',
      POSIBLE_INACTIVO: '⚠️ Posible inactivo',
      INACTIVO:         '😴 Inactivo',
      RECUPERADO:       '🔄 Recuperado',
      BLOQUEADO:        '🔒 Bloqueado',
      ELIMINADO:        '🗑️ Eliminado',
    };
    return map[estado] ?? estado;
  }
}
