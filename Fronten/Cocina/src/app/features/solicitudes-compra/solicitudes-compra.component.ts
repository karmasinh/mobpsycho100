import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SolicitudCompraService,
  ProveedorService,
  InsumoService,
  CrearSolicitudCompraRequest,
  AvanzarEstadoSolicitudCompraRequest,
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { SolicitudCompra, EstadoSolicitudCompra, Proveedor, Insumo } from '../../core/models';

interface ItemFormulario {
  insumoId: string;
  cantidadSolicitada: number;
  observaciones: string;
}

interface ItemRecepcionFormulario {
  itemId: number;
  insumoNombre: string;
  unidadMedida: string;
  numeroLote: string;
  precioUnitario: number;
  fechaVencimiento: string;
}

@Component({
  selector: 'app-solicitudes-compra',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-5 animate-slide-up">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Solicitudes de compra
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            Flujo de aprobación: creada → en revisión → aprobada → en proceso → recibida
          </p>
        </div>
        <button (click)="abrirModalNueva()" class="btn-primary whitespace-nowrap">+ Nueva solicitud</button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2">
        <button (click)="vistaActiva.set('pendientes')"
                class="btn text-sm py-2 px-3"
                [class.btn-primary]="vistaActiva()==='pendientes'"
                [class.btn-secondary]="vistaActiva()!=='pendientes'">
          Pendientes
        </button>
        <button (click)="vistaActiva.set('mias')"
                class="btn text-sm py-2 px-3"
                [class.btn-primary]="vistaActiva()==='mias'"
                [class.btn-secondary]="vistaActiva()!=='mias'">
          Mis solicitudes
        </button>
      </div>

      @if (cargando()) {
        <div class="skeleton h-40 rounded-2xl"></div>
      } @else if (listaActual().length === 0) {
        <div class="card text-center py-10">
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ vistaActiva() === 'pendientes' ? 'No hay solicitudes pendientes.' : 'Todavía no creaste ninguna solicitud.' }}
          </p>
        </div>
      } @else {
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Proveedor</th>
                <th>Sucursal</th>
                <th>Solicitante</th>
                <th>Ítems</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (s of listaActual(); track s.id) {
                <tr>
                  <td class="font-mono text-xs">#{{ s.id }}</td>
                  <td class="text-sm">{{ s.proveedor?.nombre ?? '—' }}</td>
                  <td class="text-xs">{{ s.sucursal?.nombre ?? '—' }}</td>
                  <td class="text-xs">{{ s.solicitante?.username ?? '—' }}</td>
                  <td class="text-xs">{{ s.items.length }} ítem(s)</td>
                  <td>
                    <span [class]="badgeClase(s.estado)">{{ estadoLabel(s.estado) }}</span>
                    @if (s.estado === 'RECHAZADA' && s.motivoRechazo) {
                      <p class="text-xs mt-1" style="color:rgb(var(--color-on-surface)/0.5)">{{ s.motivoRechazo }}</p>
                    }
                  </td>
                  <td class="text-xs">{{ s.creadoEn | date:'dd/MM HH:mm' }}</td>
                  <td>
                    <div class="flex gap-1 flex-wrap">
                      @if (s.estado === 'CREADA') {
                        <button (click)="avanzar(s, 'EN_REVISION')" [disabled]="procesandoId() === s.id"
                                class="btn-primary text-xs px-2 py-1">
                          Enviar a revisión
                        </button>
                        <button (click)="abrirRechazar(s)" [disabled]="procesandoId() === s.id"
                                class="btn-ghost text-xs px-2 py-1 text-danger">
                          Rechazar
                        </button>
                      }
                      @if (s.estado === 'EN_REVISION') {
                        @if (esAdmin()) {
                          <button (click)="avanzar(s, 'APROBADA')" [disabled]="procesandoId() === s.id"
                                  class="btn-primary text-xs px-2 py-1">
                            Aprobar
                          </button>
                          <button (click)="abrirRechazar(s)" [disabled]="procesandoId() === s.id"
                                  class="btn-ghost text-xs px-2 py-1 text-danger">
                            Rechazar
                          </button>
                        } @else {
                          <span class="text-xs" style="color:rgb(var(--color-on-surface)/0.4)">
                            Esperando decisión de un administrador
                          </span>
                        }
                      }
                      @if (s.estado === 'APROBADA') {
                        <button (click)="avanzar(s, 'EN_PROCESO')" [disabled]="procesandoId() === s.id"
                                class="btn-primary text-xs px-2 py-1">
                          Marcar en proceso
                        </button>
                      }
                      @if (s.estado === 'EN_PROCESO') {
                        <button (click)="abrirRecepcion(s)" [disabled]="procesandoId() === s.id"
                                class="btn-primary text-xs px-2 py-1">
                          Marcar recibida
                        </button>
                      }
                      @if (s.estado === 'RECIBIDA' || s.estado === 'RECHAZADA') {
                        <span class="text-xs" style="color:rgb(var(--color-on-surface)/0.35)">Sin acciones</span>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- Modal: nueva solicitud -->
    @if (modalNueva()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.6)" (click)="cerrarModales()">
        <div class="card max-w-lg w-full space-y-4 animate-pop" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h3 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
              Nueva solicitud de compra
            </h3>
            <button (click)="cerrarModales()" class="btn-ghost p-1">
              <iconify-icon icon="line-md:close" width="16" height="16" style="color:currentColor"></iconify-icon>
            </button>
          </div>

          <div>
            <label class="input-label">Proveedor *</label>
            <select [(ngModel)]="formNueva.proveedorId" class="input text-sm">
              <option value="">Seleccionar proveedor...</option>
              @for (p of proveedores(); track p.id) {
                <option [value]="p.id">{{ p.nombre }}</option>
              }
            </select>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="input-label mb-0">Ítems *</label>
              <button (click)="agregarItem()" class="btn-ghost text-xs px-2 py-1">+ Agregar ítem</button>
            </div>
            @for (item of formNueva.items; track $index) {
              <div class="grid grid-cols-[2fr_1fr_2fr_auto] gap-2 items-start">
                <select [(ngModel)]="item.insumoId" class="input text-sm">
                  <option value="">Insumo...</option>
                  @for (i of insumos(); track i.id) {
                    <option [value]="i.id">{{ i.codigo }} — {{ i.nombre }}</option>
                  }
                </select>
                <input [(ngModel)]="item.cantidadSolicitada" type="number" min="0.01" class="input text-sm" placeholder="Cant.">
                <input [(ngModel)]="item.observaciones" maxlength="255" class="input text-sm" placeholder="Observaciones (opcional)">
                <button (click)="quitarItem($index)" class="btn-ghost p-1.5" [disabled]="formNueva.items.length === 1">
                  <iconify-icon icon="line-md:close" width="14" height="14" style="color:currentColor"></iconify-icon>
                </button>
              </div>
            }
          </div>

          @if (errorModal()) {
            <p class="text-xs p-2 rounded-lg"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              {{ errorModal() }}
            </p>
          }

          <div class="flex gap-2 pt-1">
            <button (click)="cerrarModales()" class="btn-secondary flex-1 justify-center">Cancelar</button>
            <button (click)="crearSolicitud()" [disabled]="guardando()" class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else { Crear solicitud }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal: rechazar -->
    @if (modalRechazar()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.5)">
        <div class="card max-w-sm w-full space-y-4 animate-pop">
          <h3 class="font-display font-bold text-lg" style="color:rgb(var(--color-danger))">
            Rechazar solicitud #{{ modalRechazar()!.id }}
          </h3>
          <div>
            <label class="input-label">Motivo del rechazo *</label>
            <textarea [(ngModel)]="motivoRechazo" class="input w-full resize-none" rows="3"
                      maxlength="255" placeholder="Explicá por qué se rechaza..."></textarea>
            @if (errorModal()) {
              <p class="text-xs mt-1" style="color:rgb(var(--color-danger))">{{ errorModal() }}</p>
            }
          </div>
          <div class="flex gap-2">
            <button (click)="cerrarModales()" class="btn-secondary flex-1 justify-center">Cancelar</button>
            <button (click)="confirmarRechazar()" [disabled]="guardando()" class="btn-danger flex-1 justify-center">
              Rechazar
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal: marcar recibida (datos de lote por ítem) -->
    @if (modalRecepcion()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background:rgba(0,0,0,0.6)" (click)="cerrarModales()">
        <div class="card max-w-lg w-full space-y-4 animate-pop" (click)="$event.stopPropagation()">
          <h3 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
            Marcar solicitud #{{ modalRecepcion()!.id }} como recibida
          </h3>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.6)">
            Indicá los datos de lote de cada ítem recibido — esto genera el ingreso real de stock.
          </p>

          <div>
            <label class="input-label">Fecha de recepción</label>
            <input [(ngModel)]="formRecepcion.fechaRecepcion" type="date" class="input text-sm">
          </div>

          <div class="space-y-3 max-h-72 overflow-y-auto">
            @for (item of formRecepcion.items; track item.itemId) {
              <div class="p-3 rounded-xl space-y-2" style="border:1px solid rgb(var(--color-border))">
                <p class="text-sm font-semibold" style="color:rgb(var(--color-on-surface))">
                  {{ item.insumoNombre }} ({{ item.unidadMedida }})
                </p>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="input-label">N° de lote</label>
                    <input [(ngModel)]="item.numeroLote" maxlength="100" class="input text-sm" placeholder="Auto">
                  </div>
                  <div>
                    <label class="input-label">Precio unitario *</label>
                    <input [(ngModel)]="item.precioUnitario" type="number" min="0" class="input text-sm" placeholder="0.00">
                  </div>
                  <div>
                    <label class="input-label">Vencimiento</label>
                    <input [(ngModel)]="item.fechaVencimiento" type="date" class="input text-sm">
                  </div>
                </div>
              </div>
            }
          </div>

          @if (errorModal()) {
            <p class="text-xs p-2 rounded-lg"
               style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
              {{ errorModal() }}
            </p>
          }

          <div class="flex gap-2 pt-1">
            <button (click)="cerrarModales()" class="btn-secondary flex-1 justify-center">Cancelar</button>
            <button (click)="confirmarRecepcion()" [disabled]="guardando()" class="btn-primary flex-1 justify-center">
              @if (guardando()) {
                <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              } @else { Confirmar recepción }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class SolicitudesCompraComponent implements OnInit {
  vistaActiva     = signal<'pendientes' | 'mias'>('pendientes');
  cargando        = signal(true);
  pendientes      = signal<SolicitudCompra[]>([]);
  mias            = signal<SolicitudCompra[]>([]);
  proveedores     = signal<Proveedor[]>([]);
  insumos         = signal<Insumo[]>([]);
  procesandoId    = signal<number | null>(null);
  guardando       = signal(false);
  errorModal      = signal('');

  modalNueva      = signal(false);
  modalRechazar   = signal<SolicitudCompra | null>(null);
  modalRecepcion  = signal<SolicitudCompra | null>(null);
  motivoRechazo   = '';

  formNueva: { proveedorId: string; items: ItemFormulario[] } = {
    proveedorId: '',
    items: [{ insumoId: '', cantidadSolicitada: 0, observaciones: '' }],
  };

  formRecepcion: { fechaRecepcion: string; items: ItemRecepcionFormulario[] } = {
    fechaRecepcion: '',
    items: [],
  };

  listaActual = computed(() => this.vistaActiva() === 'pendientes' ? this.pendientes() : this.mias());

  constructor(
    private solicitudService: SolicitudCompraService,
    private proveedorService: ProveedorService,
    private insumoService: InsumoService,
    public auth: AuthService,
    private toastSvc: ToastService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.proveedorService.listar().subscribe({ next: l => this.proveedores.set(l), error: () => {} });
    this.insumoService.listar().subscribe({ next: l => this.insumos.set(l), error: () => {} });
  }

  esAdmin(): boolean {
    return this.auth.rol() === 'ADMIN';
  }

  estadoLabel(estado: EstadoSolicitudCompra): string {
    switch (estado) {
      case 'CREADA': return 'Creada';
      case 'EN_REVISION': return 'En revisión';
      case 'APROBADA': return 'Aprobada';
      case 'EN_PROCESO': return 'En proceso';
      case 'RECIBIDA': return 'Recibida';
      case 'RECHAZADA': return 'Rechazada';
    }
  }

  badgeClase(estado: EstadoSolicitudCompra): string {
    switch (estado) {
      case 'CREADA': return 'badge-neutral';
      case 'EN_REVISION': return 'badge-warning';
      case 'APROBADA': return 'badge-info';
      case 'EN_PROCESO': return 'badge-primary';
      case 'RECIBIDA': return 'badge-success';
      case 'RECHAZADA': return 'badge-danger';
    }
  }

  private cargar(): void {
    this.cargando.set(true);
    const sucursalId = this.auth.sucursalActiva();
    this.solicitudService.pendientes(sucursalId).subscribe({
      next: l => { this.pendientes.set(l); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
    this.solicitudService.mias().subscribe({ next: l => this.mias.set(l), error: () => {} });
  }

  abrirModalNueva(): void {
    this.formNueva = { proveedorId: '', items: [{ insumoId: '', cantidadSolicitada: 0, observaciones: '' }] };
    this.errorModal.set('');
    this.modalNueva.set(true);
  }

  agregarItem(): void {
    this.formNueva.items.push({ insumoId: '', cantidadSolicitada: 0, observaciones: '' });
  }

  quitarItem(index: number): void {
    if (this.formNueva.items.length === 1) return;
    this.formNueva.items.splice(index, 1);
  }

  crearSolicitud(): void {
    if (!this.formNueva.proveedorId) {
      this.errorModal.set('Selecciona un proveedor.');
      return;
    }
    const items = this.formNueva.items.filter(i => i.insumoId && i.cantidadSolicitada > 0);
    if (items.length === 0) {
      this.errorModal.set('Agrega al menos un ítem con insumo y cantidad válidos.');
      return;
    }

    const body: CrearSolicitudCompraRequest = {
      proveedorId: Number(this.formNueva.proveedorId),
      items: items.map(i => ({
        insumoId: Number(i.insumoId),
        cantidadSolicitada: i.cantidadSolicitada,
        observaciones: i.observaciones || undefined,
      })),
    };

    const sucursalId = this.auth.sucursalActiva();
    this.guardando.set(true);
    this.solicitudService.crear(body, sucursalId).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModales();
        this.toastSvc.success('Solicitud de compra creada');
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        this.errorModal.set(err?.error?.mensaje ?? 'No se pudo crear la solicitud');
      },
    });
  }

  avanzar(s: SolicitudCompra, estado: EstadoSolicitudCompra): void {
    this.procesandoId.set(s.id);
    const body: AvanzarEstadoSolicitudCompraRequest = { estado };
    this.solicitudService.avanzarEstado(s.id, body).subscribe({
      next: () => {
        this.toastSvc.success(`Solicitud #${s.id} actualizada — ${this.estadoLabel(estado)}`);
        this.procesandoId.set(null);
        this.cargar();
      },
      error: err => {
        this.toastSvc.error(err?.error?.mensaje ?? 'No se pudo actualizar la solicitud');
        this.procesandoId.set(null);
      },
    });
  }

  abrirRechazar(s: SolicitudCompra): void {
    this.modalRechazar.set(s);
    this.motivoRechazo = '';
    this.errorModal.set('');
  }

  confirmarRechazar(): void {
    if (!this.motivoRechazo.trim()) {
      this.errorModal.set('El motivo es obligatorio');
      return;
    }
    const s = this.modalRechazar()!;
    this.guardando.set(true);
    this.solicitudService.avanzarEstado(s.id, {
      estado: 'RECHAZADA',
      motivoRechazo: this.motivoRechazo.trim(),
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.toastSvc.success(`Solicitud #${s.id} rechazada`);
        this.cerrarModales();
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        this.errorModal.set(err?.error?.mensaje ?? 'No se pudo rechazar la solicitud');
      },
    });
  }

  abrirRecepcion(s: SolicitudCompra): void {
    this.modalRecepcion.set(s);
    this.formRecepcion = {
      fechaRecepcion: '',
      items: s.items.map(i => ({
        itemId: i.id,
        insumoNombre: i.insumo.nombre,
        unidadMedida: i.insumo.unidadMedida,
        numeroLote: '',
        precioUnitario: 0,
        fechaVencimiento: '',
      })),
    };
    this.errorModal.set('');
  }

  confirmarRecepcion(): void {
    const s = this.modalRecepcion();
    if (!s) return;
    if (this.formRecepcion.items.some(i => !i.precioUnitario || i.precioUnitario <= 0)) {
      this.errorModal.set('Indica el precio unitario de cada ítem.');
      return;
    }
    this.guardando.set(true);
    this.solicitudService.avanzarEstado(s.id, {
      estado: 'RECIBIDA',
      fechaRecepcion: this.formRecepcion.fechaRecepcion || undefined,
      items: this.formRecepcion.items.map(i => ({
        itemId: i.itemId,
        numeroLote: i.numeroLote || undefined,
        precioUnitario: i.precioUnitario,
        fechaVencimiento: i.fechaVencimiento || undefined,
      })),
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.toastSvc.success(`Solicitud #${s.id} marcada como recibida`);
        this.cerrarModales();
        this.cargar();
      },
      error: err => {
        this.guardando.set(false);
        this.errorModal.set(err?.error?.mensaje ?? 'No se pudo registrar la recepción');
      },
    });
  }

  cerrarModales(): void {
    this.modalNueva.set(false);
    this.modalRechazar.set(null);
    this.modalRecepcion.set(null);
    this.errorModal.set('');
  }
}
