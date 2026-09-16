package com.restaurante.service;

import com.restaurante.dto.request.AvanzarEstadoSolicitudCompraRequest;
import com.restaurante.dto.request.CrearSolicitudCompraRequest;
import com.restaurante.entity.SolicitudCompra;
import com.restaurante.enums.EstadoSolicitudCompra;

import java.util.List;

public interface SolicitudCompraService {

    SolicitudCompra crear(CrearSolicitudCompraRequest request, Long sucursalId, Long usuarioId);

    /**
     * Avanza la solicitud a `nuevoEstado` siguiendo el flujo
     * CREADA → EN_REVISION → APROBADA → EN_PROCESO → RECIBIDA, o hacia
     * RECHAZADA (con motivo obligatorio) desde CREADA/EN_REVISION.
     * Al llegar a RECIBIDA, ingresa un lote por cada ítem vía InventarioService.
     */
    SolicitudCompra avanzarEstado(Long id, EstadoSolicitudCompra nuevoEstado,
                                   AvanzarEstadoSolicitudCompraRequest request, Long usuarioId);

    List<SolicitudCompra> listarPendientes(Long sucursalEfectiva);

    List<SolicitudCompra> listarMias(Long usuarioId);

    SolicitudCompra obtenerPorId(Long id);
}
