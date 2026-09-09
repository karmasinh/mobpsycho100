import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioService, InsumoService, ProveedorService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { StockInsumo, LoteInsumo, Proveedor, Insumo } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <div class="space-y-5 animate-fade-up">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Inventario
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ stockList().length }} registros · Control FEFO — Primero en vencer, primero en consumir
          </p>
        </div>
        <div class="flex gap-2">
          <button (click)="vistaActiva.set('stock')"
                  class="btn text-sm py-2 px-3"
                  [class.btn-primary]="vistaActiva()==='stock'"
                  [class.btn-secondary]="vistaActiva()!=='stock'">
            📦 Stock
          </button>
          <button (click)="vistaActiva.set('vencimientos')"
                  class="btn text-sm py-2 px-3"
                  [class.btn-primary]="vistaActiva()==='vencimientos'"
                  [class.btn-secondary]="vistaActiva()!=='vencimientos'">
            ⚠️ Vencimientos
          </button>
          <button (click)="abrirIngresoModal()"
                  class="btn-primary text-sm py-2 px-3">
            + Ingresar lote
          </button>
        </div>
      </div>

      @if (!auth.sucursalActiva()) {
        <div class="card text-center py-8">
          <p class="text-3xl mb-2">🏪</p>
          <p style="color:rgb(var(--color-on-surface)/0.5)">Selecciona una sucursal antes de ver el inventario.</p>
        </div>
      } @else {

      <!-- Stats rápidas -->
      <div class="grid grid-cols-3 gap-4">
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <span class="text-xl">📦</span>
            <span class="badge-neutral">Total</span>
          </div>
          <p class="stat-value mt-2">{{ stockList().length }}</p>
          <p class="stat-label">Insumos activos</p>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <span class="text-xl">🔴</span>
            @if (stockBajo().length > 0) {
              <span class="badge-danger">Alerta</span>
            }
          </div>
          <p class="stat-value mt-2"
             [style.color]="stockBajo().length > 0 ? 'rgb(var(--color-danger))' : 'inherit'">
            {{ stockBajo().length }}
          </p>
          <p class="stat-label">Bajo el mínimo</p>
        </div>
        <div class="stat-card">
          <div class="flex items-center justify-between">
            <span class="text-xl">📅</span>
            @if (lotesPorVencer().length > 0) {
              <span class="badge-warning">{{ lotesPorVencer().length }}</span>
            }
          </div>
          <p class="stat-value mt-2"
             [style.color]="lotesPorVencer().length > 0 ? 'rgb(var(--color-warning))' : 'inherit'">
            {{ lotesPorVencer().length }}
          </p>
          <p class="stat-label">Por vencer (15 días)</p>
        </div>
      </div>

      <!-- VISTA: STOCK -->
      @if (vistaActiva() === 'stock') {
        <div class="card p-0 overflow-hidden">
          <!-- Search -->
          <div class="p-4" style="border-bottom:1px solid rgb(var(--color-border))">
            <input [(ngModel)]="busqueda" (ngModelChange)="pagina.set(1)" maxlength="100" class="input max-w-xs text-sm"
                   placeholder="🔍 Buscar insumo...">
          </div>

          <div class="table-wrapper" style="border:none;border-radius:0">
            <table>
              <thead>
                <tr>
                  <th (click)="sortBy('codigo')" class="cursor-pointer select-none">
                    <div class="flex items-center gap-1">Código <span class="text-xs opacity-40">{{ si('codigo') }}</span></div>
                  </th>
                  <th (click)="sortBy('nombre')" class="cursor-pointer select-none">
                    <div class="flex items-center gap-1">Insumo <span class="text-xs opacity-40">{{ si('nombre') }}</span></div>
                  </th>
                  <th>Unidad</th>
                  <th (click)="sortBy('stockActual')" class="cursor-pointer select-none">
                    <div class="flex items-center gap-1">Stock actual <span class="text-xs opacity-40">{{ si('stockActual') }}</span></div>
                  </th>
                  <th>Stock mínimo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @if (cargando()) {
                  @for (i of [1,2,3,4,5]; track i) {
                    <tr>@for (j of [1,2,3,4,5,6,7]; track j){<td><div class="skeleton h-4 rounded"></div></td>}</tr>
                  }
                }
                @for (item of stockPaginado(); track item.insumoId) {
                  <tr>
                    <td class="font-mono text-xs">{{ item.codigo }}</td>
                    <td>
                      <p class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">
                        {{ item.nombre }}
                      </p>
                      <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.4)">
                        {{ item.categoriaNombre }}
                      </p>
                    </td>
                    <td class="text-sm">{{ item.unidadMedida }}</td>
                    <td>
                      <span class="font-mono font-semibold text-sm"
                            [style.color]="item.stockActual <= item.stockMinimo
                              ? 'rgb(var(--color-danger))' : 'rgb(var(--color-success))'">
                        {{ item.stockActual | number:'1.2-2' }}
                      </span>
                    </td>
                    <td class="font-mono text-sm text-on-surface/60">
                      {{ item.stockMinimo | number:'1.2-2' }}
                    </td>
                    <td>
                      @if (item.stockActual <= 0) {
                        <span class="badge-danger">Sin stock</span>
                      } @else if (item.stockActual <= item.stockMinimo) {
                        <span class="badge-warning">Bajo mínimo</span>
                      } @else {
                        <span class="badge-success">OK</span>
                      }
                    </td>
                    <td>
                      <div class="flex gap-1">
                        <button (click)="consumirStock(item)"
                                class="text-xs py-1 px-2 rounded-lg transition-all"
                                style="background:rgb(var(--color-primary)/0.1);color:rgb(var(--color-primary))">
                          − Consumir
                        </button>
                        <button (click)="abrirAjuste(item)"
                                class="text-xs py-1 px-2 rounded-lg transition-all"
                                style="background:rgb(var(--color-surface));border:1px solid rgb(var(--color-border));color:rgb(var(--color-on-surface)/0.6)">
                          Ajustar
                        </button>
                        <button (click)="abrirAjusteMinimo(item)"
                                class="text-xs py-1 px-2 rounded-lg transition-all"
                                style="background:rgb(var(--color-surface));border:1px solid rgb(var(--color-border));color:rgb(var(--color-on-surface)/0.6)"
                                title="Ajustar stock mínimo">
                          Mín.
                        </button>
                        <button (click)="abrirAjusteFisico(item)"
                                class="text-xs py-1 px-2 rounded-lg transition-all"
                                style="background:rgb(var(--color-surface));border:1px solid rgb(var(--color-border));color:rgb(var(--color-on-surface)/0.6)"
                                title="Corregir stock según conteo físico">
                          Ajuste físico
                        </button>
                      </div>
                    </td>
                  </tr>
                }
                @if (!cargando() && stockFiltrado().length === 0) {
                  <tr>
                    <td colspan="7" class="text-center py-10"
                        style="color:rgb(var(--color-on-surface)/0.35)">
                      Sin insumos encontrados
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <app-pagination
          [total]="stockFiltrado().length"
          [pagina]="pagina()"
          [pageSize]="pageSize"
          (pageChange)="pagina.set($event)" />
      }

      <!-- VISTA: VENCIMIENTOS -->
      @if (vistaActiva() === 'vencimientos') {
        <div class="space-y-3">
          @for (lote of lotesPorVencer(); track lote.id) {
            <div class="card flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                   [style.background]="getDiasColor(lote.fechaVencimiento!, 'bg')"
                   [style.color]="getDiasColor(lote.fechaVencimiento!, 'text')">
                📅
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">
                  {{ lote.insumo?.nombre }}
                </p>
                <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">
                  Lote: {{ lote.numeroLote }} · {{ lote.cantidadDisponible | number:'1.2-2' }} {{ lote.insumo?.unidadMedida }} disponibles
                </p>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="font-mono font-bold text-sm"
                   [style.color]="getDiasColor(lote.fechaVencimiento!, 'text')">
                  {{ getDiasRestantes(lote.fechaVencimiento!) }} días
                </p>
                <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.4)">
                  Vence {{ lote.fechaVencimiento | date:'dd/MM/yyyy' }}
                </p>
              </div>
              <div [class]="getVencimientoBadge(lote.fechaVencimiento!)">
                {{ getVencimientoLabel(lote.fechaVencimiento!) }}
              </div>
            </div>
          }
          @if (lotesPorVencer().length === 0) {
            <div class="card text-center py-12">
              <p class="text-4xl mb-3">✅</p>
              <p style="color:rgb(var(--color-on-surface)/0.4)">
                Sin lotes próximos a vencer en los próximos 15 días
              </p>
            </div>
          }
        </div>
      }
      }
    </div>

    <!-- Modal Ingreso de Lote -->
    @if (modalIngreso()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.6)" (click)="cerrarModal()">
        <div class="card max-w-md w-full space-y-4 animate-fade-up"
             (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h3 class="font-display font-bold" style="color:rgb(var(--color-on-surface))">
              📦 Ingresar Lote de Insumo
            </h3>
            <button (click)="cerrarModal()" class="btn-ghost p-1">✕</button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="input-label">Insumo *</label>
              <select [(ngModel)]="formLote.insumoId" class="input text-sm">
                <option value="">Seleccionar insumo...</option>
                @for (i of catalogoInsumos(); track i.id) {
                  <option [value]="i.id">{{ i.codigo }} — {{ i.nombre }}</option>
                }
              </select>
            </div>
            <div>
              <label class="input-label">Proveedor</label>
              <select [(ngModel)]="formLote.proveedorId" class="input text-sm">
                <option value="">Sin proveedor / no especificado</option>
                @for (p of proveedores(); track p.id) {
                  <option [value]="p.id">{{ p.nombre }}</option>
                }
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="input-label">Cantidad *</label>
                <input [(ngModel)]="formLote.cantidad" type="number" min="0.01"
                       class="input text-sm" placeholder="0.00">
              </div>
              <div>
                <label class="input-label">Precio unitario *</label>
                <input [(ngModel)]="formLote.precioUnitario" type="number" min="0"
                       class="input text-sm" placeholder="0.00">
              </div>
            </div>
            <div>
              <label class="input-label">Número de lote</label>
              <input [(ngModel)]="formLote.numeroLote" maxlength="100" class="input text-sm"
                     placeholder="Auto-generado si está vacío">
            </div>
            <div>
              <label class="input-label">Fecha de vencimiento</label>
              <input [(ngModel)]="formLote.fechaVencimiento" type="date" class="input text-sm">
            </div>
          </div>

          @if (errorModal()) {
            <p class="text-xs p-2 rounded-lg"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              {{ errorModal() }}
            </p>
          }

          <div class="flex gap-2 pt-1">
            <button (click)="cerrarModal()" class="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button (click)="guardarLote()" [disabled]="guardando()"
                    class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else {
                Ingresar lote
              }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal Consumo / Ajuste -->
    @if (modalConsumo()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.6)" (click)="cerrarModal()">
        <div class="card max-w-sm w-full space-y-4 animate-fade-up"
             (click)="$event.stopPropagation()">
          <h3 class="font-display font-bold" style="color:rgb(var(--color-on-surface))">
            🍳 Consumir Stock
          </h3>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.6)">
            Insumo: <strong>{{ itemSeleccionado()?.nombre }}</strong> ·
            Disponible: {{ itemSeleccionado()?.stockActual | number:'1.2-2' }}
            {{ itemSeleccionado()?.unidadMedida }}
          </p>
          <div class="space-y-3">
            <div>
              <label class="input-label">Cantidad a consumir *</label>
              <input [(ngModel)]="formConsumo.cantidad" type="number" min="0.01"
                     class="input" placeholder="0.00">
            </div>
            <div>
              <label class="input-label">Motivo</label>
              <input [(ngModel)]="formConsumo.motivo" maxlength="250" class="input text-sm"
                     placeholder="Consumo en producción">
            </div>
          </div>
          @if (errorModal()) {
            <p class="text-xs p-2 rounded-lg"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              {{ errorModal() }}
            </p>
          }
          <div class="flex gap-2">
            <button (click)="cerrarModal()" class="btn-secondary flex-1 justify-center">Cancelar</button>
            <button (click)="confirmarConsumo()" [disabled]="guardando()"
                    class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else { Confirmar }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal Ajuste físico de stock -->
    @if (modalAjusteFisico()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.6)" (click)="cerrarModal()">
        <div class="card max-w-sm w-full space-y-4 animate-fade-up"
             (click)="$event.stopPropagation()">
          <h3 class="font-display font-bold" style="color:rgb(var(--color-on-surface))">
            📦 Ajuste físico de inventario
          </h3>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.6)">
            Insumo: <strong>{{ itemSeleccionado()?.nombre }}</strong> ·
            Sistema: {{ itemSeleccionado()?.stockActual | number:'1.2-2' }}
            {{ itemSeleccionado()?.unidadMedida }}
          </p>
          <div class="space-y-3">
            <div>
              <label class="input-label">Cantidad real contada *</label>
              <input [(ngModel)]="formAjusteFisico.cantidad" type="number" min="0"
                     class="input" placeholder="0.00">
            </div>
            <div>
              <label class="input-label">Motivo *</label>
              <input [(ngModel)]="formAjusteFisico.motivo" maxlength="250" class="input text-sm"
                     placeholder="Conteo físico de inventario">
            </div>
          </div>
          @if (errorModal()) {
            <p class="text-xs p-2 rounded-lg"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              {{ errorModal() }}
            </p>
          }
          <div class="flex gap-2">
            <button (click)="cerrarModal()" class="btn-secondary flex-1 justify-center">Cancelar</button>
            <button (click)="confirmarAjusteFisico()" [disabled]="guardando()"
                    class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else { Confirmar }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal Ajustar mínimo -->
    @if (modalMinimo()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.6)" (click)="cerrarModal()">
        <div class="card max-w-sm w-full space-y-4 animate-fade-up"
             (click)="$event.stopPropagation()">
          <h3 class="font-display font-bold" style="color:rgb(var(--color-on-surface))">
            🎚️ Ajustar Stock Mínimo
          </h3>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.6)">
            Insumo: <strong>{{ itemSeleccionado()?.nombre }}</strong> en esta sucursal
          </p>
          <div>
            <label class="input-label">Nuevo stock mínimo *</label>
            <input [(ngModel)]="formMinimo" type="number" min="0" class="input" placeholder="0.00">
          </div>
          @if (errorModal()) {
            <p class="text-xs p-2 rounded-lg"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              {{ errorModal() }}
            </p>
          }
          <div class="flex gap-2">
            <button (click)="cerrarModal()" class="btn-secondary flex-1 justify-center">Cancelar</button>
            <button (click)="confirmarAjusteMinimo()" [disabled]="guardando()"
                    class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else { Confirmar }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class InventarioComponent implements OnInit {
  vistaActiva        = signal<'stock' | 'vencimientos'>('stock');
  stockList          = signal<StockInsumo[]>([]);
  catalogoInsumos     = signal<Insumo[]>([]);
  proveedores        = signal<Proveedor[]>([]);
  stockBajo          = signal<StockInsumo[]>([]);
  lotesPorVencer     = signal<LoteInsumo[]>([]);
  cargando           = signal(true);
  busqueda           = '';
  modalIngreso       = signal(false);
  modalConsumo       = signal(false);
  modalMinimo        = signal(false);
  modalAjusteFisico  = signal(false);
  itemSeleccionado   = signal<StockInsumo | null>(null);
  guardando          = signal(false);
  errorModal         = signal('');

  pagina             = signal(1);
  readonly pageSize  = 10;

  sortCol = signal<string>('');
  sortDir = signal<'asc' | 'desc'>('asc');

  formLote = { insumoId: '', proveedorId: '', cantidad: 0, precioUnitario: 0, numeroLote: '', fechaVencimiento: '' };
  formConsumo = { cantidad: 0, motivo: 'Consumo en producción' };
  formMinimo: number | null = null;
  formAjusteFisico = { cantidad: 0, motivo: 'Conteo físico de inventario' };

  stockFiltrado = computed(() => {
    const q = this.busqueda.toLowerCase();
    let lista = q
      ? this.stockList().filter(i =>
          i.nombre.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q)
        )
      : this.stockList();
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

  stockPaginado = computed(() => {
    const lista = this.stockFiltrado();
    return lista.slice((this.pagina() - 1) * this.pageSize, this.pagina() * this.pageSize);
  });

  constructor(
    private inventarioService: InventarioService,
    private insumoService: InsumoService,
    private proveedorService: ProveedorService,
    private toastSvc: ToastService,
    public auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.insumoService.listarTodos().subscribe({
      next: lista => this.catalogoInsumos.set(lista),
      error: () => {},
    });
    this.proveedorService.listar().subscribe({
      next: lista => this.proveedores.set(lista),
      error: () => {},
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

  cargar(): void {
    const sucursalId = this.auth.sucursalActiva();
    if (sucursalId == null) { this.cargando.set(false); return; }

    this.cargando.set(true);
    this.inventarioService.stock(sucursalId).subscribe({
      next: list => { this.stockList.set(list); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
    this.inventarioService.stockBajo(sucursalId).subscribe({ next: l => this.stockBajo.set(l), error: () => {} });
    this.inventarioService.vencimientos(15, sucursalId).subscribe({ next: l => this.lotesPorVencer.set(l), error: () => {} });
  }

  abrirIngresoModal(): void {
    this.formLote = { insumoId: '', proveedorId: '', cantidad: 0, precioUnitario: 0, numeroLote: '', fechaVencimiento: '' };
    this.errorModal.set('');
    this.modalIngreso.set(true);
  }

  abrirAjuste(item: StockInsumo): void {
    this.itemSeleccionado.set(item);
    this.formConsumo = { cantidad: item.stockActual, motivo: 'Ajuste inventario físico' };
    this.errorModal.set('');
    this.modalConsumo.set(true);
  }

  abrirAjusteMinimo(item: StockInsumo): void {
    this.itemSeleccionado.set(item);
    this.formMinimo = item.stockMinimo;
    this.errorModal.set('');
    this.modalMinimo.set(true);
  }

  abrirAjusteFisico(item: StockInsumo): void {
    this.itemSeleccionado.set(item);
    this.formAjusteFisico = { cantidad: item.stockActual, motivo: 'Conteo físico de inventario' };
    this.errorModal.set('');
    this.modalAjusteFisico.set(true);
  }

  consumirStock(item: StockInsumo): void {
    this.itemSeleccionado.set(item);
    this.formConsumo = { cantidad: 0, motivo: 'Consumo en producción' };
    this.errorModal.set('');
    this.modalConsumo.set(true);
  }

  guardarLote(): void {
    const sucursalId = this.auth.sucursalActiva();
    if (sucursalId == null) { this.errorModal.set('Selecciona una sucursal antes de ingresar un lote.'); return; }
    if (!this.formLote.insumoId || this.formLote.cantidad <= 0 || this.formLote.precioUnitario <= 0) {
      this.errorModal.set('Complete los campos obligatorios.');
      return;
    }
    this.guardando.set(true);
    this.inventarioService.ingresarLote(Number(this.formLote.insumoId), sucursalId, {
      proveedorId: this.formLote.proveedorId ? Number(this.formLote.proveedorId) : undefined,
      cantidad: this.formLote.cantidad,
      precioUnitario: this.formLote.precioUnitario,
      numeroLote: this.formLote.numeroLote || undefined,
      fechaVencimiento: this.formLote.fechaVencimiento || undefined,
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.toastSvc.success('✅ Lote ingresado correctamente');
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        this.errorModal.set(err?.error?.mensaje ?? 'Error al ingresar lote');
      }
    });
  }

  confirmarConsumo(): void {
    const item = this.itemSeleccionado();
    const sucursalId = this.auth.sucursalActiva();
    if (!item || this.formConsumo.cantidad <= 0) {
      this.errorModal.set('Ingrese una cantidad válida.');
      return;
    }
    if (sucursalId == null) { this.errorModal.set('Selecciona una sucursal.'); return; }
    this.guardando.set(true);
    this.inventarioService.consumirStock(item.insumoId, sucursalId, this.formConsumo.cantidad, this.formConsumo.motivo).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.toastSvc.success(`✅ Consumo registrado — ${item.nombre}`);
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        this.errorModal.set(err?.error?.mensaje ?? 'Error al consumir stock');
      }
    });
  }

  confirmarAjusteMinimo(): void {
    const item = this.itemSeleccionado();
    const sucursalId = this.auth.sucursalActiva();
    if (!item || this.formMinimo == null || this.formMinimo < 0) {
      this.errorModal.set('Ingrese un valor válido.');
      return;
    }
    if (sucursalId == null) { this.errorModal.set('Selecciona una sucursal.'); return; }
    this.guardando.set(true);
    this.inventarioService.ajustarStockMinimo(item.insumoId, sucursalId, this.formMinimo).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.toastSvc.success(`✅ Stock mínimo actualizado — ${item.nombre}`);
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        this.errorModal.set(err?.error?.mensaje ?? 'Error al ajustar el mínimo');
      }
    });
  }

  confirmarAjusteFisico(): void {
    const item = this.itemSeleccionado();
    const sucursalId = this.auth.sucursalActiva();
    if (!item || this.formAjusteFisico.cantidad < 0) {
      this.errorModal.set('Ingrese una cantidad válida.');
      return;
    }
    if (!this.formAjusteFisico.motivo.trim()) {
      this.errorModal.set('Indique un motivo para el ajuste.');
      return;
    }
    if (sucursalId == null) { this.errorModal.set('Selecciona una sucursal.'); return; }
    this.guardando.set(true);
    this.inventarioService.ajustarStock(item.insumoId, sucursalId, this.formAjusteFisico.cantidad, this.formAjusteFisico.motivo).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.toastSvc.success(`✅ Stock ajustado — ${item.nombre}`);
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        this.errorModal.set(err?.error?.mensaje ?? 'Error al ajustar el stock');
      }
    });
  }

  cerrarModal(): void {
    this.modalIngreso.set(false);
    this.modalConsumo.set(false);
    this.modalMinimo.set(false);
    this.modalAjusteFisico.set(false);
    this.errorModal.set('');
  }

  getDiasRestantes(fecha: string): number {
    const diff = new Date(fecha).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  }

  getDiasColor(fecha: string, tipo: 'bg' | 'text'): string {
    const d = this.getDiasRestantes(fecha);
    if (d <= 3)  return tipo === 'bg' ? 'rgb(var(--color-danger)/0.15)'  : 'rgb(var(--color-danger))';
    if (d <= 7)  return tipo === 'bg' ? 'rgb(var(--color-warning)/0.15)' : 'rgb(var(--color-warning))';
    return tipo === 'bg' ? 'rgb(var(--color-info)/0.15)' : 'rgb(var(--color-info))';
  }

  getVencimientoBadge(fecha: string): string {
    const d = this.getDiasRestantes(fecha);
    if (d <= 3)  return 'badge-danger';
    if (d <= 7)  return 'badge-warning';
    return 'badge-info';
  }

  getVencimientoLabel(fecha: string): string {
    const d = this.getDiasRestantes(fecha);
    if (d <= 3)  return '🔴 Urgente';
    if (d <= 7)  return '🟡 Pronto';
    return '🔵 Próximo';
  }
}
