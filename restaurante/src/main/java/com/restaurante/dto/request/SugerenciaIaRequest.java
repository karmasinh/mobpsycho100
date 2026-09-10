package com.restaurante.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class SugerenciaIaRequest {

    @NotBlank(message = "El nombre del plato es obligatorio")
    private String platoNombre;

    @NotEmpty(message = "Debe incluir al menos un ingrediente")
    private List<Map<String, Object>> ingredientes;

    @NotNull(message = "El costo total es obligatorio")
    private Double costoTotal;

    @NotBlank(message = "Debe indicar el proveedor de IA (GEMINI, CLAUDE u OPENAI)")
    private String proveedor;
}
