package com.restaurante.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class PensionadoRequest {

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    @NotBlank(message = "El apellido es obligatorio")
    private String apellido;

    @NotBlank(message = "La cédula es obligatoria")
    private String cedula;

    private String telefono;
    private String correo;

    @NotNull(message = "El tipo de almuerzo es obligatorio")
    private Long tipoAlmuerzoId;

    /**
     * Sucursal donde se inscribe el pensionado. Si el usuario autenticado tiene
     * sucursal fija, el controller la sobrescribe con la suya (ver
     * SucursalAccessService.resolver); solo ADMIN u operadores multi-sucursal
     * pueden elegir libremente este valor.
     */
    private Long sucursalId;

    @NotNull(message = "La fecha de inscripción es obligatoria")
    private LocalDate fechaInscripcion;

    /**
     * Username personalizado para el usuario del sistema.
     * Si está vacío se genera como nombre.apellido.
     */
    private String usernamePersonalizado;

    @NotBlank(message = "La contraseña inicial es obligatoria")
    private String passwordInicial;
}
