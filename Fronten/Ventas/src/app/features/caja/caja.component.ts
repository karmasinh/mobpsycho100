import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PlatoService, PedidoService, VentaService, ProduccionService, ConfiguracionTicketService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TicketPrintService } from '../../core/services/ticket-print.service';
import { Plato, LineaProduccion } from '../../core/models';

interface ItemCarrito {
  plato: Plato;
  cantidad: number;
  sopaSeleccionada?: LineaProduccion;
  segundoSeleccionado?: LineaProduccion;
}

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="h-full grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 animate-slide-up">

      <!-- ── Panel izquierdo: menú del día ────────────────────── -->
      <div class="flex flex-col gap-4 min-h-0 overflow-hidden">

        <!-- Header + búsqueda -->
        <div class="flex items-center gap-3">
          <div class="flex-1">
            <h1 class="font-display text-xl font-bold" style="color: rgb(var(--color-on-surface))">
              Caja — Nueva Venta
            </h1>
          </div>
          <input [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event)" class="input w-48 text-sm" placeholder="Buscar plato..." maxlength="100" data-cy="caja-busqueda">
        </div>

        <!-- Filtros por tipo -->
        <div class="flex gap-2 flex-wrap">
          @for (tipo of tiposDisponibles; track tipo.valor) {
            <button (click)="tipoSeleccionado.set(tipo.valor)"
                    class="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                    [style.background]="tipoSeleccionado() === tipo.valor
                      ? 'rgb(var(--color-primary))' : 'rgb(var(--color-surface-2))'"
                    [style.color]="tipoSeleccionado() === tipo.valor
                      ? 'rgb(var(--color-on-primary))' : 'rgb(var(--color-on-surface)/0.6)'"
                    [style.border]="'1px solid rgb(var(--color-border))'">
              <span class="inline-flex items-center gap-1">
                @if (tipo.icon) {
                  <iconify-icon [attr.icon]="tipo.icon" width="14" height="14" style="color:currentColor"></iconify-icon>
                } @else {
                  {{ tipo.emoji }}
                }
                {{ tipo.label }}
              </span>
            </button>
          }
        </div>

        <!-- Grid de platos -->
        <div class="flex-1 overflow-y-auto">
          <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">

            @if (cargandoPlatos()) {
              @for (i of [1,2,3,4,5,6,7,8]; track i) {
                <div class="skeleton h-28 rounded-2xl"></div>
              }
            }

            @for (plato of platosFiltrados(); track plato.id) {
              <button (click)="onClickPlato(plato)"
                      class="card text-left transition-all duration-200 hover:shadow-card-lg
                             active:scale-95 hover:border-primary/40 group relative">
                <div class="mb-2">
                  @if (getTipoIcon(plato.tipo)) {
                    <iconify-icon [attr.icon]="getTipoIcon(plato.tipo)" width="24" height="24" style="color:currentColor"></iconify-icon>
                  } @else {
                    <span class="text-2xl">{{ getTipoEmoji(plato.tipo) }}</span>
                  }
                </div>
                <p class="font-semibold text-sm leading-snug mb-1"
                   style="color: rgb(var(--color-on-surface))">
                  {{ plato.nombre }}
                </p>
                <p class="font-display font-bold text-base"
                   style="color: rgb(var(--color-primary))">
                  Bs {{ plato.precioVenta.toFixed(2) }}
                </p>
                @if (esAlmuerzoDelDia(plato)) {
                  <span class="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-full font-semibold"
                        style="background: rgb(var(--color-success)/0.15); color: rgb(var(--color-success))">
                    Hoy
                  </span>
                }
                @if (getCantidadEnCarrito(plato.id) > 0) {
                  <div class="absolute bottom-2 right-2 w-5 h-5 rounded-full text-xs font-bold
                              flex items-center justify-center"
                       style="background: rgb(var(--color-primary)); color: white">
                    {{ getCantidadEnCarrito(plato.id) }}
                  </div>
                }
              </button>
            }
          </div>
        </div>
      </div>

      <!-- ── Panel derecho: carrito + cobro ───────────────────── -->
      <div class="flex flex-col gap-3 overflow-hidden">
        <div class="card flex flex-col gap-4 h-full overflow-hidden">

          <div class="flex items-center justify-between">
            <h2 class="font-display font-bold inline-flex items-center gap-1.5" style="color: rgb(var(--color-on-surface))">
              <iconify-icon icon="tabler:shopping-cart" width="18" height="18" style="color:currentColor"></iconify-icon>
              Carrito
            </h2>
            @if (carrito().length > 0) {
              <button (click)="limpiarCarrito()" class="btn-ghost text-xs text-danger">
                Vaciar
              </button>
            }
          </div>

          <!-- Cliente rápido -->
          <div>
            <label class="input-label">Cliente (opcional)</label>
            <input [(ngModel)]="nombreCliente" class="input text-sm"
                   placeholder="Nombre del cliente..." maxlength="100">
          </div>

          <!-- Items carrito -->
          <div class="flex-1 overflow-y-auto space-y-2 min-h-0">
            @if (carrito().length === 0) {
              <div class="flex flex-col items-center justify-center py-12 text-center">
                <span class="mb-3 opacity-20"><iconify-icon icon="tabler:shopping-cart" width="44" height="44" style="color:currentColor"></iconify-icon></span>
                <p class="text-sm" style="color: rgb(var(--color-on-surface)/0.4)">
                  Selecciona platos del menú
                </p>
              </div>
            }

            @for (item of carrito(); track item.plato.id) {
              <div class="flex items-start gap-3 p-3 rounded-xl"
                   style="background: rgb(var(--color-surface)); border: 1px solid rgb(var(--color-border))">
                @if (getTipoIcon(item.plato.tipo)) {
                  <iconify-icon [attr.icon]="getTipoIcon(item.plato.tipo)" width="20" height="20" class="mt-0.5" style="color:currentColor"></iconify-icon>
                } @else {
                  <span class="text-xl mt-0.5">{{ getTipoEmoji(item.plato.tipo) }}</span>
                }
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold truncate" style="color: rgb(var(--color-on-surface))">
                    {{ item.plato.nombre }}
                  </p>
                  @if (item.sopaSeleccionada || item.segundoSeleccionado) {
                    <p class="text-xs mt-0.5" style="color: rgb(var(--color-on-surface)/0.5)">
                      @if (item.sopaSeleccionada) { {{ item.sopaSeleccionada.plato.nombre }} }
                      @if (item.sopaSeleccionada && item.segundoSeleccionado) { + }
                      @if (item.segundoSeleccionado) { {{ item.segundoSeleccionado.plato.nombre }} }
                    </p>
                  }
                  <p class="text-xs" style="color: rgb(var(--color-on-surface)/0.5)">
                    Bs {{ item.plato.precioVenta.toFixed(2) }} c/u
                  </p>
                </div>
                <!-- Controles cantidad -->
                <div class="flex items-center gap-1">
                  <button (click)="decrementar(item)" class="w-6 h-6 rounded-lg text-sm font-bold
                          flex items-center justify-center transition-all hover:bg-danger/10"
                          style="border: 1px solid rgb(var(--color-border)); color: rgb(var(--color-on-surface))">−</button>
                  <span class="w-6 text-center text-sm font-bold" style="color: rgb(var(--color-on-surface))">
                    {{ item.cantidad }}
                  </span>
                  <button (click)="incrementar(item)" class="w-6 h-6 rounded-lg text-sm font-bold
                          flex items-center justify-center transition-all hover:bg-primary/10"
                          style="border: 1px solid rgb(var(--color-border)); color: rgb(var(--color-primary))">+</button>
                </div>
                <span class="text-sm font-bold w-16 text-right font-mono"
                      style="color: rgb(var(--color-primary))">
                  Bs {{ (item.plato.precioVenta * item.cantidad).toFixed(2) }}
                </span>
              </div>
            }
          </div>

          <!-- Totales -->
          <div class="space-y-2 pt-3" style="border-top: 1px solid rgb(var(--color-border))">
            <div class="flex justify-between text-sm">
              <span style="color: rgb(var(--color-on-surface)/0.5)">Subtotal</span>
              <span class="font-mono font-semibold">Bs {{ total().toFixed(2) }}</span>
            </div>
          </div>

          <!-- Forma de pago -->
          <div>
            <label class="input-label">Forma de pago</label>
            <div class="grid grid-cols-2 gap-2">
              @for (fp of formasPago; track fp.valor) {
                <button (click)="formaPago.set(fp.valor)"
                        class="py-2 px-3 rounded-xl text-xs font-semibold transition-all"
                        [style.background]="formaPago() === fp.valor
                          ? 'rgb(var(--color-primary)/0.15)' : 'rgb(var(--color-surface))'"
                        [style.color]="formaPago() === fp.valor
                          ? 'rgb(var(--color-primary))' : 'rgb(var(--color-on-surface)/0.5)'"
                        [style.outline]="formaPago() === fp.valor
                          ? '2px solid rgb(var(--color-primary)/0.5)' : '1px solid rgb(var(--color-border))'">
                  <span class="inline-flex items-center gap-1">
                    <iconify-icon [attr.icon]="fp.icon" width="14" height="14" style="color:currentColor"></iconify-icon>
                    {{ fp.label }}
                  </span>
                </button>
              }
            </div>
          </div>

          <!-- Monto recibido (si efectivo) -->
          @if (formaPago() === 'EFECTIVO' || formaPago() === 'MIXTO') {
            <div>
              <label class="input-label">Monto recibido (Bs)</label>
              <input [ngModel]="montoRecibido()" (ngModelChange)="montoRecibido.set($event)" type="number" class="input text-sm"
                     [min]="total()" placeholder="0.00">
              @if (vuelto() > 0) {
                <p class="text-sm mt-1 font-semibold" style="color: rgb(var(--color-success))">
                  Vuelto: Bs {{ vuelto().toFixed(2) }}
                </p>
              }
            </div>
          }

          <!-- Error -->
          @if (errorMsg()) {
            <p class="text-xs p-2 rounded-lg"
               style="background: rgb(var(--color-danger)/0.1); color: rgb(var(--color-danger))">
              {{ errorMsg() }}
            </p>
          }

          <!-- Botón cobrar -->
          <button (click)="cobrar()"
                  [disabled]="carrito().length === 0 || procesando()"
                  class="btn-primary w-full justify-center py-3 text-base"
                  data-cy="btn-cobrar">
            @if (procesando()) {
              <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
              Procesando...
            } @else {
              <span class="inline-flex items-center gap-1.5">
                <iconify-icon icon="tabler:credit-card" width="18" height="18" style="color:currentColor"></iconify-icon>
                Cobrar Bs {{ total().toFixed(2) }}
              </span>
            }
          </button>

        </div>
      </div>
    </div>

    <!-- ── Modal confirmación venta ─────────────────────────── -->
    @if (ventaExitosa()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background: rgb(0 0 0 / 0.5)" data-cy="modal-venta-exitosa">
        <div class="card max-w-sm w-full text-center animate-pop">
          <div class="mb-4 flex justify-center"><iconify-icon icon="line-md:confirm-circle" width="56" height="56" style="color:currentColor"></iconify-icon></div>
          <h3 class="font-display text-xl font-bold mb-1">¡Venta registrada!</h3>
          <p class="text-sm mb-1" style="color: rgb(var(--color-on-surface)/0.6)">
            Total: <strong>Bs {{ ventaExitosa()?.totalCobrado?.toFixed(2) }}</strong>
          </p>
          @if ((ventaExitosa()?.vuelto ?? 0) > 0) {
            <p class="text-sm mb-4" style="color: rgb(var(--color-success))">
              Vuelto: <strong>Bs {{ ventaExitosa()?.vuelto?.toFixed(2) }}</strong>
            </p>
          }
          <button (click)="cerrarModal()" class="btn-primary w-full justify-center" data-cy="btn-nueva-venta">
            Nueva venta
          </button>
        </div>
      </div>
    }

    <!-- ── Modal picker almuerzo ────────────────────────────── -->
    @if (pickerAbierto()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background: rgb(0 0 0 / 0.6)">
        <div class="card w-full max-w-2xl animate-pop flex flex-col gap-5 max-h-[90vh] overflow-y-auto">

          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-display text-lg font-bold inline-flex items-center gap-1.5" style="color: rgb(var(--color-on-surface))">
                <iconify-icon icon="tabler:soup" width="18" height="18" style="color:currentColor"></iconify-icon>
                {{ platoAlmuerzoSeleccionado()?.nombre }}
              </h3>
              <p class="text-xs mt-0.5" style="color: rgb(var(--color-on-surface)/0.5)">
                Elige sopa y segundo del día
              </p>
            </div>
            <button (click)="cerrarPicker()" class="btn-ghost text-lg leading-none">
              <iconify-icon icon="line-md:close" width="18" height="18" style="color:currentColor"></iconify-icon>
            </button>
          </div>

          <!-- Sopas -->
          <div>
            <p class="text-sm font-semibold mb-2 inline-flex items-center gap-1.5" style="color: rgb(var(--color-on-surface)/0.7)">
              <iconify-icon icon="tabler:cup" width="16" height="16" style="color:currentColor"></iconify-icon>
              Sopa (elige una)
            </p>
            @if (cargandoDisponibles()) {
              <div class="skeleton h-16 rounded-xl"></div>
            } @else if (sopasHoy().length === 0) {
              <p class="text-sm p-3 rounded-xl text-center"
                 style="background: rgb(var(--color-surface-2)); color: rgb(var(--color-on-surface)/0.4)">
                Sin sopas en producción hoy
              </p>
            } @else {
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                @for (s of sopasHoy(); track s.id) {
                  <button (click)="sopaElegida.set(s)"
                          class="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                          [style.outline]="sopaElegida()?.id === s.id
                            ? '2px solid rgb(var(--color-primary))' : '1px solid rgb(var(--color-border))'"
                          [style.background]="sopaElegida()?.id === s.id
                            ? 'rgb(var(--color-primary)/0.08)' : 'rgb(var(--color-surface))'">
                    <iconify-icon icon="tabler:cup" width="20" height="20" style="color:currentColor"></iconify-icon>
                    <div class="flex-1">
                      <p class="text-sm font-semibold" style="color: rgb(var(--color-on-surface))">
                        {{ s.plato.nombre }}
                      </p>
                      <p class="text-xs" style="color: rgb(var(--color-on-surface)/0.5)">
                        {{ s.cantidadDisponible }} disponibles
                      </p>
                    </div>
                    @if (sopaElegida()?.id === s.id) {
                      <iconify-icon icon="tabler:check" width="16" height="16" style="color:rgb(var(--color-primary))"></iconify-icon>
                    }
                  </button>
                }
              </div>
            }
          </div>

          <!-- Segundos -->
          <div>
            <p class="text-sm font-semibold mb-2 inline-flex items-center gap-1.5" style="color: rgb(var(--color-on-surface)/0.7)">
              <iconify-icon icon="tabler:tools-kitchen-2" width="16" height="16" style="color:currentColor"></iconify-icon>
              Segundo (elige uno)
            </p>
            @if (cargandoDisponibles()) {
              <div class="skeleton h-16 rounded-xl"></div>
            } @else if (segundosHoy().length === 0) {
              <p class="text-sm p-3 rounded-xl text-center"
                 style="background: rgb(var(--color-surface-2)); color: rgb(var(--color-on-surface)/0.4)">
                Sin segundos en producción hoy
              </p>
            } @else {
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                @for (s of segundosHoy(); track s.id) {
                  <button (click)="segundoElegido.set(s)"
                          class="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                          [style.outline]="segundoElegido()?.id === s.id
                            ? '2px solid rgb(var(--color-primary))' : '1px solid rgb(var(--color-border))'"
                          [style.background]="segundoElegido()?.id === s.id
                            ? 'rgb(var(--color-primary)/0.08)' : 'rgb(var(--color-surface))'">
                    <iconify-icon icon="tabler:tools-kitchen-2" width="20" height="20" style="color:currentColor"></iconify-icon>
                    <div class="flex-1">
                      <p class="text-sm font-semibold" style="color: rgb(var(--color-on-surface))">
                        {{ s.plato.nombre }}
                      </p>
                      <p class="text-xs" style="color: rgb(var(--color-on-surface)/0.5)">
                        {{ s.cantidadDisponible }} disponibles
                      </p>
                    </div>
                    @if (segundoElegido()?.id === s.id) {
                      <iconify-icon icon="tabler:check" width="16" height="16" style="color:rgb(var(--color-primary))"></iconify-icon>
                    }
                  </button>
                }
              </div>
            }
          </div>

          <!-- Precio -->
          <div class="flex items-center justify-between p-3 rounded-xl"
               style="background: rgb(var(--color-primary)/0.08)">
            <span class="text-sm" style="color: rgb(var(--color-on-surface)/0.7)">Precio almuerzo</span>
            <span class="font-display font-bold text-lg" style="color: rgb(var(--color-primary))">
              Bs {{ platoAlmuerzoSeleccionado()?.precioVenta?.toFixed(2) }}
            </span>
          </div>

          <!-- Acciones -->
          <div class="flex gap-3">
            <button (click)="cerrarPicker()" class="btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button (click)="confirmarAlmuerzo()"
                    [disabled]="!sopaElegida() || !segundoElegido()"
                    class="btn-primary flex-1 justify-center">
              Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CajaComponent implements OnInit {
  platos           = signal<Plato[]>([]);
  cargandoPlatos   = signal(true);
  carrito          = signal<ItemCarrito[]>([]);
  busqueda         = signal('');
  tipoSeleccionado = signal<string>('TODOS');
  formaPago        = signal<string>('EFECTIVO');
  montoRecibido    = signal(0);
  nombreCliente    = '';
  procesando       = signal(false);
  errorMsg         = signal('');
  ventaExitosa     = signal<any>(null);

  // Picker almuerzo
  pickerAbierto             = signal(false);
  cargandoDisponibles       = signal(false);
  platoAlmuerzoSeleccionado = signal<Plato | null>(null);
  sopasHoy                  = signal<LineaProduccion[]>([]);
  segundosHoy               = signal<LineaProduccion[]>([]);
  sopaElegida               = signal<LineaProduccion | null>(null);
  segundoElegido            = signal<LineaProduccion | null>(null);

  // IDs de platos de tipo SOPA/SEGUNDO en producción hoy (para badge "Hoy")
  platosEnProduccionHoy     = signal<Set<number>>(new Set());

  tiposDisponibles: { valor: string; label: string; icon?: string; emoji?: string }[] = [
    { valor: 'TODOS',     label: 'Todos',      icon: 'tabler:tools-kitchen-2' },
    { valor: 'ALMUERZO',  label: 'Almuerzos',  icon: 'tabler:soup' },
    { valor: 'SOPA',      label: 'Solo sopa',  icon: 'tabler:cup' },
    { valor: 'SEGUNDO',   label: 'Solo segundo', icon: 'tabler:bowl' },
    { valor: 'EMPANADA',  label: 'Empanadas',  emoji: '🥟' },
    { valor: 'TUCUMANA',  label: 'Tucumanas',  emoji: '🫔' },
    { valor: 'LICUADO',   label: 'Licuados',   emoji: '🥤' },
    { valor: 'REFRESCO',  label: 'Refrescos',  emoji: '🧃' },
    { valor: 'ESPECIAL',  label: 'Especiales', icon: 'tabler:star' },
  ];

  formasPago = [
    { valor: 'EFECTIVO',       label: 'Efectivo', icon: 'tabler:currency-dollar' },
    { valor: 'QR',             label: 'QR',       icon: 'tabler:phone' },
    { valor: 'MIXTO',          label: 'Mixto',    icon: 'tabler:credit-card' },
    { valor: 'CREDITO_CUENTA', label: 'Cuenta',   icon: 'tabler:clipboard-list' },
  ];

  platosFiltrados = computed(() => {
    let lista = this.platos().filter(p => p.activo);
    if (this.tipoSeleccionado() !== 'TODOS') {
      lista = lista.filter(p => p.tipo === this.tipoSeleccionado());
    }
    if (this.busqueda().trim()) {
      const q = this.busqueda().toLowerCase();
      lista = lista.filter(p => p.nombre.toLowerCase().includes(q));
    }
    return lista;
  });

  total = computed(() =>
    this.carrito().reduce((s, i) => s + i.plato.precioVenta * i.cantidad, 0)
  );

  vuelto = computed(() => {
    const mv = Number(this.montoRecibido()) || 0;
    return Math.max(mv - this.total(), 0);
  });

  constructor(
    private platoService: PlatoService,
    private pedidoService: PedidoService,
    private ventaService: VentaService,
    private produccionService: ProduccionService,
    private configuracionTicketService: ConfiguracionTicketService,
    private ticketPrint: TicketPrintService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.platoService.listar().subscribe({
      next: ps => { this.platos.set(ps); this.cargandoPlatos.set(false); },
      error: () => this.cargandoPlatos.set(false),
    });
    this.cargarDisponiblesHoy();
  }

  private cargarDisponiblesHoy(): void {
    const sucursalId = this.auth.sucursalActiva();
    if (sucursalId == null) return;
    forkJoin({
      sopas:    this.produccionService.disponiblesHoy(sucursalId, 'SOPA'),
      segundos: this.produccionService.disponiblesHoy(sucursalId, 'SEGUNDO'),
    }).subscribe({
      next: ({ sopas, segundos }) => {
        const ids = new Set<number>([
          ...sopas.map(s => s.plato.id),
          ...segundos.map(s => s.plato.id),
        ]);
        this.platosEnProduccionHoy.set(ids);
        this.sopasHoy.set(sopas);
        this.segundosHoy.set(segundos);
      },
      error: () => {},
    });
  }

  esAlmuerzoDelDia(plato: Plato): boolean {
    return ['SOPA', 'SEGUNDO'].includes(plato.tipo) &&
           this.platosEnProduccionHoy().has(plato.id);
  }

  onClickPlato(plato: Plato): void {
    if (plato.tipo === 'ALMUERZO') {
      this.abrirPickerAlmuerzo(plato);
    } else {
      this.agregarAlCarrito(plato);
    }
  }

  private abrirPickerAlmuerzo(plato: Plato): void {
    this.platoAlmuerzoSeleccionado.set(plato);
    this.sopaElegida.set(null);
    this.segundoElegido.set(null);
    this.cargandoDisponibles.set(true);
    this.pickerAbierto.set(true);

    const sucursalId = this.auth.sucursalActiva();
    if (sucursalId == null) { this.cargandoDisponibles.set(false); return; }

    forkJoin({
      sopas:    this.produccionService.disponiblesHoy(sucursalId, 'SOPA'),
      segundos: this.produccionService.disponiblesHoy(sucursalId, 'SEGUNDO'),
    }).subscribe({
      next: ({ sopas, segundos }) => {
        this.sopasHoy.set(sopas);
        this.segundosHoy.set(segundos);
        this.cargandoDisponibles.set(false);
      },
      error: () => this.cargandoDisponibles.set(false),
    });
  }

  confirmarAlmuerzo(): void {
    const plato   = this.platoAlmuerzoSeleccionado();
    const sopa    = this.sopaElegida();
    const segundo = this.segundoElegido();
    if (!plato || !sopa || !segundo) return;

    this.carrito.update(items => {
      const idx = items.findIndex(i =>
        i.plato.id === plato.id &&
        i.sopaSeleccionada?.id === sopa.id &&
        i.segundoSeleccionado?.id === segundo.id
      );
      if (idx >= 0) {
        const nuevo = [...items];
        nuevo[idx] = { ...nuevo[idx], cantidad: nuevo[idx].cantidad + 1 };
        return nuevo;
      }
      return [...items, { plato, cantidad: 1, sopaSeleccionada: sopa, segundoSeleccionado: segundo }];
    });
    this.cerrarPicker();
  }

  cerrarPicker(): void {
    this.pickerAbierto.set(false);
    this.platoAlmuerzoSeleccionado.set(null);
  }

  private agregarAlCarrito(plato: Plato): void {
    this.carrito.update(items => {
      const idx = items.findIndex(i => i.plato.id === plato.id && !i.sopaSeleccionada);
      if (idx >= 0) {
        const nuevo = [...items];
        nuevo[idx] = { ...nuevo[idx], cantidad: nuevo[idx].cantidad + 1 };
        return nuevo;
      }
      return [...items, { plato, cantidad: 1 }];
    });
  }

  incrementar(item: ItemCarrito): void {
    this.carrito.update(items =>
      items.map(i => this.mismoItem(i, item) ? { ...i, cantidad: i.cantidad + 1 } : i)
    );
  }

  decrementar(item: ItemCarrito): void {
    this.carrito.update(items =>
      item.cantidad === 1
        ? items.filter(i => !this.mismoItem(i, item))
        : items.map(i => this.mismoItem(i, item) ? { ...i, cantidad: i.cantidad - 1 } : i)
    );
  }

  private mismoItem(a: ItemCarrito, b: ItemCarrito): boolean {
    return a.plato.id === b.plato.id &&
           a.sopaSeleccionada?.id === b.sopaSeleccionada?.id &&
           a.segundoSeleccionado?.id === b.segundoSeleccionado?.id;
  }

  getCantidadEnCarrito(platoId: number): number {
    return this.carrito()
      .filter(i => i.plato.id === platoId)
      .reduce((s, i) => s + i.cantidad, 0);
  }

  limpiarCarrito(): void { this.carrito.set([]); }

  cobrar(): void {
    if (this.carrito().length === 0) return;
    if ((this.formaPago() === 'EFECTIVO' || this.formaPago() === 'MIXTO')
        && Number(this.montoRecibido()) < this.total()) {
      this.errorMsg.set('El monto recibido es insuficiente.');
      return;
    }

    const sucursalId = this.auth.sucursalActiva();
    if (sucursalId == null) {
      this.errorMsg.set('Selecciona una sucursal antes de cobrar.');
      return;
    }

    this.procesando.set(true);
    this.errorMsg.set('');

    const pedidoBody = {
      sucursalId,
      observaciones: this.nombreCliente ? `Cliente: ${this.nombreCliente}` : '',
      detalles: this.carrito().map(i => ({
        platoId:             i.plato.id,
        cantidad:            i.cantidad,
        sopaSeleccionadaId:  i.sopaSeleccionada?.plato?.id ?? null,
        segundoSeleccionadoId: i.segundoSeleccionado?.plato?.id ?? null,
      })),
    };

    this.pedidoService.crear(pedidoBody).subscribe({
      next: pedido => {
        const monto = Number(this.montoRecibido()) || this.total();
        this.ventaService.cobrar(pedido.id, monto, this.formaPago()).subscribe({
          next: venta => {
            this.ventaExitosa.set(venta);
            this.procesando.set(false);
            this.cargarDisponiblesHoy();
            this.imprimirSiCorresponde(sucursalId, venta);
          },
          error: err => {
            this.errorMsg.set(err?.error?.mensaje ?? 'Error al cobrar');
            this.procesando.set(false);
          }
        });
      },
      error: err => {
        this.errorMsg.set(err?.error?.mensaje ?? 'Error al crear pedido');
        this.procesando.set(false);
      }
    });
  }

  private imprimirSiCorresponde(sucursalId: number, venta: any): void {
    this.configuracionTicketService.obtener(sucursalId).subscribe({
      next: config => {
        if (config.imprimirAutomatico) this.ticketPrint.imprimir(venta, config);
      },
      error: () => {},
    });
  }

  cerrarModal(): void {
    this.ventaExitosa.set(null);
    this.limpiarCarrito();
    this.montoRecibido.set(0);
    this.nombreCliente = '';
  }

  getTipoEmoji(tipo: string): string {
    const map: Record<string, string> = {
      EMPANADA: '🥟', TUCUMANA: '🫔',
      LICUADO: '🥤', REFRESCO: '🧃',
    };
    return map[tipo] ?? '';
  }

  getTipoIcon(tipo: string): string | null {
    const iconMap: Record<string, string> = {
      ALMUERZO: 'tabler:soup', SOPA: 'tabler:cup', SEGUNDO: 'tabler:bowl',
      ESPECIAL: 'tabler:star',
    };
    if (iconMap[tipo]) return iconMap[tipo];
    if (this.getTipoEmoji(tipo)) return null; // sin icono en whitelist, usar fallback de emoji
    return 'tabler:tools-kitchen-2';
  }
}
