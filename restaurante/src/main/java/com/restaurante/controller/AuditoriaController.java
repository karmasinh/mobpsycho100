package com.restaurante.controller;

import com.restaurante.entity.AuditoriaLog;
import com.restaurante.repository.AuditoriaLogRepository;
import com.restaurante.security.SucursalAccessService;
import com.restaurante.security.UserDetailsImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/auditoria")
@RequiredArgsConstructor
@Tag(name = "Auditoría", description = "Registro inmutable de acciones del sistema")
public class AuditoriaController {

    private final AuditoriaLogRepository auditoriaLogRepository;
    private final SucursalAccessService sucursalAccessService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_AUDITORIA') or @perm.tiene(authentication, 'MOD_AUDITORIA_COCINA')")
    @Operation(summary = "Listar registros de auditoría (filtrados por sucursal si el usuario tiene una fija)")
    public ResponseEntity<List<AuditoriaLog>> listar(@RequestParam(required = false) Long sucursalId,
                                                       @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(filtrarPorSucursal(auditoriaLogRepository.findAll(), user, sucursalId));
    }

    @GetMapping("/entidad/{entidad}/{id}")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_AUDITORIA') or @perm.tiene(authentication, 'MOD_AUDITORIA_COCINA')")
    @Operation(summary = "Historial de una entidad específica (filtrado por sucursal si el usuario tiene una fija)")
    public ResponseEntity<List<AuditoriaLog>> porEntidad(@PathVariable String entidad,
                                                           @PathVariable Long id,
                                                           @RequestParam(required = false) Long sucursalId,
                                                           @AuthenticationPrincipal UserDetailsImpl user) {
        List<AuditoriaLog> logs = auditoriaLogRepository.findByEntidadAndEntidadIdOrderByCreadoEnDesc(entidad, id);
        return ResponseEntity.ok(filtrarPorSucursal(logs, user, sucursalId));
    }

    @GetMapping("/usuario/{username}")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_AUDITORIA') or @perm.tiene(authentication, 'MOD_AUDITORIA_COCINA')")
    @Operation(summary = "Historial de acciones de un usuario (filtrado por sucursal si el usuario tiene una fija)")
    public ResponseEntity<List<AuditoriaLog>> porUsuario(@PathVariable String username,
                                                          @RequestParam(required = false) Long sucursalId,
                                                          @AuthenticationPrincipal UserDetailsImpl user) {
        List<AuditoriaLog> logs = auditoriaLogRepository.findByUsernameOrderByCreadoEnDesc(username);
        return ResponseEntity.ok(filtrarPorSucursal(logs, user, sucursalId));
    }

    /**
     * Filtra por la sucursal efectiva del usuario (AUD-A-028/AUD-L-022): un evento sin
     * sucursal asociada (login, catálogos globales, etc.) siempre es visible; un usuario
     * sin sucursal fija (ADMIN/multi-sucursal) ve todo, igual que ya hace AlertaController.
     */
    private List<AuditoriaLog> filtrarPorSucursal(List<AuditoriaLog> logs, UserDetailsImpl user, Long sucursalId) {
        Long efectiva = sucursalAccessService.resolver(user, sucursalId);
        if (efectiva == null) return logs;
        return logs.stream()
                .filter(l -> l.getSucursal() == null || efectiva.equals(l.getSucursal().getId()))
                .toList();
    }
}
