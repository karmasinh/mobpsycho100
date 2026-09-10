package com.restaurante.service;

import com.restaurante.entity.UnidadMedida;
import com.restaurante.repository.UnidadMedidaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Resuelve unidades de medida escritas en texto libre (ej. "Litro", "ml",
 * "Kg.") a un código canónico del catálogo {@link UnidadMedida} y convierte
 * cantidades entre unidades de la misma magnitud (masa, volumen, unidad).
 *
 * El campo `unidadMedida` de `Insumo`/`RecetaIngrediente` sigue siendo texto
 * libre por compatibilidad con datos ya cargados; esta clase es una utilidad
 * de mejor esfuerzo — si no reconoce el texto o las magnitudes no coinciden,
 * el llamador debe conservar el comportamiento anterior (sin convertir).
 */
@Component
@RequiredArgsConstructor
public class UnidadConversionService {

    private final UnidadMedidaRepository unidadMedidaRepository;

    private static final Pattern NO_ALFANUM = Pattern.compile("[^a-z0-9]");

    private static final Map<String, String> ALIAS = Map.ofEntries(
            Map.entry("kg", "kg"), Map.entry("kilo", "kg"), Map.entry("kilogramo", "kg"), Map.entry("kilogramos", "kg"),
            Map.entry("g", "g"), Map.entry("gr", "g"), Map.entry("gramo", "g"), Map.entry("gramos", "g"),
            Map.entry("mg", "mg"), Map.entry("miligramo", "mg"), Map.entry("miligramos", "mg"),
            Map.entry("l", "l"), Map.entry("lt", "l"), Map.entry("litro", "l"), Map.entry("litros", "l"),
            Map.entry("ml", "ml"), Map.entry("mililitro", "ml"), Map.entry("mililitros", "ml"),
            Map.entry("unidad", "unidad"), Map.entry("unidades", "unidad"), Map.entry("und", "unidad"),
            Map.entry("unid", "unidad"), Map.entry("pieza", "unidad"), Map.entry("piezas", "unidad"),
            Map.entry("docena", "docena"), Map.entry("docenas", "docena")
    );

    /** Normaliza texto libre ("Kg.", " litros ") al código canónico del catálogo, si se reconoce. */
    public Optional<String> normalizar(String textoLibre) {
        if (textoLibre == null) return Optional.empty();
        String base = Normalizer.normalize(textoLibre.trim().toLowerCase(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        base = NO_ALFANUM.matcher(base).replaceAll("");
        return Optional.ofNullable(ALIAS.get(base));
    }

    private Optional<UnidadMedida> resolver(String textoLibre) {
        return normalizar(textoLibre).flatMap(unidadMedidaRepository::findByCodigo);
    }

    /**
     * Convierte `cantidad` expresada en `unidadOrigenTexto` a su equivalente
     * en `unidadDestinoTexto`. Vacío si alguna unidad no se reconoce o si
     * pertenecen a magnitudes distintas (ej. masa vs. volumen).
     */
    public Optional<Double> convertir(double cantidad, String unidadOrigenTexto, String unidadDestinoTexto) {
        Optional<UnidadMedida> origen = resolver(unidadOrigenTexto);
        Optional<UnidadMedida> destino = resolver(unidadDestinoTexto);
        if (origen.isEmpty() || destino.isEmpty()) return Optional.empty();
        if (origen.get().getTipoMagnitud() != destino.get().getTipoMagnitud()) return Optional.empty();

        double enUnidadBase = cantidad * origen.get().getFactorABase();
        return Optional.of(enUnidadBase / destino.get().getFactorABase());
    }
}
