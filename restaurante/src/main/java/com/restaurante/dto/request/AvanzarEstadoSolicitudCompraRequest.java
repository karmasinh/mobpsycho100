package com.restaurante.dto.request;

import com.restaurante.enums.EstadoSolicitudCompra;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class AvanzarEstadoSolicitudCompraRequest {

    @NotNull(message = "El nuevo estado es obligatorio")
    private EstadoSolicitudCompra estado;

    /** Obligatorio cuando el nuevo estado es RECHAZADA */
    private String motivoRechazo;

    /** Fecha de recepción declarada al marcar RECIBIDA (opcional; por defecto hoy) */
    private LocalDate fechaRecepcion;

    /** Datos de lote por ítem, solo necesarios al marcar RECIBIDA */
    private List<ItemRecepcionRequest> items;

    @Data
    public static class ItemRecepcionRequest {

        @NotNull(message = "El ítem de la solicitud es obligatorio")
        private Long itemId;

        private String numeroLote;

        private Double precioUnitario;

        private LocalDate fechaVencimiento;
    }
}
