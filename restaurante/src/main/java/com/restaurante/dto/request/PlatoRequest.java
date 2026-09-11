package com.restaurante.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;

@Data
public class PlatoRequest {

    @NotBlank(message = "El código es obligatorio")
    @Size(max = 30, message = "El código no debe superar los 30 caracteres")
    private String codigo;

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 150, message = "El nombre no debe superar los 150 caracteres")
    private String nombre;

    @Size(max = 500, message = "La descripción no debe superar los 500 caracteres")
    private String descripcion;

    @NotNull(message = "El precio de venta es obligatorio")
    @Positive(message = "El precio de venta debe ser mayor que cero")
    private Double precioVenta;

    @PositiveOrZero(message = "El costo estimado no puede ser negativo")
    private Double costoEstimado;

    @Size(max = 40, message = "El tipo de plato no debe superar los 40 caracteres")
    private String tipo;

    private Boolean activo;

    private List<Long> categoriaIds;
}
