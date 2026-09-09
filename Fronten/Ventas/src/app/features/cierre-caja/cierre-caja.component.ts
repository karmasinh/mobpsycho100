import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CierreCajaService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { CierreCaja, MovimientoCaja, TipoMovimientoCaja } from '../../core/models';

@Component({
  selector: 'app-cierre-caja',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-lg mx-auto space-y-5 animate-slide-up">
      <div>
        <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
          Cierre de caja
        </h1>
        <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
          Apertura y arqueo de tu turno de caja
        </p>
      </div>

      @if (cargando()) {
        <div class="skeleton h-40 rounded-2xl"></div>
      } @else if (!turnoAbierto()) {
        <!-- Abrir turno -->
        <div class="card space-y-4">
          <h2 class="font-display font-bold" style="color:rgb(var(--color-on-surface))">
            🔓 Abrir turno de caja
          </h2>
          <div>
            <label class="input-label">Monto inicial en efectivo (Bs) *</label>
            <input [(ngModel)]="montoInicial" type="number" min="0" class="input"
                   placeholder="0.00">
          </div>
          @if (errorMsg()) {
            <p class="text-xs p-2 rounded-lg"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              {{ errorMsg() }}
            </p>
          }
          <button (click)="abrirTurno()" [disabled]="procesando()" class="btn-primary w-full justify-center">
            @if (procesando()) {
              <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
            } @else { Abrir turno }
          </button>
        </div>
      } @else {
        <!-- Turno abierto -->
        <div class="card space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-display font-bold" style="color:rgb(var(--color-on-surface))">
              🔒 Turno abierto
            </h2>
            <span class="badge-success">En curso</span>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="stat-card">
              <p class="stat-value">{{ turnoAbierto()!.fechaApertura | date:'HH:mm' }}</p>
              <p class="stat-label">Hora de apertura</p>
            </div>
            <div class="stat-card">
              <p class="stat-value">Bs {{ turnoAbierto()!.montoInicial | number:'1.2-2' }}</p>
              <p class="stat-label">Monto inicial</p>
            </div>
          </div>

          <div class="pt-2 space-y-3" style="border-top:1px solid rgb(var(--color-border))">
            <p class="text-sm font-semibold" style="color:rgb(var(--color-on-surface)/0.7)">
              Movimientos de caja
            </p>

            @if (movimientos().length > 0) {
              <div class="space-y-1 max-h-40 overflow-y-auto">
                @for (m of movimientos(); track m.id) {
                  <div class="flex items-center justify-between text-xs p-2 rounded-lg"
                       style="background:rgb(var(--color-surface-2))">
                    <span [style.color]="m.tipo === 'INGRESO' ? 'rgb(var(--color-success))' : 'rgb(var(--color-danger))'">
                      {{ m.tipo === 'INGRESO' ? '↑ Ingreso' : '↓ Retiro' }}
                      @if (m.motivo) { — {{ m.motivo }} }
                    </span>
                    <span class="font-mono font-semibold">Bs {{ m.monto | number:'1.2-2' }}</span>
                  </div>
                }
              </div>
            }

            <div class="flex gap-2 items-end">
              <div class="w-28">
                <label class="input-label">Tipo</label>
                <select [(ngModel)]="movTipo" class="input text-sm">
                  <option value="INGRESO">Ingreso</option>
                  <option value="RETIRO">Retiro</option>
                </select>
              </div>
              <div class="w-24">
                <label class="input-label">Monto</label>
                <input [(ngModel)]="movMonto" type="number" min="0.01" class="input text-sm" placeholder="0.00">
              </div>
              <div class="flex-1">
                <label class="input-label">Motivo</label>
                <input [(ngModel)]="movMotivo" class="input text-sm" maxlength="255" placeholder="Opcional">
              </div>
              <button (click)="registrarMovimiento()" [disabled]="procesandoMov()" class="btn-secondary text-sm py-2">
                Registrar
              </button>
            </div>
            @if (errorMov()) {
              <p class="text-xs p-2 rounded-lg"
                 style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
                {{ errorMov() }}
              </p>
            }
          </div>

          <div class="pt-2 space-y-3" style="border-top:1px solid rgb(var(--color-border))">
            <p class="text-sm font-semibold" style="color:rgb(var(--color-on-surface)/0.7)">
              Cerrar turno
            </p>
            <div>
              <label class="input-label">Efectivo contado al cerrar (Bs) *</label>
              <input [(ngModel)]="montoFinalDeclarado" type="number" min="0" class="input"
                     placeholder="0.00">
            </div>
            <div>
              <label class="input-label">Observaciones</label>
              <input [(ngModel)]="observaciones" class="input text-sm" maxlength="255"
                     placeholder="Opcional">
            </div>
            @if (errorMsg()) {
              <p class="text-xs p-2 rounded-lg"
                 style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
                {{ errorMsg() }}
              </p>
            }
            <button (click)="cerrarTurno()" [disabled]="procesando()" class="btn-primary w-full justify-center">
              @if (procesando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else { Cerrar turno }
            </button>
          </div>
        </div>
      }

      @if (resultadoCierre()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
             style="background:rgba(0,0,0,0.6)">
          <div class="card max-w-sm w-full space-y-3 animate-pop">
            <h3 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
              ✅ Turno cerrado
            </h3>
            <div class="space-y-1 text-sm" style="color:rgb(var(--color-on-surface)/0.7)">
              <div class="flex justify-between"><span>Ventas en efectivo</span><span class="font-mono">Bs {{ resultadoCierre()!.totalVentasEfectivo | number:'1.2-2' }}</span></div>
              @if (resultadoCierre()!.totalIngresos > 0) {
                <div class="flex justify-between"><span>Ingresos</span><span class="font-mono">+ Bs {{ resultadoCierre()!.totalIngresos | number:'1.2-2' }}</span></div>
              }
              @if (resultadoCierre()!.totalRetiros > 0) {
                <div class="flex justify-between"><span>Retiros</span><span class="font-mono">− Bs {{ resultadoCierre()!.totalRetiros | number:'1.2-2' }}</span></div>
              }
              <div class="flex justify-between"><span>Efectivo esperado</span><span class="font-mono">Bs {{ resultadoCierre()!.montoEsperadoEfectivo | number:'1.2-2' }}</span></div>
              <div class="flex justify-between"><span>Efectivo declarado</span><span class="font-mono">Bs {{ resultadoCierre()!.montoFinalDeclarado | number:'1.2-2' }}</span></div>
              <div class="flex justify-between font-bold"
                   [style.color]="(resultadoCierre()!.diferencia ?? 0) === 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-danger))'">
                <span>Diferencia</span><span class="font-mono">Bs {{ resultadoCierre()!.diferencia | number:'1.2-2' }}</span>
              </div>
            </div>
            <button (click)="cerrarModalResultado()" class="btn-primary w-full justify-center">
              Entendido
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class CierreCajaComponent implements OnInit {
  cargando          = signal(true);
  turnoAbierto      = signal<CierreCaja | null>(null);
  resultadoCierre   = signal<CierreCaja | null>(null);
  procesando        = signal(false);
  errorMsg          = signal('');

  movimientos       = signal<MovimientoCaja[]>([]);
  procesandoMov     = signal(false);
  errorMov          = signal('');

  montoInicial: number | null = null;
  montoFinalDeclarado: number | null = null;
  observaciones = '';
  movTipo: TipoMovimientoCaja = 'INGRESO';
  movMonto: number | null = null;
  movMotivo = '';

  constructor(
    private cierreCajaService: CierreCajaService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.cierreCajaService.obtenerAbierto().subscribe({
      next: turno => {
        this.turnoAbierto.set(turno);
        this.cargando.set(false);
        if (turno) this.cargarMovimientos(turno.id);
      },
      error: () => { this.turnoAbierto.set(null); this.cargando.set(false); },
    });
  }

  private cargarMovimientos(cierreCajaId: number): void {
    this.cierreCajaService.listarMovimientos(cierreCajaId).subscribe({
      next: ms => this.movimientos.set(ms),
      error: () => {},
    });
  }

  registrarMovimiento(): void {
    const turno = this.turnoAbierto();
    if (!turno) return;
    if (!this.movMonto || this.movMonto <= 0) {
      this.errorMov.set('Ingresa un monto válido.');
      return;
    }
    this.procesandoMov.set(true);
    this.errorMov.set('');
    this.cierreCajaService.registrarMovimiento(turno.id, this.movTipo, this.movMonto, this.movMotivo || undefined).subscribe({
      next: () => {
        this.movMonto = null;
        this.movMotivo = '';
        this.procesandoMov.set(false);
        this.cargarMovimientos(turno.id);
      },
      error: err => {
        this.errorMov.set(err?.error?.mensaje ?? 'Error al registrar el movimiento');
        this.procesandoMov.set(false);
      },
    });
  }

  abrirTurno(): void {
    if (!this.montoInicial || this.montoInicial < 0) {
      this.errorMsg.set('Ingresa un monto inicial válido.');
      return;
    }
    this.procesando.set(true);
    this.errorMsg.set('');
    this.cierreCajaService.abrir(this.montoInicial, this.auth.sucursalActiva()).subscribe({
      next: turno => { this.turnoAbierto.set(turno); this.movimientos.set([]); this.procesando.set(false); },
      error: err => {
        this.errorMsg.set(err?.error?.mensaje ?? 'Error al abrir el turno');
        this.procesando.set(false);
      },
    });
  }

  cerrarTurno(): void {
    const turno = this.turnoAbierto();
    if (!turno) return;
    if (this.montoFinalDeclarado == null || this.montoFinalDeclarado < 0) {
      this.errorMsg.set('Ingresa el efectivo contado.');
      return;
    }
    this.procesando.set(true);
    this.errorMsg.set('');
    this.cierreCajaService.cerrar(turno.id, this.montoFinalDeclarado, this.observaciones || undefined).subscribe({
      next: cerrado => {
        this.resultadoCierre.set(cerrado);
        this.turnoAbierto.set(null);
        this.movimientos.set([]);
        this.montoFinalDeclarado = null;
        this.observaciones = '';
        this.procesando.set(false);
      },
      error: err => {
        this.errorMsg.set(err?.error?.mensaje ?? 'Error al cerrar el turno');
        this.procesando.set(false);
      },
    });
  }

  cerrarModalResultado(): void {
    this.resultadoCierre.set(null);
  }
}
