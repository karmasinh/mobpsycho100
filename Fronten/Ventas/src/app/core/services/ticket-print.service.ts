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

  /**
   * Abre la pestaña del ticket de inmediato, dentro del mismo gesto de click que la
   * origina (antes de cualquier `subscribe` asíncrono) — así el navegador no la trata
   * como popup no solicitado. Guardar el resultado y pasarlo luego a `imprimir()`.
   */
  abrirVentana(): Window | null {
    const ventana = window.open('', '_blank', 'width=340,height=600');
    if (!ventana) {
      this.toastSvc.error('No se pudo abrir el ticket — permite ventanas emergentes para este sitio.');
    }
    return ventana;
  }

  /**
   * `ventanaPrevia` permite pasar una pestaña ya abierta de forma síncrona dentro del
   * gesto de click original (ver `abrirVentana()`). Si se omite, se intenta abrir una
   * nueva aquí — funciona solo si `imprimir()` en sí se llama de forma síncrona desde el
   * click, no tras una respuesta HTTP (ahí el navegador la bloquea como popup).
   */
  imprimir(venta: Venta, config: ConfiguracionTicket, ventanaPrevia?: Window | null): void {
    const ventana = ventanaPrevia ?? window.open('', '_blank', 'width=340,height=600');
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
      <div class="logo">${config.logoBase64 ? `<img src="${config.logoBase64}" alt="logo">` : this.emblemaPorDefecto()}</div>
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
          .logo { text-align: center; margin-bottom: 4px; }
          .logo img { max-width: 100%; display: block; margin: 0 auto; }
          .logo svg { width: 30mm; height: 30mm; color: #000; margin: 0 auto; display: block; }
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

  /**
   * Emblema vectorial de "La Entrerriana" — mismo SVG que login.component.ts (líneas
   * 72-88), usado como logo por defecto del ticket cuando la sucursal no subió el suyo.
   */
  private emblemaPorDefecto(): string {
    return `
      <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" fill="none">
        <circle cx="40" cy="40" r="36" stroke="currentColor" stroke-width="2"/>
        <circle cx="40" cy="40" r="28" stroke="currentColor" stroke-width="0.75" opacity="0.4"/>
        <ellipse cx="33" cy="11" rx="2.5" ry="4.5" fill="currentColor" opacity="0.7" transform="rotate(-18 33 11)"/>
        <ellipse cx="40" cy="9"  rx="2.5" ry="5"   fill="currentColor" opacity="0.85"/>
        <ellipse cx="47" cy="11" rx="2.5" ry="4.5" fill="currentColor" opacity="0.7" transform="rotate(18 47 11)"/>
        <line x1="40" y1="14" x2="40" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <text x="40" y="58" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="32" font-weight="700" fill="currentColor">E</text>
      </svg>
    `;
  }

  private escapar(texto: string): string {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }
}
