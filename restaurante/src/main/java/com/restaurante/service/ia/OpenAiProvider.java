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
public class OpenAiProvider implements SugerenciaIaProvider {

    private static final String URL = "https://api.openai.com/v1/chat/completions";
    private static final String MODELO = "gpt-4o-mini";

    @Value("${app.ai.openai.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;

    @Override
    public String codigo() { return "OPENAI"; }

    @Override
    public boolean disponible() { return apiKey != null && !apiKey.isBlank(); }

    @Override
    @SuppressWarnings("unchecked")
    public String sugerir(String prompt) {
        if (!disponible()) {
            throw new NegocioException("El proveedor ChatGPT no está configurado (falta app.ai.openai.key).");
        }

        Map<String, Object> body = Map.of(
                "model", MODELO,
                "max_tokens", 1024,
                "messages", List.of(Map.of("role", "user", "content", prompt))
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        try {
            Map<String, Object> respuesta = restTemplate.postForObject(
                    URL, new HttpEntity<>(body, headers), Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) respuesta.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            return (String) message.get("content");
        } catch (Exception e) {
            throw new NegocioException("Error al consultar ChatGPT: " + e.getMessage());
        }
    }
}
