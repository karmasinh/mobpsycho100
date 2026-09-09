package com.restaurante.dto.request;

import com.restaurante.enums.TipoLineaProduccion;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class CrearProduccionRequest {

    @NotNull(message = "La fecha es obligatoria")
    private LocalDate fecha;

    @NotNull(message = "La sucursal es obligatoria")
    private Long sucursalId;

    @NotEmpty(message = "Debe incluir al menos una línea de producción")
    private List<LineaRequest> lineas;

    @Data
    public static class LineaRequest {

        @NotNull(message = "El plato es obligatorio")
        private Long platoId;

        @NotNull(message = "El tipo es obligatorio")
        private TipoLineaProduccion tipo;

        @NotNull(message = "La cantidad planificada es obligatoria")
        private Integer cantidadPlanificada;
    }
}
