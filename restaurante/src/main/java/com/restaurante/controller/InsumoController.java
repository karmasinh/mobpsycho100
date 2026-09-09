package com.restaurante.controller;

import com.restaurante.dto.request.InsumoRequest;
import com.restaurante.dto.response.InsumoResponse;
import com.restaurante.service.InsumoService;
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
@RequestMapping("/insumos")
@RequiredArgsConstructor
@Tag(name = "Insumos", description = "Gestión de insumos de cocina y almacén")
public class InsumoController {

    private final InsumoService insumoService;

    @PostMapping
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ALMACENERO', 'ADMIN') or @perm.tiene(authentication, 'MOD_INSUMOS')")
    @Operation(summary = "Crear un nuevo insumo")
    public ResponseEntity<InsumoResponse> crear(@Valid @RequestBody InsumoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(insumoService.crear(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ALMACENERO', 'ADMIN') or @perm.tiene(authentication, 'MOD_INSUMOS')")
    @Operation(summary = "Actualizar un insumo existente")
    public ResponseEntity<InsumoResponse> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody InsumoRequest request) {
        return ResponseEntity.ok(insumoService.actualizar(id, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ALMACENERO', 'ADMIN') or @perm.tiene(authentication, 'MOD_INSUMOS')")
    @Operation(summary = "Obtener un insumo por su ID")
    public ResponseEntity<InsumoResponse> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(insumoService.obtenerPorId(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ALMACENERO', 'ADMIN') or @perm.tiene(authentication, 'MOD_INSUMOS')")
    @Operation(summary = "Listar todos los insumos activos")
    public ResponseEntity<List<InsumoResponse>> listarActivos() {
        return ResponseEntity.ok(insumoService.listarActivos());
    }

    @GetMapping("/todos")
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ALMACENERO', 'ADMIN') or @perm.tiene(authentication, 'MOD_INSUMOS')")
    @Operation(summary = "Listar todos los insumos (activos e inactivos)")
    public ResponseEntity<List<InsumoResponse>> listarTodos() {
        return ResponseEntity.ok(insumoService.listarTodos());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ALMACENERO', 'ADMIN') or @perm.tiene(authentication, 'MOD_INSUMOS')")
    @Operation(summary = "Desactivar un insumo (borrado lógico)")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        insumoService.desactivar(id);
        return ResponseEntity.noContent().build();
    }
}