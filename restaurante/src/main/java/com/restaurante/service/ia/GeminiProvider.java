package com.restaurante.service.ia;

import com.restaurante.exception.NegocioException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class GeminiProvider implements SugerenciaIaProvider {

    private static final String URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=";

    @Value("${app.ai.gemini.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;

    @Override
    public String codigo() { return "GEMINI"; }

    @Override
    public boolean disponible() { return apiKey != null && !apiKey.isBlank(); }

    @Override
    @SuppressWarnings("unchecked")
    public String sugerir(String prompt) {
        if (!disponible()) {
            throw new NegocioException("El proveedor Gemini no está configurado (falta app.ai.gemini.key).");
        }

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of("temperature", 0.7, "maxOutputTokens", 1024)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            Map<String, Object> respuesta = restTemplate.postForObject(
                    URL + apiKey, new HttpEntity<>(body, headers), Map.class);
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) respuesta.get("candidates");
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            return (String) parts.get(0).get("text");
        } catch (Exception e) {
            throw new NegocioException("Error al consultar Gemini: " + e.getMessage());
        }
    }
}
