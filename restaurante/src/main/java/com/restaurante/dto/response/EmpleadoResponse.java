package com.restaurante.dto.response;

import com.restaurante.enums.EstadoEmpleado;
import com.restaurante.enums.TurnoEmpleado;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class EmpleadoResponse {
    private Long id;
    private String nombre;
    private String apellido;
    private String nombreCompleto;
    private String ci;
    private String telefono;
    private String correo;
    private String cargo;
    private TurnoEmpleado turno;
    private LocalDate fechaIngreso;
    private EstadoEmpleado estado;
    private Long sucursalId;
    private String sucursalNombre;
    private Long usuarioId;
    private String username;
    private String rolNombre;
    private LocalDateTime creadoEn;
    private LocalDateTime actualizadoEn;
}