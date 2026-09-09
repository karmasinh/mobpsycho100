package com.restaurante.controller;

import com.restaurante.entity.CategoriaInsumo;
import com.restaurante.repository.CategoriaInsumoRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/categorias-insumo")
@RequiredArgsConstructor
@Tag(name = "Categorías de Insumo")
public class CategoriaInsumoController {
    private final CategoriaInsumoRepository repository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Listar todas las categorías de insumos activas")
    public ResponseEntity<List<CategoriaInsumo>> listar() {
        return ResponseEntity.ok(repository.findByActivoTrue());
    }

    @GetMapping("/todas")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Listar todas las categorías de insumos (activas e inactivas)")
    public ResponseEntity<List<CategoriaInsumo>> listarTodas() {
        return ResponseEntity.ok(repository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('JEFE_COCINA', 'ADMIN') or @perm.tiene(authentication, 'MOD_CATEGORIAS_INSUMO')")
    @Operation(summary = "Crear nueva categoría de insumos")
    public ResponseEntity<CategoriaInsumo> crear(@RequestBody CategoriaInsumo categoria) {
        if (repository.existsByNombre(categoria.getNombre())) {
            throw new com.restaurante.exception.DuplicadoException("Ya existe una categoría con el nombre: " + categoria.getNombre());
        }
        categoria.setActivo(true);
        return ResponseEntity.ok(repository.save(categoria));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('JEFE_COCINA', 'ADMIN') or @perm.tiene(authentication, 'MOD_CATEGORIAS_INSUMO')")
    @Operation(summary = "Actualizar categoría de insumos")
    public ResponseEntity<CategoriaInsumo> actualizar(@PathVariable Long id, @RequestBody CategoriaInsumo request) {
        CategoriaInsumo cat = repository.findById(id)
                .orElseThrow(() -> new com.restaurante.exception.RecursoNoEncontradoException("Categoría", id));
        if (!cat.getNombre().equals(request.getNombre()) && repository.existsByNombre(request.getNombre())) {
            throw new com.restaurante.exception.DuplicadoException("Ya existe una categoría con el nombre: " + request.getNombre());
        }
        cat.setNombre(request.getNombre());
        cat.setDescripcion(request.getDescripcion());
        if (request.getActivo() != null) {
            cat.setActivo(request.getActivo());
        }
        return ResponseEntity.ok(repository.save(cat));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('JEFE_COCINA', 'ADMIN') or @perm.tiene(authentication, 'MOD_CATEGORIAS_INSUMO')")
    @Operation(summary = "Desactivar categoría de insumos")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        CategoriaInsumo cat = repository.findById(id)
                .orElseThrow(() -> new com.restaurante.exception.RecursoNoEncontradoException("Categoría", id));
        cat.setActivo(false);
        repository.save(cat);
        return ResponseEntity.noContent().build();
    }
}
