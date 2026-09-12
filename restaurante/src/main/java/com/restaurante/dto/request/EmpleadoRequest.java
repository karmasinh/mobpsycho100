package com.restaurante.dto.request;

import com.restaurante.enums.TurnoEmpleado;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class EmpleadoRequest {

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    @NotBlank(message = "El apellido es obligatorio")
    private String apellido;

    @NotBlank(message = "La cédula es obligatoria")
    private String ci;

    private String telefono;
    private String correo;

    @NotBlank(message = "El cargo es obligatorio")
    private String cargo;

    @NotNull(message = "El turno es obligatorio")
    private TurnoEmpleado turno;

    @NotNull(message = "La fecha de ingreso es obligatoria")
    private LocalDate fechaIngreso;

    @NotNull(message = "La sucursal es obligatoria")
    private Long sucursalId;

    @NotNull(message = "El rol es obligatorio")
    private Long rolId;

    /**
     * Username personalizado. Si está vacío, se genera automáticamente
     * como nombre.apellido en minúsculas (ej: juan.perez).
     */
    private String usernamePersonalizado;

    /**
     * Solo obligatoria al crear (se usa para el Usuario nuevo del empleado) — no se
     * valida aquí con @NotBlank porque este mismo DTO se reutiliza para actualizar,
     * y actualizar() nunca toca la contraseña del usuario. Ver EmpleadoServiceImpl.crear().
     */
    private String passwordInicial;
}
