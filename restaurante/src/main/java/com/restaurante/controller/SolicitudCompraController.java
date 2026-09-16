package com.restaurante.controller;

import com.restaurante.dto.request.AvanzarEstadoSolicitudCompraRequest;
import com.restaurante.dto.request.CrearSolicitudCompraRequest;
import com.restaurante.entity.SolicitudCompra;
import com.restaurante.enums.EstadoSolicitudCompra;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.service.SolicitudCompraService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/solicitudes-compra")
@RequiredArgsConstructor
@Tag(name = "Solicitudes de compra", description = "Flujo de aprobación de compras a proveedor: CREADA → EN_REVISION → APROBADA → EN_PROCESO → RECIBIDA, o RECHAZADA")
public class SolicitudCompraController {

    private static final String ROLES_OPERATIVOS =
            "hasAnyRole('JEFE_COCINA','ALMACENERO','ADMIN') or @perm.tiene(authentication, 'MOD_SOLICITUDES_COMPRA')";

    private final SolicitudCompraService solicitudCompraService;
    private final SucursalAccessService sucursalAccessService;

    @PostMapping
    @PreAuthorize(ROLES_OPERATIVOS)
    @Operation(summary = "Crear una solicitud de compra (queda en estado CREADA)")
    public ResponseEntity<SolicitudCompra> crear(@Valid @RequestBody CrearSolicitudCompraRequest request,
                                                   @RequestParam(required = false) Long sucursalId,
                                                   @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(solicitudCompraService.crear(request, efectiva, user.getId()));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize(ROLES_OPERATIVOS)
    @Operation(summary = "Avanza el estado de la solicitud. Decidir EN_REVISION→APROBADA o EN_REVISION/CREADA→RECHAZADA "
            + "requiere ADMIN; los pasos operativos (CREADA→EN_REVISION, APROBADA→EN_PROCESO→RECIBIDA) los puede avanzar "
            + "también JEFE_COCINA/ALMACENERO")
    public ResponseEntity<SolicitudCompra> avanzarEstado(@PathVariable Long id,
                                                            @Valid @RequestBody AvanzarEstadoSolicitudCompraRequest request,
                                                            @AuthenticationPrincipal UserDetailsImpl user) {
        SolicitudCompra actual = solicitudCompraService.obtenerPorId(id);
        sucursalAccessService.verificarPertenece(user, actual.getSucursal() != null ? actual.getSucursal().getId() : null);

        boolean esDecisionDeAprobacion = request.getEstado() == EstadoSolicitudCompra.APROBADA
                || (request.getEstado() == EstadoSolicitudCompra.RECHAZADA
                    && actual.getEstado() == EstadoSolicitudCompra.EN_REVISION);
        if (esDecisionDeAprobacion && !"ROLE_ADMIN".equals(user.getRolNombre())) {
            throw new AccessDeniedException("Solo ADMIN puede aprobar o rechazar una solicitud en revisión.");
        }

        return ResponseEntity.ok(solicitudCompraService.avanzarEstado(id, request.getEstado(), request, user.getId()));
    }

    @GetMapping("/pendientes")
    @PreAuthorize(ROLES_OPERATIVOS)
    @Operation(summary = "Listar solicitudes de compra pendientes (no RECIBIDA ni RECHAZADA), filtradas por sucursal")
    public ResponseEntity<List<SolicitudCompra>> pendientes(@RequestParam(required = false) Long sucursalId,
                                                               @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(solicitudCompraService.listarPendientes(efectiva));
    }

    @GetMapping("/mias")
    @PreAuthorize(ROLES_OPERATIVOS)
    @Operation(summary = "Listar mis solicitudes de compra (cualquier estado)")
    public ResponseEntity<List<SolicitudCompra>> mias(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(solicitudCompraService.listarMias(user.getId()));
    }

    @GetMapping("/{id}")
    @PreAuthorize(ROLES_OPERATIVOS)
    @Operation(summary = "Obtener una solicitud de compra por id")
    public ResponseEntity<SolicitudCompra> obtenerPorId(@PathVariable Long id,
                                                           @AuthenticationPrincipal UserDetailsImpl user) {
        SolicitudCompra solicitud = solicitudCompraService.obtenerPorId(id);
        sucursalAccessService.verificarPertenece(user, solicitud.getSucursal() != null ? solicitud.getSucursal().getId() : null);
        return ResponseEntity.ok(solicitud);
    }
}
