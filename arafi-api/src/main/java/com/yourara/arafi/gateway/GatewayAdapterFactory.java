package com.yourara.arafi.gateway;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.List;

/**
 * Spring-managed registry for all {@link GatewayAdapter} implementations.
 *
 * <p>Collects every adapter bean from the application context and provides
 * named lookup. The {@link GatewayRoutingEngine} uses this factory to resolve
 * adapters by name (e.g., {@code "FLUTTERWAVE"}, {@code "ALATPAY"}).
 *
 * <p>Adding a new gateway adapter is zero-configuration: just implement
 * {@link GatewayAdapter}, annotate with {@code @Component}, and it will
 * automatically be registered here.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GatewayAdapterFactory {

    private final List<GatewayAdapter> adapters;

    private Map<String, GatewayAdapter> adapterMap;

    @PostConstruct
    public void init() {
        adapterMap = adapters.stream()
                .collect(Collectors.toMap(
                        adapter -> adapter.getGatewayName().toUpperCase(),
                        Function.identity()
                ));
        log.info("[GatewayAdapterFactory] Registered {} gateway adapters: {}",
                adapterMap.size(), adapterMap.keySet());
    }

    /**
     * Returns the adapter for the given gateway name.
     *
     * @param gatewayName e.g. {@code "FLUTTERWAVE"}, {@code "ALATPAY"}, {@code "PAYSTACK"}, {@code "NOMBA"}
     * @return the matching adapter
     * @throws IllegalArgumentException if no adapter is registered for the given name
     */
    public GatewayAdapter getAdapter(String gatewayName) {
        if (gatewayName == null) {
            throw new IllegalArgumentException("Gateway name must not be null.");
        }
        GatewayAdapter adapter = adapterMap.get(gatewayName.toUpperCase());
        if (adapter == null) {
            throw new IllegalArgumentException(
                    "No GatewayAdapter registered for gateway: '" + gatewayName + "'. " +
                    "Available: " + adapterMap.keySet());
        }
        return adapter;
    }

    /**
     * Returns all registered gateway adapters.
     * Useful for health monitoring and diagnostics.
     */
    public Map<String, GatewayAdapter> getAllAdapters() {
        return Map.copyOf(adapterMap);
    }
}
