import { Component, OnInit, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';

interface AsistenciaResumen {
  fecha: string;
  asistio: boolean;
}

interface PensionadoPublico {
  nombre: string;
  apellido: string;
  tipoAlmuerzo: string | null;
  estado: string;
  saldoPendiente: number;
  ultimasAsistencias: AsistenciaResumen[];
}

/**
 * Autoservicio QR del pensionado — pantalla PÚBLICA (sin login), accesible solo
 * por posesión del token en la URL. Consume PensionadoAutoServicioController
 * (/pensionados-publico/**, declarado público en SecurityConfig). Ruta declarada
 * fuera del authGuard en app.routes.ts, igual que /login.
 */
@Component({
  selector: 'app-pensionado-publico',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4"
         style="background:rgb(var(--color-background))">
      <div class="card max-w-sm w-full space-y-4 animate-pop">

        <div class="text-center">
          <h1 class="font-display text-xl font-bold" style="color:rgb(var(--color-on-surface))">
            Mi cuenta de pensionado
          </h1>
        </div>

        @if (cargando()) {
          <div class="skeleton h-40 rounded-xl"></div>
        } @else if (error()) {
          <p class="text-sm text-center p-3 rounded-lg"
             style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
            {{ error() }}
          </p>
        } @else {
          @if (info(); as p) {
          <div class="rounded-xl p-4 space-y-2" style="background:rgb(var(--color-surface-2))">
            <p class="font-bold text-lg" style="color:rgb(var(--color-on-surface))">
              {{ p.nombre }} {{ p.apellido }}
            </p>
            <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.6)">
              Plan: <strong>{{ p.tipoAlmuerzo || '—' }}</strong>
            </p>
            <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.6)">
              Estado: <span [class]="badgeEstado(p.estado)">{{ labelEstado(p.estado) }}</span>
            </p>
            <p class="text-sm">
              Saldo pendiente:
              @if ((p.saldoPendiente ?? 0) > 0) {
                <span class="badge-danger text-xs">Bs {{ p.saldoPendiente | number:'1.2-2' }}</span>
              } @else {
                <span class="badge-success text-xs">Al día</span>
              }
            </p>
          </div>

          <button (click)="marcarAsistencia()"
                  class="btn-primary w-full justify-center"
                  [disabled]="marcando() || yaMarcada()">
            @if (marcando()) {
              <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
            } @else if (yaMarcada()) {
              Asistencia de hoy ya registrada
            } @else {
              Marcar asistencia de hoy
            }
          </button>

          @if (mensajeAsistencia()) {
            <p class="text-xs text-center p-2 rounded-lg"
               [style.background]="asistenciaOk() ? 'rgb(var(--color-success)/0.1)' : 'rgb(var(--color-danger)/0.1)'"
               [style.color]="asistenciaOk() ? 'rgb(var(--color-success))' : 'rgb(var(--color-danger))'">
              {{ mensajeAsistencia() }}
            </p>
          }

          <div>
            <p class="text-xs font-semibold uppercase tracking-wider mb-2"
               style="color:rgb(var(--color-on-surface)/0.4)">Últimas asistencias</p>
            @if (p.ultimasAsistencias.length === 0) {
              <p class="text-center py-4 text-sm" style="color:rgb(var(--color-on-surface)/0.35)">
                Sin asistencias registradas
              </p>
            } @else {
              <div class="space-y-1">
                @for (a of p.ultimasAsistencias; track a.fecha) {
                  <div class="flex items-center justify-between px-3 py-2 rounded-lg"
                       style="background:rgb(var(--color-surface-2))">
                    <span class="text-sm font-mono" style="color:rgb(var(--color-on-surface)/0.75)">{{ a.fecha }}</span>
                    <span class="text-xs font-semibold"
                          [style.color]="a.asistio ? 'rgb(var(--color-success))' : 'rgb(var(--color-danger))'">
                      {{ a.asistio ? 'Presente' : 'Ausente' }}
                    </span>
                  </div>
                }
              </div>
            }
          </div>
          }
        }
      </div>
    </div>
  `,
})
export class PensionadoPublicoComponent implements OnInit {
  qrToken = '';
  cargando  = signal(true);
  error     = signal('');
  info      = signal<PensionadoPublico | null>(null);
  marcando  = signal(false);
  yaMarcada = signal(false);
  mensajeAsistencia = signal('');
  asistenciaOk = signal(true);

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit(): void {
    this.qrToken = this.route.snapshot.paramMap.get('qrToken') ?? '';
    this.cargar();
  }

  private cargar(): void {
    if (!this.qrToken) {
      this.error.set('Enlace inválido.');
      this.cargando.set(false);
      return;
    }
    this.cargando.set(true);
    this.http.get<PensionadoPublico>(`${environment.apiUrl}/pensionados-publico/${this.qrToken}`).subscribe({
      next: p => { this.info.set(p); this.cargando.set(false); },
      error: () => {
        this.error.set('No se encontró información para este código. Verificá el enlace o contactá al restaurante.');
        this.cargando.set(false);
      },
    });
  }

  marcarAsistencia(): void {
    this.marcando.set(true);
    this.mensajeAsistencia.set('');
    this.http.post(`${environment.apiUrl}/pensionados-publico/${this.qrToken}/asistencia`, null).subscribe({
      next: () => {
        this.marcando.set(false);
        this.yaMarcada.set(true);
        this.asistenciaOk.set(true);
        this.mensajeAsistencia.set('¡Asistencia registrada!');
        this.cargar();
      },
      error: err => {
        this.marcando.set(false);
        if (err?.status === 409) this.yaMarcada.set(true);
        this.asistenciaOk.set(false);
        this.mensajeAsistencia.set(err?.error?.mensaje ?? 'No se pudo registrar la asistencia.');
      },
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
}
