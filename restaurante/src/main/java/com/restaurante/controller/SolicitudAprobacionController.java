package com.restaurante.controller;

import com.restaurante.entity.SolicitudAprobacion;
import com.restaurante.enums.TipoSolicitud;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.service.SolicitudAprobacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/solicitudes-aprobacion")
@RequiredArgsConstructor
@Tag(name = "Solicitudes de aprobación", description = "Anulación de venta y reversión de movimiento de caja: no-ADMIN solicita, ADMIN aprueba o rechaza")
public class SolicitudAprobacionController {

    private static final String ROLES_SOLICITANTE =
            "hasAnyRole('CAJERO','VENDEDOR','GERENTE_SUCURSAL','ADMIN') or @perm.tiene(authentication, 'MOD_CAJA')";

    private final SolicitudAprobacionService solicitudService;
    private final SucursalAccessService sucursalAccessService;

    @PostMapping
    @PreAuthorize(ROLES_SOLICITANTE)
    @Operation(summary = "Solicitar anulación de venta o reversión de movimiento de caja")
    public ResponseEntity<SolicitudAprobacion> solicitar(@RequestBody Map<String, Object> body,
                                                           @AuthenticationPrincipal UserDetailsImpl user) {
        TipoSolicitud tipo = TipoSolicitud.valueOf((String) body.get("tipo"));
        Long entidadId = ((Number) body.get("entidadId")).longValue();
        String motivo = (String) body.get("motivo");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(solicitudService.solicitar(tipo, entidadId, motivo, user.getId()));
    }

    @PatchMapping("/{id}/aprobar")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Aprobar la solicitud — ejecuta la acción real (anular venta / revertir movimiento)")
    public ResponseEntity<SolicitudAprobacion> aprobar(@PathVariable Long id,
                                                         @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(solicitudService.aprobar(id, user.getId()));
    }

    @PatchMapping("/{id}/rechazar")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Rechazar la solicitud — no ejecuta ninguna acción")
    public ResponseEntity<SolicitudAprobacion> rechazar(@PathVariable Long id,
                                                          @RequestBody Map<String, String> body,
                                                          @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(solicitudService.rechazar(id, body.get("motivo"), user.getId()));
    }

    @GetMapping("/pendientes")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Listar solicitudes pendientes (filtradas por sucursal si el usuario tiene una fija)")
    public ResponseEntity<List<SolicitudAprobacion>> pendientes(@RequestParam(required = false) Long sucursalId,
                                                                  @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(solicitudService.listarPendientes(efectiva));
    }

    @GetMapping("/mias")
    @PreAuthorize(ROLES_SOLICITANTE)
    @Operation(summary = "Listar mis solicitudes (cualquier estado)")
    public ResponseEntity<List<SolicitudAprobacion>> mias(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(solicitudService.listarMias(user.getId()));
    }
}
