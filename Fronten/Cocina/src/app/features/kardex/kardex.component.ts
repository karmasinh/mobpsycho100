import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KardexService, InsumoService, KardexResponse } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Insumo } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  selector: 'app-kardex',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <div class="space-y-5 animate-fade-up">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Kárdex de Inventario
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ insumos().length }} insumos · Consulta el historial de entradas y salidas de un insumo por período
          </p>
        </div>
        @if (kardex()) {
          <button (click)="descargarPdf()" class="btn-primary text-sm py-2 px-4">
            📄 Descargar PDF
          </button>
        }
      </div>

      <!-- Panel de consulta -->
      <div class="card p-5">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div class="sm:col-span-2">
            <label class="label">Insumo *</label>
            <select [(ngModel)]="filtro.insumoId" class="input w-full" [disabled]="cargandoInsumos()">
              <option value="">
                {{ cargandoInsumos() ? 'Cargando insumos...' : 'Seleccionar insumo...' }}
              </option>
              @for (ins of insumos(); track ins.id) {
                <option [value]="ins.id">{{ ins.nombre }} ({{ ins.unidadMedida }})</option>
              }
            </select>
          </div>
          <div>
            <label class="label">Desde</label>
            <input type="date" [(ngModel)]="filtro.desde" class="input w-full">
          </div>
          <div>
            <label class="label">Hasta</label>
            <input type="date" [(ngModel)]="filtro.hasta" class="input w-full">
          </div>
        </div>
        <div class="flex gap-3 mt-4">
          <button (click)="generar()" class="btn-primary text-sm py-2 px-5"
            [disabled]="!filtro.insumoId || generando()">
            {{ generando() ? 'Generando...' : '📊 Generar Kárdex' }}
          </button>
          @if (kardex()) {
            <button (click)="limpiar()" class="btn-secondary text-sm py-2 px-4">
              Limpiar
            </button>
          }
        </div>
      </div>

      <!-- Resumen -->
      @if (kardex(); as k) {
        <div class="space-y-5">

          <!-- Cabecera del insumo -->
          <div class="card p-4 flex items-center gap-4 flex-wrap">
            <div class="flex-1 min-w-0">
              <h2 class="font-display text-xl font-bold" style="color:rgb(var(--color-on-surface))">
                {{ k.insumoNombre }}
              </h2>
              <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
                Unidad: {{ k.insumoUnidad }}  ·  Precio unitario: Bs {{ k.precioUnitario | number:'1.2-2' }}
                ·  Período: {{ k.desde }} al {{ k.hasta }}
              </p>
            </div>
            <span class="badge" style="background:rgb(var(--color-primary)/0.15);color:rgb(var(--color-primary))">
              {{ k.movimientos.length }} movimiento{{ k.movimientos.length !== 1 ? 's' : '' }}
            </span>
          </div>

          <!-- Cards resumen -->
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div class="card p-4 text-center">
              <p class="text-xs font-medium uppercase tracking-wide"
                style="color:rgb(var(--color-on-surface)/0.5)">Saldo Inicial</p>
              <p class="text-xl font-bold mt-1 tabular-nums" style="color:rgb(var(--color-on-surface))">
                {{ k.saldoInicial | number:'1.2-2' }}
              </p>
              <p class="text-xs mt-0.5" style="color:rgb(var(--color-on-surface)/0.4)">{{ k.insumoUnidad }}</p>
            </div>
            <div class="card p-4 text-center">
              <p class="text-xs font-medium uppercase tracking-wide"
                style="color:rgb(var(--color-on-surface)/0.5)">Total Entradas</p>
              <p class="text-xl font-bold mt-1 tabular-nums text-green-400">
                + {{ k.totalEntradas | number:'1.2-2' }}
              </p>
              <p class="text-xs mt-0.5" style="color:rgb(var(--color-on-surface)/0.4)">{{ k.insumoUnidad }}</p>
            </div>
            <div class="card p-4 text-center">
              <p class="text-xs font-medium uppercase tracking-wide"
                style="color:rgb(var(--color-on-surface)/0.5)">Total Salidas</p>
              <p class="text-xl font-bold mt-1 tabular-nums text-red-400">
                - {{ k.totalSalidas | number:'1.2-2' }}
              </p>
              <p class="text-xs mt-0.5" style="color:rgb(var(--color-on-surface)/0.4)">{{ k.insumoUnidad }}</p>
            </div>
            <div class="card p-4 text-center border-2" style="border-color:rgb(var(--color-primary)/0.3)">
              <p class="text-xs font-medium uppercase tracking-wide"
                style="color:rgb(var(--color-on-surface)/0.5)">Saldo Final</p>
              <p class="text-xl font-bold mt-1 tabular-nums" style="color:rgb(var(--color-primary))">
                {{ k.saldoFinal | number:'1.2-2' }}
              </p>
              <p class="text-xs mt-0.5" style="color:rgb(var(--color-on-surface)/0.4)">{{ k.insumoUnidad }}</p>
            </div>
            <div class="card p-4 text-center col-span-2 sm:col-span-1"
              style="background:rgb(var(--color-primary)/0.08)">
              <p class="text-xs font-medium uppercase tracking-wide"
                style="color:rgb(var(--color-on-surface)/0.5)">Valor Total</p>
              <p class="text-xl font-bold mt-1 tabular-nums" style="color:rgb(var(--color-primary))">
                Bs {{ k.valorTotal | number:'1.2-2' }}
              </p>
              <p class="text-xs mt-0.5" style="color:rgb(var(--color-on-surface)/0.4)">
                {{ k.precioUnitario | number:'1.2-2' }} × {{ k.saldoFinal | number:'1.2-2' }}
              </p>
            </div>
          </div>

          <!-- Tabla de movimientos -->
          <div class="card p-0 overflow-hidden">
            <div class="table-wrapper" style="border:none;border-radius:0">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th class="cursor-pointer select-none" (click)="sortBy('fechaHora')">
                      Fecha / Hora {{ si('fechaHora') }}
                    </th>
                    <th class="cursor-pointer select-none" (click)="sortBy('tipo')">
                      Tipo {{ si('tipo') }}
                    </th>
                    <th>Descripción</th>
                    <th class="text-right text-green-400 cursor-pointer select-none" (click)="sortBy('entradas')">
                      Entradas {{ si('entradas') }}
                    </th>
                    <th class="text-right text-red-400 cursor-pointer select-none" (click)="sortBy('salidas')">
                      Salidas {{ si('salidas') }}
                    </th>
                    <th class="text-right cursor-pointer select-none" (click)="sortBy('saldo')">
                      Saldo {{ si('saldo') }}
                    </th>
                    <th class="text-right">Valor Bs</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Fila saldo inicial -->
                  <tr style="background:rgb(var(--color-surface-container))">
                    <td class="text-xs" style="color:rgb(var(--color-on-surface)/0.4)">—</td>
                    <td class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">{{ k.desde }}</td>
                    <td>
                      <span class="badge text-xs"
                        style="background:rgb(var(--color-on-surface)/0.08);color:rgb(var(--color-on-surface)/0.6)">
                        Saldo inicial
                      </span>
                    </td>
                    <td class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">
                      Saldo al inicio del período
                    </td>
                    <td></td>
                    <td></td>
                    <td class="text-right font-semibold tabular-nums">{{ k.saldoInicial | number:'1.2-2' }}</td>
                    <td class="text-right text-xs tabular-nums"
                      style="color:rgb(var(--color-on-surface)/0.5)">
                      {{ k.saldoInicial * k.precioUnitario | number:'1.2-2' }}
                    </td>
                    <td></td>
                  </tr>

                  @for (m of movimientosPaginados(); track m.id; let idx = $index) {
                    <tr>
                      <td class="text-xs" style="color:rgb(var(--color-on-surface)/0.4)">
                        {{ (pagina() - 1) * pageSize + idx + 1 }}
                      </td>
                      <td class="tabular-nums text-sm">
                        <div>{{ m.fechaHora | date:'dd/MM/yyyy' }}</div>
                        <div class="text-xs" style="color:rgb(var(--color-on-surface)/0.4)">
                          {{ m.fechaHora | date:'HH:mm' }}
                        </div>
                      </td>
                      <td>
                        <span class="badge text-xs"
                          [class]="tipoBadgeClass(m.tipo)">
                          {{ tipoLabel(m.tipo) }}
                        </span>
                      </td>
                      <td class="text-sm max-w-[160px] truncate"
                        [title]="m.descripcion ?? ''" style="color:rgb(var(--color-on-surface)/0.7)">
                        {{ m.descripcion || '—' }}
                        @if (m.observaciones) {
                          <span class="text-xs block" style="color:rgb(var(--color-on-surface)/0.45)">
                            {{ m.observaciones }}
                          </span>
                        }
                      </td>
                      <td class="text-right tabular-nums">
                        @if (m.entradas > 0) {
                          <span class="font-semibold text-green-400">
                            + {{ m.entradas | number:'1.2-2' }}
                          </span>
                        } @else {
                          <span style="color:rgb(var(--color-on-surface)/0.25)">—</span>
                        }
                      </td>
                      <td class="text-right tabular-nums">
                        @if (m.salidas > 0) {
                          <span class="font-semibold text-red-400">
                            - {{ m.salidas | number:'1.2-2' }}
                          </span>
                        } @else {
                          <span style="color:rgb(var(--color-on-surface)/0.25)">—</span>
                        }
                      </td>
                      <td class="text-right font-semibold tabular-nums"
                        style="color:rgb(var(--color-on-surface))">
                        {{ m.saldo | number:'1.2-2' }}
                      </td>
                      <td class="text-right tabular-nums text-sm"
                        style="color:rgb(var(--color-on-surface)/0.7)">
                        {{ m.valorEconomico | number:'1.2-2' }}
                      </td>
                      <td class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
                        {{ m.usuario ?? '—' }}
                      </td>
                    </tr>
                  }

                  @if (movimientosFiltrados().length === 0) {
                    <tr>
                      <td colspan="9" class="text-center py-10 text-sm"
                        style="color:rgb(var(--color-on-surface)/0.4)">
                        Sin movimientos en el período seleccionado
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr style="background:rgb(var(--color-surface-container))">
                    <td colspan="4" class="text-right font-bold text-sm">TOTALES DEL PERÍODO</td>
                    <td class="text-right font-bold text-green-400 tabular-nums">
                      + {{ k.totalEntradas | number:'1.2-2' }}
                    </td>
                    <td class="text-right font-bold text-red-400 tabular-nums">
                      - {{ k.totalSalidas | number:'1.2-2' }}
                    </td>
                    <td class="text-right font-bold tabular-nums" style="color:rgb(var(--color-primary))">
                      {{ k.saldoFinal | number:'1.2-2' }}
                    </td>
                    <td class="text-right font-bold tabular-nums" style="color:rgb(var(--color-primary))">
                      {{ k.valorTotal | number:'1.2-2' }}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <app-pagination
            [total]="movimientosFiltrados().length"
            [pagina]="pagina()"
            [pageSize]="pageSize"
            (pageChange)="pagina.set($event)" />
        </div>
      }

      <!-- Estado vacío -->
      @if (!kardex() && !generando()) {
        <div class="card p-12 text-center">
          <div class="text-5xl mb-4">📋</div>
          <p class="text-lg font-semibold" style="color:rgb(var(--color-on-surface)/0.6)">
            Selecciona un insumo y un período para generar el Kárdex
          </p>
          <p class="text-sm mt-1" style="color:rgb(var(--color-on-surface)/0.4)">
            El Kárdex muestra el historial completo de entradas y salidas con su valor económico
          </p>
        </div>
      }

      @if (generando()) {
        <div class="card p-12 text-center">
          <div class="text-5xl mb-4 animate-pulse">⏳</div>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">Generando Kárdex...</p>
        </div>
      }
    </div>
  `,
})
export class KardexComponent implements OnInit {
  insumos        = signal<Insumo[]>([]);
  kardex         = signal<KardexResponse | null>(null);
  cargandoInsumos = signal(true);
  generando      = signal(false);

  pagina   = signal(1);
  readonly pageSize = 10;

  sortCol = signal<string>('');
  sortDir = signal<'asc' | 'desc'>('asc');

  filtro = {
    insumoId: '',
    desde:    this.primerDiaMes(),
    hasta:    this.hoy(),
  };

  movimientosFiltrados = computed(() => {
    const k = this.kardex();
    if (!k) return [];
    let lista = [...k.movimientos];
    const col = this.sortCol();
    if (col) {
      const dir = this.sortDir() === 'asc' ? 1 : -1;
      lista = lista.sort((a, b) => {
        const va = (a as any)[col]; const vb = (b as any)[col];
        if (typeof va === 'string') return dir * va.localeCompare(vb);
        return dir * ((va ?? 0) - (vb ?? 0));
      });
    }
    return lista;
  });

  movimientosPaginados = computed(() => {
    const lista = this.movimientosFiltrados();
    return lista.slice((this.pagina() - 1) * this.pageSize, this.pagina() * this.pageSize);
  });

  constructor(
    private kardexService: KardexService,
    private insumoService: InsumoService,
    private toastSvc: ToastService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.insumoService.listarTodos().subscribe({
      next: ins => { this.insumos.set(ins); this.cargandoInsumos.set(false); },
      error: ()  => this.cargandoInsumos.set(false),
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

  generar() {
    if (!this.filtro.insumoId) return;
    const sucursalId = this.auth.sucursalActiva();
    if (sucursalId == null) {
      this.toastSvc.error('Selecciona una sucursal antes de generar el Kárdex.');
      return;
    }
    this.generando.set(true);
    this.kardex.set(null);
    this.pagina.set(1);
    this.kardexService.obtener(+this.filtro.insumoId, sucursalId, this.filtro.desde, this.filtro.hasta).subscribe({
      next: data => { this.kardex.set(data); this.generando.set(false); },
      error: ()  => {
        this.generando.set(false);
        this.toastSvc.error('Error al generar el Kárdex');
      },
    });
  }

  limpiar() { this.kardex.set(null); this.pagina.set(1); }

  tipoLabel(tipo: string): string {
    const map: Record<string, string> = {
      INGRESO_COMPRA:      'Ingreso',
      CONSUMO_PRODUCCION:  'Consumo',
      MERMA:               'Merma',
      VENCIMIENTO:         'Vencimiento',
      AJUSTE_MANUAL:       'Ajuste',
      DEVOLUCION_PROVEEDOR:'Devolución',
    };
    return map[tipo] ?? tipo;
  }

  tipoBadgeClass(tipo: string): string {
    const map: Record<string, string> = {
      INGRESO_COMPRA:      'bg-green-500/15 text-green-400',
      CONSUMO_PRODUCCION:  'bg-blue-500/15 text-blue-400',
      MERMA:               'bg-red-500/15 text-red-400',
      VENCIMIENTO:         'bg-orange-500/15 text-orange-400',
      AJUSTE_MANUAL:       'bg-purple-500/15 text-purple-400',
      DEVOLUCION_PROVEEDOR:'bg-cyan-500/15 text-cyan-400',
    };
    return `badge ${map[tipo] ?? 'bg-gray-500/15 text-gray-400'}`;
  }

  private primerDiaMes(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }

  private hoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  async descargarPdf() {
    const k = this.kardex();
    if (!k) return;

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // ── Encabezado ──
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 297, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('KÁRDEX DE INVENTARIO', 148.5, 10, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${k.insumoNombre}  ·  ${k.insumoUnidad}  ·  Bs ${k.precioUnitario.toFixed(2)} / ${k.insumoUnidad}`, 148.5, 17, { align: 'center' });
    doc.text(`Período: ${k.desde}  al  ${k.hasta}`, 148.5, 22, { align: 'center' });

    // ── Resumen ──
    let y = 33;
    const stats: [string, string][] = [
      ['Saldo Inicial',  `${k.saldoInicial.toFixed(2)} ${k.insumoUnidad}`],
      ['Total Entradas', `+ ${k.totalEntradas.toFixed(2)} ${k.insumoUnidad}`],
      ['Total Salidas',  `- ${k.totalSalidas.toFixed(2)} ${k.insumoUnidad}`],
      ['Saldo Final',    `${k.saldoFinal.toFixed(2)} ${k.insumoUnidad}`],
      ['Valor Total',    `Bs ${k.valorTotal.toFixed(2)}`],
    ];
    stats.forEach((s, i) => {
      const x = 10 + i * 56;
      doc.setFillColor(240, 244, 255);
      doc.rect(x, y - 5, 53, 12, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(s[0], x + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(s[1], x + 2, y + 6);
    });

    // ── Tabla ──
    y = 54;
    const cols  = [10,  30,  55,  80,  120, 150, 175, 200, 230, 258];
    const heads = ['#', 'Fecha', 'Hora', 'Tipo', 'Descripción', 'Entradas', 'Salidas', 'Saldo', 'Valor Bs', 'Usuario'];

    doc.setFillColor(37, 99, 235);
    doc.rect(10, y - 5, 277, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    heads.forEach((h, i) => doc.text(h, cols[i], y));

    // Fila saldo inicial
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(240, 245, 255);
    doc.rect(10, y - 4, 277, 7, 'F');
    doc.setTextColor(80, 80, 80);
    doc.text('—',                         cols[0], y);
    doc.text(k.desde,                     cols[1], y);
    doc.text('',                          cols[2], y);
    doc.text('Saldo inicial',             cols[3], y);
    doc.text('Saldo al inicio del período', cols[4], y);
    doc.text('',                          cols[5], y);
    doc.text('',                          cols[6], y);
    doc.setFont('helvetica', 'bold');
    doc.text(k.saldoInicial.toFixed(2),  cols[7], y);
    doc.setFont('helvetica', 'normal');
    doc.text((k.saldoInicial * k.precioUnitario).toFixed(2), cols[8], y);

    y += 7;
    k.movimientos.forEach((m, idx) => {
      if (y > 190) { doc.addPage(); y = 15; }
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 255);
        doc.rect(10, y - 4, 277, 7, 'F');
      }
      const fecha = m.fechaHora.split('T')[0] ?? '';
      const hora  = m.fechaHora.split('T')[1]?.substring(0, 5) ?? '';
      doc.setTextColor(50, 50, 50);
      doc.text(String(idx + 1),                      cols[0], y);
      doc.text(fecha,                                 cols[1], y);
      doc.text(hora,                                  cols[2], y);
      doc.text(this.tipoLabel(m.tipo),                cols[3], y);
      doc.text((m.descripcion ?? '').substring(0,22), cols[4], y);
      if (m.entradas > 0) {
        doc.setTextColor(22, 163, 74);
        doc.text(`+${m.entradas.toFixed(2)}`,         cols[5], y);
        doc.setTextColor(50, 50, 50);
      } else doc.text('—',                            cols[5], y);
      if (m.salidas > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text(`-${m.salidas.toFixed(2)}`,          cols[6], y);
        doc.setTextColor(50, 50, 50);
      } else doc.text('—',                            cols[6], y);
      doc.setTextColor(50, 50, 50);
      doc.text((m.saldo ?? 0).toFixed(2),             cols[7], y);
      doc.text((m.valorEconomico ?? 0).toFixed(2),    cols[8], y);
      doc.text((m.usuario ?? '—').substring(0, 12),   cols[9], y);
      y += 7;
    });

    // ── Pie totales ──
    y += 3;
    doc.setDrawColor(200, 200, 200);
    doc.line(10, y, 287, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text('SALDO FINAL:', cols[6], y);
    doc.setTextColor(37, 99, 235);
    doc.text(`${k.saldoFinal.toFixed(2)} ${k.insumoUnidad}  |  Bs ${k.valorTotal.toFixed(2)}`, cols[7], y);

    doc.save(`kardex-${k.insumoNombre.replace(/\s+/g, '-')}-${k.desde}.pdf`);
  }
}
