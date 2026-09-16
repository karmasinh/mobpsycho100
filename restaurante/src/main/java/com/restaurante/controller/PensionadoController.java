package com.restaurante.controller;

import com.restaurante.dto.request.CobroMensualRequest;
import com.restaurante.dto.request.PensionadoRequest;
import com.restaurante.entity.AsistenciaPensionado;
import com.restaurante.entity.CicloPensionado;
import com.restaurante.entity.CobroMensual;
import com.restaurante.entity.Pensionado;
import com.restaurante.exception.RecursoNoEncontradoException;
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
import java.util.Map;

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
        Pensionado pensionado = verificarSucursalPensionado(id, user);
        return ResponseEntity.ok(pensionado);
    }

    /**
     * Confirma que el pensionado {@code id} pertenece a la sucursal efectiva del
     * usuario antes de operar sobre él por ID (AUD-A-037) — mismo patrón que
     * {@code ProduccionController}/{@code PedidoController}/{@code VentaController}.
     * Sin este chequeo, un usuario con sucursal fija podía adivinar/enumerar un ID
     * de pensionado de otra sucursal y marcar su asistencia, generarle un cobro o
     * darlo de baja, ya que el listado (que sí filtra) no es la única vía de acceso.
     */
    private Pensionado verificarSucursalPensionado(Long id, UserDetailsImpl user) {
        Pensionado pensionado = pensionadoService.obtenerPorId(id);
        if (pensionado.getSucursal() != null) {
            sucursalAccessService.verificarPertenece(user, pensionado.getSucursal().getId());
        }
        return pensionado;
    }

    @GetMapping("/{id}/qr")
    @PreAuthorize(ROLES_PENSIONADOS)
    @Operation(summary = "Obtener el token QR del pensionado (para que el frontend genere la imagen)")
    public ResponseEntity<java.util.Map<String, String>> obtenerQr(@PathVariable Long id,
                                                                     @AuthenticationPrincipal UserDetailsImpl user) {
        verificarSucursalPensionado(id, user);
        return ResponseEntity.ok(java.util.Map.of("qrToken", pensionadoService.obtenerOGenerarQrToken(id)));
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
    public ResponseEntity<Void> baja(@PathVariable Long id, @AuthenticationPrincipal UserDetailsImpl user) {
        verificarSucursalPensionado(id, user);
        pensionadoService.bajaVoluntaria(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reactivar")
    @PreAuthorize("hasAnyRole('ADMIN','CAJERO') or @perm.tiene(authentication, 'MOD_PENSIONADOS')")
    public ResponseEntity<Void> reactivar(@PathVariable Long id, @AuthenticationPrincipal UserDetailsImpl user) {
        verificarSucursalPensionado(id, user);
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
        verificarSucursalPensionado(id, user);
        LocalDate fechaReal = fecha != null ? fecha : LocalDate.now();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pensionadoService.registrarAsistencia(id, fechaReal, user.getId()));
    }

    @GetMapping("/{id}/asistencia")
    @PreAuthorize(ROLES_PENSIONADOS)
    public ResponseEntity<List<AsistenciaPensionado>> listarAsistencias(@PathVariable Long id,
                                                                         @AuthenticationPrincipal UserDetailsImpl user) {
        verificarSucursalPensionado(id, user);
        return ResponseEntity.ok(pensionadoService.listarAsistencias(id));
    }

    // ─── Cobros ────────────────────────────────────────────────────

    @PostMapping("/{id}/cobro/generar")
    @PreAuthorize("hasAnyRole('ADMIN','CAJERO') or @perm.tiene(authentication, 'MOD_COBROS')")
    @Operation(summary = "Generar cobro mensual para un pensionado (incluye saldo anterior)")
    public ResponseEntity<CobroMensual> generarCobro(
            @PathVariable Long id,
            @RequestParam int mes,
            @RequestParam int anio,
            @AuthenticationPrincipal UserDetailsImpl user) {
        verificarSucursalPensionado(id, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pensionadoService.generarCobroMensual(id, mes, anio));
    }

    @PostMapping("/cobro/pagar")
    @PreAuthorize("hasAnyRole('ADMIN','CAJERO') or @perm.tiene(authentication, 'MOD_COBROS')")
    @Operation(summary = "Registrar pago de cobro mensual")
    public ResponseEntity<CobroMensual> registrarPago(
            @Valid @RequestBody CobroMensualRequest request,
            @AuthenticationPrincipal UserDetailsImpl user) {
        verificarSucursalPensionado(request.getPensionadoId(), user);
        return ResponseEntity.ok(pensionadoService.registrarPago(request, user.getId()));
    }

    @GetMapping("/{id}/cobros")
    @PreAuthorize(ROLES_PENSIONADOS)
    public ResponseEntity<List<CobroMensual>> listarCobros(@PathVariable Long id,
                                                            @AuthenticationPrincipal UserDetailsImpl user) {
        verificarSucursalPensionado(id, user);
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

    // ─── Ciclo prepago de 26 días ────────────────────────────────────

    @PostMapping("/{id}/ciclo/renovar")
    @PreAuthorize("hasAnyRole('ADMIN','CAJERO') or @perm.tiene(authentication, 'MOD_COBROS')")
    @Operation(summary = "Renovar la pensión: cierra el ciclo activo (si existe) y abre uno nuevo de 26 días")
    public ResponseEntity<CicloPensionado> renovarCiclo(
            @PathVariable Long id,
            @RequestBody Map<String, Double> body,
            @AuthenticationPrincipal UserDetailsImpl user) {
        verificarSucursalPensionado(id, user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pensionadoService.renovarCiclo(id, body.get("montoPagado"), user.getId()));
    }

    @GetMapping("/{id}/ciclo")
    @PreAuthorize(ROLES_PENSIONADOS)
    @Operation(summary = "Consultar el ciclo prepago de 26 días activo del pensionado")
    public ResponseEntity<CicloPensionado> consultarCiclo(@PathVariable Long id,
                                                            @AuthenticationPrincipal UserDetailsImpl user) {
        verificarSucursalPensionado(id, user);
        return ResponseEntity.ok(pensionadoService.consultarCiclo(id)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Sin ciclo activo. Puede registrar una nueva pensión.")));
    }
}
