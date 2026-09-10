package com.restaurante.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EmpresaRequest {

    @NotBlank(message = "El nombre de la empresa es obligatorio")
    private String nombre;

    private String nit;
    private String direccion;
    private String telefono;
    private String logoUrl;
}
