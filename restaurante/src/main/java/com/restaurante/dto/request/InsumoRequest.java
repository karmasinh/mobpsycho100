package com.restaurante.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class InsumoRequest {

    @NotBlank(message = "El código es obligatorio")
    @Size(max = 30, message = "El código no debe superar los 30 caracteres")
    private String codigo;

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 150, message = "El nombre no debe superar los 150 caracteres")
    private String nombre;

    @NotBlank(message = "La unidad de medida es obligatoria")
    @Size(max = 30, message = "La unidad de medida no debe superar los 30 caracteres")
    private String unidadMedida;

    private Double precioUnitario;

    private Boolean perecedero;

    private Long categoriaId;

    private Boolean activo;
}
