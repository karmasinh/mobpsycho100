import { Component, OnInit, signal, effect, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacturacionService } from '../../core/services/api.service';
import { ConfiguracionFacturacion, EstadoFacturacionDto, Factura } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-facturacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-5 animate-slide-up">
      <div>
        <h1 class="font-display text-2xl font-bold inline-flex items-center gap-2" style="color:rgb(var(--color-on-surface))">
          <iconify-icon icon="tabler:file-invoice" width="24" height="24" style="color:currentColor"></iconify-icon>
          Facturación electrónica
        </h1>
        <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
          Emisión de facturas ante el SIN (SIAT) — cimientos del sistema
        </p>
      </div>

      <!-- Badge de estado: nunca finge tener conexión real -->
      <div class="card flex flex-wrap items-center gap-3"
           style="background:rgb(var(--color-warning)/0.08);border:1px solid rgb(var(--color-warning)/0.3)">
        <iconify-icon icon="tabler:alert-triangle" width="22" height="22" style="color:rgb(var(--color-warning))"></iconify-icon>
        <div class="flex-1 min-w-[220px]">
          <p class="text-sm font-bold" style="color:rgb(var(--color-warning))">
            Conexión SIN: no configurada — cimientos únicamente
          </p>
          <p class="text-xs mt-0.5" style="color:rgb(var(--color-on-surface)/0.6)">
            Este sistema genera el XML de la factura localmente y la deja lista para descargar,
            pero <strong>nunca la envía al SIN de verdad</strong>. Toda factura emitida queda en
            estado <strong>PENDIENTE</strong> — jamás se marca como aceptada, porque no hay conexión real.
          </p>
        </div>
        @if (estado()) {
          <span class="text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap"
                [style.background]="estado()!.habilitada ? 'rgb(var(--color-success)/0.15)' : 'rgb(var(--color-surface-2))'"
                [style.color]="estado()!.habilitada ? 'rgb(var(--color-success))' : 'rgb(var(--color-on-surface)/0.5)'">
            {{ estado()!.habilitada ? 'Habilitada (demo)' : 'Deshabilitada' }} · {{ estado()!.estado }}
          </span>
        }
      </div>

      @if (cargando()) {
        <div class="card h-64 animate-pulse"></div>
      } @else {
        <div class="grid gap-5 lg:grid-cols-2 items-start">

          <!-- ── Configuración fiscal ───────────────────────────── -->
          <div class="card space-y-4">
            <h2 class="font-display font-bold" style="color:rgb(var(--color-on-surface))">Datos fiscales</h2>

            <div>
              <label class="input-label">Razón social</label>
              <input [(ngModel)]="form.razonSocial" class="input text-sm" maxlength="200" placeholder="La Entrerriana" data-cy="input-facturacion-razon-social">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="input-label">NIT</label>
                <input [(ngModel)]="form.nit" class="input text-sm" maxlength="20" placeholder="1234567890">
              </div>
              <div>
                <label class="input-label">Municipio</label>
                <input [(ngModel)]="form.municipio" class="input text-sm" maxlength="100" placeholder="Santa Cruz de la Sierra">
              </div>
            </div>

            <div>
              <label class="input-label">Leyenda de la factura</label>
              <input [(ngModel)]="form.leyendaFactura" class="input text-sm" maxlength="500"
                     placeholder="Ley N° 453: Usted tiene derecho a recibir información...">
            </div>

            <div>
              <label class="input-label">Ambiente</label>
              <select [(ngModel)]="form.ambiente" class="input text-sm">
                <option value="PRUEBAS">Pruebas</option>
                <option value="PRODUCCION">Producción</option>
              </select>
            </div>

            <label class="inline-flex items-center gap-2 text-sm pt-1">
              <input type="checkbox" [(ngModel)]="form.facturacionHabilitada">
              Habilitar emisión de facturas en esta sucursal
            </label>
            <p class="text-[11px]" style="color:rgb(var(--color-on-surface)/0.4)">
              Requiere un CUFD vigente (de prueba). Generalo abajo antes de habilitar.
            </p>

            @if (error()) {
              <p class="text-xs p-2.5 rounded-lg inline-flex items-center gap-1.5"
                 style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
                <iconify-icon icon="tabler:alert-triangle" width="14" height="14" style="color:currentColor"></iconify-icon> {{ error() }}
              </p>
            }

            <button (click)="guardar()" [disabled]="guardando()" class="btn-primary w-full justify-center" data-cy="btn-guardar-facturacion">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else { Guardar configuración }
            </button>
          </div>

          <!-- ── Códigos de habilitación (simulados) ────────────── -->
          <div class="card space-y-4">
            <h2 class="font-display font-bold" style="color:rgb(var(--color-on-surface))">Códigos de habilitación (demo)</h2>
            <p class="text-xs" style="color:rgb(var(--color-on-surface)/0.5)">
              Como no hay conexión real al SIN, estos botones generan códigos de <strong>prueba
              locales</strong> — nunca los emite el SIN. Sirven para poder emitir facturas y
              probar el circuito completo.
            </p>

            <div class="p-3 rounded-lg space-y-1" style="background:rgb(var(--color-surface-2))">
              <div class="flex justify-between text-sm">
                <span style="color:rgb(var(--color-on-surface)/0.5)">CUIS</span>
                <span class="font-mono">{{ config()?.cuis ?? '—' }}</span>
              </div>
              <div class="flex justify-between text-xs" style="color:rgb(var(--color-on-surface)/0.4)">
                <span>Vigente hasta</span>
                <span>{{ (config()?.cuisVigenteHasta | date:'dd/MM/yyyy HH:mm') ?? '—' }}</span>
              </div>
            </div>
            <button (click)="solicitarCuis()" [disabled]="procesandoCuis()" class="btn-secondary w-full justify-center text-sm" data-cy="btn-generar-cuis">
              @if (procesandoCuis()) {
                <span class="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin inline-block"></span>
              } @else {
                <iconify-icon icon="tabler:refresh" width="16" height="16" style="color:currentColor"></iconify-icon>
              }
              Generar CUIS de prueba
            </button>

            <div class="p-3 rounded-lg space-y-1" style="background:rgb(var(--color-surface-2))">
              <div class="flex justify-between text-sm">
                <span style="color:rgb(var(--color-on-surface)/0.5)">CUFD</span>
                <span class="font-mono">{{ config()?.cufd ?? '—' }}</span>
              </div>
              <div class="flex justify-between text-xs" style="color:rgb(var(--color-on-surface)/0.4)">
                <span>Vigente hasta</span>
                <span>{{ (config()?.cufdVigenteHasta | date:'dd/MM/yyyy HH:mm') ?? '—' }}</span>
              </div>
            </div>
            <button (click)="renovarCufd()" [disabled]="procesandoCufd()" class="btn-secondary w-full justify-center text-sm" data-cy="btn-renovar-cufd">
              @if (procesandoCufd()) {
                <span class="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin inline-block"></span>
              } @else {
                <iconify-icon icon="tabler:refresh" width="16" height="16" style="color:currentColor"></iconify-icon>
              }
              Renovar CUFD de prueba (24 h)
            </button>

            @if (ultimoMensajeDemo()) {
              <p class="text-xs p-2.5 rounded-lg" style="background:rgb(var(--color-info)/0.1);color:rgb(var(--color-info))">
                {{ ultimoMensajeDemo() }}
              </p>
            }
          </div>
        </div>

        <!-- ── Listado de facturas ───────────────────────────────── -->
        <div class="card space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="font-display font-bold" style="color:rgb(var(--color-on-surface))">Facturas emitidas</h2>
            <button (click)="cargarFacturas()" class="btn-ghost text-xs">
              <iconify-icon icon="tabler:refresh" width="14" height="14" style="color:currentColor"></iconify-icon> Actualizar
            </button>
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>NIT/Doc.</th>
                  <th class="text-right">Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @if (facturas().length === 0) {
                  <tr>
                    <td colspan="7" class="text-center py-10">
                      <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.4)">
                        Todavía no se emitió ninguna factura. Emitilas desde Historial de ventas.
                      </p>
                    </td>
                  </tr>
                } @else {
                  @for (f of facturas(); track f.id) {
                    <tr>
                      <td class="font-mono text-sm">{{ f.numeroFactura }}</td>
                      <td class="text-xs font-mono">{{ f.fechaEmision | date:'dd/MM/yyyy HH:mm' }}</td>
                      <td class="text-sm">{{ f.razonSocialCliente }}</td>
                      <td class="text-xs font-mono">{{ f.nitCliente }}</td>
                      <td class="text-right font-mono text-sm">Bs {{ f.montoTotal | number:'1.2-2' }}</td>
                      <td>
                        <span class="text-xs px-2 py-0.5 rounded-full font-semibold" [style.background]="badgeBg(f.estado)" [style.color]="badgeColor(f.estado)">
                          {{ f.estado }}
                        </span>
                      </td>
                      <td>
                        <div class="flex gap-1">
                          <button (click)="verPdf(f)" class="btn-ghost text-xs px-2 py-1" title="Ver PDF">
                            <iconify-icon icon="tabler:file-type-pdf" width="16" height="16" style="color:currentColor"></iconify-icon>
                          </button>
                          <button (click)="descargarXml(f)" class="btn-ghost text-xs px-2 py-1" title="Descargar XML">
                            <iconify-icon icon="tabler:file-text" width="16" height="16" style="color:currentColor"></iconify-icon>
                          </button>
                          @if (f.estado === 'PENDIENTE') {
                            <button (click)="reintentar(f)" class="btn-ghost text-xs px-2 py-1" title="Reintentar envío al SIN">
                              <iconify-icon icon="tabler:refresh" width="16" height="16" style="color:currentColor"></iconify-icon>
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class FacturacionComponent implements OnInit {
  cargando   = signal(true);
  guardando  = signal(false);
  procesandoCuis = signal(false);
  procesandoCufd = signal(false);
  error      = signal('');
  ultimoMensajeDemo = signal('');

  estado    = signal<EstadoFacturacionDto | null>(null);
  config    = signal<ConfiguracionFacturacion | null>(null);
  facturas  = signal<Factura[]>([]);

  form = {
    nit: '' as string | null,
    razonSocial: '' as string | null,
    municipio: '' as string | null,
    leyendaFactura: '' as string | null,
    ambiente: 'PRUEBAS' as 'PRUEBAS' | 'PRODUCCION',
    facturacionHabilitada: false,
  };

  private sucursalId = 0;

  constructor(
    private svc: FacturacionService,
    private authSvc: AuthService,
    private toastSvc: ToastService,
  ) {
    // Igual que en config-ticket: la sucursal activa del admin se resuelve async, así que
    // se reacciona al signal en vez de leerlo una sola vez (evita mandar sucursalId=0).
    effect(() => {
      const sucursalId = this.authSvc.sucursalActiva();
      if (sucursalId == null || sucursalId === this.sucursalId) return;
      this.sucursalId = sucursalId;
      this.cargarTodo();
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    if (this.authSvc.sucursalActiva() == null) this.cargando.set(false);
  }

  private cargarTodo(): void {
    this.cargando.set(true);
    this.svc.estado(this.sucursalId).subscribe({ next: e => this.estado.set(e) });
    this.svc.obtenerConfiguracion(this.sucursalId).subscribe({
      next: c => { this.config.set(c); this.cargarForm(c); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
    this.cargarFacturas();
  }

  cargarFacturas(): void {
    if (!this.sucursalId) return;
    this.svc.listar(this.sucursalId).subscribe({ next: fs => this.facturas.set(fs) });
  }

  private cargarForm(c: ConfiguracionFacturacion): void {
    this.form = {
      nit: c.nit,
      razonSocial: c.razonSocial,
      municipio: c.municipio,
      leyendaFactura: c.leyendaFactura,
      ambiente: c.ambiente,
      facturacionHabilitada: c.facturacionHabilitada,
    };
  }

  guardar(): void {
    this.error.set('');
    if (!this.sucursalId) { this.error.set('No hay una sucursal activa seleccionada.'); return; }

    this.guardando.set(true);
    this.svc.guardarConfiguracion(this.sucursalId, this.form).subscribe({
      next: c => {
        this.guardando.set(false);
        this.config.set(c);
        this.cargarForm(c);
        this.toastSvc.success('Configuración fiscal guardada');
        this.svc.estado(this.sucursalId).subscribe({ next: e => this.estado.set(e) });
      },
      error: err => {
        this.guardando.set(false);
        this.error.set(err?.error?.mensaje ?? 'Error al guardar');
      },
    });
  }

  solicitarCuis(): void {
    if (!this.sucursalId) return;
    this.procesandoCuis.set(true);
    this.svc.solicitarCuis(this.sucursalId).subscribe({
      next: c => {
        this.procesandoCuis.set(false);
        this.config.set(c);
        this.ultimoMensajeDemo.set(
          `CUIS de prueba generado: ${c.cuis} (simulado — el SIN nunca fue contactado).`);
        this.toastSvc.success('CUIS de prueba generado');
      },
      error: err => {
        this.procesandoCuis.set(false);
        this.toastSvc.error(err?.error?.mensaje ?? 'No se pudo generar el CUIS');
      },
    });
  }

  renovarCufd(): void {
    if (!this.sucursalId) return;
    this.procesandoCufd.set(true);
    this.svc.renovarCufd(this.sucursalId).subscribe({
      next: c => {
        this.procesandoCufd.set(false);
        this.config.set(c);
        this.ultimoMensajeDemo.set(
          `CUFD de prueba generado: ${c.cufd} (simulado — el SIN nunca fue contactado). Vigente 24 h.`);
        this.toastSvc.success('CUFD de prueba renovado');
      },
      error: err => {
        this.procesandoCufd.set(false);
        this.toastSvc.error(err?.error?.mensaje ?? 'No se pudo renovar el CUFD');
      },
    });
  }

  descargarXml(f: Factura): void {
    this.svc.obtenerXml(f.id).subscribe({
      next: xml => {
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura-${f.numeroFactura}.xml`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toastSvc.error('No se pudo descargar el XML'),
    });
  }

  verPdf(f: Factura): void {
    // La pestaña se abre YA, de forma síncrona dentro del handler del click: si se abre recién
    // cuando llega la respuesta HTTP (async), la mayoría de navegadores la bloquea como popup.
    // Se le asigna la URL del blob una vez que el PDF llega.
    const pestana = window.open('', '_blank');
    this.svc.descargarPdf(f.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        if (pestana && !pestana.closed) {
          pestana.location.href = url;
        } else {
          window.open(url, '_blank');
        }
        // No se revoca el object URL enseguida: la pestaña sigue leyendo el blob al abrirse.
        // El navegador lo libera solo al cerrar el documento/pestaña.
      },
      error: () => {
        pestana?.close();
        this.toastSvc.error('No se pudo generar el PDF');
      },
    });
  }

  reintentar(f: Factura): void {
    this.svc.reintentar(f.id).subscribe({
      next: () => this.toastSvc.success('Reintento exitoso'),
      error: err => this.toastSvc.error(
        err?.error?.mensaje ?? 'No se pudo reintentar el envío (conexión al SIN no configurada)'),
    });
  }

  badgeBg(estado: string): string {
    const m: Record<string, string> = {
      PENDIENTE: 'rgb(var(--color-warning)/0.15)',
      ACEPTADA:  'rgb(var(--color-success)/0.15)',
      RECHAZADA: 'rgb(var(--color-danger)/0.12)',
      ANULADA:   'rgb(var(--color-surface-2))',
    };
    return m[estado] ?? 'rgb(var(--color-surface-2))';
  }

  badgeColor(estado: string): string {
    const m: Record<string, string> = {
      PENDIENTE: 'rgb(var(--color-warning))',
      ACEPTADA:  'rgb(var(--color-success))',
      RECHAZADA: 'rgb(var(--color-danger))',
      ANULADA:   'rgb(var(--color-on-surface)/0.5)',
    };
    return m[estado] ?? 'rgb(var(--color-on-surface))';
  }
}
