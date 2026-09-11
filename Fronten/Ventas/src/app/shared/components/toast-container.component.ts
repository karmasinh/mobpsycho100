import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="fixed top-5 right-5 z-[9999] flex flex-col gap-2 max-w-xs w-full pointer-events-none"
         aria-live="polite" aria-atomic="false">
      @for (t of toast.toasts(); track t.id) {
        <div class="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm animate-pop"
             [ngClass]="clases(t.tipo)"
             role="alert">
          <iconify-icon [attr.icon]="icono(t.tipo)" width="18" height="18"
                        class="flex-shrink-0 mt-0.5" style="color:currentColor"></iconify-icon>
          <span class="flex-1 leading-snug font-medium">{{ t.mensaje }}</span>
          <button (click)="toast.quitar(t.id)"
                  class="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity p-0.5 rounded"
                  aria-label="Cerrar notificación">
            <iconify-icon icon="line-md:close" width="14" height="14" style="color:currentColor"></iconify-icon>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  constructor(public toast: ToastService) {}

  clases(tipo: ToastMessage['tipo']): Record<string, boolean> {
    return {
      'bg-success/10 border-success/30 text-success': tipo === 'success',
      'bg-danger/10 border-danger/30 text-danger':    tipo === 'error',
      'bg-warning/10 border-warning/30 text-warning': tipo === 'warning',
      'bg-info/10 border-info/30 text-info':          tipo === 'info',
    };
  }

  icono(tipo: ToastMessage['tipo']): string {
    const m: Record<string, string> = {
      success: 'line-md:confirm-circle',
      error: 'line-md:close-circle',
      warning: 'tabler:alert-triangle',
      info: 'tabler:info-circle',
    };
    return m[tipo] ?? 'tabler:info-circle';
  }
}
