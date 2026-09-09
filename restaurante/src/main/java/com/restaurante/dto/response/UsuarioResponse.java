// dto/response/UsuarioResponse.java
package com.restaurante.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UsuarioResponse {
    private Long id;
    private String username;
    private Boolean activo;
    private Integer intentosFallidos;
    private LocalDateTime ultimoAcceso;
    private LocalDateTime bloqueadoEn;
    private Long rolId;
    private String rolNombre;
    private Long empleadoId;    // solo IDs, sin objetos anidados
    private Long clienteId;
    private Long pensionadoId;
    private LocalDateTime creadoEn;
    private LocalDateTime actualizadoEn;
}