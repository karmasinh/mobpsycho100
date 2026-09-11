package com.restaurante.enums;

/**
 * Ciclo de vida de una factura electrónica ante el SIN.
 *
 * <p><b>Cimientos:</b> este proyecto no tiene conexión real a los servicios web del SIN
 * (requiere credenciales fiscales de un contribuyente boliviano registrado), así que una
 * factura <b>nunca</b> llega a {@code ACEPTADA} por este sistema — ese estado existe para
 * cuando se conecte de verdad, pero hoy no lo pone ningún flujo. Toda factura emitida queda
 * en {@code PENDIENTE}.
 */
public enum EstadoFactura {

    /** Generada localmente con su XML, sin enviar (ni poder enviarse) al SIN todavía. */
    PENDIENTE,

    /** Reservado para cuando exista conexión real al SIN. No lo asigna ningún flujo hoy. */
    ACEPTADA,

    /** El SIN la rechazó. Reservado para cuando exista conexión real. */
    RECHAZADA,

    /** Anulada localmente, con motivo. */
    ANULADA
}
