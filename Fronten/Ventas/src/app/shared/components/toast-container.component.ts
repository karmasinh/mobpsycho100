import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-5 right-5 z-[9999] flex flex-col gap-2 max-w-xs w-full pointer-events-none"
         aria-live="polite" aria-atomic="false">
      @for (t of toast.toasts(); track t.id) {
        <div class="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm animate-pop"
             [ngClass]="clases(t.tipo)"
             role="alert">
          <span class="flex-shrink-0 text-base leading-none mt-0.5">{{ icono(t.tipo) }}</span>
          <span class="flex-1 leading-snug font-medium">{{ t.mensaje }}</span>
          <button (click)="toast.quitar(t.id)"
                  class="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity p-0.5 rounded"
                  aria-label="Cerrar notificación">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
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
    const m: Record<string, string> = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    return m[tipo] ?? '';
  }
}
