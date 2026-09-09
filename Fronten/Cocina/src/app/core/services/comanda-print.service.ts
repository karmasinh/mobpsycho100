import { Injectable } from '@angular/core';
import { Pedido } from '../models';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ComandaPrintService {

  constructor(private toastSvc: ToastService) {}

  imprimir(pedido: Pedido): void {
    const ventana = window.open('', '_blank', 'width=320,height=600');
    if (!ventana) {
      this.toastSvc.error('No se pudo abrir la comanda — permite ventanas emergentes para este sitio.');
      return;
    }

    ventana.document.open();
    ventana.document.write(this.armarHtml(pedido));
    ventana.document.close();
    ventana.onload = () => {
      ventana.focus();
      ventana.print();
    };
  }

  private armarHtml(pedido: Pedido): string {
    const fecha = new Date(pedido.creadoEn);
    const fechaStr = fecha.toLocaleDateString('es-BO') + ' ' + fecha.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

    const cliente = pedido.pensionado
      ? `${pedido.pensionado.nombre} ${pedido.pensionado.apellido} (pensionado)`
      : pedido.cliente?.nombre ?? 'Mostrador';

    const lineas = pedido.detalles.map(d => {
      let extra = '';
      if (d.sopaSeleccionada) extra += `<div class="detalle">  Sopa: ${this.escapar(d.sopaSeleccionada.nombre)}</div>`;
      if (d.segundoSeleccionado) extra += `<div class="detalle">  Segundo: ${this.escapar(d.segundoSeleccionado.nombre)}</div>`;
      if (d.observaciones) extra += `<div class="detalle">  Obs: ${this.escapar(d.observaciones)}</div>`;
      return `<div class="item"><span>${d.cantidad} × ${this.escapar(d.plato.nombre)}</span></div>${extra}`;
    }).join('');

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Comanda #${pedido.id}</title>
        <style>
          @page { margin: 4mm; }
          body { font-family: 'Courier New', monospace; font-size: 13px; width: 72mm; margin: 0; padding: 4px; }
          h1 { font-size: 16px; margin: 0 0 4px; text-align: center; }
          .linea { border-top: 1px dashed #000; margin: 6px 0; }
          .item { font-weight: bold; margin-top: 4px; }
          .detalle { font-size: 12px; padding-left: 6px; }
          .meta { font-size: 12px; }
          .obs-pedido { margin-top: 8px; font-size: 12px; font-style: italic; }
        </style>
      </head>
      <body>
        <h1>🍳 COMANDA</h1>
        <div class="meta">Pedido #${pedido.id}</div>
        <div class="meta">${fechaStr}</div>
        <div class="meta">Sucursal: ${this.escapar(pedido.sucursal?.nombre ?? '—')}</div>
        <div class="meta">Cliente: ${this.escapar(cliente)}</div>
        <div class="linea"></div>
        ${lineas}
        <div class="linea"></div>
        ${pedido.observaciones ? `<div class="obs-pedido">Obs. pedido: ${this.escapar(pedido.observaciones)}</div>` : ''}
      </body>
      </html>
    `;
  }

  private escapar(texto: string): string {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }
}
