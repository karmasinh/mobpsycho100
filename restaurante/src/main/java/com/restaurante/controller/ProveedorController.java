package com.restaurante.controller;

import com.restaurante.entity.Proveedor;
import com.restaurante.service.ProveedorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/proveedores")
@RequiredArgsConstructor
@Tag(name = "Proveedores", description = "Gestión de proveedores de insumos")
public class ProveedorController {

    private final ProveedorService proveedorService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Listar proveedores activos")
    public ResponseEntity<List<Proveedor>> listar() {
        return ResponseEntity.ok(proveedorService.listarActivos());
    }

    @GetMapping("/todos")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_PROVEEDORES')")
    @Operation(summary = "Listar todos los proveedores (activos e inactivos)")
    public ResponseEntity<List<Proveedor>> listarTodos() {
        return ResponseEntity.ok(proveedorService.listarTodos());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Obtener proveedor por ID")
    public ResponseEntity<Proveedor> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(proveedorService.obtenerPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE_SUCURSAL', 'ALMACENERO') or @perm.tiene(authentication, 'MOD_PROVEEDORES')")
    @Operation(summary = "Registrar nuevo proveedor")
    public ResponseEntity<Proveedor> crear(@RequestBody Proveedor proveedor) {
        return ResponseEntity.status(HttpStatus.CREATED).body(proveedorService.crear(proveedor));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE_SUCURSAL', 'ALMACENERO') or @perm.tiene(authentication, 'MOD_PROVEEDORES')")
    @Operation(summary = "Actualizar proveedor")
    public ResponseEntity<Proveedor> actualizar(@PathVariable Long id, @RequestBody Proveedor proveedor) {
        return ResponseEntity.ok(proveedorService.actualizar(id, proveedor));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_PROVEEDORES')")
    @Operation(summary = "Desactivar proveedor")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        proveedorService.desactivar(id);
        return ResponseEntity.noContent().build();
    }
}
