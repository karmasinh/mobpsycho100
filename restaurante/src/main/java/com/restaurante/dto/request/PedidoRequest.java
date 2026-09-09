package com.restaurante.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class PedidoRequest {

    private Long clienteId;
    private Long pensionadoId;

    @NotNull(message = "La sucursal es obligatoria")
    private Long sucursalId;

    private String observaciones;

    @NotEmpty(message = "El pedido debe tener al menos un ítem")
    private List<DetallePedidoRequest> detalles;

    @Data
    public static class DetallePedidoRequest {
        @NotNull(message = "El plato es obligatorio")
        private Long platoId;

        @NotNull(message = "La cantidad es obligatoria")
        private Integer cantidad;

        private String observaciones;

        /** Sopa elegida (solo cuando platoId es un ALMUERZO) */
        private Long sopaSeleccionadaId;

        /** Segundo elegido (solo cuando platoId es un ALMUERZO) */
        private Long segundoSeleccionadoId;
    }
}
