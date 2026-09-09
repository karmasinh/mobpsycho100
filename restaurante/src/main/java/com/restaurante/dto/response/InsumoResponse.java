package com.restaurante.dto.response;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

// InsumoResponse.java
@Data
@Builder
public class InsumoResponse {
    private Long id;
    private String codigo;
    private String nombre;
    private String unidadMedida;
    private Double precioUnitario;
    private Boolean perecedero;
    private Boolean activo;
    private Long categoriaId;       // solo el ID
    private String categoriaNombre; // o el nombre si lo necesitas
    private LocalDateTime creadoEn;
    private LocalDateTime actualizadoEn;
}