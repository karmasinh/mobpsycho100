import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PensionadoService } from '../../core/services/api.service';
import { TipoAlmuerzoPensionadosService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { Pensionado, CobroMensual, AsistenciaPensionado, TipoAlmuerzo } from '../../core/models';

type Vista = 'lista' | 'asistencia' | 'cobros';

@Component({
  selector: 'app-pensionados',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <div class="space-y-5 animate-slide-up">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Pensionados
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ lista().length }} registrados · {{ totalActivos() }} activos
          </p>
        </div>
        <div class="flex gap-2">
          <input [(ngModel)]="busqueda" (ngModelChange)="pagina.set(1)" class="input w-44 text-sm"
                 placeholder="🔍 Buscar..." maxlength="100">
          <button (click)="abrirRegistro()" class="btn-primary">+ Nuevo</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-3">
        <div class="stat-card">
          <p class="stat-value text-success">{{ totalActivos() }}</p>
          <p class="stat-label">Activos</p>
        </div>
        <div class="stat-card">
          <p class="stat-value text-warning">{{ totalConSaldo() }}</p>
          <p class="stat-label">Con saldo pendiente</p>
        </div>
        <div class="stat-card">
          <p class="stat-value">{{ lista().length }}</p>
          <p class="stat-label">Total</p>
        </div>
      </div>

      <!-- Tabla -->
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th (click)="sortBy('nombre')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">Pensionado <span class="text-xs opacity-40">{{ si('nombre') }}</span></div>
              </th>
              <th>Cédula</th>
              <th (click)="sortBy('plan')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">Plan <span class="text-xs opacity-40">{{ si('plan') }}</span></div>
              </th>
              <th (click)="sortBy('saldo')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">Saldo <span class="text-xs opacity-40">{{ si('saldo') }}</span></div>
              </th>
              <th (click)="sortBy('estado')" class="cursor-pointer select-none">
                <div class="flex items-center gap-1">Estado <span class="text-xs opacity-40">{{ si('estado') }}</span></div>
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (cargando()) {
              @for (i of [1,2,3,4]; track i) {
                <tr>@for (j of [1,2,3,4,5,6]; track j){<td><div class="skeleton h-4 rounded"></div></td>}</tr>
              }
            }
            @for (p of filtradosPaginados(); track p.id) {
              <tr>
                <td>
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                         style="background:rgb(var(--color-primary)/0.15);color:rgb(var(--color-primary))">
                      {{ p.nombre.charAt(0) }}
                    </div>
                    <div>
                      <p class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">
                        {{ p.nombre }} {{ p.apellido }}
                      </p>
                      <p class="text-[11px]" style="color:rgb(var(--color-on-surface)/0.4)">
                        {{ p.telefono || p.correo || '—' }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="font-mono text-xs">{{ p.cedula }}</td>
                <td class="text-sm">{{ p.tipoAlmuerzo?.nombre || '—' }}</td>
                <td>
                  @if ((p.saldoPendiente ?? 0) > 0) {
                    <span class="badge-danger text-xs">Bs {{ p.saldoPendiente | number:'1.2-2' }}</span>
                  } @else {
                    <span class="badge-success text-xs">Al día</span>
                  }
                </td>
                <td><span [class]="badgeEstado(p.estado)">{{ labelEstado(p.estado) }}</span></td>
                <td>
                  <div class="flex gap-1 flex-wrap">
                    <button (click)="verAsistencia(p)"
                            class="text-xs py-1 px-2 rounded-lg"
                            style="background:rgb(var(--color-success)/0.1);color:rgb(var(--color-success))">
                      ✓ Asistencia
                    </button>
                    <button (click)="verCobros(p)"
                            class="text-xs py-1 px-2 rounded-lg"
                            style="background:rgb(var(--color-primary)/0.1);color:rgb(var(--color-primary))">
                      🧾 Cobros
                    </button>
                    @if (p.estado === 'ACTIVO' || p.estado === 'REACTIVADO') {
                      <button (click)="baja(p)"
                              class="text-xs py-1 px-2 rounded-lg"
                              style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
                        Baja
                      </button>
                    } @else if (p.estado === 'BAJA_VOLUNTARIA' || p.estado === 'INACTIVO') {
                      <button (click)="reactivar(p)"
                              class="text-xs py-1 px-2 rounded-lg"
                              style="background:rgb(var(--color-info)/0.1);color:rgb(var(--color-info))">
                        Reactivar
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
            @if (!cargando() && filtrados().length === 0) {
              <tr>
                <td colspan="6" class="text-center py-12" style="color:rgb(var(--color-on-surface)/0.35)">
                  <p class="text-3xl mb-2">🏠</p>
                  <p>No hay pensionados registrados</p>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <app-pagination
        [total]="filtrados().length"
        [pagina]="pagina()"
        [pageSize]="pageSize"
        (pageChange)="pagina.set($event)" />

    </div>

    <!-- ── MODAL REGISTRO ──────────────────────────────────── -->
    @if (modalRegistro()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
           (click)="modalRegistro.set(false)">
        <div class="card max-w-lg w-full space-y-4 animate-pop max-h-[90vh] overflow-y-auto"
             (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h3 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
              🏠 Nuevo Pensionado
            </h3>
            <button (click)="modalRegistro.set(false)" class="btn-ghost p-1">✕</button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="input-label">Nombre <span class="text-danger">*</span></label>
              <input [(ngModel)]="regForm.nombre" class="input text-sm" placeholder="Juan" maxlength="100" required>
            </div>
            <div>
              <label class="input-label">Apellido <span class="text-danger">*</span></label>
              <input [(ngModel)]="regForm.apellido" class="input text-sm" placeholder="Pérez" maxlength="100" required>
            </div>
            <div>
              <label class="input-label">Cédula <span class="text-danger">*</span></label>
              <input [(ngModel)]="regForm.cedula" class="input text-sm" placeholder="12345678" maxlength="20" required>
            </div>
            <div>
              <label class="input-label">
                Teléfono
                <span title="Formato: 7 a 15 dígitos" class="cursor-help ml-1 opacity-50">(?)</span>
              </label>
              <input [(ngModel)]="regForm.telefono" class="input text-sm"
                     placeholder="79xxxxxx" maxlength="15" type="tel">
            </div>
            <div class="col-span-2">
              <label class="input-label">Correo electrónico</label>
              <input [(ngModel)]="regForm.correo" class="input text-sm" type="email"
                     placeholder="juan@email.com" maxlength="150">
            </div>
            <div class="col-span-2">
              <label class="input-label">Plan de almuerzo <span class="text-danger">*</span></label>
              <select [(ngModel)]="regForm.tipoAlmuerzoId" class="input text-sm" required>
                <option [value]="null">— Seleccionar plan —</option>
                @for (t of tiposAlmuerzo(); track t.id) {
                  <option [value]="t.id">{{ t.nombre }} — Bs {{ t.precioMensual | number:'1.2-2' }}/mes</option>
                }
              </select>
            </div>
            <div>
              <label class="input-label">Fecha de inscripción <span class="text-danger">*</span></label>
              <input [(ngModel)]="regForm.fechaInscripcion" class="input text-sm" type="date" required>
            </div>
            <div>
              <label class="input-label">
                Username
                <span title="Si se omite, se genera automáticamente como nombre.apellido" class="cursor-help ml-1 opacity-50">(?)</span>
              </label>
              <input [(ngModel)]="regForm.usernamePersonalizado" class="input text-sm font-mono"
                     placeholder="Auto: nombre.apellido" maxlength="50">
            </div>
            <div class="col-span-2">
              <label class="input-label">Contraseña inicial <span class="text-danger">*</span></label>
              <input [(ngModel)]="regForm.passwordInicial" class="input text-sm" type="password"
                     placeholder="Mínimo 6 caracteres" maxlength="100" required>
            </div>
          </div>

          @if (errorModal()) {
            <p class="text-xs p-2.5 rounded-lg"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              ⚠️ {{ errorModal() }}
            </p>
          }
          <div class="flex gap-2 pt-1">
            <button (click)="modalRegistro.set(false)" class="btn-secondary flex-1 justify-center">Cancelar</button>
            <button (click)="registrar()" [disabled]="guardando()" class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else { Registrar }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── PANEL ASISTENCIA ────────────────────────────────── -->
    @if (vista() === 'asistencia' && pensionadoActivo()) {
      <div class="fixed inset-0 z-50 flex justify-end" (click)="cerrarPanel()">
        <div class="w-full max-w-md bg-surface h-full flex flex-col shadow-2xl animate-slide-in-right overflow-y-auto"
             style="background:rgb(var(--color-surface))"
             (click)="$event.stopPropagation()">

          <div class="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h3 class="font-bold" style="color:rgb(var(--color-on-surface))">
                ✓ Asistencia — {{ pensionadoActivo()!.nombre }} {{ pensionadoActivo()!.apellido }}
              </h3>
              <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.45)">
                Historial del mes actual
              </p>
            </div>
            <button (click)="cerrarPanel()" class="btn-ghost p-1 text-lg">✕</button>
          </div>

          <div class="p-5 space-y-4 flex-1">
            <!-- Marcar hoy -->
            <button (click)="marcarAsistenciaHoy()"
                    class="btn-primary w-full justify-center"
                    [disabled]="guardando()">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else {
                ✅ Marcar asistencia hoy
              }
            </button>

            <!-- Historial -->
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider mb-2"
                 style="color:rgb(var(--color-on-surface)/0.4)">Historial</p>
              @if (cargandoDetalle()) {
                <div class="skeleton h-32 rounded-xl"></div>
              } @else if (asistencias().length === 0) {
                <p class="text-center py-6 text-sm" style="color:rgb(var(--color-on-surface)/0.35)">
                  Sin asistencias registradas
                </p>
              } @else {
                <div class="space-y-1">
                  @for (a of asistencias(); track a.id) {
                    <div class="flex items-center justify-between px-3 py-2 rounded-lg"
                         style="background:rgb(var(--color-surface-2))">
                      <span class="text-sm font-mono" style="color:rgb(var(--color-on-surface)/0.75)">
                        {{ a.fecha }}
                      </span>
                      <span class="text-xs font-semibold"
                            [style.color]="a.asistio ? 'rgb(var(--color-success))' : 'rgb(var(--color-danger))'">
                        {{ a.asistio ? '✅ Presente' : '❌ Ausente' }}
                      </span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ── PANEL COBROS ────────────────────────────────────── -->
    @if (vista() === 'cobros' && pensionadoActivo()) {
      <div class="fixed inset-0 z-50 flex justify-end" (click)="cerrarPanel()">
        <div class="w-full max-w-md bg-surface h-full flex flex-col shadow-2xl overflow-y-auto"
             style="background:rgb(var(--color-surface))"
             (click)="$event.stopPropagation()">

          <div class="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h3 class="font-bold" style="color:rgb(var(--color-on-surface))">
                🧾 Cobros — {{ pensionadoActivo()!.nombre }} {{ pensionadoActivo()!.apellido }}
              </h3>
              <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.45)">
                Plan: {{ pensionadoActivo()!.tipoAlmuerzo?.nombre }}
              </p>
            </div>
            <button (click)="cerrarPanel()" class="btn-ghost p-1 text-lg">✕</button>
          </div>

          <div class="p-5 space-y-4 flex-1">
            <!-- Generar cobro del mes -->
            <button (click)="generarCobroMes()"
                    class="btn-secondary w-full justify-center"
                    [disabled]="guardando()">
              🗓️ Generar cobro de este mes
            </button>

            <!-- Lista de cobros -->
            @if (cargandoDetalle()) {
              <div class="skeleton h-48 rounded-xl"></div>
            } @else if (cobros().length === 0) {
              <p class="text-center py-6 text-sm" style="color:rgb(var(--color-on-surface)/0.35)">
                Sin cobros registrados
              </p>
            } @else {
              <div class="space-y-3">
                @for (c of cobros(); track c.id) {
                  <div class="rounded-xl p-4 space-y-2"
                       [style.background]="c.pagado ? 'rgb(var(--color-success)/0.06)' : 'rgb(var(--color-surface-2))'"
                       [style.border]="c.pagado ? '1px solid rgb(var(--color-success)/0.25)' : '1px solid rgb(var(--color-border))'">
                    <div class="flex items-center justify-between">
                      <span class="font-semibold text-sm" style="color:rgb(var(--color-on-surface))">
                        {{ mesNombre(c.mes) }} {{ c.anio }}
                      </span>
                      <span [class]="c.pagado ? 'badge-success' : 'badge-warning'" class="text-[10px]">
                        {{ c.pagado ? '✅ Pagado' : '⏳ Pendiente' }}
                      </span>
                    </div>
                    <div class="grid grid-cols-2 gap-1 text-xs" style="color:rgb(var(--color-on-surface)/0.6)">
                      <span>Monto base: <strong>Bs {{ c.montoBase | number:'1.2-2' }}</strong></span>
                      <span>Total: <strong>Bs {{ c.totalCobrado | number:'1.2-2' }}</strong></span>
                      <span>Pagado: <strong>Bs {{ c.montoPagado | number:'1.2-2' }}</strong></span>
                      <span>Saldo: <strong style="color:rgb(var(--color-danger))">Bs {{ c.saldoRestante | number:'1.2-2' }}</strong></span>
                      <span>Asistencias: <strong>{{ c.diasAsistidos }} días</strong></span>
                      @if (c.fechaPago) {
                        <span>Pagado el: <strong>{{ c.fechaPago }}</strong></span>
                      }
                    </div>
                    @if (!c.pagado) {
                      <button (click)="abrirPago(c)"
                              class="btn-primary text-xs py-1.5 px-3 mt-1">
                        💳 Registrar pago
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- ── MODAL PAGO ──────────────────────────────────────── -->
    @if (modalPago() && cobroActivo()) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
           (click)="modalPago.set(false)">
        <div class="card max-w-sm w-full space-y-4 animate-pop" (click)="$event.stopPropagation()">
          <h3 class="font-display font-bold" style="color:rgb(var(--color-on-surface))">
            💳 Registrar Pago
          </h3>
          <div class="rounded-xl p-3 space-y-1 text-sm"
               style="background:rgb(var(--color-surface-2))">
            <p style="color:rgb(var(--color-on-surface)/0.6)">
              {{ mesNombre(cobroActivo()!.mes) }} {{ cobroActivo()!.anio }}
            </p>
            <p class="font-bold text-lg" style="color:rgb(var(--color-on-surface))">
              Total a cobrar: Bs {{ cobroActivo()!.saldoRestante | number:'1.2-2' }}
            </p>
          </div>
          <div>
            <label class="input-label">Monto a pagar *</label>
            <input [(ngModel)]="pagoMonto" type="number" class="input text-sm"
                   [placeholder]="'Bs ' + (cobroActivo()!.saldoRestante | number:'1.2-2')">
          </div>
          <div>
            <label class="input-label">Forma de pago</label>
            <select [(ngModel)]="pagoForma" class="input text-sm">
              <option value="EFECTIVO">💵 Efectivo</option>
              <option value="QR">📱 QR</option>
              <option value="MIXTO">🔀 Mixto</option>
            </select>
          </div>
          @if (errorModal()) {
            <p class="text-xs p-2.5 rounded-lg"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              ⚠️ {{ errorModal() }}
            </p>
          }
          <div class="flex gap-2">
            <button (click)="modalPago.set(false)" class="btn-secondary flex-1 justify-center">Cancelar</button>
            <button (click)="confirmarPago()" [disabled]="guardando()" class="btn-primary flex-1 justify-center">
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
export class PensionadosComponent implements OnInit {
  lista              = signal<Pensionado[]>([]);
  tiposAlmuerzo      = signal<TipoAlmuerzo[]>([]);
  asistencias        = signal<AsistenciaPensionado[]>([]);
  cobros             = signal<CobroMensual[]>([]);
  cargando           = signal(true);
  cargandoDetalle    = signal(false);
  guardando          = signal(false);
  modalRegistro      = signal(false);
  modalPago          = signal(false);
  vista              = signal<Vista>('lista');
  pensionadoActivo   = signal<Pensionado | null>(null);
  cobroActivo        = signal<CobroMensual | null>(null);
  error              = signal('');
  errorModal         = signal('');
  busqueda           = '';
  pagoMonto: number | null = null;
  pagoForma          = 'EFECTIVO';

  sortCol = signal<string>('');
  sortDir = signal<'asc' | 'desc'>('asc');
  pagina  = signal(1);
  readonly pageSize = 10;

  regForm = {
    nombre: '', apellido: '', cedula: '', telefono: '', correo: '',
    tipoAlmuerzoId: null as number | null,
    fechaInscripcion: new Date().toISOString().split('T')[0],
    usernamePersonalizado: '', passwordInicial: '',
  };

  totalActivos  = computed(() => this.lista().filter(p => p.estado === 'ACTIVO' || p.estado === 'REACTIVADO').length);
  totalConSaldo = computed(() => this.lista().filter(p => (p.saldoPendiente ?? 0) > 0).length);

  filtrados = computed(() => {
    const q = this.busqueda.toLowerCase().trim();
    let lista = q
      ? this.lista().filter(p =>
          `${p.nombre} ${p.apellido} ${p.cedula}`.toLowerCase().includes(q)
        )
      : this.lista();
    const col = this.sortCol();
    if (col) {
      const dir = this.sortDir() === 'asc' ? 1 : -1;
      lista = [...lista].sort((a, b) => {
        if (col === 'nombre') return dir * `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`);
        if (col === 'plan')   return dir * (a.tipoAlmuerzo?.nombre ?? '').localeCompare(b.tipoAlmuerzo?.nombre ?? '');
        if (col === 'saldo')  return dir * ((a.saldoPendiente ?? 0) - (b.saldoPendiente ?? 0));
        if (col === 'estado') return dir * a.estado.localeCompare(b.estado);
        return 0;
      });
    }
    return lista;
  });

  filtradosPaginados = computed(() => {
    const desde = (this.pagina() - 1) * this.pageSize;
    return this.filtrados().slice(desde, desde + this.pageSize);
  });

  constructor(
    private service: PensionadoService,
    private tipoSvc: TipoAlmuerzoPensionadosService,
    private toastSvc: ToastService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.tipoSvc.listar().subscribe({ next: ts => this.tiposAlmuerzo.set(ts), error: () => {} });
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.listar().subscribe({
      next: ps => { this.lista.set(ps); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
  }

  abrirRegistro(): void {
    this.regForm = {
      nombre: '', apellido: '', cedula: '', telefono: '', correo: '',
      tipoAlmuerzoId: null,
      fechaInscripcion: new Date().toISOString().split('T')[0],
      usernamePersonalizado: '', passwordInicial: '',
    };
    this.errorModal.set('');
    this.modalRegistro.set(true);
  }

  registrar(): void {
    if (!this.regForm.nombre || !this.regForm.apellido || !this.regForm.cedula) {
      this.errorModal.set('Nombre, apellido y cédula son obligatorios.'); return;
    }
    if (!this.regForm.tipoAlmuerzoId) {
      this.errorModal.set('Selecciona un plan de almuerzo.'); return;
    }
    if (!this.regForm.passwordInicial) {
      this.errorModal.set('La contraseña inicial es obligatoria.'); return;
    }
    this.guardando.set(true);
    this.service.registrar(this.regForm).subscribe({
      next: p => {
        this.guardando.set(false);
        this.modalRegistro.set(false);
        this.lista.update(list => [p, ...list]);
        this.toastSvc.success(`Pensionado registrado — ${p.nombre} ${p.apellido}`);
      },
      error: err => {
        this.guardando.set(false);
        this.errorModal.set(err?.error?.mensaje ?? 'Error al registrar');
      },
    });
  }

  verAsistencia(p: Pensionado): void {
    this.pensionadoActivo.set(p);
    this.vista.set('asistencia');
    this.cargandoDetalle.set(true);
    this.service.listarAsistencias(p.id).subscribe({
      next: as => { this.asistencias.set(as); this.cargandoDetalle.set(false); },
      error: () => this.cargandoDetalle.set(false),
    });
  }

  verCobros(p: Pensionado): void {
    this.pensionadoActivo.set(p);
    this.vista.set('cobros');
    this.cargandoDetalle.set(true);
    this.service.listarCobros(p.id).subscribe({
      next: cs => { this.cobros.set(cs); this.cargandoDetalle.set(false); },
      error: () => this.cargandoDetalle.set(false),
    });
  }

  cerrarPanel(): void {
    this.vista.set('lista');
    this.pensionadoActivo.set(null);
  }

  marcarAsistenciaHoy(): void {
    const p = this.pensionadoActivo();
    if (!p) return;
    this.guardando.set(true);
    this.service.registrarAsistencia(p.id).subscribe({
      next: () => {
        this.guardando.set(false);
        this.toastSvc.success('Asistencia registrada');
        this.service.listarAsistencias(p.id).subscribe({ next: as => this.asistencias.set(as) });
      },
      error: err => {
        this.guardando.set(false);
        this.toastSvc.error(err?.error?.mensaje ?? 'Error al registrar asistencia');
      },
    });
  }

  generarCobroMes(): void {
    const p = this.pensionadoActivo();
    if (!p) return;
    const hoy = new Date();
    this.guardando.set(true);
    this.service.generarCobro(p.id, hoy.getMonth() + 1, hoy.getFullYear()).subscribe({
      next: c => {
        this.guardando.set(false);
        this.cobros.update(list => [c, ...list]);
        this.toastSvc.success(`Cobro generado — Bs ${c.totalCobrado}`);
      },
      error: err => {
        this.guardando.set(false);
        this.toastSvc.error(err?.error?.mensaje ?? 'Error al generar cobro');
      },
    });
  }

  abrirPago(c: CobroMensual): void {
    this.cobroActivo.set(c);
    this.pagoMonto = c.saldoRestante;
    this.pagoForma = 'EFECTIVO';
    this.errorModal.set('');
    this.modalPago.set(true);
  }

  confirmarPago(): void {
    if (!this.pagoMonto || this.pagoMonto <= 0) {
      this.errorModal.set('Ingresa un monto válido.'); return;
    }
    const cobro = this.cobroActivo()!;
    this.guardando.set(true);
    this.service.registrarPago({
      pensionadoId: cobro.pensionadoId,
      mes: cobro.mes,
      anio: cobro.anio,
      montoPagado: this.pagoMonto,
      formaPago: this.pagoForma,
    }).subscribe({
      next: updated => {
        this.guardando.set(false);
        this.modalPago.set(false);
        this.cobros.update(list => list.map(x => x.id === updated.id ? updated : x));
        this.cargar();
        this.toastSvc.success(`Pago registrado — Bs ${this.pagoMonto}`);
      },
      error: err => {
        this.guardando.set(false);
        this.errorModal.set(err?.error?.mensaje ?? 'Error al registrar pago');
      },
    });
  }

  baja(p: Pensionado): void {
    if (!confirm(`¿Dar de baja a ${p.nombre} ${p.apellido}?`)) return;
    this.service.baja(p.id).subscribe({
      next: () => {
        this.lista.update(list => list.map(x => x.id === p.id ? { ...x, estado: 'BAJA_VOLUNTARIA' as any } : x));
        this.toastSvc.success('Baja registrada');
      },
      error: err => this.toastSvc.error(err?.error?.mensaje ?? 'Error al dar de baja'),
    });
  }

  reactivar(p: Pensionado): void {
    this.service.reactivar(p.id).subscribe({
      next: () => {
        this.lista.update(list => list.map(x => x.id === p.id ? { ...x, estado: 'REACTIVADO' as any } : x));
        this.toastSvc.success('Pensionado reactivado correctamente');
      },
      error: err => this.toastSvc.error(err?.error?.mensaje ?? 'Error al reactivar'),
    });
  }

  badgeEstado(estado: string): string {
    const m: Record<string, string> = {
      ACTIVO: 'badge-success', REACTIVADO: 'badge-info',
      INACTIVO: 'badge-neutral', BAJA_VOLUNTARIA: 'badge-warning',
      BAJA_AUTOMATICA: 'badge-danger',
    };
    return m[estado] ?? 'badge-neutral';
  }

  labelEstado(estado: string): string {
    const m: Record<string, string> = {
      ACTIVO: 'Activo', REACTIVADO: 'Reactivado', INACTIVO: 'Inactivo',
      BAJA_VOLUNTARIA: 'Baja voluntaria', BAJA_AUTOMATICA: 'Baja automática',
    };
    return m[estado] ?? estado;
  }

  mesNombre(mes: number): string {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return meses[mes - 1] ?? String(mes);
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
}
