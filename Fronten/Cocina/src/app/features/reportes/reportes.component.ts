import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioService, MermaService, Merma, ProduccionService, ComparativoSucursal } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { StockInsumo, ProduccionDia } from '../../core/models';

type Seccion = 'stock' | 'mermas' | 'produccion' | 'sucursales';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-5 animate-fade-up">

      <!-- Cabecera -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Reportes
          </h1>
          <p class="text-sm mt-0.5" style="color:rgb(var(--color-on-surface)/0.5)">
            Stock, mermas, avance de producción y comparativo entre sucursales
          </p>
        </div>
        <button (click)="descargarPdf()" class="btn-secondary text-xs inline-flex items-center gap-1">
          <iconify-icon icon="tabler:file-type-pdf" width="14" height="14" style="color:currentColor"></iconify-icon>
          Descargar PDF
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 p-1 rounded-xl overflow-x-auto" style="background:rgb(var(--color-surface-2))">
        @for (s of seccionesVisibles(); track s.id) {
          <button (click)="seccion.set(s.id)"
                  class="px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 inline-flex items-center gap-1"
                  [style.background]="seccion() === s.id ? 'rgb(var(--color-surface))' : 'transparent'"
                  [style.color]="seccion() === s.id ? 'rgb(var(--color-primary))' : 'rgb(var(--color-on-surface)/0.5)'"
                  [style.boxShadow]="seccion() === s.id ? '0 1px 3px rgb(0 0 0/0.1)' : 'none'">
            <iconify-icon [attr.icon]="s.icon" width="14" height="14" style="color:currentColor"></iconify-icon> {{ s.label }}
          </button>
        }
      </div>

      <!-- ══ STOCK ACTUAL ══ -->
      @if (seccion() === 'stock') {
        <div class="card space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <h2 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">Stock actual</h2>
            <button (click)="cargarStock()" class="btn-secondary text-xs">↻ Actualizar</button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-surface-2))">
              <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Insumos activos</p>
              <p class="font-bold font-mono mt-1" style="color:rgb(var(--color-on-surface))">{{ stock().length }}</p>
            </div>
            <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-surface-2))">
              <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Bajo mínimo</p>
              <p class="font-bold font-mono mt-1" style="color:rgb(var(--color-danger))">{{ stockBajoCount() }}</p>
            </div>
            <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-surface-2))">
              <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Valor total estimado</p>
              <p class="font-bold font-mono mt-1" style="color:rgb(var(--color-primary))">Bs {{ valorStockTotal() | number:'1.2-2' }}</p>
            </div>
          </div>
          @if (stock().length > 0) {
            <div class="space-y-2">
              @for (s of stock(); track s.insumoId) {
                <div class="flex items-center gap-3 p-3 rounded-xl" style="background:rgb(var(--color-surface-2))">
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">{{ s.nombre }}</p>
                    <div class="mt-1 h-1.5 rounded-full overflow-hidden" style="background:rgb(var(--color-surface))">
                      <div class="h-full rounded-full"
                           [style.width]="(s.stockActual / maxStock()) * 100 + '%'"
                           [style.background]="s.stockActual <= s.stockMinimo ? 'rgb(var(--color-danger))' : 'rgb(var(--color-primary))'">
                      </div>
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p class="font-bold font-mono" style="color:rgb(var(--color-on-surface))">
                      {{ s.stockActual | number:'1.2-2' }} {{ s.unidadMedida }}
                    </p>
                    <p class="text-xs font-mono" style="color:rgb(var(--color-on-surface)/0.5)">mín. {{ s.stockMinimo | number:'1.2-2' }}</p>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="text-sm text-center py-8" style="color:rgb(var(--color-on-surface)/0.4)">Sin datos de stock</p>
          }
        </div>
      }

      <!-- ══ MERMAS DEL PERÍODO ══ -->
      @if (seccion() === 'mermas') {
        <div class="card space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <h2 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">Mermas del período</h2>
            <div class="flex flex-wrap gap-2 items-end">
              <div>
                <label class="input-label">Desde</label>
                <input type="date" [(ngModel)]="mermaDesde" class="input text-sm">
              </div>
              <div>
                <label class="input-label">Hasta</label>
                <input type="date" [(ngModel)]="mermaHasta" class="input text-sm">
              </div>
              <button (click)="cargarMermas()" class="btn-primary text-sm" [disabled]="cargandoMermas()">
                @if (cargandoMermas()) {
                  <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
                }
                Consultar
              </button>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-surface-2))">
              <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Registros en el período</p>
              <p class="font-bold font-mono mt-1" style="color:rgb(var(--color-on-surface))">{{ mermasFiltradas().length }}</p>
            </div>
            <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-surface-2))">
              <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Valor económico total</p>
              <p class="font-bold font-mono mt-1" style="color:rgb(var(--color-danger))">Bs {{ valorMermasTotal() | number:'1.2-2' }}</p>
            </div>
          </div>
          @if (mermasPorInsumo().length > 0) {
            <div class="space-y-2">
              @for (m of mermasPorInsumo(); track m.insumoNombre) {
                <div class="flex items-center gap-3 p-3 rounded-xl" style="background:rgb(var(--color-surface-2))">
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">{{ m.insumoNombre }}</p>
                    <div class="mt-1 h-1.5 rounded-full overflow-hidden" style="background:rgb(var(--color-surface))">
                      <div class="h-full rounded-full"
                           [style.width]="(m.cantidad / maxMerma()) * 100 + '%'"
                           style="background:rgb(var(--color-danger))">
                      </div>
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p class="font-bold font-mono" style="color:rgb(var(--color-danger))">{{ m.cantidad | number:'1.2-2' }}</p>
                    <p class="text-xs font-mono" style="color:rgb(var(--color-on-surface)/0.5)">Bs {{ m.valor | number:'1.2-2' }}</p>
                  </div>
                </div>
              }
            </div>
          } @else if (!cargandoMermas()) {
            <p class="text-sm text-center py-8" style="color:rgb(var(--color-on-surface)/0.4)">Sin mermas en el período seleccionado</p>
          }
        </div>
      }

      <!-- ══ AVANCE DE PRODUCCIÓN ══ -->
      @if (seccion() === 'produccion') {
        <div class="card space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <h2 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">Avance de producción</h2>
            <div class="flex flex-wrap gap-2 items-end">
              <div>
                <label class="input-label">Desde</label>
                <input type="date" [(ngModel)]="prodDesde" class="input text-sm">
              </div>
              <div>
                <label class="input-label">Hasta</label>
                <input type="date" [(ngModel)]="prodHasta" class="input text-sm">
              </div>
              <button (click)="cargarProduccion()" class="btn-primary text-sm" [disabled]="cargandoProd()">
                @if (cargandoProd()) {
                  <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
                }
                Consultar
              </button>
            </div>
          </div>
          @if (produccionFiltrada().length > 0) {
            <div class="space-y-2">
              @for (p of produccionFiltrada(); track p.id) {
                <div class="p-3 rounded-xl" style="background:rgb(var(--color-surface-2))">
                  <div class="flex items-center justify-between mb-1">
                    <p class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">
                      {{ p.fecha | date:'dd/MM/yyyy' }} · {{ p.estado }}
                    </p>
                    <p class="text-xs font-mono" style="color:rgb(var(--color-on-surface)/0.5)">
                      {{ totalProducido(p) | number:'1.0-0' }} / {{ totalPlanificado(p) | number:'1.0-0' }} producidos
                    </p>
                  </div>
                  <div class="h-1.5 rounded-full overflow-hidden" style="background:rgb(var(--color-surface))">
                    <div class="h-full rounded-full"
                         [style.width]="pctAvance(p) + '%'"
                         style="background:rgb(var(--color-primary))">
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else if (!cargandoProd()) {
            <p class="text-sm text-center py-8" style="color:rgb(var(--color-on-surface)/0.4)">Sin planes de producción en el período seleccionado</p>
          }
        </div>
      }

      <!-- ══ COMPARATIVO ENTRE SUCURSALES (ADMIN) ══ -->
      @if (seccion() === 'sucursales') {
        <div class="card space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <h2 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">Comparativo entre sucursales</h2>
            <div class="flex flex-wrap gap-2 items-end">
              <div>
                <label class="input-label">Desde</label>
                <input type="date" [(ngModel)]="sucDesde" class="input text-sm">
              </div>
              <div>
                <label class="input-label">Hasta</label>
                <input type="date" [(ngModel)]="sucHasta" class="input text-sm">
              </div>
              <button (click)="cargarComparativo()" class="btn-primary text-sm" [disabled]="cargandoSuc()">
                @if (cargandoSuc()) {
                  <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
                }
                Consultar
              </button>
            </div>
          </div>
          @if (comparativo().length > 0) {
            <div class="space-y-2">
              @for (c of comparativo(); track c.sucursalId) {
                <div class="flex items-center gap-3 p-3 rounded-xl" style="background:rgb(var(--color-surface-2))">
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-sm inline-flex items-center gap-1" style="color:rgb(var(--color-on-surface))">
                      <iconify-icon icon="tabler:building-store" width="16" height="16" style="color:currentColor"></iconify-icon> {{ c.sucursalNombre }}
                    </p>
                    <div class="mt-1 h-1.5 rounded-full overflow-hidden" style="background:rgb(var(--color-surface))">
                      <div class="h-full rounded-full"
                           [style.width]="(c.totalMermas / maxComparativo()) * 100 + '%'"
                           style="background:rgb(var(--color-danger))">
                      </div>
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p class="font-bold font-mono" style="color:rgb(var(--color-danger))">{{ c.totalMermas | number:'1.2-2' }} mermas</p>
                    <p class="text-xs font-mono" style="color:rgb(var(--color-on-surface)/0.5)">
                      Stock: Bs {{ c.valorStockActual | number:'1.2-2' }}
                    </p>
                  </div>
                </div>
              }
            </div>
          } @else if (!cargandoSuc()) {
            <p class="text-sm text-center py-8" style="color:rgb(var(--color-on-surface)/0.4)">Seleccioná un rango y consultá el comparativo entre sucursales</p>
          }
        </div>
      }
    </div>
  `,
})
export class ReportesComponent implements OnInit {
  secciones: { id: Seccion; label: string; icon: string }[] = [
    { id: 'stock',      label: 'Stock actual',        icon: 'tabler:package' },
    { id: 'mermas',     label: 'Mermas',               icon: 'tabler:trash' },
    { id: 'produccion', label: 'Avance de producción', icon: 'tabler:flame' },
    { id: 'sucursales', label: 'Sucursales',           icon: 'tabler:building-store' },
  ];

  // El comparativo entre sucursales es de alcance global: solo ADMIN lo consulta en el backend
  seccionesVisibles = computed(() =>
    this.auth.rol() === 'ROLE_ADMIN' || this.auth.rol() === 'ADMIN'
      ? this.secciones
      : this.secciones.filter(s => s.id !== 'sucursales')
  );

  seccion = signal<Seccion>('stock');

  // ── Stock actual ─────────────────────────────────────────────
  stock = signal<StockInsumo[]>([]);
  stockBajoCount = computed(() => this.stock().filter(s => s.stockActual <= s.stockMinimo).length);
  valorStockTotal = computed(() => this.stock().reduce((sum, s) => sum + s.stockActual * s.precioUnitario, 0));
  maxStock = computed(() => Math.max(...this.stock().map(s => s.stockActual), 1));

  // ── Mermas del período ───────────────────────────────────────
  mermaDesde = this.isoDate(new Date(new Date().setDate(1)));
  mermaHasta = this.isoDate(new Date());
  cargandoMermas = signal(false);
  mermas = signal<Merma[]>([]);

  mermasFiltradas = computed(() =>
    this.mermas().filter(m => m.fecha >= this.mermaDesde && m.fecha <= this.mermaHasta)
  );
  valorMermasTotal = computed(() => this.mermasFiltradas().reduce((s, m) => s + m.valorEconomico, 0));
  mermasPorInsumo = computed(() => {
    const mapa = new Map<string, { insumoNombre: string; cantidad: number; valor: number }>();
    for (const m of this.mermasFiltradas()) {
      const cur = mapa.get(m.insumoNombre) ?? { insumoNombre: m.insumoNombre, cantidad: 0, valor: 0 };
      cur.cantidad += m.cantidad;
      cur.valor += m.valorEconomico;
      mapa.set(m.insumoNombre, cur);
    }
    return Array.from(mapa.values()).sort((a, b) => b.cantidad - a.cantidad);
  });
  maxMerma = computed(() => Math.max(...this.mermasPorInsumo().map(m => m.cantidad), 1));

  // ── Avance de producción ─────────────────────────────────────
  prodDesde = this.isoDate(new Date(new Date().setDate(1)));
  prodHasta = this.isoDate(new Date());
  cargandoProd = signal(false);
  produccion = signal<ProduccionDia[]>([]);

  produccionFiltrada = computed(() =>
    this.produccion().filter(p => p.fecha >= this.prodDesde && p.fecha <= this.prodHasta)
  );

  // ── Comparativo entre sucursales ─────────────────────────────
  sucDesde = this.isoDate(new Date(new Date().setDate(1)));
  sucHasta = this.isoDate(new Date());
  cargandoSuc = signal(false);
  comparativo = signal<ComparativoSucursal[]>([]);
  maxComparativo = computed(() => Math.max(...this.comparativo().map(c => c.totalMermas), 1));

  constructor(
    private inventarioService: InventarioService,
    private mermaService: MermaService,
    private produccionService: ProduccionService,
    private toastSvc: ToastService,
    public auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarStock();
    this.cargarMermas();
    this.cargarProduccion();
  }

  cargarStock(): void {
    const sucursalId = this.auth.sucursalActiva();
    if (sucursalId == null) return;
    this.inventarioService.stock(sucursalId).subscribe({
      next: lista => this.stock.set(lista),
      error: () => this.toastSvc.error('Error al cargar el stock'),
    });
  }

  cargarMermas(): void {
    const sucursalId = this.auth.sucursalActiva();
    if (sucursalId == null) return;
    this.cargandoMermas.set(true);
    this.mermaService.listar(sucursalId).subscribe({
      next: lista => { this.mermas.set(lista); this.cargandoMermas.set(false); },
      error: () => { this.cargandoMermas.set(false); this.toastSvc.error('Error al cargar las mermas'); },
    });
  }

  cargarProduccion(): void {
    const sucursalId = this.auth.sucursalActiva();
    if (sucursalId == null) return;
    this.cargandoProd.set(true);
    this.produccionService.listar(sucursalId).subscribe({
      next: lista => { this.produccion.set(lista); this.cargandoProd.set(false); },
      error: () => { this.cargandoProd.set(false); this.toastSvc.error('Error al cargar la producción'); },
    });
  }

  cargarComparativo(): void {
    this.cargandoSuc.set(true);
    this.inventarioService.comparativoSucursales(this.sucDesde, this.sucHasta).subscribe({
      next: lista => { this.comparativo.set(lista); this.cargandoSuc.set(false); },
      error: () => { this.cargandoSuc.set(false); this.toastSvc.error('Error al cargar el comparativo entre sucursales'); },
    });
  }

  totalPlanificado(p: ProduccionDia): number {
    return p.lineas.reduce((s, l) => s + l.cantidadPlanificada, 0);
  }

  totalProducido(p: ProduccionDia): number {
    return p.lineas.reduce((s, l) => s + l.cantidadProducida, 0);
  }

  pctAvance(p: ProduccionDia): number {
    const plan = this.totalPlanificado(p);
    return plan > 0 ? Math.min(100, (this.totalProducido(p) / plan) * 100) : 0;
  }

  private isoDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  async descargarPdf(): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTES DE COCINA', 105, 12, { align: 'center' });

    let y = 30;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);

    doc.setFont('helvetica', 'bold');
    doc.text('Stock actual', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${this.stock().length} insumos · ${this.stockBajoCount()} bajo mínimo · Valor total: Bs ${this.valorStockTotal().toFixed(2)}`, 14, y);

    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Mermas (${this.mermaDesde} al ${this.mermaHasta})`, 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${this.mermasFiltradas().length} registros · Valor total: Bs ${this.valorMermasTotal().toFixed(2)}`, 14, y);
    this.mermasPorInsumo().slice(0, 15).forEach(m => {
      y += 5;
      if (y > 280) { doc.addPage(); y = 15; }
      doc.text(`  ${m.insumoNombre}: ${m.cantidad.toFixed(2)} (Bs ${m.valor.toFixed(2)})`, 14, y);
    });

    y += 10;
    if (y > 270) { doc.addPage(); y = 15; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Avance de producción (${this.prodDesde} al ${this.prodHasta})`, 14, y);
    this.produccionFiltrada().forEach(p => {
      y += 6;
      if (y > 280) { doc.addPage(); y = 15; }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`  ${p.fecha} — ${p.estado} — ${this.totalProducido(p)}/${this.totalPlanificado(p)} producidos`, 14, y);
    });

    if (this.comparativo().length > 0) {
      y += 10;
      if (y > 270) { doc.addPage(); y = 15; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Comparativo entre sucursales (${this.sucDesde} al ${this.sucHasta})`, 14, y);
      this.comparativo().forEach(c => {
        y += 6;
        if (y > 280) { doc.addPage(); y = 15; }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`  ${c.sucursalNombre} — Mermas: ${c.totalMermas.toFixed(2)} — Valor stock: Bs ${c.valorStockActual.toFixed(2)}`, 14, y);
      });
    }

    doc.save(`reportes-cocina-${this.isoDate(new Date())}.pdf`);
  }
}
