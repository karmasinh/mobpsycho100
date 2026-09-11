import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PensionadoService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { CobroMensual } from '../../core/models';

type SortColCobro = 'nombre' | 'periodo' | 'total' | 'saldo';

@Component({
  selector: 'app-cobros',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-5 animate-slide-up">

      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Cobros Mensuales
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            Gestión de cobros de pensionados · Saldo acumulado automático
          </p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <input [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event); pagina.set(1)" class="input w-44 text-sm"
                 placeholder="Buscar pensionado…" maxlength="100">
          <button (click)="cambiarVista('pendientes')"
                  [class.btn-primary]="vistaActiva()==='pendientes'"
                  [class.btn-secondary]="vistaActiva()!=='pendientes'"
                  class="btn text-sm">
            Pendientes
            @if (pendientes().length > 0) {
              <span class="badge-danger text-[10px] ml-1">{{ pendientes().length }}</span>
            }
          </button>
          <button (click)="cambiarVista('todos')"
                  [class.btn-primary]="vistaActiva()==='todos'"
                  [class.btn-secondary]="vistaActiva()!=='todos'"
                  class="btn text-sm">
            Todos
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4">
        <div class="stat-card">
          <iconify-icon icon="tabler:receipt" width="24" height="24" style="color:currentColor"></iconify-icon>
          <p class="stat-value mt-1">{{ pendientes().length }}</p>
          <p class="stat-label">Cobros pendientes</p>
        </div>
        <div class="stat-card">
          <iconify-icon icon="tabler:currency-dollar" width="24" height="24" style="color:currentColor"></iconify-icon>
          <p class="stat-value mt-1">Bs {{ totalPendiente() | number:'1.2-2' }}</p>
          <p class="stat-label">Total por cobrar</p>
        </div>
        <div class="stat-card">
          <iconify-icon icon="tabler:circle-check" width="24" height="24" style="color:currentColor"></iconify-icon>
          <p class="stat-value mt-1">{{ totalPagados() }}</p>
          <p class="stat-label">Pagados este mes</p>
        </div>
      </div>

      <!-- Lista de cobros -->
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th (click)="sortBy('nombre')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">Pensionado <span class="text-xs opacity-40">{{ si('nombre') }}</span></div>
              </th>
              <th (click)="sortBy('periodo')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">Período <span class="text-xs opacity-40">{{ si('periodo') }}</span></div>
              </th>
              <th>Monto base</th>
              <th>Saldo anterior</th>
              <th (click)="sortBy('total')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">Total <span class="text-xs opacity-40">{{ si('total') }}</span></div>
              </th>
              <th>Pagado</th>
              <th (click)="sortBy('saldo')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">Saldo restante <span class="text-xs opacity-40">{{ si('saldo') }}</span></div>
              </th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            @if (cargando()) {
              @for (i of [1,2,3,4]; track i) {
                <tr>@for (j of [1,2,3,4,5,6,7,8,9]; track j){<td><div class="skeleton h-4 rounded"></div></td>}</tr>
              }
            }
            @for (c of cobrosPaginados(); track c.id) {
              <tr>
                <td>
                  <span class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">
                    {{ c.pensionadoNombre }} {{ c.pensionadoApellido }}
                  </span>
                </td>
                <td class="font-mono text-xs">{{ c.mes }}/{{ c.anio }}</td>
                <td class="font-mono text-sm">Bs {{ c.montoBase | number:'1.2-2' }}</td>
                <td>
                  @if (c.saldoAnterior > 0) {
                    <span class="font-mono text-sm" style="color:rgb(var(--color-warning))">
                      Bs {{ c.saldoAnterior | number:'1.2-2' }}
                    </span>
                  } @else {
                    <span class="text-xs" style="color:rgb(var(--color-on-surface)/0.3)">—</span>
                  }
                </td>
                <td class="font-mono font-semibold text-sm">Bs {{ c.totalCobrado | number:'1.2-2' }}</td>
                <td class="font-mono text-sm" style="color:rgb(var(--color-success))">
                  Bs {{ c.montoPagado | number:'1.2-2' }}
                </td>
                <td>
                  @if (c.saldoRestante > 0) {
                    <span class="font-mono text-sm" style="color:rgb(var(--color-danger))">
                      Bs {{ c.saldoRestante | number:'1.2-2' }}
                    </span>
                  } @else {
                    <span class="badge-success text-xs inline-flex items-center gap-1">
                      <iconify-icon icon="tabler:check" width="14" height="14" style="color:currentColor"></iconify-icon>
                      Completo
                    </span>
                  }
                </td>
                <td>
                  @if (c.pagado) {
                    <span class="badge-success">Pagado</span>
                  } @else if (c.montoPagado > 0) {
                    <span class="badge-warning">Parcial</span>
                  } @else {
                    <span class="badge-danger">Pendiente</span>
                  }
                </td>
                <td>
                  @if (!c.pagado) {
                    <button (click)="abrirPago(c)"
                            class="text-xs py-1 px-2 rounded-lg transition-all inline-flex items-center gap-1"
                            style="background:rgb(var(--color-primary)/0.1);color:rgb(var(--color-primary))">
                      <iconify-icon icon="tabler:credit-card" width="14" height="14" style="color:currentColor"></iconify-icon>
                      Registrar pago
                    </button>
                  }
                </td>
              </tr>
            }
            @if (!cargando() && cobrosVisibles().length === 0) {
              <tr>
                <td colspan="9" class="text-center py-10"
                    style="color:rgb(var(--color-on-surface)/0.35)">
                  Sin cobros pendientes 🎉
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <app-pagination
        [total]="cobrosVisibles().length"
        [pagina]="pagina()"
        [pageSize]="pageSize"
        (pageChange)="pagina.set($event)" />

    </div>

    <!-- Modal pago -->
    @if (cobroSeleccionado()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.5)">
        <div class="card max-w-sm w-full space-y-4 animate-pop">
          <div class="flex items-center justify-between">
            <h3 class="font-display font-bold inline-flex items-center gap-1.5" style="color:rgb(var(--color-on-surface))">
              <iconify-icon icon="tabler:credit-card" width="18" height="18" style="color:currentColor"></iconify-icon>
              Registrar Pago
            </h3>
            <button (click)="cobroSeleccionado.set(null)" class="btn-ghost p-1">
              <iconify-icon icon="line-md:close" width="16" height="16" style="color:currentColor"></iconify-icon>
            </button>
          </div>

          <div class="p-3 rounded-xl space-y-1"
               style="background:rgb(var(--color-surface));border:1px solid rgb(var(--color-border))">
            <p class="text-sm font-semibold" style="color:rgb(var(--color-on-surface))">
              {{ cobroSeleccionado()!.pensionadoNombre }} {{ cobroSeleccionado()!.pensionadoApellido }}
            </p>
            <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">
              Período: {{ cobroSeleccionado()!.mes }}/{{ cobroSeleccionado()!.anio }}
            </p>
            <div class="flex justify-between text-sm">
              <span style="color:rgb(var(--color-on-surface)/0.5)">Total a cobrar:</span>
              <span class="font-bold font-mono"
                    style="color:rgb(var(--color-on-surface))">
                Bs {{ cobroSeleccionado()!.saldoRestante | number:'1.2-2' }}
              </span>
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <label class="input-label">Monto a pagar (Bs) *</label>
              <input [(ngModel)]="montoPago" type="number" class="input text-sm"
                     [max]="cobroSeleccionado()!.saldoRestante" min="0.01" step="0.01"
                     [placeholder]="cobroSeleccionado()!.saldoRestante.toFixed(2)"
                     maxlength="12">
            </div>
            <div>
              <label class="input-label">Forma de pago *</label>
              <select [(ngModel)]="formaPago" class="input text-sm">
                <option value="EFECTIVO">Efectivo</option>
                <option value="QR">QR</option>
                <option value="MIXTO">Mixto</option>
              </select>
            </div>
          </div>

          @if (errorModal()) {
            <p class="text-xs p-2 rounded-lg"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              {{ errorModal() }}
            </p>
          }

          <div class="flex gap-2">
            <button (click)="cobroSeleccionado.set(null)"
                    class="btn-secondary flex-1 justify-center">Cancelar</button>
            <button (click)="confirmarPago()" [disabled]="guardando()"
                    class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else { Confirmar pago }
            </button>
          </div>
        </div>
      </div>
    }

  `,
})
export class CobrosComponent implements OnInit {
  cobros            = signal<CobroMensual[]>([]);
  pendientes        = computed(() => this.cobros().filter(c => !c.pagado));
  cargando          = signal(true);
  vistaActiva       = signal<'pendientes' | 'todos'>('pendientes');
  cobroSeleccionado = signal<CobroMensual | null>(null);
  montoPago         = 0;
  formaPago         = 'EFECTIVO';
  guardando         = signal(false);
  errorModal        = signal('');
  busqueda          = signal('');

  sortCol = signal<SortColCobro | ''>('');
  sortDir = signal<'asc' | 'desc'>('asc');
  pagina  = signal(1);
  readonly pageSize = 10;

  totalPendiente = computed(() =>
    this.pendientes().reduce((s, c) => s + c.saldoRestante, 0)
  );

  totalPagados = computed(() => this.cobros().filter(c => c.pagado).length);

  cobrosVisibles = computed(() => {
    const base = this.vistaActiva() === 'pendientes' ? this.pendientes() : this.cobros();
    const q = this.busqueda().toLowerCase().trim();
    let lista = q
      ? base.filter(c =>
          `${c.pensionadoNombre} ${c.pensionadoApellido}`.toLowerCase().includes(q)
        )
      : base;
    const col = this.sortCol();
    if (col) {
      const dir = this.sortDir() === 'asc' ? 1 : -1;
      lista = [...lista].sort((a, b) => {
        if (col === 'nombre')  return dir * `${a.pensionadoNombre} ${a.pensionadoApellido}`
                                             .localeCompare(`${b.pensionadoNombre} ${b.pensionadoApellido}`);
        if (col === 'periodo') return dir * (a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes);
        if (col === 'total')   return dir * (a.totalCobrado - b.totalCobrado);
        if (col === 'saldo')   return dir * (a.saldoRestante - b.saldoRestante);
        return 0;
      });
    }
    return lista;
  });

  cobrosPaginados = computed(() => {
    const desde = (this.pagina() - 1) * this.pageSize;
    return this.cobrosVisibles().slice(desde, desde + this.pageSize);
  });

  constructor(
    private pensionadoService: PensionadoService,
    private toastSvc: ToastService,
  ) {}

  ngOnInit(): void {
    this.pensionadoService.cobrosPendientes().subscribe({
      next: cs => { this.cobros.set(cs); this.cargando.set(false); },
      error: () => { this.cargando.set(false); this.toastSvc.error('No se pudo cargar los cobros'); },
    });
  }

  cambiarVista(v: 'pendientes' | 'todos'): void {
    this.vistaActiva.set(v);
    this.pagina.set(1);
  }

  sortBy(col: SortColCobro): void {
    if (this.sortCol() === col) this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    else { this.sortCol.set(col); this.sortDir.set('asc'); }
    this.pagina.set(1);
  }

  si(col: string): string {
    if (this.sortCol() !== col) return '⇅';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  abrirPago(cobro: CobroMensual): void {
    this.cobroSeleccionado.set(cobro);
    this.montoPago = cobro.saldoRestante;
    this.formaPago = 'EFECTIVO';
    this.errorModal.set('');
  }

  confirmarPago(): void {
    const cobro = this.cobroSeleccionado();
    if (!cobro) return;
    if (!this.montoPago || this.montoPago <= 0) {
      this.errorModal.set('Ingrese un monto válido mayor a cero.');
      return;
    }
    if (this.montoPago > cobro.saldoRestante) {
      this.errorModal.set(`El monto no puede superar el saldo restante (Bs ${cobro.saldoRestante.toFixed(2)}).`);
      return;
    }
    this.guardando.set(true);
    this.pensionadoService.registrarPago({
      pensionadoId: cobro.pensionadoId,
      mes: cobro.mes,
      anio: cobro.anio,
      montoPagado: this.montoPago,
      formaPago: this.formaPago,
    }).subscribe({
      next: updated => {
        this.cobros.update(cs => cs.map(c => c.id === updated.id ? updated : c));
        this.guardando.set(false);
        this.cobroSeleccionado.set(null);
        this.toastSvc.success(`Pago registrado — Bs ${updated.montoPagado.toFixed(2)}`);
      },
      error: err => {
        this.guardando.set(false);
        this.errorModal.set(err?.error?.mensaje ?? 'Error al registrar pago');
      }
    });
  }
}
