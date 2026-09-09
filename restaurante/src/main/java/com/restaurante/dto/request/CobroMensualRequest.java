package com.restaurante.dto.request;

import com.restaurante.enums.FormaPago;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CobroMensualRequest {

    @NotNull
    private Long pensionadoId;

    @NotNull @Min(1) @Max(12)
    private Integer mes;

    @NotNull @Min(2020)
    private Integer anio;

    @NotNull
    private Double montoPagado;

    @NotNull
    private FormaPago formaPago;
}
