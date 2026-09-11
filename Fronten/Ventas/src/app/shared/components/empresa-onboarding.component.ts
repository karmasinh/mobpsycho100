import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpresaService, SucursalService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

/**
 * Asistente de bienvenida del primer arranque: se muestra cuando no existe
 * el perfil de Empresa (GET /empresa → 404). Paso 1 crea la empresa; Paso 2
 * crea la primera sucursal solo si todavía no hay ninguna.
 */
@Component({
  selector: 'app-empresa-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
         style="background:rgba(0,0,0,0.6)">
      <div class="card max-w-md w-full space-y-4 animate-fade-up">
        <div>
          <h3 class="font-display font-bold text-lg" style="color:rgb(var(--color-on-surface))">
            👋 Bienvenido — configuremos tu negocio
          </h3>
          <p class="text-sm mt-1" style="color:rgb(var(--color-on-surface)/0.5)">
            Paso {{ paso() }} de {{ requiereSucursal() ? 2 : 1 }}
          </p>
        </div>

        @if (paso() === 1) {
          <div class="space-y-3">
            <div>
              <label class="input-label">Nombre del negocio *</label>
              <input [(ngModel)]="formEmpresa.nombre" maxlength="150" class="input text-sm"
                     placeholder="Ej: La Entrerriana">
            </div>
            <div>
              <label class="input-label">NIT / razón social</label>
              <input [(ngModel)]="formEmpresa.nit" maxlength="40" class="input text-sm">
            </div>
            <div>
              <label class="input-label">Dirección</label>
              <input [(ngModel)]="formEmpresa.direccion" maxlength="200" class="input text-sm">
            </div>
            <div>
              <label class="input-label">Teléfono</label>
              <input [(ngModel)]="formEmpresa.telefono" maxlength="20" class="input text-sm">
            </div>
          </div>
        }

        @if (paso() === 2) {
          <div class="space-y-3">
            <p class="text-sm" style="color:rgb(var(--color-on-surface)/0.6)">
              Todavía no hay ninguna sucursal registrada. Creá la primera para empezar a operar.
            </p>
            <div>
              <label class="input-label">Nombre de la sucursal *</label>
              <input [(ngModel)]="formSucursal.nombre" maxlength="100" class="input text-sm"
                     placeholder="Ej: Casa Matriz">
            </div>
            <div>
              <label class="input-label">Dirección</label>
              <input [(ngModel)]="formSucursal.direccion" maxlength="200" class="input text-sm">
            </div>
            <div>
              <label class="input-label">Teléfono</label>
              <input [(ngModel)]="formSucursal.telefono" maxlength="20" class="input text-sm">
            </div>
          </div>
        }

        @if (error()) {
          <p class="text-xs p-2 rounded-lg"
             style="background:rgb(var(--color-danger)/0.1);color:rgb(var(--color-danger))">
            {{ error() }}
          </p>
        }

        <div class="flex gap-2 pt-1">
          <button (click)="siguiente()" [disabled]="guardando()" class="btn-primary flex-1 justify-center">
            @if (guardando()) {
              <span class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block"></span>
            } @else if (paso() === 1 && requiereSucursal()) {
              Siguiente
            } @else {
              Finalizar
            }
          </button>
        </div>
      </div>
    </div>
  `,
})
export class EmpresaOnboardingComponent implements OnInit {
  @Output() completado = new EventEmitter<void>();

  paso      = signal(1);
  guardando = signal(false);
  error     = signal('');
  requiereSucursal = signal(true);

  formEmpresa = { nombre: '', nit: '', direccion: '', telefono: '' };
  formSucursal = { nombre: '', direccion: '', telefono: '' };

  constructor(
    private empresaService: EmpresaService,
    private sucursalService: SucursalService,
    private toastSvc: ToastService,
  ) {}

  ngOnInit(): void {
    this.sucursalService.listarTodas().subscribe({
      next: lista => this.requiereSucursal.set(lista.length === 0),
      error: () => {},
    });
  }

  siguiente(): void {
    this.error.set('');
    if (this.paso() === 1) {
      if (!this.formEmpresa.nombre.trim()) {
        this.error.set('Indicá el nombre del negocio.');
        return;
      }
      this.guardando.set(true);
      this.empresaService.guardar(this.formEmpresa).subscribe({
        next: () => {
          this.guardando.set(false);
          if (this.requiereSucursal()) {
            this.paso.set(2);
          } else {
            this.finalizar();
          }
        },
        error: err => {
          this.guardando.set(false);
          this.error.set(err?.error?.mensaje ?? 'No se pudo guardar la empresa.');
        },
      });
      return;
    }

    // Paso 2
    if (!this.formSucursal.nombre.trim()) {
      this.error.set('Indicá el nombre de la sucursal.');
      return;
    }
    this.guardando.set(true);
    this.sucursalService.crear(this.formSucursal).subscribe({
      next: () => { this.guardando.set(false); this.finalizar(); },
      error: err => {
        this.guardando.set(false);
        this.error.set(err?.error?.mensaje ?? 'No se pudo crear la sucursal.');
      },
    });
  }

  private finalizar(): void {
    this.toastSvc.success('Negocio configurado correctamente');
    this.completado.emit();
  }
}
