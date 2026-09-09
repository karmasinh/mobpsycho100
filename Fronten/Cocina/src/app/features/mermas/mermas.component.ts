import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MermaService, InventarioService, Merma } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { StockInsumo } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-mermas',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <div class="space-y-5 animate-fade-up">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Registro de Mermas
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ mermas().length }} registros · Registra y consulta pérdidas por deterioro, vencimiento o daño
          </p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button (click)="descargarPdf()" class="btn-secondary text-sm py-2 px-3"
            [disabled]="mermasFiltradas().length === 0">
            📄 Exportar PDF
          </button>
          <button (click)="abrirModal()" class="btn-primary text-sm py-2 px-3">
            + Nueva Merma
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div class="card p-4">
          <p class="text-xs font-medium uppercase tracking-wide"
            style="color:rgb(var(--color-on-surface)/0.5)">Total Registros</p>
          <p class="text-2xl font-bold mt-1" style="color:rgb(var(--color-on-surface))">
            {{ mermasFiltradas().length }}
          </p>
        </div>
        <div class="card p-4">
          <p class="text-xs font-medium uppercase tracking-wide"
            style="color:rgb(var(--color-on-surface)/0.5)">Pérdida Económica</p>
          <p class="text-2xl font-bold mt-1 text-red-400">
            Bs {{ valorTotalFiltrado() | number:'1.2-2' }}
          </p>
        </div>
        <div class="card p-4 col-span-2 sm:col-span-1">
          <p class="text-xs font-medium uppercase tracking-wide"
            style="color:rgb(var(--color-on-surface)/0.5)">Unidades Perdidas</p>
          <p class="text-2xl font-bold mt-1 text-amber-400">
            {{ cantidadTotalFiltrada() | number:'1.2-2' }}
          </p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex gap-2 flex-wrap">
        <input [(ngModel)]="busqueda" (ngModelChange)="pagina.set(1); actualizarFiltros()"
          class="input text-sm w-full sm:w-52" placeholder="🔍 Buscar insumo o causa..."
          maxlength="100">
        <select [(ngModel)]="insumoFiltro" (ngModelChange)="pagina.set(1); actualizarFiltros()"
          class="input text-sm w-full sm:w-52">
          <option value="">Todos los insumos</option>
          @for (ins of insumos(); track ins.insumoId) {
            <option [value]="ins.insumoId">{{ ins.nombre }}</option>
          }
        </select>
      </div>

      <!-- Tabla -->
      <div class="card p-0 overflow-hidden">
        <div class="table-wrapper" style="border:none;border-radius:0">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th class="cursor-pointer select-none" (click)="sortBy('fecha')">
                  Fecha {{ si('fecha') }}
                </th>
                <th>Hora</th>
                <th class="cursor-pointer select-none" (click)="sortBy('insumoNombre')">
                  Insumo {{ si('insumoNombre') }}
                </th>
                <th class="cursor-pointer select-none" (click)="sortBy('cantidad')">
                  Cantidad {{ si('cantidad') }}
                </th>
                <th class="cursor-pointer select-none" (click)="sortBy('causa')">
                  Causa {{ si('causa') }}
                </th>
                <th>Observaciones</th>
                <th class="text-right cursor-pointer select-none" (click)="sortBy('valorEconomico')">
                  Valor Bs {{ si('valorEconomico') }}
                </th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              @if (cargando()) {
                @for (i of [1,2,3,4,5]; track i) {
                  <tr>
                    @for (j of [1,2,3,4,5,6,7,8,9]; track j) {
                      <td><div class="skeleton h-4 rounded"></div></td>
                    }
                  </tr>
                }
              }

              @for (m of mermasPaginadas(); track m.id; let idx = $index) {
                <tr>
                  <td class="text-xs" style="color:rgb(var(--color-on-surface)/0.4)">
                    {{ (pagina() - 1) * pageSize + idx + 1 }}
                  </td>
                  <td>{{ m.fecha }}</td>
                  <td class="tabular-nums">{{ m.hora | slice:0:5 }}</td>
                  <td>
                    <span class="font-medium">{{ m.insumoNombre }}</span>
                  </td>
                  <td class="text-amber-400 font-semibold tabular-nums">
                    {{ m.cantidad | number:'1.2-2' }}
                    <span class="text-xs font-normal" style="color:rgb(var(--color-on-surface)/0.5)">
                      {{ m.insumoUnidad }}
                    </span>
                  </td>
                  <td>{{ m.causa }}</td>
                  <td class="text-sm max-w-[180px] truncate"
                    [title]="m.observaciones" style="color:rgb(var(--color-on-surface)/0.6)">
                    {{ m.observaciones || '—' }}
                  </td>
                  <td class="text-right text-red-400 font-semibold tabular-nums">
                    {{ m.valorEconomico | number:'1.2-2' }}
                  </td>
                  <td class="text-sm" style="color:rgb(var(--color-on-surface)/0.6)">
                    {{ m.usuario ?? '—' }}
                  </td>
                </tr>
              }

              @if (!cargando() && mermasFiltradas().length === 0) {
                <tr>
                  <td colspan="9" class="text-center py-12 text-sm"
                    style="color:rgb(var(--color-on-surface)/0.4)">
                    No se encontraron mermas registradas
                  </td>
                </tr>
              }
            </tbody>
            @if (mermasFiltradas().length > 0) {
              <tfoot>
                <tr style="background:rgb(var(--color-surface-container))">
                  <td colspan="7" class="text-right font-semibold pr-4 text-sm">TOTAL</td>
                  <td class="text-right font-bold text-red-400 tabular-nums">
                    {{ valorTotalFiltrado() | number:'1.2-2' }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            }
          </table>
        </div>
      </div>

      <app-pagination
        [total]="mermasFiltradas().length"
        [pagina]="pagina()"
        [pageSize]="pageSize"
        (pageChange)="pagina.set($event)" />
    </div>

    <!-- Modal Nueva Merma -->
    @if (modalAbierto()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style="background:rgba(0,0,0,0.6)" (click)="cerrarModal()">
        <div class="card w-full max-w-md p-6 space-y-5" (click)="$event.stopPropagation()">

          <div class="flex items-center justify-between">
            <h2 class="font-display text-xl font-bold" style="color:rgb(var(--color-on-surface))">
              Registrar Merma
            </h2>
            <button (click)="cerrarModal()" class="text-2xl leading-none"
              style="color:rgb(var(--color-on-surface)/0.4)">×</button>
          </div>

          <div class="space-y-4">

            <div>
              <label class="label">Insumo *</label>
              <select [(ngModel)]="form.insumoId" (ngModelChange)="onInsumoChange()" class="input w-full">
                <option value="">Seleccionar insumo...</option>
                @for (ins of insumos(); track ins.insumoId) {
                  <option [value]="ins.insumoId">
                    {{ ins.nombre }} — stock: {{ ins.stockActual | number:'1.2-2' }} {{ ins.unidadMedida }}
                  </option>
                }
              </select>
            </div>

            <div>
              <label class="label">Cantidad *</label>
              <div class="relative">
                <input type="number" [(ngModel)]="form.cantidad" class="input w-full pr-16"
                  min="0.01" step="0.01" placeholder="0.00">
                @if (insumoSeleccionado()) {
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                    style="color:rgb(var(--color-on-surface)/0.5)">
                    {{ insumoSeleccionado()!.unidadMedida }}
                  </span>
                }
              </div>
              @if (insumoSeleccionado()) {
                <p class="text-xs mt-1" style="color:rgb(var(--color-on-surface)/0.5)">
                  Stock disponible: <span class="font-semibold">
                    {{ insumoSeleccionado()!.stockActual | number:'1.2-2' }}
                    {{ insumoSeleccionado()!.unidadMedida }}
                  </span>
                </p>
              }
            </div>

            <div>
              <label class="label">Causa *</label>
              <select [(ngModel)]="form.causa" class="input w-full">
                <option value="">Seleccionar causa...</option>
                <option value="Deterioro por tiempo">Deterioro por tiempo</option>
                <option value="Daño en manipulación">Daño en manipulación</option>
                <option value="Contaminación">Contaminación</option>
                <option value="Temperatura inadecuada">Temperatura inadecuada</option>
                <option value="Error en preparación">Error en preparación</option>
                <option value="Rotura de envase">Rotura de envase</option>
                <option value="Vencimiento anticipado">Vencimiento anticipado</option>
                <option value="Otra causa">Otra causa</option>
              </select>
            </div>

            <div>
              <label class="label">Observaciones</label>
              <textarea [(ngModel)]="form.observaciones" class="input w-full" rows="3"
                placeholder="Detalles adicionales sobre la merma..." maxlength="250"></textarea>
            </div>

            @if (form.insumoId && form.cantidad > 0 && insumoSeleccionado()) {
              <div class="rounded-lg p-3 space-y-1"
                style="background:rgb(var(--color-surface-container))">
                <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.6)">
                  Precio unitario:
                  <span class="font-semibold">Bs {{ insumoSeleccionado()!.precioUnitario | number:'1.2-2' }}</span>
                </p>
                <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.8)">
                  Pérdida estimada:
                  <span class="font-bold text-red-400 ml-1">
                    Bs {{ valorEstimado() | number:'1.2-2' }}
                  </span>
                </p>
              </div>
            }
          </div>

          @if (error()) {
            <p class="text-sm text-red-400 rounded p-2" style="background:rgb(220 38 38/0.1)">
              ⚠ {{ error() }}
            </p>
          }

          <div class="flex gap-2 justify-end pt-2">
            <button (click)="cerrarModal()" class="btn-secondary text-sm py-2 px-4">
              Cancelar
            </button>
            <button (click)="guardar()" class="btn-primary text-sm py-2 px-4"
              [disabled]="guardando()">
              {{ guardando() ? 'Registrando...' : 'Registrar Merma' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class MermasComponent implements OnInit {
  mermas    = signal<Merma[]>([]);
  insumos   = signal<StockInsumo[]>([]);
  cargando  = signal(true);
  modalAbierto = signal(false);
  guardando = signal(false);
  error     = signal('');

  busqueda    = '';
  insumoFiltro = '';

  pagina   = signal(1);
  readonly pageSize = 10;

  sortCol = signal<string>('');
  sortDir = signal<'asc' | 'desc'>('asc');

  private _mermasFiltradas = signal<Merma[]>([]);
  mermasFiltradas = this._mermasFiltradas.asReadonly();

  mermasPaginadas = computed(() => {
    const lista = this._mermasFiltradas();
    return lista.slice((this.pagina() - 1) * this.pageSize, this.pagina() * this.pageSize);
  });

  insumoSeleccionado = computed(() =>
    this.insumos().find(i => i.insumoId === +this.form.insumoId) ?? null
  );

  valorEstimado = computed(() => {
    const ins = this.insumoSeleccionado();
    return ins ? ins.precioUnitario * (this.form.cantidad ?? 0) : 0;
  });

  valorTotalFiltrado = computed(() =>
    this._mermasFiltradas().reduce((s, m) => s + m.valorEconomico, 0)
  );

  cantidadTotalFiltrada = computed(() =>
    this._mermasFiltradas().reduce((s, m) => s + m.cantidad, 0)
  );

  form: { insumoId: string | number; cantidad: number; causa: string; observaciones: string } = {
    insumoId: '', cantidad: 0, causa: '', observaciones: ''
  };

  constructor(
    private mermaService: MermaService,
    private inventarioService: InventarioService,
    private toastSvc: ToastService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    const sucursalId = this.auth.sucursalActiva();
    if (sucursalId != null) {
      this.inventarioService.stock(sucursalId).subscribe(ins => this.insumos.set(ins));
    }
    this.cargarMermas();
  }

  sortBy(col: string): void {
    if (this.sortCol() === col) this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    else { this.sortCol.set(col); this.sortDir.set('asc'); }
    this.pagina.set(1);
    this.aplicarFiltros();
  }

  si(col: string): string {
    if (this.sortCol() !== col) return '⇅';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  cargarMermas() {
    this.cargando.set(true);
    this.mermaService.listar(this.auth.sucursalActiva()).subscribe({
      next: data => {
        this.mermas.set(data);
        this.aplicarFiltros();
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  actualizarFiltros() { this.aplicarFiltros(); }

  private aplicarFiltros() {
    const q    = this.busqueda.toLowerCase();
    const fIns = this.insumoFiltro ? +this.insumoFiltro : null;
    let lista = this.mermas().filter(m =>
      (!fIns || m.insumoId === fIns) &&
      (!q || m.insumoNombre.toLowerCase().includes(q) ||
             m.causa.toLowerCase().includes(q) ||
             (m.observaciones ?? '').toLowerCase().includes(q))
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
    this._mermasFiltradas.set(lista);
  }

  onInsumoChange() { /* computed se actualiza automáticamente */ }

  abrirModal() {
    this.form = { insumoId: '', cantidad: 0, causa: '', observaciones: '' };
    this.error.set('');
    this.modalAbierto.set(true);
  }

  cerrarModal() { this.modalAbierto.set(false); }

  guardar() {
    if (!this.form.insumoId)        { this.error.set('Selecciona un insumo'); return; }
    if (!this.form.cantidad || this.form.cantidad <= 0) { this.error.set('La cantidad debe ser mayor a 0'); return; }
    if (!this.form.causa)           { this.error.set('Selecciona una causa'); return; }

    const sucursalId = this.auth.sucursalActiva();
    if (sucursalId == null) { this.error.set('Selecciona una sucursal.'); return; }

    const ins = this.insumoSeleccionado();
    if (ins && this.form.cantidad > ins.stockActual) {
      this.error.set(`Stock insuficiente. Disponible: ${ins.stockActual} ${ins.unidadMedida}`);
      return;
    }

    this.guardando.set(true);
    this.error.set('');

    this.mermaService.registrar(+this.form.insumoId, sucursalId, {
      cantidad:     this.form.cantidad,
      causa:        this.form.causa,
      observaciones: this.form.observaciones || undefined,
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.toastSvc.success('✅ Merma registrada correctamente');
        this.cargarMermas();
        this.inventarioService.stock(sucursalId).subscribe(ins => this.insumos.set(ins));
      },
      error: err => {
        this.guardando.set(false);
        this.error.set(err.error?.mensaje ?? 'Error al registrar la merma');
      },
    });
  }

  async descargarPdf() {
    const { jsPDF } = await import('jspdf');
    const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const data = this._mermasFiltradas();

    // ── Encabezado ──
    doc.setFillColor(220, 50, 50);
    doc.rect(0, 0, 297, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE MERMAS', 148.5, 10, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleString('es-BO')}   |   Total registros: ${data.length}   |   Pérdida total: Bs ${this.valorTotalFiltrado().toFixed(2)}`, 148.5, 18, { align: 'center' });

    // ── Tabla ──
    const cols  = [10, 30, 46, 80, 122, 160, 204, 242, 262];
    const heads = ['#', 'Fecha', 'Hora', 'Insumo', 'Cantidad', 'Causa', 'Observaciones', 'Valor Bs', 'Usuario'];
    let y = 32;

    doc.setFillColor(55, 55, 55);
    doc.rect(10, y - 5, 277, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    heads.forEach((h, i) => doc.text(h, cols[i], y));

    y += 7;
    doc.setFont('helvetica', 'normal');

    data.forEach((m, idx) => {
      if (y > 190) { doc.addPage(); y = 15; }
      if (idx % 2 === 0) {
        doc.setFillColor(248, 245, 245);
        doc.rect(10, y - 4, 277, 7, 'F');
      }
      doc.setTextColor(50, 50, 50);
      doc.text(String(idx + 1),                         cols[0], y);
      doc.text(m.fecha,                                 cols[1], y);
      doc.text(m.hora.substring(0, 5),                  cols[2], y);
      doc.text(m.insumoNombre.substring(0, 22),         cols[3], y);
      doc.text(`${m.cantidad.toFixed(2)} ${m.insumoUnidad}`, cols[4], y);
      doc.text(m.causa.substring(0, 22),                cols[5], y);
      doc.text((m.observaciones ?? '').substring(0, 20),cols[6], y);
      doc.setTextColor(200, 50, 50);
      doc.text(m.valorEconomico.toFixed(2),             cols[7], y);
      doc.setTextColor(50, 50, 50);
      doc.text((m.usuario ?? '—').substring(0, 12),     cols[8], y);
      y += 7;
    });

    // ── Pie de totales ──
    y += 3;
    doc.setDrawColor(200, 200, 200);
    doc.line(10, y, 287, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('TOTAL PÉRDIDA ECONÓMICA:', cols[6], y);
    doc.setTextColor(200, 50, 50);
    doc.text(`Bs ${this.valorTotalFiltrado().toFixed(2)}`, cols[7], y);

    doc.save(`mermas-${new Date().toISOString().split('T')[0]}.pdf`);
  }
}
