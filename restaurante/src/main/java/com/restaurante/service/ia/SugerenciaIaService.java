package com.restaurante.service.ia;

import com.restaurante.dto.request.SugerenciaIaRequest;
import com.restaurante.exception.NegocioException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Punto único de entrada para pedir una sugerencia de receta a un proveedor
 * de IA generativa. La clave de cada proveedor vive solo en el backend
 * (application.properties / variables de entorno) — nunca se expone en el
 * bundle del frontend.
 */
@Service
@RequiredArgsConstructor
public class SugerenciaIaService {

    private final List<SugerenciaIaProvider> providers;

    /** Códigos de proveedor con clave configurada, para que el frontend sepa qué ofrecer. */
    public List<String> proveedoresDisponibles() {
        return providers.stream().filter(SugerenciaIaProvider::disponible)
                .map(SugerenciaIaProvider::codigo).toList();
    }

    public String sugerirReceta(SugerenciaIaRequest request) {
        SugerenciaIaProvider provider = providers.stream()
                .filter(p -> p.codigo().equalsIgnoreCase(request.getProveedor()))
                .findFirst()
                .orElseThrow(() -> new NegocioException("Proveedor de IA desconocido: " + request.getProveedor()));

        return provider.sugerir(construirPrompt(request));
    }

    private String construirPrompt(SugerenciaIaRequest request) {
        StringBuilder ingredientes = new StringBuilder();
        for (Map<String, Object> ing : request.getIngredientes()) {
            ingredientes.append("- ").append(ing.getOrDefault("nombre", ""))
                    .append(": ").append(ing.getOrDefault("cantidad", ""))
                    .append(" ").append(ing.getOrDefault("unidad", "")).append("\n");
        }

        return """
                Actuá como un chef experto en cocina boliviana. Para el plato "%s", con estos ingredientes:
                %s
                Y un costo total estimado de Bs %.2f, generá:
                1) Preparación paso a paso
                2) Tiempo estimado de preparación
                3) Porciones que rinde
                4) Un consejo del chef
                """.formatted(request.getPlatoNombre(), ingredientes, request.getCostoTotal());
    }
}
