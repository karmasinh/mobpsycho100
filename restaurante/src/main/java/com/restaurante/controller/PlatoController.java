package com.restaurante.controller;

import com.restaurante.dto.request.PlatoRequest;
import com.restaurante.entity.Plato;
import com.restaurante.service.PlatoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/platos")
@RequiredArgsConstructor
@Tag(name = "Platos", description = "Gestión del menú de platos y refrescos")
public class PlatoController {

    private final PlatoService platoService;

    @PostMapping
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ADMIN') or @perm.tiene(authentication, 'MOD_PLATOS')")
    @Operation(summary = "Crear un nuevo plato en el menú")
    public ResponseEntity<Plato> crear(@Valid @RequestBody PlatoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(platoService.crear(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ADMIN') or @perm.tiene(authentication, 'MOD_PLATOS')")
    @Operation(summary = "Actualizar un plato existente")
    public ResponseEntity<Plato> actualizar(@PathVariable Long id, @Valid @RequestBody PlatoRequest request) {
        return ResponseEntity.ok(platoService.actualizar(id, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Obtener un plato por su ID")
    public ResponseEntity<Plato> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(platoService.obtenerPorId(id));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Listar todos los platos activos")
    public ResponseEntity<List<Plato>> listarActivos() {
        return ResponseEntity.ok(platoService.listarActivos());
    }

    @GetMapping("/todos")
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ADMIN') or @perm.tiene(authentication, 'MOD_PLATOS')")
    @Operation(summary = "Listar todos los platos (activos e inactivos)")
    public ResponseEntity<List<Plato>> listarTodos() {
        return ResponseEntity.ok(platoService.listarTodos());
    }

    @GetMapping("/tipo/{tipo}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Listar platos activos de un tipo específico")
    public ResponseEntity<List<Plato>> listarPorTipo(@PathVariable String tipo) {
        return ResponseEntity.ok(platoService.listarPorTipo(tipo));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ADMIN') or @perm.tiene(authentication, 'MOD_PLATOS')")
    @Operation(summary = "Desactivar un plato (borrado lógico)")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        platoService.desactivar(id);
        return ResponseEntity.noContent().build();
    }
}
