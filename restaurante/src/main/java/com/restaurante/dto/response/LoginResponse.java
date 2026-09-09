package com.restaurante.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private String tipo;
    private Long usuarioId;
    private String username;
    private String rol;
    private String sistema;          // "COCINA" | "VENTAS" | "ADMIN"
    private Long sucursalId;         // null = usuario sin sucursal fija (admin/multi-sucursal)
    private String sucursalNombre;
    private List<ModuloMenuDto> modulos;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModuloMenuDto {
        private Long id;
        private String codigo;
        private String nombre;
        private String icono;
        private String ruta;
        private Integer orden;
        private Long padreId;
        private String sistema;
        private Boolean activo;
    }
}
