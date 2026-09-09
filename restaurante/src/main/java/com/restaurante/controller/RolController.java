package com.restaurante.controller;

import com.restaurante.dto.request.RolRequest;
import com.restaurante.entity.Rol;
import com.restaurante.service.RolService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/roles")
@RequiredArgsConstructor
@Tag(name = "Roles", description = "Roles dinámicos: crear, editar y asignar módulos/menús")
public class RolController {

    private final RolService rolService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_ROLES')")
    @Operation(summary = "Crear nuevo rol dinámico con sus módulos asignados")
    public ResponseEntity<Rol> crear(@Valid @RequestBody RolRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(rolService.crear(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_ROLES')")
    @Operation(summary = "Editar rol — nombre, descripción y lista completa de módulos")
    public ResponseEntity<Rol> actualizar(@PathVariable Long id,
                                           @Valid @RequestBody RolRequest request) {
        return ResponseEntity.ok(rolService.actualizar(id, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_ROLES')")
    public ResponseEntity<Rol> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(rolService.obtenerPorId(id));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_ROLES')")
    public ResponseEntity<List<Rol>> listar() {
        return ResponseEntity.ok(rolService.listarActivos());
    }

    @PostMapping("/{id}/modulos")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_ROLES')")
    @Operation(summary = "Agregar módulos al rol sin pisar los existentes")
    public ResponseEntity<Void> agregarModulos(@PathVariable Long id,
                                                @RequestBody Map<String, Set<Long>> body) {
        rolService.asignarModulos(id, body.get("moduloIds"));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/modulos")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_ROLES')")
    @Operation(summary = "Quitar módulos del rol")
    public ResponseEntity<Void> quitarModulos(@PathVariable Long id,
                                               @RequestBody Map<String, Set<Long>> body) {
        rolService.eliminarModulos(id, body.get("moduloIds"));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_ROLES')")
    @Operation(summary = "Desactivar rol (solo si no tiene usuarios asignados)")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        rolService.desactivar(id);
        return ResponseEntity.noContent().build();
    }
}
