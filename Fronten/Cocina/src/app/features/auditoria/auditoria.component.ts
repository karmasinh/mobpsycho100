import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditoriaService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { AuditoriaLog } from '../../core/models';

type SortCol = 'fecha' | 'usuario' | 'entidad' | 'accion';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-5 animate-slide-up">

      <!-- Cabecera -->
      <div>
        <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
          Auditoría del sistema
        </h1>
        <p class="text-sm mt-0.5" style="color:rgb(var(--color-on-surface)/0.5)">
          Registro inmutable de todas las acciones realizadas
        </p>
      </div>

      <!-- Filtros -->
      <div class="card flex flex-wrap gap-3 items-end">
        <div class="flex flex-col gap-1">
          <label class="input-label">Usuario</label>
          <input [(ngModel)]="filtroUsuario" class="input w-40 text-sm"
                 placeholder="username..." maxlength="100"
                 (keydown.enter)="buscar()">
        </div>
        <div class="flex flex-col gap-1">
          <label class="input-label">Entidad</label>
          <select [(ngModel)]="filtroEntidad" class="input w-44 text-sm">
            <option value="">Todas</option>
            @for (e of entidades; track e) {
              <option [value]="e">{{ e }}</option>
            }
          </select>
        </div>
        <button (click)="buscar()" [disabled]="cargando()" class="btn-primary">
          @if (cargando()) {
            <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
          } @else { <iconify-icon icon="line-md:search" width="16" height="16" style="color:currentColor"></iconify-icon> }
          Filtrar
        </button>
        <button (click)="limpiar()" class="btn-secondary text-sm">Limpiar</button>
      </div>

      <!-- Stats rápidas -->
      @if (logs().length > 0) {
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          @for (stat of statsAccion(); track stat.accion) {
            <div class="stat-card">
              <p class="stat-label">{{ stat.accion }}</p>
              <p class="stat-value">{{ stat.cantidad }}</p>
            </div>
          }
        </div>
      }

      <!-- Tabla -->
      <div class="card space-y-3">
        <div class="flex items-center gap-3">
          <input [(ngModel)]="busqueda" class="input w-56 text-sm"
                 placeholder="Buscar en registros..." maxlength="100">
          <span class="text-xs ml-auto" style="color:rgb(var(--color-on-surface)/0.4)">
            {{ filtrados().length }} registro{{ filtrados().length !== 1 ? 's' : '' }}
          </span>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th class="cursor-pointer select-none" (click)="sortBy('fecha')">
                  Fecha {{ si('fecha') }}
                </th>
                <th class="cursor-pointer select-none" (click)="sortBy('usuario')">
                  Usuario {{ si('usuario') }}
                </th>
                <th class="cursor-pointer select-none" (click)="sortBy('accion')">
                  Acción {{ si('accion') }}
                </th>
                <th class="cursor-pointer select-none" (click)="sortBy('entidad')">
                  Entidad {{ si('entidad') }}
                </th>
                <th>ID</th>
                <th>IP</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @if (cargando()) {
                @for (i of [1,2,3,4,5]; track i) {
                  <tr>
                    @for (j of [1,2,3,4,5,6,7]; track j) {
                      <td><div class="skeleton h-4 rounded w-full"></div></td>
                    }
                  </tr>
                }
              } @else if (paginados().length === 0) {
                <tr>
                  <td colspan="7" class="text-center py-12">
                    <iconify-icon icon="tabler:file-text" width="36" height="36" class="mb-2 inline-block opacity-20" style="color:currentColor"></iconify-icon>
                    <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.4)">
                      {{ buscado() ? 'No se encontraron registros' : 'Aplicá un filtro para ver los registros' }}
                    </p>
                  </td>
                </tr>
              } @else {
                @for (log of paginados(); track log.id) {
                  <tr>
                    <td class="font-mono text-xs whitespace-nowrap">
                      {{ log.creadoEn | date:'dd/MM/yy' }}<br>
                      <span style="color:rgb(var(--color-on-surface)/0.4)">
                        {{ log.creadoEn | date:'HH:mm:ss' }}
                      </span>
                    </td>
                    <td class="font-mono text-sm font-semibold">
                      {{ log.username ?? '—' }}
                    </td>
                    <td>
                      <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                            [style.background]="accionBg(log.accion)"
                            [style.color]="accionColor(log.accion)">
                        {{ log.accion }}
                      </span>
                    </td>
                    <td class="text-sm">{{ log.entidad }}</td>
                    <td class="font-mono text-xs" style="color:rgb(var(--color-on-surface)/0.45)">
                      {{ log.entidadId ?? '—' }}
                    </td>
                    <td class="font-mono text-xs" style="color:rgb(var(--color-on-surface)/0.4)">
                      {{ log.ip ?? '—' }}
                    </td>
                    <td>
                      @if (log.valorAnterior || log.valorNuevo) {
                        <button (click)="toggleDetalle(log.id)"
                                class="btn-ghost text-xs px-2 py-1"
                                title="Ver cambios">
                          {{ expandido() === log.id ? '▲' : '▼' }}
                        </button>
                      }
                    </td>
                  </tr>
                  @if (expandido() === log.id) {
                    <tr style="background:rgb(var(--color-surface-2)/0.5)">
                      <td colspan="7" class="px-4 py-3">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          @if (log.valorAnterior) {
                            <div>
                              <p class="text-xs font-semibold mb-1"
                                 style="color:rgb(var(--color-danger)/0.8)">
                                Antes
                              </p>
                              <pre class="text-xs p-2 rounded-lg overflow-x-auto"
                                   style="background:rgb(var(--color-danger)/0.06);
                                          color:rgb(var(--color-on-surface)/0.7);
                                          white-space:pre-wrap;word-break:break-all">{{ log.valorAnterior }}</pre>
                            </div>
                          }
                          @if (log.valorNuevo) {
                            <div>
                              <p class="text-xs font-semibold mb-1"
                                 style="color:rgb(var(--color-success)/0.8)">
                                Después
                              </p>
                              <pre class="text-xs p-2 rounded-lg overflow-x-auto"
                                   style="background:rgb(var(--color-success)/0.06);
                                          color:rgb(var(--color-on-surface)/0.7);
                                          white-space:pre-wrap;word-break:break-all">{{ log.valorNuevo }}</pre>
                            </div>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                }
              }
            </tbody>
          </table>
        </div>

        <app-pagination
          [total]="filtrados().length"
          [pageSize]="pageSize"
          [pagina]="pagina()"
          (pageChange)="pagina.set($event)" />
      </div>
    </div>
  `,
})
export class AuditoriaComponent implements OnInit {

  logs      = signal<AuditoriaLog[]>([]);
  cargando  = signal(false);
  buscado   = signal(false);
  expandido = signal<number | null>(null);

  filtroUsuario = '';
  filtroEntidad = '';
  busqueda      = '';

  sortCol = signal<SortCol | ''>('fecha');
  sortDir = signal<'asc' | 'desc'>('desc');
  pagina  = signal(1);
  pageSize = 20;

  entidades = [
    'Insumo', 'CategoriaInsumo', 'StockInsumo', 'LoteInsumo', 'MovimientoInventario',
    'Plato', 'Receta', 'ProduccionDia', 'Pedido',
    'Empleado', 'Usuario', 'Rol', 'Proveedor', 'Sucursal',
  ];

  constructor(
    private auditoriaService: AuditoriaService,
    private toastSvc: ToastService,
  ) {}

  ngOnInit(): void { this.buscar(); }

  buscar(): void {
    this.cargando.set(true);
    this.pagina.set(1);
    const obs = this.filtroUsuario.trim()
      ? this.auditoriaService.porUsuario(this.filtroUsuario.trim())
      : this.auditoriaService.listar();

    obs.subscribe({
      next: list => {
        let r = list;
        if (this.filtroEntidad) r = r.filter(l => l.entidad === this.filtroEntidad);
        this.logs.set(r);
        this.buscado.set(true);
        this.cargando.set(false);
      },
      error: () => {
        this.toastSvc.error('No se pudo cargar el registro de auditoría');
        this.cargando.set(false);
      },
    });
  }

  limpiar(): void {
    this.filtroUsuario = '';
    this.filtroEntidad = '';
    this.busqueda = '';
    this.buscar();
  }

  filtrados = computed(() => {
    let list = this.logs();
    const q = this.busqueda.toLowerCase().trim();
    if (q) {
      list = list.filter(l =>
        l.username?.toLowerCase().includes(q) ||
        l.entidad?.toLowerCase().includes(q) ||
        l.accion?.toLowerCase().includes(q) ||
        l.ip?.includes(q) ||
        String(l.entidadId ?? '').includes(q)
      );
    }
    const col = this.sortCol();
    if (col) {
      list = [...list].sort((a, b) => {
        let av: any, bv: any;
        if (col === 'fecha')   { av = a.creadoEn;  bv = b.creadoEn; }
        if (col === 'usuario') { av = a.username;   bv = b.username; }
        if (col === 'accion')  { av = a.accion;     bv = b.accion; }
        if (col === 'entidad') { av = a.entidad;    bv = b.entidad; }
        if (av < bv) return this.sortDir() === 'asc' ? -1 : 1;
        if (av > bv) return this.sortDir() === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  });

  paginados = computed(() => {
    const start = (this.pagina() - 1) * this.pageSize;
    return this.filtrados().slice(start, start + this.pageSize);
  });

  statsAccion = computed(() => {
    const mapa = new Map<string, number>();
    for (const l of this.logs()) mapa.set(l.accion, (mapa.get(l.accion) ?? 0) + 1);
    return [...mapa.entries()]
      .map(([accion, cantidad]) => ({ accion, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 4);
  });

  sortBy(col: SortCol): void {
    if (this.sortCol() === col) this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    else { this.sortCol.set(col); this.sortDir.set('desc'); }
    this.pagina.set(1);
  }

  si(col: string): string {
    if (this.sortCol() !== col) return '⇅';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  toggleDetalle(id: number): void {
    this.expandido.set(this.expandido() === id ? null : id);
  }

  accionBg(accion: string): string {
    if (accion === 'CREATE') return 'rgb(var(--color-success)/0.12)';
    if (accion === 'UPDATE') return 'rgb(var(--color-warning)/0.15)';
    if (accion === 'DELETE') return 'rgb(var(--color-danger)/0.12)';
    if (accion === 'LOGIN')  return 'rgb(var(--color-primary)/0.10)';
    return 'rgb(var(--color-surface-2))';
  }

  accionColor(accion: string): string {
    if (accion === 'CREATE') return 'rgb(var(--color-success))';
    if (accion === 'UPDATE') return 'rgb(var(--color-warning))';
    if (accion === 'DELETE') return 'rgb(var(--color-danger))';
    if (accion === 'LOGIN')  return 'rgb(var(--color-primary))';
    return 'rgb(var(--color-on-surface)/0.6)';
  }
}
