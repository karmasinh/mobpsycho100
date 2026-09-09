package com.restaurante.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Set;

@Data
public class RolRequest {

    @NotBlank(message = "El nombre del rol es obligatorio")
    private String nombre;

    private String descripcion;

    /** IDs de los módulos/menús que tendrá este rol */
    private Set<Long> moduloIds;
}
