import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { VentaService, PensionadoService, SucursalService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Venta, CobroMensual, TopProductoDto, RentabilidadPlato, VentaPorSucursal, Sucursal } from '../../core/models';

type Seccion = 'calendario' | 'ventas' | 'cobros' | 'productos' | 'pensionados' | 'rentabilidad' | 'sucursales';

interface DiaCalendario {
  dia: number | null;
  total: number;
  cantidad: number;
  esHoy: boolean;
}

interface VentaDiaria {
  fecha: string;
  total: number;
  cantidad: number;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5 animate-slide-up">

      <!-- Cabecera -->
      <div>
        <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
          Reportes
        </h1>
        <p class="text-sm mt-0.5" style="color:rgb(var(--color-on-surface)/0.5)">
          Análisis de ventas, cobros y productos
        </p>
      </div>

      <!-- Tabs de sección -->
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex gap-1 p-1 rounded-xl overflow-x-auto" style="background:rgb(var(--color-surface-2))">
          @for (s of seccionesVisibles(); track s.id) {
            <button (click)="seccion.set(s.id)"
                    class="px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
                    [style.background]="seccion() === s.id ? 'rgb(var(--color-surface))' : 'transparent'"
                    [style.color]="seccion() === s.id ? 'rgb(var(--color-primary))' : 'rgb(var(--color-on-surface)/0.5)'"
                    [style.boxShadow]="seccion() === s.id ? '0 1px 3px rgb(0 0 0/0.1)' : 'none'">
              {{ s.emoji }} {{ s.label }}
            </button>
          }
        </div>

        @if (auth.sucursalFija() == null && seccion() !== 'sucursales') {
          <select [(ngModel)]="sucursalFiltro" (ngModelChange)="onCambioSucursalFiltro()"
                  class="input text-xs py-2 ml-auto" style="width:auto">
            <option [ngValue]="null">🏪 Todas las sucursales</option>
            @for (s of sucursales(); track s.id) {
              <option [ngValue]="s.id">{{ s.nombre }}</option>
            }
          </select>
        }
      </div>

      <!-- ══ CALENDARIO ══ -->
      @if (seccion() === 'calendario') {
        <div class="card space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <h2 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
              Ventas del mes
            </h2>
            <div class="flex items-center gap-2">
              <button (click)="mesAnterior()" class="btn-ghost px-2">‹</button>
              <span class="font-mono text-sm font-semibold w-36 text-center"
                    style="color:rgb(var(--color-on-surface))">
                {{ mesLabel(calMes(), calAnio()) }}
              </span>
              <button (click)="mesSiguiente()" class="btn-ghost px-2">›</button>
              <button (click)="cargarCalendario()" class="btn-secondary text-xs">↻</button>
            </div>
          </div>

          <!-- Stats del mes -->
          <div class="grid grid-cols-3 gap-3">
            <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-surface-2))">
              <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Total mes</p>
              <p class="font-bold font-mono mt-1" style="color:rgb(var(--color-primary))">
                Bs {{ totalMes() | number:'1.2-2' }}
              </p>
            </div>
            <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-surface-2))">
              <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Ventas</p>
              <p class="font-bold font-mono mt-1" style="color:rgb(var(--color-on-surface))">
                {{ cantidadMes() }}
              </p>
            </div>
            <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-surface-2))">
              <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Promedio día</p>
              <p class="font-bold font-mono mt-1" style="color:rgb(var(--color-on-surface))">
                Bs {{ promedioDia() | number:'1.2-2' }}
              </p>
            </div>
          </div>

          <!-- Grid calendario -->
          @if (cargandoCal()) {
            <div class="grid grid-cols-7 gap-1">
              @for (i of [1,2,3,4,5,6,7,8,9,10,11,12,13,14]; track i) {
                <div class="skeleton h-14 rounded-lg"></div>
              }
            </div>
          } @else {
            <div class="grid grid-cols-7 gap-1">
              @for (d of ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']; track d) {
                <div class="text-center text-xs font-semibold py-1"
                     style="color:rgb(var(--color-on-surface)/0.4)">{{ d }}</div>
              }
              @for (dia of diasCalendario(); track $index) {
                @if (dia.dia === null) {
                  <div></div>
                } @else {
                  <div class="relative rounded-lg p-1.5 text-center transition-all"
                       [style.background]="diaColor(dia)"
                       [style.outline]="dia.esHoy ? '2px solid rgb(var(--color-primary))' : 'none'"
                       [title]="dia.total > 0 ? 'Bs ' + dia.total.toFixed(2) + ' (' + dia.cantidad + ' ventas)' : 'Sin ventas'">
                    <p class="text-xs font-bold"
                       [style.color]="dia.total > 0 ? 'rgb(var(--color-on-surface))' : 'rgb(var(--color-on-surface)/0.3)'">
                      {{ dia.dia }}
                    </p>
                    @if (dia.total > 0) {
                      <p class="text-[9px] font-mono mt-0.5 leading-tight"
                         style="color:rgb(var(--color-primary))">
                        Bs {{ dia.total | number:'1.0-0' }}
                      </p>
                    }
                  </div>
                }
              }
            </div>
          }

          <!-- Leyenda -->
          <div class="flex items-center gap-4 text-xs" style="color:rgb(var(--color-on-surface)/0.5)">
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded" style="background:rgb(var(--color-surface-2))"></div> Sin ventas
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded" style="background:rgb(var(--color-primary)/0.2)"></div> Bajo
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded" style="background:rgb(var(--color-primary)/0.5)"></div> Medio
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 rounded" style="background:rgb(var(--color-primary)/0.85)"></div> Alto
            </div>
          </div>
        </div>
      }

      <!-- ══ VENTAS POR RANGO ══ -->
      @if (seccion() === 'ventas') {
        <div class="card space-y-4">
          <h2 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
            Ventas por rango de fechas
          </h2>
          <div class="flex flex-wrap gap-3 items-end">
            <div>
              <label class="input-label">Desde</label>
              <input type="date" [(ngModel)]="ventaDesde" class="input text-sm">
            </div>
            <div>
              <label class="input-label">Hasta</label>
              <input type="date" [(ngModel)]="ventaHasta" class="input text-sm">
            </div>
            <button (click)="cargarVentasRango()" class="btn-primary text-sm" [disabled]="cargandoVentas()">
              @if (cargandoVentas()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              }
              Consultar
            </button>
            <div class="flex gap-1 ml-auto flex-wrap">
              @for (acc of accesosRapidosRango; track acc.label) {
                <button (click)="aplicarRango(acc.desde, acc.hasta)" class="btn-ghost text-xs">
                  {{ acc.label }}
                </button>
              }
            </div>
          </div>

          @if (ventasDiarias().length > 0) {
            <!-- Resumen -->
            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-surface-2))">
                <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Total recaudado</p>
                <p class="font-bold font-mono mt-1" style="color:rgb(var(--color-primary))">
                  Bs {{ totalRango() | number:'1.2-2' }}
                </p>
              </div>
              <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-surface-2))">
                <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Cant. ventas</p>
                <p class="font-bold font-mono mt-1">{{ cantidadRango() }}</p>
              </div>
              <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-surface-2))">
                <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Promedio/día</p>
                <p class="font-bold font-mono mt-1">
                  Bs {{ (totalRango() / Math.max(ventasDiarias().length, 1)) | number:'1.2-2' }}
                </p>
              </div>
            </div>

            <!-- Barra chart SVG -->
            <div class="space-y-1">
              <p class="text-xs font-semibold" style="color:rgb(var(--color-on-surface)/0.5)">
                Ventas por día
              </p>
              <div class="overflow-x-auto">
                <div class="flex items-end gap-1 h-40 min-w-0"
                     [style.minWidth]="(ventasDiarias().length * 32) + 'px'">
                  @for (d of ventasDiarias(); track d.fecha) {
                    <div class="flex flex-col items-center gap-0.5 flex-1 min-w-[28px]">
                      <span class="text-[8px] font-mono" style="color:rgb(var(--color-primary))">
                        {{ d.total | number:'1.0-0' }}
                      </span>
                      <div class="w-full rounded-t-sm transition-all"
                           [style.height]="barHeight(d.total, maxDiario()) + 'px'"
                           [style.background]="'rgb(var(--color-primary)/' + barOpacity(d.total, maxDiario()) + ')'">
                      </div>
                      <span class="text-[8px] font-mono" style="color:rgb(var(--color-on-surface)/0.4)">
                        {{ d.fecha | date:'dd/MM' }}
                      </span>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Tabla detalle -->
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th class="text-center">Ventas</th>
                    <th class="text-right">Total</th>
                    <th class="text-right">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  @for (d of ventasDiarias(); track d.fecha) {
                    <tr>
                      <td class="font-mono text-xs">{{ d.fecha | date:'EEEE dd/MM/yyyy':'':'es' }}</td>
                      <td class="text-center font-mono">{{ d.cantidad }}</td>
                      <td class="text-right font-mono font-bold"
                          style="color:rgb(var(--color-primary))">
                        Bs {{ d.total | number:'1.2-2' }}
                      </td>
                      <td class="text-right font-mono text-sm"
                          style="color:rgb(var(--color-on-surface)/0.6)">
                        Bs {{ (d.total / d.cantidad) | number:'1.2-2' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else if (!cargandoVentas()) {
            <div class="text-center py-10">
              <p class="text-3xl opacity-20 mb-2">📊</p>
              <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.4)">
                Selecciona un rango de fechas y consultá
              </p>
            </div>
          }
        </div>
      }

      <!-- ══ COBROS PENDIENTES VS PAGADOS ══ -->
      @if (seccion() === 'cobros') {
        <div class="card space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <h2 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
              Cobros de pensionados
            </h2>
            <div class="flex items-center gap-2">
              <select [(ngModel)]="cobroMes" (ngModelChange)="cargarCobros()" class="input text-sm">
                @for (m of meses; track m.num) {
                  <option [value]="m.num">{{ m.label }}</option>
                }
              </select>
              <select [(ngModel)]="cobroAnio" (ngModelChange)="cargarCobros()" class="input text-sm w-24">
                @for (a of anios; track a) {
                  <option [value]="a">{{ a }}</option>
                }
              </select>
            </div>
          </div>

          @if (cargandoCobros()) {
            <div class="flex justify-center py-8">
              <div class="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
            </div>
          } @else if (cobros().length > 0) {
            <!-- Barra comparativa -->
            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-success)/0.1)">
                <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Pagados</p>
                <p class="font-bold text-2xl mt-1" style="color:rgb(var(--color-success))">
                  {{ cobrosPagados() }}
                </p>
                <p class="text-xs font-mono mt-0.5" style="color:rgb(var(--color-success)/0.7)">
                  Bs {{ totalPagado() | number:'1.2-2' }}
                </p>
              </div>
              <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-danger)/0.1)">
                <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Pendientes</p>
                <p class="font-bold text-2xl mt-1" style="color:rgb(var(--color-danger))">
                  {{ cobrosPendientesCount() }}
                </p>
                <p class="text-xs font-mono mt-0.5" style="color:rgb(var(--color-danger)/0.7)">
                  Bs {{ totalPendiente() | number:'1.2-2' }}
                </p>
              </div>
              <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-surface-2))">
                <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Total cobrado</p>
                <p class="font-bold text-2xl mt-1" style="color:rgb(var(--color-primary))">
                  {{ cobros().length }}
                </p>
                <p class="text-xs font-mono mt-0.5" style="color:rgb(var(--color-primary)/0.7)">
                  Bs {{ totalCobros() | number:'1.2-2' }}
                </p>
              </div>
            </div>

            <!-- Barra visual pagados vs pendientes -->
            @if (cobros().length > 0) {
              <div class="space-y-1">
                <div class="flex justify-between text-xs" style="color:rgb(var(--color-on-surface)/0.5)">
                  <span>Pagados {{ pctPagados() | number:'1.0-0' }}%</span>
                  <span>Pendientes {{ (100 - pctPagados()) | number:'1.0-0' }}%</span>
                </div>
                <div class="h-4 rounded-full overflow-hidden" style="background:rgb(var(--color-danger)/0.2)">
                  <div class="h-full rounded-full transition-all duration-700"
                       [style.width]="pctPagados() + '%'"
                       style="background:rgb(var(--color-success))">
                  </div>
                </div>
              </div>
            }

            <!-- Tabla -->
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Pensionado</th>
                    <th>Monto base</th>
                    <th>Saldo restante</th>
                    <th>Estado</th>
                    <th>Forma pago</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of cobros(); track c.id) {
                    <tr>
                      <td class="font-medium text-sm">
                        {{ c.pensionadoNombre }} {{ c.pensionadoApellido }}
                      </td>
                      <td class="font-mono text-sm">Bs {{ c.montoBase | number:'1.2-2' }}</td>
                      <td class="font-mono text-sm font-bold"
                          [style.color]="c.saldoRestante > 0 ? 'rgb(var(--color-danger))' : 'rgb(var(--color-success))'">
                        Bs {{ c.saldoRestante | number:'1.2-2' }}
                      </td>
                      <td>
                        @if (c.pagado) {
                          <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                                style="background:rgb(var(--color-success)/0.15);color:rgb(var(--color-success))">
                            Pagado
                          </span>
                        } @else if (c.saldoRestante < c.totalCobrado) {
                          <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                                style="background:rgb(var(--color-warning)/0.15);color:rgb(var(--color-warning))">
                            Parcial
                          </span>
                        } @else {
                          <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                                style="background:rgb(var(--color-danger)/0.15);color:rgb(var(--color-danger))">
                            Pendiente
                          </span>
                        }
                      </td>
                      <td class="text-xs">{{ c.formaPago ?? '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="text-center py-10">
              <p class="text-3xl opacity-20 mb-2">🧾</p>
              <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.4)">
                No hay cobros generados para {{ mesLabel(cobroMes, cobroAnio) }}
              </p>
            </div>
          }
        </div>
      }

      <!-- ══ TOP PRODUCTOS ══ -->
      @if (seccion() === 'productos') {
        <div class="card space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <h2 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
              Productos más vendidos
            </h2>
            <div class="flex flex-wrap gap-2 items-end">
              <div>
                <label class="input-label">Desde</label>
                <input type="date" [(ngModel)]="prodDesde" class="input text-sm">
              </div>
              <div>
                <label class="input-label">Hasta</label>
                <input type="date" [(ngModel)]="prodHasta" class="input text-sm">
              </div>
              <button (click)="cargarTopProductos()" class="btn-primary text-sm"
                      [disabled]="cargandoProd()">
                @if (cargandoProd()) {
                  <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
                }
                Consultar
              </button>
            </div>
          </div>

          @if (topProductos().length > 0) {
            <div class="space-y-2">
              @for (p of topProductos(); track p.platoId; let i = $index) {
                <div class="flex items-center gap-3 p-3 rounded-xl transition-all"
                     style="background:rgb(var(--color-surface-2))">
                  <span class="text-lg font-bold w-8 text-center"
                        [style.color]="rankColor(i)">
                    {{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1) }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-sm truncate"
                       style="color:rgb(var(--color-on-surface))">
                      {{ p.platoNombre }}
                    </p>
                    <div class="mt-1 h-1.5 rounded-full overflow-hidden"
                         style="background:rgb(var(--color-surface))">
                      <div class="h-full rounded-full"
                           [style.width]="prodBarPct(p.cantidadVendida) + '%'"
                           [style.background]="'rgb(var(--color-primary)/' + (0.4 + 0.6 * prodBarPct(p.cantidadVendida) / 100) + ')'">
                      </div>
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p class="font-bold font-mono" style="color:rgb(var(--color-primary))">
                      {{ p.cantidadVendida }}
                      <span class="text-xs font-normal" style="color:rgb(var(--color-on-surface)/0.4)">uds</span>
                    </p>
                    <p class="text-xs font-mono" style="color:rgb(var(--color-on-surface)/0.5)">
                      Bs {{ p.totalIngresos | number:'1.2-2' }}
                    </p>
                  </div>
                </div>
              }
            </div>

            <p class="text-xs text-center" style="color:rgb(var(--color-on-surface)/0.35)">
              Top {{ topProductos().length }} productos — excluyendo pedidos cancelados
            </p>
          } @else if (!cargandoProd()) {
            <div class="text-center py-10">
              <p class="text-3xl opacity-20 mb-2">🍽️</p>
              <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.4)">
                Seleccioná un rango y consultá los productos más vendidos
              </p>
            </div>
          }
        </div>
      }

      <!-- ══ PENSIONADOS ══ -->
      @if (seccion() === 'pensionados') {
        <div class="card space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <h2 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
              Reporte pensionados
            </h2>
            <div class="flex items-center gap-2">
              <select [(ngModel)]="pensMes" (ngModelChange)="cargarPensionados()" class="input text-sm">
                @for (m of meses; track m.num) {
                  <option [value]="m.num">{{ m.label }}</option>
                }
              </select>
              <select [(ngModel)]="pensAnio" (ngModelChange)="cargarPensionados()" class="input text-sm w-24">
                @for (a of anios; track a) {
                  <option [value]="a">{{ a }}</option>
                }
              </select>
            </div>
          </div>

          @if (cargandoPens()) {
            <div class="flex justify-center py-8">
              <div class="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
            </div>
          } @else {
            <!-- Stats -->
            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-primary)/0.1)">
                <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Total cobros</p>
                <p class="font-bold text-2xl mt-1" style="color:rgb(var(--color-primary))">
                  Bs {{ totalCobrosPens() | number:'1.2-2' }}
                </p>
              </div>
              <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-success)/0.1)">
                <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Días asistidos (total)</p>
                <p class="font-bold text-2xl mt-1" style="color:rgb(var(--color-success))">
                  {{ totalDiasAsistidos() }}
                </p>
              </div>
              <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-surface-2))">
                <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Pensionados</p>
                <p class="font-bold text-2xl mt-1" style="color:rgb(var(--color-on-surface))">
                  {{ cobrosPens().length }}
                </p>
              </div>
            </div>

            @if (cobrosPens().length > 0) {
              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Pensionado</th>
                      <th class="text-center">Días asistidos</th>
                      <th class="text-right">Monto base</th>
                      <th class="text-right">Total cobrado</th>
                      <th class="text-right">Saldo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of cobrosPens(); track c.id) {
                      <tr>
                        <td class="font-medium text-sm">
                          {{ c.pensionadoNombre }} {{ c.pensionadoApellido }}
                        </td>
                        <td class="text-center font-mono">{{ c.diasAsistidos }}</td>
                        <td class="text-right font-mono text-sm">Bs {{ c.montoBase | number:'1.2-2' }}</td>
                        <td class="text-right font-mono text-sm font-bold"
                            style="color:rgb(var(--color-primary))">
                          Bs {{ c.totalCobrado | number:'1.2-2' }}
                        </td>
                        <td class="text-right font-mono text-sm"
                            [style.color]="c.saldoRestante > 0 ? 'rgb(var(--color-danger))' : 'rgb(var(--color-success))'">
                          Bs {{ c.saldoRestante | number:'1.2-2' }}
                        </td>
                        <td>
                          @if (c.pagado) {
                            <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                                  style="background:rgb(var(--color-success)/0.15);color:rgb(var(--color-success))">
                              ✓ Pagado
                            </span>
                          } @else {
                            <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                                  style="background:rgb(var(--color-danger)/0.15);color:rgb(var(--color-danger))">
                              Pendiente
                            </span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="text-center py-10">
                <p class="text-3xl opacity-20 mb-2">🏠</p>
                <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.4)">
                  No hay cobros para {{ mesLabel(pensMes, pensAnio) }}
                </p>
              </div>
            }
          }
        </div>
      }

      <!-- ══ RENTABILIDAD POR PLATO ══ -->
      @if (seccion() === 'rentabilidad') {
        <div class="card space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <h2 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
              Rentabilidad por plato
            </h2>
            <div class="flex flex-wrap gap-2 items-end">
              <div>
                <label class="input-label">Desde</label>
                <input type="date" [(ngModel)]="rentDesde" class="input text-sm">
              </div>
              <div>
                <label class="input-label">Hasta</label>
                <input type="date" [(ngModel)]="rentHasta" class="input text-sm">
              </div>
              <button (click)="cargarRentabilidad()" class="btn-primary text-sm" [disabled]="cargandoRent()">
                @if (cargandoRent()) {
                  <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
                }
                Consultar
              </button>
            </div>
          </div>

          <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.4)">
            Margen estimado = precio de venta − costo de la receta activa del plato (costo actual aplicado a todo el período, no una foto histórica).
          </p>

          @if (rentabilidad().length > 0) {
            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-surface-2))">
                <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Ingresos</p>
                <p class="font-bold font-mono mt-1" style="color:rgb(var(--color-primary))">
                  Bs {{ totalIngresosRent() | number:'1.2-2' }}
                </p>
              </div>
              <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-surface-2))">
                <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Costo estimado</p>
                <p class="font-bold font-mono mt-1">Bs {{ totalCostoRent() | number:'1.2-2' }}</p>
              </div>
              <div class="rounded-xl p-3 text-center" style="background:rgb(var(--color-success)/0.1)">
                <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">Margen</p>
                <p class="font-bold font-mono mt-1" style="color:rgb(var(--color-success))">
                  Bs {{ totalMargenRent() | number:'1.2-2' }}
                </p>
              </div>
            </div>

            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Plato</th>
                    <th class="text-center">Cant.</th>
                    <th class="text-right">Ingresos</th>
                    <th class="text-right">Costo</th>
                    <th class="text-right">Margen</th>
                    <th class="text-right">Margen %</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of rentabilidad(); track r.platoId) {
                    <tr>
                      <td class="font-medium text-sm">{{ r.platoNombre }}</td>
                      <td class="text-center font-mono">{{ r.cantidadVendida }}</td>
                      <td class="text-right font-mono text-sm">Bs {{ r.totalIngresos | number:'1.2-2' }}</td>
                      <td class="text-right font-mono text-sm" style="color:rgb(var(--color-on-surface)/0.6)">
                        Bs {{ r.costoTotalEstimado | number:'1.2-2' }}
                      </td>
                      <td class="text-right font-mono text-sm font-bold"
                          [style.color]="r.margenTotal >= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-danger))'">
                        Bs {{ r.margenTotal | number:'1.2-2' }}
                      </td>
                      <td class="text-right font-mono text-sm">{{ r.margenPct | number:'1.0-0' }}%</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else if (!cargandoRent()) {
            <div class="text-center py-10">
              <p class="text-3xl opacity-20 mb-2">📈</p>
              <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.4)">
                Seleccioná un rango y consultá la rentabilidad por plato
              </p>
            </div>
          }
        </div>
      }

      <!-- ══ COMPARATIVO POR SUCURSAL ══ -->
      @if (seccion() === 'sucursales') {
        <div class="card space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <h2 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
              Ventas por sucursal
            </h2>
            <div class="flex flex-wrap gap-2 items-end">
              <div>
                <label class="input-label">Desde</label>
                <input type="date" [(ngModel)]="sucDesde" class="input text-sm">
              </div>
              <div>
                <label class="input-label">Hasta</label>
                <input type="date" [(ngModel)]="sucHasta" class="input text-sm">
              </div>
              <button (click)="cargarComparativoSucursales()" class="btn-primary text-sm" [disabled]="cargandoSuc()">
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
                    <p class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">
                      🏪 {{ c.sucursalNombre }}
                    </p>
                    <div class="mt-1 h-1.5 rounded-full overflow-hidden" style="background:rgb(var(--color-surface))">
                      <div class="h-full rounded-full"
                           [style.width]="(c.total / maxComparativo()) * 100 + '%'"
                           style="background:rgb(var(--color-primary))">
                      </div>
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p class="font-bold font-mono" style="color:rgb(var(--color-primary))">
                      Bs {{ c.total | number:'1.2-2' }}
                    </p>
                    <p class="text-xs font-mono" style="color:rgb(var(--color-on-surface)/0.5)">
                      {{ c.cantidad }} ventas
                    </p>
                  </div>
                </div>
              }
            </div>
          } @else if (!cargandoSuc()) {
            <div class="text-center py-10">
              <p class="text-3xl opacity-20 mb-2">🏪</p>
              <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.4)">
                Seleccioná un rango y consultá el comparativo entre sucursales
              </p>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ReportesComponent implements OnInit {

  // Sección activa
  seccion = signal<Seccion>('calendario');

  secciones = [
    { id: 'calendario' as Seccion, label: 'Calendario',    emoji: '📅' },
    { id: 'ventas'     as Seccion, label: 'Ventas',        emoji: '📊' },
    { id: 'cobros'     as Seccion, label: 'Cobros',        emoji: '🧾' },
    { id: 'productos'  as Seccion, label: 'Productos',     emoji: '🍽️' },
    { id: 'pensionados' as Seccion, label: 'Pensionados',  emoji: '🏠' },
    { id: 'rentabilidad' as Seccion, label: 'Rentabilidad', emoji: '📈' },
    { id: 'sucursales' as Seccion, label: 'Sucursales',    emoji: '🏪' },
  ];

  // Solo usuarios sin sucursal fija (admin/multi-sucursal) ven el comparativo entre sucursales
  seccionesVisibles = computed(() =>
    this.auth.sucursalFija() == null
      ? this.secciones
      : this.secciones.filter(s => s.id !== 'sucursales')
  );

  // Filtro de sucursal para usuarios multi-sucursal (null = todas)
  sucursales      = signal<Sucursal[]>([]);
  sucursalFiltro: number | null = null;

  // ── Calendario ────────────────────────────────────────────────
  calMes  = signal(new Date().getMonth() + 1);
  calAnio = signal(new Date().getFullYear());
  cargandoCal = signal(false);
  ventasMes   = signal<Venta[]>([]);

  diasCalendario = computed<DiaCalendario[]>(() => {
    const mes = this.calMes();
    const anio = this.calAnio();
    const primerDia = new Date(anio, mes - 1, 1).getDay();
    const offset = (primerDia === 0 ? 6 : primerDia - 1); // lunes=0
    const diasEnMes = new Date(anio, mes, 0).getDate();
    const hoy = new Date();

    const totalesPorDia = new Map<number, { total: number; cantidad: number }>();
    for (const v of this.ventasMes()) {
      const d = new Date(v.creadoEn).getDate();
      const cur = totalesPorDia.get(d) ?? { total: 0, cantidad: 0 };
      totalesPorDia.set(d, { total: cur.total + v.totalCobrado, cantidad: cur.cantidad + 1 });
    }

    const dias: DiaCalendario[] = [];
    for (let i = 0; i < offset; i++) dias.push({ dia: null, total: 0, cantidad: 0, esHoy: false });
    for (let d = 1; d <= diasEnMes; d++) {
      const t = totalesPorDia.get(d) ?? { total: 0, cantidad: 0 };
      dias.push({
        dia: d,
        total: t.total,
        cantidad: t.cantidad,
        esHoy: hoy.getDate() === d && hoy.getMonth() + 1 === mes && hoy.getFullYear() === anio,
      });
    }
    return dias;
  });

  totalMes    = computed(() => this.ventasMes().reduce((s, v) => s + v.totalCobrado, 0));
  cantidadMes = computed(() => this.ventasMes().length);
  promedioDia = computed(() => {
    const dias = new Set(this.ventasMes().map(v => new Date(v.creadoEn).getDate())).size;
    return dias ? this.totalMes() / dias : 0;
  });

  // ── Ventas por rango ──────────────────────────────────────────
  ventaDesde  = this.isoDate(new Date(new Date().setDate(1)));
  ventaHasta  = this.isoDate(new Date());
  cargandoVentas = signal(false);
  ventasRango    = signal<Venta[]>([]);

  ventasDiarias = computed<VentaDiaria[]>(() => {
    const mapa = new Map<string, VentaDiaria>();
    for (const v of this.ventasRango()) {
      const fecha = v.creadoEn.substring(0, 10);
      const cur = mapa.get(fecha) ?? { fecha, total: 0, cantidad: 0 };
      mapa.set(fecha, { fecha, total: cur.total + v.totalCobrado, cantidad: cur.cantidad + 1 });
    }
    return Array.from(mapa.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  });

  totalRango    = computed(() => this.ventasRango().reduce((s, v) => s + v.totalCobrado, 0));
  cantidadRango = computed(() => this.ventasRango().length);
  maxDiario     = computed(() => Math.max(...this.ventasDiarias().map(d => d.total), 1));

  accesosRapidosRango = [
    { label: 'Hoy',       desde: this.isoDate(new Date()), hasta: this.isoDate(new Date()) },
    { label: 'Este mes',  desde: this.isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), hasta: this.isoDate(new Date()) },
    { label: 'Mes ant.',  desde: this.isoDate(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)), hasta: this.isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 0)) },
    { label: 'Est. año',  desde: this.isoDate(new Date(new Date().getFullYear(), 0, 1)), hasta: this.isoDate(new Date()) },
  ];

  // ── Cobros ────────────────────────────────────────────────────
  cobroMes  = new Date().getMonth() + 1;
  cobroAnio = new Date().getFullYear();
  cargandoCobros = signal(false);
  cobros = signal<CobroMensual[]>([]);

  cobrosPagados       = computed(() => this.cobros().filter(c => c.pagado).length);
  cobrosPendientesCount = computed(() => this.cobros().filter(c => !c.pagado).length);
  totalPagado         = computed(() => this.cobros().filter(c => c.pagado).reduce((s, c) => s + c.montoPagado, 0));
  totalPendiente      = computed(() => this.cobros().filter(c => !c.pagado).reduce((s, c) => s + c.saldoRestante, 0));
  totalCobros         = computed(() => this.cobros().reduce((s, c) => s + c.totalCobrado, 0));
  pctPagados          = computed(() => this.cobros().length ? (this.cobrosPagados() / this.cobros().length) * 100 : 0);

  // ── Top productos ─────────────────────────────────────────────
  prodDesde    = this.isoDate(new Date(new Date().setDate(1)));
  prodHasta    = this.isoDate(new Date());
  cargandoProd = signal(false);
  topProductos = signal<TopProductoDto[]>([]);
  maxProd      = computed(() => this.topProductos()[0]?.cantidadVendida ?? 1);

  // ── Pensionados reporte ───────────────────────────────────────
  pensMes  = new Date().getMonth() + 1;
  pensAnio = new Date().getFullYear();
  cargandoPens = signal(false);
  cobrosPens   = signal<CobroMensual[]>([]);

  totalCobrosPens   = computed(() => this.cobrosPens().reduce((s, c) => s + c.totalCobrado, 0));
  totalDiasAsistidos = computed(() => this.cobrosPens().reduce((s, c) => s + c.diasAsistidos, 0));

  // ── Rentabilidad por plato ────────────────────────────────────
  rentDesde    = this.isoDate(new Date(new Date().setDate(1)));
  rentHasta    = this.isoDate(new Date());
  cargandoRent = signal(false);
  rentabilidad = signal<RentabilidadPlato[]>([]);

  totalIngresosRent = computed(() => this.rentabilidad().reduce((s, r) => s + r.totalIngresos, 0));
  totalCostoRent    = computed(() => this.rentabilidad().reduce((s, r) => s + r.costoTotalEstimado, 0));
  totalMargenRent   = computed(() => this.rentabilidad().reduce((s, r) => s + r.margenTotal, 0));

  // ── Comparativo por sucursal ──────────────────────────────────
  sucDesde     = this.isoDate(new Date(new Date().setDate(1)));
  sucHasta     = this.isoDate(new Date());
  cargandoSuc  = signal(false);
  comparativo  = signal<VentaPorSucursal[]>([]);
  maxComparativo = computed(() => Math.max(...this.comparativo().map(c => c.total), 1));

  // ── Helpers ───────────────────────────────────────────────────
  meses = [
    {num: 1, label:'Enero'},{num: 2, label:'Febrero'},{num: 3, label:'Marzo'},
    {num: 4, label:'Abril'},{num: 5, label:'Mayo'},{num: 6, label:'Junio'},
    {num: 7, label:'Julio'},{num: 8, label:'Agosto'},{num: 9, label:'Septiembre'},
    {num:10, label:'Octubre'},{num:11, label:'Noviembre'},{num:12, label:'Diciembre'},
  ];
  anios = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  Math = Math;

  constructor(
    private ventaService: VentaService,
    private pensionadoService: PensionadoService,
    private sucursalService: SucursalService,
    private toastSvc: ToastService,
    public auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarCalendario();
    this.cargarCobros();
    this.cargarPensionados();
    if (this.auth.sucursalFija() == null) {
      this.sucursalService.listar().subscribe({ next: l => this.sucursales.set(l), error: () => {} });
    }
  }

  onCambioSucursalFiltro(): void {
    this.cargarCalendario();
    this.cargarVentasRango();
    this.cargarTopProductos();
    this.cargarRentabilidad();
  }

  // ── Calendario ────────────────────────────────────────────────
  cargarCalendario(): void {
    this.cargandoCal.set(true);
    const desde = new Date(this.calAnio(), this.calMes() - 1, 1);
    const hasta  = new Date(this.calAnio(), this.calMes(), 0, 23, 59, 59);
    this.ventaService.listar(desde.toISOString(), hasta.toISOString(), this.sucursalFiltro).subscribe({
      next: vs => { this.ventasMes.set(vs); this.cargandoCal.set(false); },
      error: () => { this.toastSvc.error('Error al cargar calendario'); this.cargandoCal.set(false); },
    });
  }

  mesAnterior(): void {
    if (this.calMes() === 1) { this.calMes.set(12); this.calAnio.update(a => a - 1); }
    else this.calMes.update(m => m - 1);
    this.cargarCalendario();
  }

  mesSiguiente(): void {
    if (this.calMes() === 12) { this.calMes.set(1); this.calAnio.update(a => a + 1); }
    else this.calMes.update(m => m + 1);
    this.cargarCalendario();
  }

  diaColor(dia: DiaCalendario): string {
    if (dia.total === 0) return 'rgb(var(--color-surface-2))';
    const max = Math.max(...this.diasCalendario().filter(d => d.total > 0).map(d => d.total), 1);
    const pct = dia.total / max;
    if (pct < 0.33) return 'rgb(var(--color-primary)/0.2)';
    if (pct < 0.66) return 'rgb(var(--color-primary)/0.4)';
    return 'rgb(var(--color-primary)/0.7)';
  }

  // ── Ventas rango ─────────────────────────────────────────────
  cargarVentasRango(): void {
    this.cargandoVentas.set(true);
    const desde = new Date(this.ventaDesde + 'T00:00:00').toISOString();
    const hasta  = new Date(this.ventaHasta + 'T23:59:59').toISOString();
    this.ventaService.listar(desde, hasta, this.sucursalFiltro).subscribe({
      next: vs => { this.ventasRango.set(vs); this.cargandoVentas.set(false); },
      error: () => { this.toastSvc.error('Error al cargar ventas'); this.cargandoVentas.set(false); },
    });
  }

  aplicarRango(desde: string, hasta: string): void {
    this.ventaDesde = desde;
    this.ventaHasta = hasta;
    this.cargarVentasRango();
  }

  barHeight(val: number, max: number): number { return Math.max((val / max) * 112, 4); }
  barOpacity(val: number, max: number): number { return 0.35 + 0.65 * (val / max); }

  // ── Cobros ────────────────────────────────────────────────────
  cargarCobros(): void {
    this.cargandoCobros.set(true);
    this.pensionadoService.cobrosPorMes(this.cobroMes, this.cobroAnio).subscribe({
      next: cs => { this.cobros.set(cs); this.cargandoCobros.set(false); },
      error: () => { this.toastSvc.error('Error al cargar cobros'); this.cargandoCobros.set(false); },
    });
  }

  // ── Top productos ─────────────────────────────────────────────
  cargarTopProductos(): void {
    this.cargandoProd.set(true);
    const desde = new Date(this.prodDesde + 'T00:00:00').toISOString();
    const hasta  = new Date(this.prodHasta + 'T23:59:59').toISOString();
    this.ventaService.topProductos(desde, hasta, 15, this.sucursalFiltro).subscribe({
      next: ps => { this.topProductos.set(ps); this.cargandoProd.set(false); },
      error: () => { this.toastSvc.error('Error al cargar productos'); this.cargandoProd.set(false); },
    });
  }

  prodBarPct(cantidad: number): number { return (cantidad / this.maxProd()) * 100; }
  rankColor(i: number): string {
    return i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgb(var(--color-on-surface)/0.4)';
  }

  // ── Rentabilidad por plato ─────────────────────────────────────
  cargarRentabilidad(): void {
    this.cargandoRent.set(true);
    const desde = new Date(this.rentDesde + 'T00:00:00').toISOString();
    const hasta  = new Date(this.rentHasta + 'T23:59:59').toISOString();
    this.ventaService.rentabilidad(desde, hasta, this.sucursalFiltro).subscribe({
      next: rs => { this.rentabilidad.set(rs); this.cargandoRent.set(false); },
      error: () => { this.toastSvc.error('Error al cargar rentabilidad'); this.cargandoRent.set(false); },
    });
  }

  // ── Comparativo por sucursal ───────────────────────────────────
  cargarComparativoSucursales(): void {
    this.cargandoSuc.set(true);
    const desde = new Date(this.sucDesde + 'T00:00:00').toISOString();
    const hasta  = new Date(this.sucHasta + 'T23:59:59').toISOString();
    this.ventaService.comparativoSucursales(desde, hasta).subscribe({
      next: cs => { this.comparativo.set(cs); this.cargandoSuc.set(false); },
      error: () => { this.toastSvc.error('Error al cargar comparativo de sucursales'); this.cargandoSuc.set(false); },
    });
  }

  // ── Pensionados ───────────────────────────────────────────────
  cargarPensionados(): void {
    this.cargandoPens.set(true);
    this.pensionadoService.cobrosPorMes(this.pensMes, this.pensAnio).subscribe({
      next: cs => { this.cobrosPens.set(cs); this.cargandoPens.set(false); },
      error: () => { this.toastSvc.error('Error al cargar reporte'); this.cargandoPens.set(false); },
    });
  }

  // ── Utils ─────────────────────────────────────────────────────
  mesLabel(mes: number, anio: number): string {
    return this.meses.find(m => m.num === mes)?.label + ' ' + anio;
  }

  private isoDate(d: Date): string {
    return d.toISOString().substring(0, 10);
  }
}
