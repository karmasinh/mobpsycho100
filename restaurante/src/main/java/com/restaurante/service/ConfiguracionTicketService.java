package com.restaurante.service;

import com.restaurante.dto.request.ConfiguracionTicketRequest;
import com.restaurante.entity.ConfiguracionTicket;

public interface ConfiguracionTicketService {

    /** Devuelve la configuración de la sucursal, o una con valores por defecto si nunca se guardó. */
    ConfiguracionTicket obtener(Long sucursalId);

    ConfiguracionTicket guardar(Long sucursalId, ConfiguracionTicketRequest request);

    /**
     * Incrementa el correlativo de la sucursal (con lock pesimista) y devuelve el número de
     * ticket resultante, ej. "S1-000001". Crea la configuración con valores por defecto si la
     * sucursal todavía no configuró nada.
     */
    String siguienteNumeroTicket(Long sucursalId);
}
