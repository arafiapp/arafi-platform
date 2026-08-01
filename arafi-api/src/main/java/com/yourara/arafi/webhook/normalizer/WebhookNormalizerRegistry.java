package com.yourara.arafi.webhook.normalizer;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Spring-managed registry for all {@link WebhookNormalizer} implementations.
 * Maps normalizers by their gateway name (e.g. "FLUTTERWAVE", "ALATPAY").
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebhookNormalizerRegistry {

    private final List<WebhookNormalizer> normalizers;
    private Map<String, WebhookNormalizer> normalizerMap;

    @PostConstruct
    public void init() {
        normalizerMap = normalizers.stream()
                .collect(Collectors.toMap(
                        n -> n.getSupportedGateway().toUpperCase(),
                        Function.identity()
                ));
        log.info("[WebhookNormalizerRegistry] Registered webhook normalizers for: {}", normalizerMap.keySet());
    }

    /**
     * Resolves the normalizer for the specified gateway name.
     *
     * @param gateway target gateway name (case-insensitive)
     * @return the webhook normalizer
     * @throws IllegalArgumentException if no normalizer is registered for the gateway
     */
    public WebhookNormalizer getNormalizer(String gateway) {
        if (gateway == null) {
            throw new IllegalArgumentException("Gateway name must not be null");
        }
        WebhookNormalizer normalizer = normalizerMap.get(gateway.toUpperCase());
        if (normalizer == null) {
            throw new IllegalArgumentException("No WebhookNormalizer registered for gateway: " + gateway);
        }
        return normalizer;
    }
}
