import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  mensaje: string;
  tipo: 'success' | 'error' | 'warning' | 'info';
  duracion: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private contador = 0;
  toasts = signal<ToastMessage[]>([]);

  success(mensaje: string, duracion = 3500): void {
    this.agregar(mensaje, 'success', duracion);
  }

  error(mensaje: string, duracion = 4500): void {
    this.agregar(mensaje, 'error', duracion);
  }

  warning(mensaje: string, duracion = 4000): void {
    this.agregar(mensaje, 'warning', duracion);
  }

  info(mensaje: string, duracion = 3000): void {
    this.agregar(mensaje, 'info', duracion);
  }

  quitar(id: number): void {
    this.toasts.update(ts => ts.filter(t => t.id !== id));
  }

  private agregar(mensaje: string, tipo: ToastMessage['tipo'], duracion: number): void {
    const id = ++this.contador;
    this.toasts.update(ts => [...ts, { id, mensaje, tipo, duracion }]);
    setTimeout(() => this.quitar(id), duracion);
  }
}
