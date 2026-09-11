import { Injectable } from '@angular/core';
import { ConfiguracionTicket, Venta } from '../models';
import { ToastService } from './toast.service';

/**
 * Ticket de venta impreso al cliente — adoptado del sistema base (LINEAMIENTOS MAESTROS Y
 * PROYECTOS REFERENCIALES/SistemaDesk, docs/correcciones-sugeridas/03-ticket-venta-configurable.md).
 * Mismo patrón que ComandaPrintService de Cocina, con la plantilla del comprobante de venta.
 */
@Injectable({ providedIn: 'root' })
export class TicketPrintService {

  constructor(private toastSvc: ToastService) {}

  imprimir(venta: Venta, config: ConfiguracionTicket): void {
    const ventana = window.open('', '_blank', 'width=340,height=600');
    if (!ventana) {
      this.toastSvc.error('No se pudo abrir el ticket — permite ventanas emergentes para este sitio.');
      return;
    }

    ventana.document.open();
    ventana.document.write(this.armarHtml(venta, config));
    ventana.document.close();
    ventana.onload = () => {
      ventana.focus();
      ventana.print();
    };
  }

  private armarHtml(venta: Venta, config: ConfiguracionTicket): string {
    const fecha = new Date(venta.creadoEn);
    const fechaStr = fecha.toLocaleDateString('es-BO') + ' ' + fecha.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    const pedido = venta.pedido;

    const cliente = pedido?.pensionado
      ? `${pedido.pensionado.nombre} ${pedido.pensionado.apellido}`
      : pedido?.cliente?.nombre ?? 'Consumidor final';

    const lineas = (pedido?.detalles ?? []).map(d =>
      `<div class="item">
         <span>${d.cantidad} ${this.escapar(d.plato.nombre)}</span>
         <span>${(d.precioUnitario * d.cantidad).toFixed(2)}</span>
       </div>`
    ).join('');

    const encabezado = `
      ${config.logoBase64 ? `<div class="logo"><img src="${config.logoBase64}" alt="logo"></div>` : ''}
      ${config.razonSocial ? `<div class="centrado negrita">${this.escapar(config.razonSocial)}</div>` : ''}
      ${config.nit ? `<div class="centrado">NIT: ${this.escapar(config.nit)}</div>` : ''}
      ${config.direccion ? `<div class="centrado">${this.escapar(config.direccion)}</div>` : ''}
      ${config.telefono ? `<div class="centrado">Tel: ${this.escapar(config.telefono)}</div>` : ''}
    `;

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ticket ${venta.numeroTicket ?? venta.id}</title>
        <style>
          @page { size: ${config.anchoMm}mm auto; margin: 0; }
          body { font-family: 'Courier New', monospace; font-size: 12px; width: ${config.anchoMm}mm; margin: 0; padding: 4mm; }
          .centrado { text-align: center; }
          .negrita { font-weight: bold; }
          .logo img { max-width: 100%; display: block; margin: 0 auto 4px; }
          .linea { border-top: 1px dashed #000; margin: 6px 0; }
          .meta { font-size: 11px; }
          .item { display: flex; justify-content: space-between; }
          .totales div { display: flex; justify-content: space-between; font-weight: bold; }
          .pie { text-align: center; margin-top: 8px; font-size: 11px; font-style: italic; }
        </style>
      </head>
      <body>
        ${encabezado}
        <div class="linea"></div>
        <div class="meta">Ticket: ${this.escapar(venta.numeroTicket ?? String(venta.id))}</div>
        <div class="meta">Fecha: ${fechaStr}</div>
        ${config.mostrarNumeroPedido && pedido ? `<div class="meta">Pedido: #${pedido.id}</div>` : ''}
        ${config.mostrarCajero && venta.cajero ? `<div class="meta">Cajero: ${this.escapar(venta.cajero.username)}</div>` : ''}
        ${config.mostrarCliente ? `<div class="meta">Cliente: ${this.escapar(cliente)}</div>` : ''}
        <div class="linea"></div>
        ${lineas}
        <div class="linea"></div>
        <div class="totales">
          <div><span>TOTAL</span><span>Bs ${venta.totalCobrado.toFixed(2)}</span></div>
          ${config.mostrarFormaPago ? `<div><span>Forma de pago</span><span>${venta.formaPago}</span></div>` : ''}
          <div><span>Recibido</span><span>Bs ${venta.montoRecibido.toFixed(2)}</span></div>
          <div><span>Cambio</span><span>Bs ${venta.vuelto.toFixed(2)}</span></div>
        </div>
        ${config.mostrarObservaciones && pedido?.observaciones ? `<div class="meta">Obs: ${this.escapar(pedido.observaciones)}</div>` : ''}
        ${config.mensajePie ? `<div class="pie">${this.escapar(config.mensajePie)}</div>` : ''}
        ${config.leyendaLegal ? `<div class="pie">${this.escapar(config.leyendaLegal)}</div>` : ''}
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
