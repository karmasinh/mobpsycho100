package com.restaurante.controller;

import com.restaurante.dto.request.CrearProduccionRequest;
import com.restaurante.entity.LineaProduccion;
import com.restaurante.entity.ProduccionDia;
import com.restaurante.enums.EstadoProduccion;
import com.restaurante.enums.TipoLineaProduccion;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import com.restaurante.service.ProduccionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/produccion")
@RequiredArgsConstructor
public class ProduccionController {

    private final ProduccionService produccionService;
    private final SucursalAccessService sucursalAccessService;

    @PostMapping
    @PreAuthorize("hasAnyRole('COCINERO','JEFE_COCINA','ADMIN') or @perm.tiene(authentication, 'MOD_PRODUCCION')")
    public ResponseEntity<ProduccionDia> crear(@Valid @RequestBody CrearProduccionRequest request,
                                                @AuthenticationPrincipal UserDetailsImpl user) {
        request.setSucursalId(sucursalAccessService.resolver(user, request.getSucursalId()));
        return ResponseEntity.status(HttpStatus.CREATED).body(produccionService.crear(request));
    }

    private static final String ROLES_PRODUCCION =
            "hasAnyRole('COCINERO','JEFE_COCINA','ADMIN') or @perm.tiene(authentication, 'MOD_PRODUCCION')";

    @GetMapping("/{id}")
    @PreAuthorize(ROLES_PRODUCCION)
    public ResponseEntity<ProduccionDia> obtener(@PathVariable Long id,
                                                  @AuthenticationPrincipal UserDetailsImpl user) {
        ProduccionDia produccion = produccionService.obtenerPorId(id);
        sucursalAccessService.verificarPertenece(user, produccion.getSucursal().getId());
        return ResponseEntity.ok(produccion);
    }

    @GetMapping("/hoy")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ProduccionDia> hoy(@RequestParam Long sucursalId,
                                              @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        ProduccionDia p = produccionService.obtenerHoy(efectiva);
        return p != null ? ResponseEntity.ok(p) : ResponseEntity.noContent().build();
    }

    @GetMapping("/sucursal/{sucursalId}")
    @PreAuthorize(ROLES_PRODUCCION)
    public ResponseEntity<List<ProduccionDia>> listar(@PathVariable Long sucursalId,
                                                        @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(produccionService.listarPorSucursal(efectiva));
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasAnyRole('COCINERO','JEFE_COCINA','ADMIN') or @perm.tiene(authentication, 'MOD_PRODUCCION')")
    public ResponseEntity<ProduccionDia> cambiarEstado(@PathVariable Long id,
                                                        @RequestParam EstadoProduccion nuevoEstado) {
        return ResponseEntity.ok(produccionService.cambiarEstado(id, nuevoEstado));
    }

    @PatchMapping("/lineas/{lineaId}/producida")
    @PreAuthorize("hasAnyRole('COCINERO','JEFE_COCINA','ADMIN') or @perm.tiene(authentication, 'MOD_PRODUCCION')")
    public ResponseEntity<LineaProduccion> actualizarProducida(@PathVariable Long lineaId,
                                                                @RequestParam Integer cantidad,
                                                                @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(produccionService.actualizarProducida(lineaId, cantidad, user.getId()));
    }

    /** Endpoint para caja: sopas o segundos disponibles hoy con stock */
    @GetMapping("/hoy/disponibles")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<LineaProduccion>> disponiblesHoy(@RequestParam Long sucursalId,
                                                                  @RequestParam TipoLineaProduccion tipo,
                                                                  @AuthenticationPrincipal UserDetailsImpl user) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        return ResponseEntity.ok(produccionService.disponiblesHoy(efectiva, tipo));
    }
}
