package com.restaurante.controller;

import com.restaurante.entity.Insumo;
import com.restaurante.entity.Plato;
import com.restaurante.entity.Receta;
import com.restaurante.entity.RecetaIngrediente;
import com.restaurante.exception.RecursoNoEncontradoException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.restaurante.repository.InsumoRepository;
import com.restaurante.repository.PlatoRepository;
import com.restaurante.dto.request.SugerenciaIaRequest;
import com.restaurante.repository.RecetaRepository;
import com.restaurante.service.UnidadConversionService;
import com.restaurante.service.ia.SugerenciaIaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/recetas")
@RequiredArgsConstructor
@Tag(name = "Recetas", description = "Gestión de recetas de platos con versionado")
@Transactional(readOnly = true)
public class RecetaController {

    private static final Logger log = LoggerFactory.getLogger(RecetaController.class);

    private final RecetaRepository recetaRepository;
    private final PlatoRepository platoRepository;
    private final InsumoRepository insumoRepository;
    private final UnidadConversionService unidadConversionService;
    private final SugerenciaIaService sugerenciaIaService;

    /** Lista todos los platos activos con el estado de su receta activa */
    @GetMapping
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ADMIN') or @perm.tiene(authentication, 'MOD_RECETAS')")
    @Operation(summary = "Listar platos con estado de receta activa")
    public ResponseEntity<List<Map<String, Object>>> listar() {
        List<Plato> platos = platoRepository.findByActivoTrue();
        List<Map<String, Object>> result = platos.stream().map(p -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("platoId", p.getId());
            item.put("platoNombre", p.getNombre());
            item.put("platoCodigo", p.getCodigo());
            item.put("platoTipo", p.getTipo());
            item.put("precioVenta", p.getPrecioVenta());
            item.put("costoEstimado", p.getCostoEstimado());
            item.put("margen", p.getMargenGanancia());
            recetaRepository.findByPlatoIdAndActivaTrue(p.getId()).ifPresentOrElse(
                r -> {
                    item.put("tieneReceta", true);
                    item.put("recetaId", r.getId());
                    item.put("version", r.getVersion());
                    item.put("costoTotal", r.getCostoTotal());
                    item.put("notas", r.getNotas());
                },
                () -> item.put("tieneReceta", false)
            );
            return item;
        }).toList();
        return ResponseEntity.ok(result);
    }

    /** Receta activa de un plato con todos sus ingredientes */
    @GetMapping("/plato/{platoId}/activa")
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ADMIN') or @perm.tiene(authentication, 'MOD_RECETAS')")
    @Operation(summary = "Obtener receta activa de un plato con ingredientes")
    public ResponseEntity<Map<String, Object>> getActivaPorPlato(@PathVariable Long platoId) {
        List<Receta> recetas = recetaRepository.findActivaConIngredientesByPlatoId(platoId);
        if (recetas.isEmpty()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(toMap(recetas.get(0)));
    }

    /** Historial de versiones de un plato con ingredientes */
    @GetMapping("/plato/{platoId}")
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ADMIN') or @perm.tiene(authentication, 'MOD_RECETAS')")
    @Operation(summary = "Historial de versiones de receta para un plato")
    public ResponseEntity<List<Map<String, Object>>> getVersionesPorPlato(@PathVariable Long platoId) {
        List<Receta> recetas = recetaRepository.findByPlatoIdConIngredientesOrderByVersionDesc(platoId);
        return ResponseEntity.ok(recetas.stream().map(this::toMap).toList());
    }

    /** Crea nueva versión de receta (la activa anterior queda como histórico) */
    @PostMapping("/plato/{platoId}")
    @Transactional
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ADMIN') or @perm.tiene(authentication, 'MOD_RECETAS')")
    @Operation(summary = "Crear nueva versión de receta para un plato")
    public ResponseEntity<Map<String, Object>> crear(
            @PathVariable Long platoId,
            @RequestBody Map<String, Object> body) {

        Plato plato = platoRepository.findById(platoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Plato", platoId));

        int nuevaVersion = recetaRepository.findTopByPlatoIdOrderByVersionDesc(platoId)
                .map(r -> r.getVersion() + 1)
                .orElse(1);

        recetaRepository.findByPlatoIdOrderByVersionDesc(platoId)
                .forEach(r -> { r.setActiva(false); recetaRepository.save(r); });

        Receta receta = Receta.builder()
                .plato(plato)
                .version(nuevaVersion)
                .activa(true)
                .notas((String) body.get("notas"))
                .costoTotal(0.0)
                .ingredientes(new ArrayList<>())
                .build();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> ingredientesBody =
                (List<Map<String, Object>>) body.getOrDefault("ingredientes", List.of());

        double costoTotal = 0.0;
        for (Map<String, Object> ing : ingredientesBody) {
            Long insumoId = ((Number) ing.get("insumoId")).longValue();
            double cantidad = ((Number) ing.get("cantidad")).doubleValue();
            Object unidadRaw = ing.getOrDefault("unidadMedida", "");
            String unidadMedida = unidadRaw == null ? "" : (String) unidadRaw;

            Insumo insumo = insumoRepository.findById(insumoId)
                    .orElseThrow(() -> new RecursoNoEncontradoException("Insumo", insumoId));

            String unidadFinal = unidadMedida.isBlank() ? insumo.getUnidadMedida() : unidadMedida;

            // El precio del insumo está fijado por su propia unidad; si el ingrediente
            // se registró en una unidad distinta (ej. insumo por litro, receta en ml),
            // se convierte antes de costear. Si no se reconocen ambas unidades o no son
            // de la misma magnitud, se conserva el comportamiento anterior (sin convertir)
            // pero se deja registrado en el log — un costo sin convertir puede ser incorrecto.
            var conversion = unidadConversionService.convertir(cantidad, unidadFinal, insumo.getUnidadMedida());
            if (conversion.isEmpty() && !unidadFinal.equalsIgnoreCase(insumo.getUnidadMedida())) {
                log.warn("No se pudo convertir '{}' a '{}' para el insumo {} — se costea sin convertir, revisar manualmente.",
                        unidadFinal, insumo.getUnidadMedida(), insumo.getId());
            }
            double cantidadEnUnidadInsumo = conversion.orElse(cantidad);

            double costoIngrediente = cantidadEnUnidadInsumo * insumo.getPrecioUnitario();
            costoTotal += costoIngrediente;

            receta.getIngredientes().add(RecetaIngrediente.builder()
                    .receta(receta)
                    .insumo(insumo)
                    .cantidad(cantidad)
                    .unidadMedida(unidadFinal)
                    .costoIngrediente(costoIngrediente)
                    .build());
        }

        receta.setCostoTotal(costoTotal);
        Receta saved = recetaRepository.save(receta);

        plato.setCostoEstimado(costoTotal);
        platoRepository.save(plato);

        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(saved));
    }

    /** Activa una versión específica (desactiva las demás) */
    @PutMapping("/{id}/activar")
    @Transactional
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ADMIN') or @perm.tiene(authentication, 'MOD_RECETAS')")
    @Operation(summary = "Activar versión de receta")
    public ResponseEntity<Map<String, Object>> activar(@PathVariable Long id) {
        List<Receta> encontrados = recetaRepository.findByIdConIngredientes(id);
        if (encontrados.isEmpty()) throw new RecursoNoEncontradoException("Receta", id);
        Receta target = encontrados.get(0);

        recetaRepository.findByPlatoIdOrderByVersionDesc(target.getPlato().getId())
                .forEach(r -> {
                    r.setActiva(r.getId().equals(id));
                    recetaRepository.save(r);
                });

        target.getPlato().setCostoEstimado(target.getCostoTotal());
        platoRepository.save(target.getPlato());

        return ResponseEntity.ok(toMap(target));
    }

    /** Proveedores de IA con clave configurada (para que el frontend sepa qué ofrecer). */
    @GetMapping("/sugerencia-ia/proveedores")
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ADMIN') or @perm.tiene(authentication, 'MOD_RECETAS')")
    public ResponseEntity<List<String>> proveedoresIa() {
        return ResponseEntity.ok(sugerenciaIaService.proveedoresDisponibles());
    }

    /** Pide una sugerencia de preparación a un proveedor de IA (Gemini/Claude/ChatGPT), sin exponer la clave al frontend. */
    @PostMapping("/sugerencia-ia")
    @PreAuthorize("hasAnyRole('COCINERO', 'JEFE_COCINA', 'ADMIN') or @perm.tiene(authentication, 'MOD_RECETAS')")
    @Operation(summary = "Sugerencia de preparación generada por IA (proveedor a elección)")
    public ResponseEntity<Map<String, String>> sugerenciaIa(@Valid @RequestBody SugerenciaIaRequest request) {
        String texto = sugerenciaIaService.sugerirReceta(request);
        return ResponseEntity.ok(Map.of("texto", texto));
    }

    // ── helper ─────────────────────────────────────────────────────────────────

    private Map<String, Object> toMap(Receta r) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", r.getId());
        map.put("platoId", r.getPlato().getId());
        map.put("platoNombre", r.getPlato().getNombre());
        map.put("platoCodigo", r.getPlato().getCodigo());
        map.put("platoTipo", r.getPlato().getTipo());
        map.put("precioVenta", r.getPlato().getPrecioVenta());
        map.put("version", r.getVersion());
        map.put("activa", r.getActiva());
        map.put("notas", r.getNotas());
        map.put("costoTotal", r.getCostoTotal());
        map.put("creadoEn", r.getCreadoEn());
        map.put("ingredientes", r.getIngredientes().stream().map(ing -> {
            Map<String, Object> ingMap = new LinkedHashMap<>();
            ingMap.put("id", ing.getId());
            ingMap.put("insumoId", ing.getInsumo().getId());
            ingMap.put("insumoNombre", ing.getInsumo().getNombre());
            ingMap.put("insumoUnidad", ing.getInsumo().getUnidadMedida());
            ingMap.put("precioUnitario", ing.getInsumo().getPrecioUnitario());
            ingMap.put("cantidad", ing.getCantidad());
            ingMap.put("unidadMedida", ing.getUnidadMedida());
            ingMap.put("costoIngrediente", ing.getCostoIngrediente());
            return ingMap;
        }).toList());
        return map;
    }
}
