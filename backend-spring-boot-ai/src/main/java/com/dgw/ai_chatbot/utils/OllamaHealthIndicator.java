package com.dgw.ai_chatbot.utils;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class OllamaHealthIndicator implements HealthIndicator {

    private final RestClient restClient;

    @Value("${spring.ai.ollama.base-url}")
    private String ollamaBaseUrl;

    public OllamaHealthIndicator(RestClient.Builder builder) {
        this.restClient = builder.build();
    }

    @Override
    public Health health() {
        try {
            restClient.get().uri(ollamaBaseUrl).retrieve().toBodilessEntity();
            return Health.up()
                    .withDetail("url", ollamaBaseUrl)
                    .withDetail("message", "Ollama is running")
                    .build();
        } catch (Exception e) {
            return Health.down(e).withDetail("url", ollamaBaseUrl).build();
        }
    }
}