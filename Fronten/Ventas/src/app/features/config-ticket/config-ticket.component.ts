import { Component, OnInit, signal, effect, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfiguracionTicketService } from '../../core/services/api.service';
import { ConfiguracionTicket, Venta } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TicketPrintService } from '../../core/services/ticket-print.service';

const VENTA_EJEMPLO: Venta = {
  id: 0,
  pedido: {
    id: 0,
    estado: 'ENTREGADO',
    total: 45,
    observaciones: '',
    cliente: { id: 0, nombre: 'Consumidor final' },
    detalles: [
      { id: 1, plato: { id: 1, nombre: 'Plan Completo', tipo: 'SEGUNDO' }, cantidad: 1, precioUnitario: 25, observaciones: '' },
      { id: 2, plato: { id: 2, nombre: 'Refresco', tipo: 'SEGUNDO' }, cantidad: 2, precioUnitario: 10, observaciones: '' },
    ],
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  },
  totalCobrado: 45,
  montoRecibido: 50,
  vuelto: 5,
  formaPago: 'EFECTIVO',
  anulada: false,
  numeroTicket: 'S1-000001',
  cajero: { id: 0, username: 'cajero1' },
  creadoEn: new Date().toISOString(),
};

@Component({
  selector: 'app-config-ticket',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-5 animate-slide-up">
      <div>
        <h1 class="font-display text-2xl font-bold inline-flex items-center gap-2" style="color:rgb(var(--color-on-surface))">
          <iconify-icon icon="tabler:receipt" width="24" height="24" style="color:currentColor"></iconify-icon>
          Ticket de venta
        </h1>
        <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
          Datos que se imprimen en el comprobante entregado al cliente
        </p>
      </div>

      @if (cargando()) {
        <div class="card h-64 animate-pulse"></div>
      } @else {
        <div class="grid gap-5 lg:grid-cols-2 items-start">

          <!-- ── Formulario ─────────────────────────────────────── -->
          <div class="card space-y-4">
            <div>
              <label class="input-label">Razón social</label>
              <input [(ngModel)]="form.razonSocial" class="input text-sm" maxlength="150"
                     placeholder="La Entrerriana" data-cy="input-ticket-razon-social">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="input-label">NIT</label>
                <input [(ngModel)]="form.nit" class="input text-sm" maxlength="30" placeholder="1234567890">
              </div>
              <div>
                <label class="input-label">Teléfono</label>
                <input [(ngModel)]="form.telefono" class="input text-sm" maxlength="30" placeholder="70000000">
              </div>
            </div>

            <div>
              <label class="input-label">Dirección</label>
              <input [(ngModel)]="form.direccion" class="input text-sm" maxlength="200"
                     placeholder="Av. Principal #123">
            </div>

            <div>
              <label class="input-label">Prefijo del correlativo</label>
              <input [(ngModel)]="form.prefijo" class="input text-sm font-mono" maxlength="10" placeholder="S1">
              <p class="text-[11px] mt-1" style="color:rgb(var(--color-on-surface)/0.4)">
                Correlativo actual: {{ form.correlativoActual }} · siguiente ticket: {{ form.prefijo || 'S1' }}-{{ pad(form.correlativoActual + 1) }}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="input-label">Ancho de papel (mm)</label>
                <input [(ngModel)]="form.anchoMm" type="number" min="40" max="120" class="input text-sm font-mono">
              </div>
              <div>
                <label class="input-label">Copias</label>
                <input [(ngModel)]="form.copias" type="number" min="1" max="5" class="input text-sm font-mono">
              </div>
            </div>

            <div>
              <label class="input-label">Mensaje de pie</label>
              <input [(ngModel)]="form.mensajePie" class="input text-sm" maxlength="150"
                     placeholder="¡Gracias por su preferencia!">
            </div>

            <div>
              <label class="input-label">Leyenda legal</label>
              <input [(ngModel)]="form.leyendaLegal" class="input text-sm" maxlength="200"
                     placeholder="Este comprobante no tiene validez fiscal">
            </div>

            <div class="space-y-2 pt-1">
              <label class="text-xs font-semibold" style="color:rgb(var(--color-on-surface)/0.6)">Mostrar en el ticket</label>
              <div class="grid grid-cols-2 gap-2 text-sm">
                <label class="inline-flex items-center gap-2">
                  <input type="checkbox" [(ngModel)]="form.mostrarCajero"> Cajero
                </label>
                <label class="inline-flex items-center gap-2">
                  <input type="checkbox" [(ngModel)]="form.mostrarCliente"> Cliente
                </label>
                <label class="inline-flex items-center gap-2">
                  <input type="checkbox" [(ngModel)]="form.mostrarFormaPago"> Forma de pago
                </label>
                <label class="inline-flex items-center gap-2">
                  <input type="checkbox" [(ngModel)]="form.mostrarNumeroPedido"> Número de pedido
                </label>
                <label class="inline-flex items-center gap-2">
                  <input type="checkbox" [(ngModel)]="form.mostrarObservaciones"> Observaciones
                </label>
              </div>
            </div>

            <label class="inline-flex items-center gap-2 text-sm pt-1">
              <input type="checkbox" [(ngModel)]="form.imprimirAutomatico">
              Imprimir automáticamente al cobrar
            </label>

            @if (error()) {
              <p class="text-xs p-2.5 rounded-lg inline-flex items-center gap-1.5"
                 style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
                <iconify-icon icon="tabler:alert-triangle" width="14" height="14" style="color:currentColor"></iconify-icon> {{ error() }}
              </p>
            }

            <div class="flex gap-2 pt-1">
              <button (click)="guardar()" [disabled]="guardando()" class="btn-primary flex-1 justify-center" data-cy="btn-guardar-ticket">
                @if (guardando()) {
                  <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
                } @else { Guardar }
              </button>
              <button (click)="probarImpresion()" class="btn-secondary inline-flex items-center gap-1.5">
                <iconify-icon icon="tabler:printer" width="16" height="16" style="color:currentColor"></iconify-icon> Probar impresión
              </button>
            </div>
          </div>

          <!-- ── Vista previa en vivo ───────────────────────────── -->
          <div class="card">
            <p class="text-xs font-semibold mb-3" style="color:rgb(var(--color-on-surface)/0.5)">Vista previa</p>
            <div class="mx-auto rounded-lg overflow-hidden" style="background:#fff;max-width:280px;box-shadow:0 4px 20px rgb(0 0 0 / 0.15)">
              <div class="p-3" style="font-family:'Courier New',monospace;font-size:11px;color:#111;line-height:1.5">
                @if (form.razonSocial) {
                  <div class="text-center font-bold">{{ form.razonSocial }}</div>
                }
                @if (form.nit) { <div class="text-center">NIT: {{ form.nit }}</div> }
                @if (form.direccion) { <div class="text-center">{{ form.direccion }}</div> }
                @if (form.telefono) { <div class="text-center">Tel: {{ form.telefono }}</div> }
                <div class="border-t border-dashed my-1.5" style="border-color:#999"></div>
                <div>Ticket: {{ form.prefijo || 'S1' }}-{{ pad(form.correlativoActual + 1) }}</div>
                <div>Fecha: {{ hoy }}</div>
                @if (form.mostrarNumeroPedido) { <div>Pedido: #1</div> }
                @if (form.mostrarCajero) { <div>Cajero: cajero1</div> }
                @if (form.mostrarCliente) { <div>Cliente: Consumidor final</div> }
                <div class="border-t border-dashed my-1.5" style="border-color:#999"></div>
                <div class="flex justify-between"><span>1 Plan Completo</span><span>25.00</span></div>
                <div class="flex justify-between"><span>2 Refresco</span><span>20.00</span></div>
                <div class="border-t border-dashed my-1.5" style="border-color:#999"></div>
                <div class="flex justify-between font-bold"><span>TOTAL</span><span>Bs 45.00</span></div>
                @if (form.mostrarFormaPago) {
                  <div class="flex justify-between font-bold"><span>Forma de pago</span><span>EFECTIVO</span></div>
                }
                <div class="flex justify-between font-bold"><span>Recibido</span><span>Bs 50.00</span></div>
                <div class="flex justify-between font-bold"><span>Cambio</span><span>Bs 5.00</span></div>
                @if (form.mensajePie) { <div class="text-center italic mt-1.5">{{ form.mensajePie }}</div> }
                @if (form.leyendaLegal) { <div class="text-center italic">{{ form.leyendaLegal }}</div> }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ConfigTicketComponent implements OnInit {
  cargando  = signal(true);
  guardando = signal(false);
  error     = signal('');
  hoy = new Date().toLocaleDateString('es-BO') + ' ' + new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

  form = {
    razonSocial: '' as string | null,
    nit: '' as string | null,
    direccion: '' as string | null,
    telefono: '' as string | null,
    prefijo: '' as string | null,
    correlativoActual: 0,
    anchoMm: 80,
    copias: 1,
    mostrarCajero: true,
    mostrarCliente: true,
    mostrarFormaPago: true,
    mostrarObservaciones: true,
    mostrarNumeroPedido: true,
    mensajePie: '' as string | null,
    leyendaLegal: '' as string | null,
    imprimirAutomatico: true,
  };

  private sucursalId = 0;

  constructor(
    private svc: ConfiguracionTicketService,
    private authSvc: AuthService,
    private toastSvc: ToastService,
    private ticketPrint: TicketPrintService,
  ) {
    // La sucursal activa del admin se resuelve de forma async (shell.component.ts elige la
    // primera disponible recién tras cargar la lista) — puede seguir en null cuando este
    // componente se monta directo por ruta, así que se reacciona al signal en vez de leerlo
    // una sola vez en ngOnInit (evita el 404 de mandar sucursalId=0 al backend).
    effect(() => {
      const sucursalId = this.authSvc.sucursalActiva();
      if (sucursalId == null || sucursalId === this.sucursalId) return;
      this.sucursalId = sucursalId;
      this.cargar();
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    if (this.authSvc.sucursalActiva() == null) this.cargando.set(false);
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.svc.obtener(this.sucursalId).subscribe({
      next: c => { this.cargarForm(c); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
  }

  private cargarForm(c: ConfiguracionTicket): void {
    this.form = {
      razonSocial: c.razonSocial,
      nit: c.nit,
      direccion: c.direccion,
      telefono: c.telefono,
      prefijo: c.prefijo,
      correlativoActual: c.correlativoActual,
      anchoMm: c.anchoMm,
      copias: c.copias,
      mostrarCajero: c.mostrarCajero,
      mostrarCliente: c.mostrarCliente,
      mostrarFormaPago: c.mostrarFormaPago,
      mostrarObservaciones: c.mostrarObservaciones,
      mostrarNumeroPedido: c.mostrarNumeroPedido,
      mensajePie: c.mensajePie,
      leyendaLegal: c.leyendaLegal,
      imprimirAutomatico: c.imprimirAutomatico,
    };
  }

  pad(n: number): string {
    return String(n).padStart(6, '0');
  }

  guardar(): void {
    this.error.set('');
    if (!this.sucursalId) {
      this.error.set('No hay una sucursal activa seleccionada.'); return;
    }
    if (this.form.anchoMm < 40 || this.form.anchoMm > 120) {
      this.error.set('El ancho debe estar entre 40 y 120 mm.'); return;
    }
    if (this.form.copias < 1 || this.form.copias > 5) {
      this.error.set('Las copias deben estar entre 1 y 5.'); return;
    }

    this.guardando.set(true);
    this.svc.guardar(this.sucursalId, this.form).subscribe({
      next: c => {
        this.guardando.set(false);
        this.cargarForm(c);
        this.toastSvc.success('Configuración de ticket guardada');
      },
      error: err => {
        this.guardando.set(false);
        this.error.set(err?.error?.mensaje ?? 'Error al guardar');
      },
    });
  }

  probarImpresion(): void {
    const config: ConfiguracionTicket = {
      id: null,
      sucursal: { id: this.sucursalId, nombre: '' },
      ...this.form,
      logoBase64: null,
    };
    this.ticketPrint.imprimir(VENTA_EJEMPLO, config);
  }
}
