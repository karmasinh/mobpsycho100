package com.restaurante.controller;

import com.restaurante.entity.Sucursal;
import com.restaurante.exception.DuplicadoException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.SucursalRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/sucursales")
@RequiredArgsConstructor
@Tag(name = "Sucursales", description = "Gestión de sucursales del restaurante")
public class SucursalController {

    private final SucursalRepository sucursalRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Listar sucursales activas")
    public ResponseEntity<List<Sucursal>> listar() {
        return ResponseEntity.ok(sucursalRepository.findByActivoTrue());
    }

    @GetMapping("/todas")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_SUCURSALES')")
    @Operation(summary = "Listar todas las sucursales (incluyendo inactivas)")
    public ResponseEntity<List<Sucursal>> listarTodas() {
        return ResponseEntity.ok(sucursalRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Sucursal> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(sucursalRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Sucursal", id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_SUCURSALES')")
    @Operation(summary = "Crear nueva sucursal")
    public ResponseEntity<Sucursal> crear(@RequestBody Map<String, String> body) {
        String nombre = body.get("nombre");
        if (nombre == null || nombre.isBlank())
            throw new com.restaurante.exception.NegocioException("El nombre es obligatorio");
        if (sucursalRepository.existsByNombre(nombre.trim()))
            throw new DuplicadoException("Ya existe una sucursal con el nombre: " + nombre);

        Sucursal s = Sucursal.builder()
                .nombre(nombre.trim())
                .direccion(body.getOrDefault("direccion", ""))
                .telefono(body.getOrDefault("telefono", ""))
                .activo(true)
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(sucursalRepository.save(s));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_SUCURSALES')")
    @Operation(summary = "Actualizar sucursal")
    public ResponseEntity<Sucursal> actualizar(@PathVariable Long id,
                                                @RequestBody Map<String, String> body) {
        Sucursal s = sucursalRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Sucursal", id));

        String nombre = body.get("nombre");
        if (nombre != null && !nombre.isBlank() && !nombre.trim().equals(s.getNombre())) {
            if (sucursalRepository.existsByNombre(nombre.trim()))
                throw new DuplicadoException("Ya existe una sucursal con el nombre: " + nombre);
            s.setNombre(nombre.trim());
        }
        if (body.containsKey("direccion")) s.setDireccion(body.get("direccion"));
        if (body.containsKey("telefono"))  s.setTelefono(body.get("telefono"));

        return ResponseEntity.ok(sucursalRepository.save(s));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_SUCURSALES')")
    @Operation(summary = "Desactivar sucursal (borrado lógico)")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        Sucursal s = sucursalRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Sucursal", id));
        s.setActivo(false);
        sucursalRepository.save(s);
        return ResponseEntity.noContent().build();
    }
}
