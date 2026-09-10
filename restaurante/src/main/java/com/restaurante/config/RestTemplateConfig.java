package com.restaurante.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Bean compartido de {@link RestTemplate} para los proveedores de IA
 * ({@code GeminiProvider}, {@code ClaudeProvider}, {@code OpenAiProvider}),
 * que antes instanciaban cada uno el suyo (AUD-A-024).
 */
@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
