package com.restaurante.controller;

import com.restaurante.dto.request.CobroMensualRequest;
import com.restaurante.dto.request.PensionadoRequest;
import com.restaurante.entity.AsistenciaPensionado;
import com.restaurante.entity.CobroMensual;
import com.restaurante.entity.Pensionado;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.service.PensionadoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/pensionados")
@RequiredArgsConstructor
@Tag(name = "Pensionados", description = "Registro, asistencia, cobros mensuales y bajas")
public class PensionadoController {

    private final PensionadoService pensionadoService;
    private final SucursalAccessService sucursalAccessService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','CAJERO','VENDEDOR') or @perm.tiene(authentication, 'MOD_PENSIONADOS')")
    @Operation(summary = "Registrar pensionado — crea usuario automáticamente")
    public ResponseEntity<Pensionado> registrar(@Valid @RequestBody PensionadoRequest request,
                                                 @AuthenticationPrincipal UserDetailsImpl user) {
        request.setSucursalId(sucursalAccessService.resolver(user, request.getSucursalId()));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pensionadoService.registrar(request));
    }

    private static final String ROLES_PENSIONADOS =
            "hasAnyRole('ADMIN','CAJERO','VENDEDOR') or @perm.tiene(authentication, 'MOD_PENSIONADOS')";

    @GetMapping("/{id}")
    @PreAuthorize(ROLES_PENSIONADOS)
    public ResponseEntity<Pensionado> obtener(@PathVariable Long id,
                                               @AuthenticationPrincipal UserDetailsImpl user) {
        Pensionado pensionado = pensionadoService.obtenerPorId(id);
        if (pensionado.getSucursal() != null) {
            sucursalAccessService.verificarPertenece(user, pensionado.getSucursal().getId());
        }
        return ResponseEntity.ok(pensionado);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','CAJERO','VENDEDOR') or @perm.tiene(authentication, 'MOD_PENSIONADOS')")
    public ResponseEntity<List<Pensionado>> listar(@RequestParam(required = false) Long sucursalId,
                                                     @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(pensionadoService.listarActivos(efectiva));
    }

    @PatchMapping("/{id}/baja")
    @PreAuthorize("hasAnyRole('ADMIN','CAJERO') or @perm.tiene(authentication, 'MOD_PENSIONADOS')")
    @Operation(summary = "Registrar baja voluntaria del pensionado")
    public ResponseEntity<Void> baja(@PathVariable Long id) {
        pensionadoService.bajaVoluntaria(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reactivar")
    @PreAuthorize("hasAnyRole('ADMIN','CAJERO') or @perm.tiene(authentication, 'MOD_PENSIONADOS')")
    public ResponseEntity<Void> reactivar(@PathVariable Long id) {
        pensionadoService.reactivar(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Asistencia ────────────────────────────────────────────────

    @PostMapping("/{id}/asistencia")
    @PreAuthorize(ROLES_PENSIONADOS)
    @Operation(summary = "Marcar asistencia del pensionado para una fecha")
    public ResponseEntity<AsistenciaPensionado> registrarAsistencia(
            @PathVariable Long id,
            @RequestParam(required = false) LocalDate fecha,
            @AuthenticationPrincipal UserDetailsImpl user) {
        LocalDate fechaReal = fecha != null ? fecha : LocalDate.now();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pensionadoService.registrarAsistencia(id, fechaReal, user.getId()));
    }

    @GetMapping("/{id}/asistencia")
    @PreAuthorize(ROLES_PENSIONADOS)
    public ResponseEntity<List<AsistenciaPensionado>> listarAsistencias(@PathVariable Long id) {
        return ResponseEntity.ok(pensionadoService.listarAsistencias(id));
    }

    // ─── Cobros ────────────────────────────────────────────────────

    @PostMapping("/{id}/cobro/generar")
    @PreAuthorize("hasAnyRole('ADMIN','CAJERO') or @perm.tiene(authentication, 'MOD_COBROS')")
    @Operation(summary = "Generar cobro mensual para un pensionado (incluye saldo anterior)")
    public ResponseEntity<CobroMensual> generarCobro(
            @PathVariable Long id,
            @RequestParam int mes,
            @RequestParam int anio) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pensionadoService.generarCobroMensual(id, mes, anio));
    }

    @PostMapping("/cobro/pagar")
    @PreAuthorize("hasAnyRole('ADMIN','CAJERO') or @perm.tiene(authentication, 'MOD_COBROS')")
    @Operation(summary = "Registrar pago de cobro mensual")
    public ResponseEntity<CobroMensual> registrarPago(
            @Valid @RequestBody CobroMensualRequest request,
            @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(pensionadoService.registrarPago(request, user.getId()));
    }

    @GetMapping("/{id}/cobros")
    @PreAuthorize(ROLES_PENSIONADOS)
    public ResponseEntity<List<CobroMensual>> listarCobros(@PathVariable Long id) {
        return ResponseEntity.ok(pensionadoService.listarCobros(id));
    }

    @GetMapping("/cobros/pendientes")
    @PreAuthorize("hasAnyRole('ADMIN','CAJERO') or @perm.tiene(authentication, 'MOD_COBROS')")
    public ResponseEntity<List<CobroMensual>> cobrosPendientes() {
        return ResponseEntity.ok(pensionadoService.listarCobrosPendientes());
    }

    @GetMapping("/cobros/por-mes")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE_SUCURSAL','CAJERO') or @perm.tiene(authentication, 'MOD_COBROS')")
    @Operation(summary = "Listar todos los cobros de un mes/año (para reportes)")
    public ResponseEntity<List<CobroMensual>> cobrosPorMes(
            @RequestParam int mes,
            @RequestParam int anio) {
        return ResponseEntity.ok(pensionadoService.listarCobrosPorMes(mes, anio));
    }
}
