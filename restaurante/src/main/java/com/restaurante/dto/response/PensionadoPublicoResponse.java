package com.restaurante.dto.response;

import com.restaurante.enums.EstadoPensionado;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * Vista de solo-consulta para el autoservicio QR de un pensionado
 * (PensionadoAutoServicioController) — sin login, expone lo mínimo para que el
 * pensionado se reconozca. Deliberadamente NO incluye cedula/telefono/correo/id
 * interno ni nada operable por el resto del sistema.
 */
@Data
@Builder
public class PensionadoPublicoResponse {
    private String nombre;
    private String apellido;
    private String tipoAlmuerzo;
    private EstadoPensionado estado;
    private Double saldoPendiente;
    private List<AsistenciaResumen> ultimasAsistencias;

    @Data
    @Builder
    public static class AsistenciaResumen {
        private LocalDate fecha;
        private Boolean asistio;
    }
}
