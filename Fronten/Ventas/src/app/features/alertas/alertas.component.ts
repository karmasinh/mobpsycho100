import { Component, OnInit, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertaService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { AlertaSistema } from '../../core/models';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-5 animate-slide-up">

      <!-- Cabecera -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Centro de alertas
          </h1>
          <p class="text-sm mt-0.5" style="color:rgb(var(--color-on-surface)/0.5)">
            Notificaciones del sistema
          </p>
        </div>
        @if (alertas().length > 0) {
          <button (click)="marcarTodas()" [disabled]="procesando()"
                  class="btn-secondary text-sm">
            ✓ Marcar todas como leídas
          </button>
        }
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        @for (grupo of grupos(); track grupo.tipo) {
          <div class="stat-card cursor-pointer transition-all"
               [style.outline]="filtroTipo() === grupo.tipo
                 ? '2px solid rgb(var(--color-primary))' : 'none'"
               (click)="toggleFiltro(grupo.tipo)">
            <iconify-icon [attr.icon]="tipoIcon(grupo.tipo)" width="24" height="24" style="color:currentColor"></iconify-icon>
            <p class="stat-value mt-1">{{ grupo.cantidad }}</p>
            <p class="stat-label">{{ tipoLabel(grupo.tipo) }}</p>
          </div>
        }
        @if (grupos().length === 0 && !cargando()) {
          <div class="col-span-4 text-center py-8">
            <iconify-icon icon="tabler:bell" width="40" height="40" class="mb-2" style="color:currentColor"></iconify-icon>
            <p style="color:rgb(var(--color-on-surface)/0.4)" class="text-sm">
              No hay alertas pendientes
            </p>
          </div>
        }
      </div>

      <!-- Lista de alertas -->
      @if (filtradas().length > 0) {
        <div class="card space-y-2">
          <div class="flex items-center justify-between mb-1">
            <p class="text-sm font-semibold" style="color:rgb(var(--color-on-surface)/0.6)">
              {{ filtradas().length }} alerta{{ filtradas().length !== 1 ? 's' : '' }}
              @if (filtroTipo()) { · {{ tipoLabel(filtroTipo()!) }} }
            </p>
            @if (filtroTipo()) {
              <button (click)="filtroTipo.set(null)"
                      class="text-xs btn-ghost">✕ Quitar filtro</button>
            }
          </div>

          @for (a of filtradas(); track a.id) {
            <div class="flex items-start gap-3 p-3 rounded-xl transition-all"
                 style="background:rgb(var(--color-surface-2));
                        border:1px solid rgb(var(--color-border)/0.5)">
              <iconify-icon [attr.icon]="tipoIcon(a.tipo)" width="20" height="20" class="flex-shrink-0 mt-0.5" style="color:currentColor"></iconify-icon>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium" style="color:rgb(var(--color-on-surface))">
                  {{ a.mensaje }}
                </p>
                <div class="flex items-center gap-3 mt-1">
                  <span class="text-xs" style="color:rgb(var(--color-on-surface)/0.4)">
                    {{ a.creadoEn | date:'dd/MM/yyyy HH:mm' }}
                  </span>
                  <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                        [style.background]="tipoBg(a.tipo)"
                        [style.color]="tipoColor(a.tipo)">
                    {{ tipoLabel(a.tipo) }}
                  </span>
                </div>
              </div>
              <button (click)="marcarLeida(a)"
                      [disabled]="procesando()"
                      class="btn-ghost text-xs px-2 py-1 flex-shrink-0"
                      title="Marcar como leída"
                      style="color:rgb(var(--color-on-surface)/0.4)">
                ✕
              </button>
            </div>
          }
        </div>
      } @else if (!cargando() && alertas().length > 0 && filtroTipo()) {
        <div class="card text-center py-8">
          <p style="color:rgb(var(--color-on-surface)/0.4)" class="text-sm">
            No hay alertas de este tipo
          </p>
        </div>
      }

      @if (cargando()) {
        <div class="space-y-2">
          @for (i of [1,2,3]; track i) {
            <div class="skeleton h-16 rounded-2xl"></div>
          }
        </div>
      }

    </div>
  `,
})
export class AlertasComponent implements OnInit {

  alertas   = signal<AlertaSistema[]>([]);
  cargando  = signal(true);
  procesando = signal(false);
  filtroTipo = signal<string | null>(null);

  filtradas = computed(() => {
    const f = this.filtroTipo();
    return f ? this.alertas().filter(a => a.tipo === f) : this.alertas();
  });

  grupos = computed(() => {
    const mapa = new Map<string, number>();
    for (const a of this.alertas()) {
      mapa.set(a.tipo, (mapa.get(a.tipo) ?? 0) + 1);
    }
    return [...mapa.entries()]
      .map(([tipo, cantidad]) => ({ tipo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  });

  constructor(
    private alertaService: AlertaService,
    private toastSvc: ToastService,
  ) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.alertaService.listarNoLeidas().subscribe({
      next: list => { this.alertas.set(list); this.cargando.set(false); },
      error: () => { this.toastSvc.error('No se pudieron cargar las alertas'); this.cargando.set(false); },
    });
  }

  toggleFiltro(tipo: string): void {
    this.filtroTipo.set(this.filtroTipo() === tipo ? null : tipo);
  }

  marcarLeida(a: AlertaSistema): void {
    this.procesando.set(true);
    this.alertaService.marcarLeida(a.id).subscribe({
      next: () => {
        this.alertas.update(list => list.filter(x => x.id !== a.id));
        this.procesando.set(false);
      },
      error: () => { this.toastSvc.error('No se pudo marcar la alerta'); this.procesando.set(false); },
    });
  }

  marcarTodas(): void {
    this.procesando.set(true);
    this.alertaService.marcarTodasLeidas().subscribe({
      next: () => {
        this.alertas.set([]);
        this.filtroTipo.set(null);
        this.toastSvc.success('Todas las alertas marcadas como leídas');
        this.procesando.set(false);
      },
      error: () => { this.toastSvc.error('No se pudieron marcar las alertas'); this.procesando.set(false); },
    });
  }

  tipoIcon(tipo: string): string {
    if (tipo.includes('VENCIMIENTO_3'))  return 'tabler:alert-triangle';
    if (tipo.includes('VENCIMIENTO_7'))  return 'tabler:clock';
    if (tipo.includes('VENCIMIENTO_15')) return 'tabler:hourglass';
    if (tipo.includes('STOCK'))          return 'tabler:package';
    if (tipo.includes('CLIENTE'))        return 'tabler:users';
    if (tipo.includes('PENSIONADO'))     return 'tabler:home';
    if (tipo.includes('LOGIN'))          return 'tabler:lock';
    return 'tabler:bell';
  }

  tipoLabel(tipo: string): string {
    const m: Record<string, string> = {
      VENCIMIENTO_3_DIAS:  'Vence en 3 días',
      VENCIMIENTO_7_DIAS:  'Vence en 7 días',
      VENCIMIENTO_15_DIAS: 'Vence en 15 días',
      STOCK_MINIMO:        'Stock bajo',
      CLIENTE_INACTIVO:    'Cliente inactivo',
      PENSIONADO_BAJA:     'Pensionado baja',
      LOGIN_BLOQUEADO:     'Login bloqueado',
    };
    return m[tipo] ?? tipo;
  }

  tipoBg(tipo: string): string {
    if (tipo.includes('VENCIMIENTO_3'))  return 'rgb(var(--color-danger)/0.12)';
    if (tipo.includes('VENCIMIENTO_7'))  return 'rgb(var(--color-warning)/0.15)';
    if (tipo.includes('VENCIMIENTO_15')) return 'rgb(var(--color-warning)/0.10)';
    if (tipo.includes('STOCK'))          return 'rgb(var(--color-primary)/0.10)';
    if (tipo.includes('LOGIN'))          return 'rgb(var(--color-danger)/0.12)';
    return 'rgb(var(--color-surface-2))';
  }

  tipoColor(tipo: string): string {
    if (tipo.includes('VENCIMIENTO_3'))  return 'rgb(var(--color-danger))';
    if (tipo.includes('VENCIMIENTO_7'))  return 'rgb(var(--color-warning))';
    if (tipo.includes('VENCIMIENTO_15')) return 'rgb(var(--color-warning))';
    if (tipo.includes('STOCK'))          return 'rgb(var(--color-primary))';
    if (tipo.includes('LOGIN'))          return 'rgb(var(--color-danger))';
    return 'rgb(var(--color-on-surface)/0.6)';
  }
}
