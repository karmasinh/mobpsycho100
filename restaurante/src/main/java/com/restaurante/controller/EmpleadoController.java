package com.restaurante.controller;

import com.restaurante.dto.request.EmpleadoRequest;
import com.restaurante.dto.response.EmpleadoResponse;
import com.restaurante.service.EmpleadoService;
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

@RestController
@RequestMapping("/empleados")
@RequiredArgsConstructor
@Tag(name = "Empleados", description = "Gestión de empleados y sus usuarios del sistema")
public class EmpleadoController {

    private final EmpleadoService empleadoService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_EMPLEADOS')")
    @Operation(summary = "Registrar empleado — crea su usuario automáticamente")
    public ResponseEntity<EmpleadoResponse> crear(@Valid @RequestBody EmpleadoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(empleadoService.crear(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_EMPLEADOS')")
    @Operation(summary = "Actualizar datos del empleado y/o cambiar su rol")
    public ResponseEntity<EmpleadoResponse> actualizar(@PathVariable Long id,
                                                        @Valid @RequestBody EmpleadoRequest request) {
        return ResponseEntity.ok(empleadoService.actualizar(id, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_EMPLEADOS')")
    public ResponseEntity<EmpleadoResponse> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(empleadoService.obtenerPorId(id));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_EMPLEADOS')")
    public ResponseEntity<List<EmpleadoResponse>> listar() {
        return ResponseEntity.ok(empleadoService.listarActivos());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_EMPLEADOS')")
    @Operation(summary = "Desactivar empleado y su usuario")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        empleadoService.desactivar(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/usuarios/{usuarioId}/rol/{rolId}")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_USUARIOS')")
    @Operation(summary = "Asignar un rol dinámico a un usuario")
    public ResponseEntity<Void> asignarRol(@PathVariable Long usuarioId,
                                            @PathVariable Long rolId) {
        empleadoService.asignarRol(usuarioId, rolId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/usuarios/{usuarioId}/desbloquear")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_USUARIOS')")
    @Operation(summary = "Desbloquear usuario bloqueado por intentos fallidos")
    public ResponseEntity<Void> desbloquear(@PathVariable Long usuarioId) {
        empleadoService.desbloquearUsuario(usuarioId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/usuarios/{usuarioId}/password")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_USUARIOS')")
    @Operation(summary = "Cambiar contraseña de un usuario")
    public ResponseEntity<Void> cambiarPassword(@PathVariable Long usuarioId,
                                                 @RequestBody Map<String, String> body) {
        empleadoService.cambiarPassword(usuarioId, body.get("password"));
        return ResponseEntity.noContent().build();
    }
}