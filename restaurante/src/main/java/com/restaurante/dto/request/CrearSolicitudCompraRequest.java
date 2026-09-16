package com.restaurante.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CrearSolicitudCompraRequest {

    @NotNull(message = "El proveedor es obligatorio")
    private Long proveedorId;

    private Long sucursalId;

    @NotEmpty(message = "Debe incluir al menos un ítem en la solicitud")
    private List<ItemRequest> items;

    @Data
    public static class ItemRequest {

        @NotNull(message = "El insumo es obligatorio")
        private Long insumoId;

        @NotNull(message = "La cantidad solicitada es obligatoria")
        private Double cantidadSolicitada;

        private String observaciones;
    }
}
