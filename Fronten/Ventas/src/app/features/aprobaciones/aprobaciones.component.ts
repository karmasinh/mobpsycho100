import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SolicitudAprobacionService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { SolicitudAprobacion } from '../../core/models';

@Component({
  selector: 'app-aprobaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5 animate-slide-up">
      <div>
        <h1 class="font-display text-2xl font-bold" style="color:rgb(var(--color-on-surface))">
          Aprobaciones
        </h1>
        <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
          @if (esAdmin()) {
            Solicitudes de anulación de venta y reversión de caja pendientes de tu aprobación
          } @else {
            Tus solicitudes de anulación de venta y reversión de caja
          }
        </p>
      </div>

      @if (cargando()) {
        <div class="skeleton h-40 rounded-2xl"></div>
      } @else if (solicitudes().length === 0) {
        <div class="card text-center py-10">
          <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.5)">
            {{ esAdmin() ? 'No hay solicitudes pendientes.' : 'No enviaste ninguna solicitud todavía.' }}
          </p>
        </div>
      } @else {
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>#Ref</th>
                @if (esAdmin()) { <th>Sucursal</th><th>Solicitante</th> }
                <th>Motivo</th>
                <th>Estado</th>
                @if (!esAdmin()) { <th>Resolución</th> }
                <th>Fecha</th>
                @if (esAdmin()) { <th>Acciones</th> }
              </tr>
            </thead>
            <tbody>
              @for (s of solicitudes(); track s.id) {
                <tr>
                  <td>{{ tipoLabel(s.tipo) }}</td>
                  <td class="font-mono text-xs">#{{ s.entidadId }}</td>
                  @if (esAdmin()) {
                    <td class="text-xs">{{ s.sucursal?.nombre ?? '—' }}</td>
                    <td class="text-xs">{{ s.solicitante?.username ?? '—' }}</td>
                  }
                  <td class="text-xs">{{ s.motivo }}</td>
                  <td>
                    @if (s.estado === 'PENDIENTE') { <span class="badge-warning">Pendiente</span> }
                    @else if (s.estado === 'APROBADA') { <span class="badge-success">Aprobada</span> }
                    @else { <span class="badge-danger">Rechazada</span> }
                  </td>
                  @if (!esAdmin()) {
                    <td class="text-xs">
                      @if (s.estado === 'RECHAZADA') { {{ s.motivoRechazo }} }
                      @else if (s.estado === 'APROBADA') { por {{ s.resueltoPor?.username }} }
                    </td>
                  }
                  <td class="text-xs">{{ s.creadoEn | date:'dd/MM HH:mm' }}</td>
                  @if (esAdmin()) {
                    <td>
                      @if (s.estado === 'PENDIENTE') {
                        <div class="flex gap-1">
                          <button (click)="aprobar(s)" [disabled]="procesandoId() === s.id"
                                  class="btn-primary text-xs px-2 py-1">
                            Aprobar
                          </button>
                          <button (click)="abrirRechazar(s)" [disabled]="procesandoId() === s.id"
                                  class="btn-ghost text-xs px-2 py-1 text-danger">
                            Rechazar
                          </button>
                        </div>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

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
            @if (errModal()) {
              <p class="text-xs mt-1" style="color:rgb(var(--color-danger))">{{ errModal() }}</p>
            }
          </div>
          <div class="flex gap-2">
            <button (click)="modalRechazar.set(null)" class="btn-secondary flex-1 justify-center">Cancelar</button>
            <button (click)="confirmarRechazar()" [disabled]="procesandoId() !== null"
                    class="btn-danger flex-1 justify-center">
              Rechazar
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AprobacionesComponent implements OnInit {
  cargando       = signal(true);
  solicitudes    = signal<SolicitudAprobacion[]>([]);
  procesandoId   = signal<number | null>(null);
  modalRechazar  = signal<SolicitudAprobacion | null>(null);
  errModal       = signal('');
  motivoRechazo  = '';

  constructor(
    private solicitudService: SolicitudAprobacionService,
    public auth: AuthService,
    private toastSvc: ToastService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  esAdmin(): boolean {
    return this.auth.rol() === 'ADMIN';
  }

  tipoLabel(tipo: string): string {
    return tipo === 'ANULACION_VENTA' ? 'Anulación de venta' : 'Reversión de movimiento';
  }

  private cargar(): void {
    this.cargando.set(true);
    const obs = this.esAdmin() ? this.solicitudService.listarPendientes() : this.solicitudService.listarMias();
    obs.subscribe({
      next: ss => { this.solicitudes.set(ss); this.cargando.set(false); },
      error: () => { this.cargando.set(false); },
    });
  }

  aprobar(s: SolicitudAprobacion): void {
    this.procesandoId.set(s.id);
    this.solicitudService.aprobar(s.id).subscribe({
      next: () => {
        this.toastSvc.success(`Solicitud #${s.id} aprobada — la acción ya se aplicó`);
        this.procesandoId.set(null);
        this.cargar();
      },
      error: err => {
        this.toastSvc.error(err?.error?.mensaje ?? 'No se pudo aprobar la solicitud');
        this.procesandoId.set(null);
      },
    });
  }

  abrirRechazar(s: SolicitudAprobacion): void {
    this.modalRechazar.set(s);
    this.motivoRechazo = '';
    this.errModal.set('');
  }

  confirmarRechazar(): void {
    if (!this.motivoRechazo.trim()) {
      this.errModal.set('El motivo es obligatorio');
      return;
    }
    const s = this.modalRechazar()!;
    this.procesandoId.set(s.id);
    this.solicitudService.rechazar(s.id, this.motivoRechazo.trim()).subscribe({
      next: () => {
        this.toastSvc.success(`Solicitud #${s.id} rechazada`);
        this.modalRechazar.set(null);
        this.procesandoId.set(null);
        this.cargar();
      },
      error: err => {
        this.errModal.set(err?.error?.mensaje ?? 'No se pudo rechazar la solicitud');
        this.procesandoId.set(null);
      },
    });
  }
}
