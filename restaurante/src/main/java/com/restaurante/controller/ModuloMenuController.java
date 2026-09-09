package com.restaurante.controller;

import com.restaurante.entity.ModuloMenu;
import com.restaurante.repository.ModuloMenuRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/modulos")
@RequiredArgsConstructor
@Tag(name = "Módulos/Menús", description = "Catálogo de pantallas del sistema (menús)")
public class ModuloMenuController {

    private final ModuloMenuRepository moduloMenuRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_MODULOS')")
    @Operation(summary = "Listar todos los módulos activos del sistema")
    public ResponseEntity<List<ModuloMenu>> listarTodos() {
        return ResponseEntity.ok(moduloMenuRepository.findByActivoTrueOrderByOrdenAsc());
    }

    @GetMapping("/gestion")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_MODULOS')")
    @Operation(summary = "Listar todos los módulos del sistema (activos e inactivos)")
    public ResponseEntity<List<ModuloMenu>> listarGestion() {
        return ResponseEntity.ok(moduloMenuRepository.findAll());
    }

    @GetMapping("/sistema/{sistema}")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_MODULOS')")
    @Operation(summary = "Listar módulos por sistema: COCINA o VENTAS")
    public ResponseEntity<List<ModuloMenu>> listarPorSistema(@PathVariable String sistema) {
        return ResponseEntity.ok(
                moduloMenuRepository.findBySistemaAndActivoTrueOrderByOrdenAsc(
                        sistema.toUpperCase()));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_MODULOS')")
    @Operation(summary = "Crear nuevo módulo o menú")
    public ResponseEntity<ModuloMenu> crear(@RequestBody ModuloMenu modulo) {
        if (moduloMenuRepository.findByCodigo(modulo.getCodigo()).isPresent()) {
            throw new com.restaurante.exception.DuplicadoException("Ya existe un módulo con el código: " + modulo.getCodigo());
        }
        modulo.setActivo(true);
        if (modulo.getPadre() != null && modulo.getPadre().getId() != null) {
            ModuloMenu padre = moduloMenuRepository.findById(modulo.getPadre().getId())
                    .orElseThrow(() -> new com.restaurante.exception.RecursoNoEncontradoException("Módulo padre", modulo.getPadre().getId()));
            modulo.setPadre(padre);
        } else {
            modulo.setPadre(null);
        }
        return ResponseEntity.ok(moduloMenuRepository.save(modulo));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_MODULOS')")
    @Operation(summary = "Actualizar módulo o menú existente")
    public ResponseEntity<ModuloMenu> actualizar(@PathVariable Long id, @RequestBody ModuloMenu request) {
        ModuloMenu mod = moduloMenuRepository.findById(id)
                .orElseThrow(() -> new com.restaurante.exception.RecursoNoEncontradoException("Módulo", id));

        if (!mod.getCodigo().equals(request.getCodigo()) && moduloMenuRepository.findByCodigo(request.getCodigo()).isPresent()) {
            throw new com.restaurante.exception.DuplicadoException("Ya existe un módulo con el código: " + request.getCodigo());
        }

        mod.setCodigo(request.getCodigo());
        mod.setNombre(request.getNombre());
        mod.setIcono(request.getIcono());
        mod.setRuta(request.getRuta());
        mod.setOrden(request.getOrden());
        mod.setSistema(request.getSistema() != null ? request.getSistema().toUpperCase() : null);
        if (request.getActivo() != null) {
            mod.setActivo(request.getActivo());
        }

        if (request.getPadre() != null && request.getPadre().getId() != null) {
            if (request.getPadre().getId().equals(id)) {
                throw new com.restaurante.exception.NegocioException("Un módulo no puede ser su propio padre");
            }
            ModuloMenu padre = moduloMenuRepository.findById(request.getPadre().getId())
                    .orElseThrow(() -> new com.restaurante.exception.RecursoNoEncontradoException("Módulo padre", request.getPadre().getId()));
            mod.setPadre(padre);
        } else {
            mod.setPadre(null);
        }

        return ResponseEntity.ok(moduloMenuRepository.save(mod));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_MODULOS')")
    @Operation(summary = "Desactivar módulo o menú (borrado lógico)")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        ModuloMenu mod = moduloMenuRepository.findById(id)
                .orElseThrow(() -> new com.restaurante.exception.RecursoNoEncontradoException("Módulo", id));
        mod.setActivo(false);
        moduloMenuRepository.save(mod);
        return ResponseEntity.noContent().build();
    }
}
