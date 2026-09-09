import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PensionadoService } from '../../core/services/api.service';
import { Pensionado } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';

interface PensionadoAsistencia extends Pensionado {
  asistioHoy?: boolean;
  cargando?: boolean;
}

@Component({
  selector: 'app-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5 animate-slide-up">

      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
            Asistencia
          </h1>
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            Registro diario — {{ fechaHoy() }}
          </p>
        </div>
        <div class="flex gap-2 items-center">
          <span class="badge-success text-sm px-3 py-1.5">
            ✅ {{ asistieron() }} asistieron
          </span>
          <span class="badge-warning text-sm px-3 py-1.5">
            ⏳ {{ pensionados().length - asistieron() }} pendientes
          </span>
          <button (click)="marcarTodos()" class="btn-secondary text-sm"
                  [disabled]="pendientes().length === 0">
            Marcar todos presentes
          </button>
        </div>
      </div>

      <!-- Barra de progreso -->
      <div class="card py-3 px-4">
        <div class="flex items-center justify-between mb-2 text-sm">
          <span style="color:rgb(var(--color-on-surface)/0.6)">Progreso del día</span>
          <span class="font-bold font-mono" style="color:rgb(var(--color-primary))">
            {{ asistieron() }}/{{ pensionados().length }}
          </span>
        </div>
        <div class="w-full h-2 rounded-full overflow-hidden"
             style="background:rgb(var(--color-border))">
          <div class="h-full rounded-full transition-all duration-500"
               style="background:rgb(var(--color-primary))"
               [style.width.%]="progreso()">
          </div>
        </div>
      </div>

      <!-- Búsqueda -->
      <input [(ngModel)]="busqueda" class="input max-w-xs text-sm"
             placeholder="🔍 Buscar pensionado...">

      <!-- Grid de pensionados -->
      @if (cargando()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="skeleton h-24 rounded-2xl"></div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          @for (p of filtrados(); track p.id) {
            <div class="card flex items-center gap-4 transition-all duration-200"
                 [style.border-color]="p.asistioHoy ? 'rgb(var(--color-success)/0.4)' : 'rgb(var(--color-border))'">
              <!-- Avatar -->
              <div class="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                   [style.background]="p.asistioHoy
                     ? 'rgb(var(--color-success)/0.15)' : 'rgb(var(--color-surface))'"
                   [style.color]="p.asistioHoy
                     ? 'rgb(var(--color-success))' : 'rgb(var(--color-on-surface)/0.4)'"
                   [style.border]="'1px solid rgb(var(--color-border))'">
                {{ p.nombre.charAt(0).toUpperCase() }}
              </div>

              <div class="flex-1 min-w-0">
                <p class="font-semibold text-sm truncate"
                   style="color:rgb(var(--color-on-surface))">
                  {{ p.nombre }} {{ p.apellido }}
                </p>
                <p class="text-xs truncate" style="color:rgb(var(--color-on-surface)/0.4)">
                  {{ p.tipoAlmuerzo?.nombre ?? 'Sin tipo' }}
                </p>
                @if ((p.saldoPendiente ?? 0) > 0) {
                  <span class="badge-warning text-[10px]">
                    Bs {{ p.saldoPendiente | number:'1.2-2' }} pendiente
                  </span>
                }
              </div>

              <!-- Botón asistencia -->
              <button (click)="toggleAsistencia(p)"
                      [disabled]="p.cargando || p.asistioHoy"
                      class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                             font-bold text-lg transition-all duration-200"
                      [style.background]="p.asistioHoy
                        ? 'rgb(var(--color-success))' : 'rgb(var(--color-surface-2))'"
                      [style.color]="p.asistioHoy ? 'white' : 'rgb(var(--color-on-surface)/0.4)'"
                      [style.border]="'1px solid ' + (p.asistioHoy
                        ? 'rgb(var(--color-success))' : 'rgb(var(--color-border))')">
                @if (p.cargando) {
                  <span class="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block"></span>
                } @else if (p.asistioHoy) {
                  ✓
                } @else {
                  +
                }
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AsistenciaComponent implements OnInit {
  pensionados = signal<PensionadoAsistencia[]>([]);
  cargando    = signal(true);
  busqueda    = '';

  asistieron = computed(() => this.pensionados().filter(p => p.asistioHoy).length);
  pendientes = computed(() => this.pensionados().filter(p => !p.asistioHoy));
  progreso   = computed(() => {
    const total = this.pensionados().length;
    return total > 0 ? (this.asistieron() / total) * 100 : 0;
  });

  filtrados = computed(() => {
    const q = this.busqueda.toLowerCase();
    if (!q) return this.pensionados();
    return this.pensionados().filter(p =>
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(q)
    );
  });

  constructor(
    private pensionadoService: PensionadoService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.pensionadoService.listar().subscribe({
      next: ps => {
        this.pensionados.set(ps.map(p => ({ ...p, asistioHoy: false, cargando: false })));
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  toggleAsistencia(p: PensionadoAsistencia): void {
    if (p.asistioHoy || p.cargando) return;
    this.pensionados.update(list =>
      list.map(x => x.id === p.id ? { ...x, cargando: true } : x)
    );

    this.pensionadoService.registrarAsistencia(p.id).subscribe({
      next: () => {
        this.pensionados.update(list =>
          list.map(x => x.id === p.id ? { ...x, asistioHoy: true, cargando: false } : x)
        );
      },
      error: err => {
        this.pensionados.update(list =>
          list.map(x => x.id === p.id ? { ...x, cargando: false } : x)
        );
        console.error(err?.error?.mensaje);
      }
    });
  }

  marcarTodos(): void {
    this.pendientes().forEach(p => this.toggleAsistencia(p));
  }

  fechaHoy(): string {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }
}
