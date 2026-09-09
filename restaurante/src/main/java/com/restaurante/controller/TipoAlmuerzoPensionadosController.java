package com.restaurante.controller;

import com.restaurante.entity.TipoAlmuerzo;
import com.restaurante.exception.DuplicadoException;
import com.restaurante.exception.NegocioException;
import com.restaurante.exception.RecursoNoEncontradoException;
import com.restaurante.repository.TipoAlmuerzoRepository;
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
@RequestMapping("/tipos-almuerzo")
@RequiredArgsConstructor
@Tag(name = "Tipos de Almuerzo", description = "Planes de almuerzo para pensionados")
public class TipoAlmuerzoPensionadosController {

    private final TipoAlmuerzoRepository tipoAlmuerzoRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Listar tipos de almuerzo activos")
    public ResponseEntity<List<TipoAlmuerzo>> listar() {
        return ResponseEntity.ok(tipoAlmuerzoRepository.findByActivoTrue());
    }

    @GetMapping("/todos")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_TIPOS_ALMUERZO')")
    @Operation(summary = "Listar todos los tipos de almuerzo (incluyendo inactivos)")
    public ResponseEntity<List<TipoAlmuerzo>> listarTodos() {
        return ResponseEntity.ok(tipoAlmuerzoRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TipoAlmuerzo> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(tipoAlmuerzoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("TipoAlmuerzo", id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_TIPOS_ALMUERZO')")
    @Operation(summary = "Crear nuevo tipo de almuerzo")
    public ResponseEntity<TipoAlmuerzo> crear(@RequestBody Map<String, Object> body) {
        String nombre = (String) body.get("nombre");
        if (nombre == null || nombre.isBlank()) {
            throw new NegocioException("El nombre es obligatorio.");
        }
        if (tipoAlmuerzoRepository.existsByNombre(nombre.trim())) {
            throw new DuplicadoException("Ya existe un tipo de almuerzo con nombre: " + nombre);
        }

        TipoAlmuerzo tipo = TipoAlmuerzo.builder()
                .nombre(nombre.trim())
                .precioMensual(parseDouble(body.get("precioMensual"), 0.0))
                .descripcion((String) body.get("descripcion"))
                .diasDisponibles((String) body.get("diasDisponibles"))
                .activo(true)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(tipoAlmuerzoRepository.save(tipo));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE_SUCURSAL') or @perm.tiene(authentication, 'MOD_TIPOS_ALMUERZO')")
    @Operation(summary = "Actualizar tipo de almuerzo")
    public ResponseEntity<TipoAlmuerzo> actualizar(@PathVariable Long id,
                                                    @RequestBody Map<String, Object> body) {
        TipoAlmuerzo tipo = tipoAlmuerzoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("TipoAlmuerzo", id));

        String nombre = (String) body.get("nombre");
        if (nombre == null || nombre.isBlank()) {
            throw new NegocioException("El nombre es obligatorio.");
        }
        if (!tipo.getNombre().equals(nombre.trim())
                && tipoAlmuerzoRepository.existsByNombre(nombre.trim())) {
            throw new DuplicadoException("Ya existe un tipo de almuerzo con nombre: " + nombre);
        }

        tipo.setNombre(nombre.trim());
        tipo.setPrecioMensual(parseDouble(body.get("precioMensual"), tipo.getPrecioMensual()));
        if (body.containsKey("descripcion")) tipo.setDescripcion((String) body.get("descripcion"));
        if (body.containsKey("diasDisponibles")) tipo.setDiasDisponibles((String) body.get("diasDisponibles"));

        return ResponseEntity.ok(tipoAlmuerzoRepository.save(tipo));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @perm.tiene(authentication, 'MOD_TIPOS_ALMUERZO')")
    @Operation(summary = "Desactivar tipo de almuerzo (soft delete)")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        TipoAlmuerzo tipo = tipoAlmuerzoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("TipoAlmuerzo", id));
        tipo.setActivo(false);
        tipoAlmuerzoRepository.save(tipo);
        return ResponseEntity.noContent().build();
    }

    private Double parseDouble(Object value, Double fallback) {
        if (value == null) return fallback;
        try { return Double.parseDouble(value.toString()); }
        catch (NumberFormatException e) { return fallback; }
    }
}
