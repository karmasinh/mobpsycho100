package com.restaurante.service.ia;

import com.restaurante.exception.NegocioException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class ClaudeProvider implements SugerenciaIaProvider {

    private static final String URL = "https://api.anthropic.com/v1/messages";
    private static final String MODELO = "claude-3-5-haiku-20241022";

    @Value("${app.ai.claude.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;

    @Override
    public String codigo() { return "CLAUDE"; }

    @Override
    public boolean disponible() { return apiKey != null && !apiKey.isBlank(); }

    @Override
    @SuppressWarnings("unchecked")
    public String sugerir(String prompt) {
        if (!disponible()) {
            throw new NegocioException("El proveedor Claude no está configurado (falta app.ai.claude.key).");
        }

        Map<String, Object> body = Map.of(
                "model", MODELO,
                "max_tokens", 1024,
                "messages", List.of(Map.of("role", "user", "content", prompt))
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", apiKey);
        headers.set("anthropic-version", "2023-06-01");

        try {
            Map<String, Object> respuesta = restTemplate.postForObject(
                    URL, new HttpEntity<>(body, headers), Map.class);
            List<Map<String, Object>> content = (List<Map<String, Object>>) respuesta.get("content");
            return (String) content.get(0).get("text");
        } catch (Exception e) {
            throw new NegocioException("Error al consultar Claude: " + e.getMessage());
        }
    }
}
