package com.restaurante.controller;

import com.restaurante.entity.CategoriaPlato;
import com.restaurante.repository.CategoriaPlatoRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/categorias-plato")
@RequiredArgsConstructor
@Tag(name = "Categorías de Plato")
public class CategoriaPlatoController {

    private final CategoriaPlatoRepository repository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Listar categorías de platos activas")
    public ResponseEntity<List<CategoriaPlato>> listar() {
        return ResponseEntity.ok(repository.findByActivoTrue());
    }

    @GetMapping("/todas")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Listar todas las categorías de platos")
    public ResponseEntity<List<CategoriaPlato>> listarTodas() {
        return ResponseEntity.ok(repository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_CATEGORIAS_PLATO')")
    @Operation(summary = "Crear nueva categoría de platos")
    public ResponseEntity<CategoriaPlato> crear(@RequestBody CategoriaPlato categoria) {
        if (repository.existsByNombre(categoria.getNombre())) {
            throw new com.restaurante.exception.DuplicadoException(
                    "Ya existe una categoría con el nombre: " + categoria.getNombre());
        }
        categoria.setActivo(true);
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(categoria));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_CATEGORIAS_PLATO')")
    @Operation(summary = "Actualizar categoría de platos")
    public ResponseEntity<CategoriaPlato> actualizar(@PathVariable Long id,
                                                      @RequestBody CategoriaPlato request) {
        CategoriaPlato cat = repository.findById(id)
                .orElseThrow(() -> new com.restaurante.exception.RecursoNoEncontradoException("Categoría plato", id));
        if (!cat.getNombre().equals(request.getNombre()) && repository.existsByNombre(request.getNombre())) {
            throw new com.restaurante.exception.DuplicadoException(
                    "Ya existe una categoría con el nombre: " + request.getNombre());
        }
        cat.setNombre(request.getNombre());
        cat.setDescripcion(request.getDescripcion());
        if (request.getActivo() != null) cat.setActivo(request.getActivo());
        return ResponseEntity.ok(repository.save(cat));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_CATEGORIAS_PLATO')")
    @Operation(summary = "Desactivar categoría de platos")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        CategoriaPlato cat = repository.findById(id)
                .orElseThrow(() -> new com.restaurante.exception.RecursoNoEncontradoException("Categoría plato", id));
        cat.setActivo(false);
        repository.save(cat);
        return ResponseEntity.noContent().build();
    }
}
