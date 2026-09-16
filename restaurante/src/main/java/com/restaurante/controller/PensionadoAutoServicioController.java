package com.restaurante.controller;

import com.restaurante.dto.response.PensionadoPublicoResponse;
import com.restaurante.entity.AsistenciaPensionado;
import com.restaurante.service.PensionadoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Autoservicio QR del pensionado — SIN autenticación, acceso por posesión del
 * {@code qrToken} fijo asignado al pensionado (ver Pensionado.qrToken /
 * PensionadoServiceImpl.obtenerOGenerarQrToken). Ruta pública declarada en
 * SecurityConfig.PUBLIC_URLS ("/pensionados-publico/**").
 *
 * Alcance deliberadamente mínimo: solo lectura de su propia info (sin datos
 * sensibles como cédula/teléfono/correo) y marcar su propia asistencia de hoy.
 * Nada de pagos, bajas, ni edición — eso sigue exclusivo del staff autenticado
 * en {@link PensionadoController}. La regla de negocio (asistencia única por
 * día, etc.) vive en PensionadoService/registrarAsistencia; este controller es
 * solo una fachada pública sobre él.
 */
@RestController
@RequestMapping("/pensionados-publico")
@RequiredArgsConstructor
@Tag(name = "Pensionados - Autoservicio QR", description = "Consulta y asistencia sin login, por token QR")
public class PensionadoAutoServicioController {

    private final PensionadoService pensionadoService;

    @GetMapping("/{qrToken}")
    @Operation(summary = "Info de solo-consulta del pensionado dueño del token")
    public ResponseEntity<PensionadoPublicoResponse> obtener(@PathVariable String qrToken) {
        return ResponseEntity.ok(pensionadoService.obtenerPublicoPorQrToken(qrToken));
    }

    @PostMapping("/{qrToken}/asistencia")
    @Operation(summary = "Marca la asistencia de HOY del pensionado dueño del token")
    public ResponseEntity<AsistenciaPensionado> marcarAsistencia(@PathVariable String qrToken) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pensionadoService.registrarAsistenciaPorQrToken(qrToken));
    }
}
