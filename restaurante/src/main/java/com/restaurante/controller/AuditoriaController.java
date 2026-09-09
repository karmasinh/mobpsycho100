package com.restaurante.controller;

import com.restaurante.entity.AuditoriaLog;
import com.restaurante.repository.AuditoriaLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/auditoria")
@RequiredArgsConstructor
@Tag(name = "Auditoría", description = "Registro inmutable de acciones del sistema")
public class AuditoriaController {

    private final AuditoriaLogRepository auditoriaLogRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_AUDITORIA') or @perm.tiene(authentication, 'MOD_AUDITORIA_COCINA')")
    @Operation(summary = "Listar todos los registros de auditoría")
    public ResponseEntity<List<AuditoriaLog>> listar() {
        return ResponseEntity.ok(auditoriaLogRepository.findAll());
    }

    @GetMapping("/entidad/{entidad}/{id}")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_AUDITORIA') or @perm.tiene(authentication, 'MOD_AUDITORIA_COCINA')")
    @Operation(summary = "Historial de una entidad específica")
    public ResponseEntity<List<AuditoriaLog>> porEntidad(@PathVariable String entidad,
                                                           @PathVariable Long id) {
        return ResponseEntity.ok(
                auditoriaLogRepository.findByEntidadAndEntidadIdOrderByCreadoEnDesc(entidad, id));
    }

    @GetMapping("/usuario/{username}")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_AUDITORIA') or @perm.tiene(authentication, 'MOD_AUDITORIA_COCINA')")
    @Operation(summary = "Historial de acciones de un usuario")
    public ResponseEntity<List<AuditoriaLog>> porUsuario(@PathVariable String username) {
        return ResponseEntity.ok(
                auditoriaLogRepository.findByUsernameOrderByCreadoEnDesc(username));
    }
}
