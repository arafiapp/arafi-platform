package com.yourara.arafi.gateway;

import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Supplier;

/**
 * Arafi Circuit Breaker Registry — manages one Resilience4j {@link CircuitBreaker}
 * per payment gateway (in-memory, no database persistence).
 *
 * <h3>Design Decisions:</h3>
 * <ul>
 *   <li><strong>In-memory only:</strong> Circuit breaker state resets to CLOSED on restart.
 *       This is the safest default — after a restart, we try the gateway again and let
 *       real transactions teach the breaker. No DB write overhead on every gateway call.</li>
 *   <li><strong>Passive telemetry:</strong> We evaluate real transaction responses rather
 *       than sending wasteful pre-flight health-check pings to gateways.</li>
 *   <li><strong>2,500ms hard timeout:</strong> Any gateway call that takes longer than
 *       2,500ms is treated as a failure, protecting customer checkouts from hanging
 *       during network latency events.</li>
 *   <li><strong>Per-gateway isolation:</strong> A slow ALATPay does not trip the
 *       Flutterwave or Paystack breakers — each gateway has its own independent breaker.</li>
 * </ul>
 *
 * <h3>Circuit Breaker States:</h3>
 * <pre>
 *   CLOSED   → normal operation; failures are counted
 *   OPEN     → gateway bypassed; calls fail immediately with fallback
 *   HALF-OPEN → probe phase; limited calls allowed to test recovery
 * </pre>
 *
 * <h3>Configuration (from application.properties):</h3>
 * <ul>
 *   <li>Sliding window: 10 requests</li>
 *   <li>Failure rate threshold: 50% → OPEN</li>
 *   <li>Wait in OPEN state: 30 seconds</li>
 *   <li>Half-open probe calls: 3</li>
 *   <li>Timeout per call: 2,500ms</li>
 * </ul>
 */
@Slf4j
@Component
public class ArafiCircuitBreakerRegistry {

    // Hard timeout cap matching the product spec: 2,500ms per gateway call
    private static final Duration GATEWAY_TIMEOUT = Duration.ofMillis(2500);

    private final CircuitBreakerRegistry circuitBreakerRegistry;
    private final ExecutorService executor;

    // Per-gateway circuit breaker instances
    private final Map<String, CircuitBreaker> breakers = new ConcurrentHashMap<>();

    public ArafiCircuitBreakerRegistry() {
        CircuitBreakerConfig cbConfig = CircuitBreakerConfig.custom()
                .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.COUNT_BASED)
                .slidingWindowSize(10)
                .failureRateThreshold(50.0f)           // Open after 50% failures
                .waitDurationInOpenState(Duration.ofSeconds(30))
                .permittedNumberOfCallsInHalfOpenState(3)
                .automaticTransitionFromOpenToHalfOpenEnabled(true)
                // Treat timeout exceptions as failures
                .recordExceptions(Exception.class)
                .build();

        this.circuitBreakerRegistry = CircuitBreakerRegistry.of(cbConfig);

        // Virtual thread pool for async gateway calls (Java 21+)
        this.executor = Executors.newVirtualThreadPerTaskExecutor();
    }

    @PostConstruct
    public void init() {
        // Pre-create circuit breakers for all known gateways
        for (String gateway : new String[]{"FLUTTERWAVE", "ALATPAY", "PAYSTACK", "NOMBA"}) {
            CircuitBreaker breaker = circuitBreakerRegistry.circuitBreaker(gateway);
            breakers.put(gateway, breaker);

            // Register state-change listeners for observability
            breaker.getEventPublisher()
                    .onStateTransition(event -> log.warn(
                            "[CircuitBreaker] Gateway={} transitioned: {} → {}",
                            gateway,
                            event.getStateTransition().getFromState(),
                            event.getStateTransition().getToState()))
                    .onCallNotPermitted(event -> log.warn(
                            "[CircuitBreaker] Gateway={} call BLOCKED — circuit is OPEN",
                            gateway))
                    .onError(event -> log.debug(
                            "[CircuitBreaker] Gateway={} call failed: {}",
                            gateway, event.getThrowable().getMessage()));
        }
        log.info("[ArafiCircuitBreakerRegistry] Initialized breakers for: {}", breakers.keySet());
    }

    /**
     * Executes a gateway call with circuit breaker protection and 2,500ms timeout enforcement.
     *
     * <p>If the circuit breaker for the given gateway is OPEN, the supplier is not called
     * and a {@link CallNotPermittedException} is thrown immediately — the caller (routing engine)
     * should then try the next gateway in the fallback chain.
     *
     * <p>If the call takes longer than 2,500ms, it is cancelled and treated as a failure.
     *
     * @param gatewayName  the gateway identifier (e.g., "FLUTTERWAVE")
     * @param gatewayCall  the actual gateway operation to execute
     * @param <T>          the return type of the gateway call
     * @return the result of the gateway call
     * @throws CallNotPermittedException if the circuit is OPEN
     * @throws Exception if the call fails or times out
     */
    public <T> T execute(String gatewayName, Supplier<T> gatewayCall) throws Exception {
        CircuitBreaker breaker = getBreaker(gatewayName);

        // Use CircuitBreaker.decorateCheckedSupplier to wrap the timed call.
        // We manually enforce the 2,500ms timeout via Future.get(timeout) rather than
        // relying on the ambiguous TimeLimiter static API across Resilience4j versions.
        Supplier<T> protectedSupplier = CircuitBreaker.decorateSupplier(breaker, () -> {
            java.util.concurrent.Future<T> future = executor.submit(gatewayCall::get);
            try {
                return future.get(GATEWAY_TIMEOUT.toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS);
            } catch (java.util.concurrent.TimeoutException e) {
                future.cancel(true);
                throw new RuntimeException(
                        "Gateway " + gatewayName + " timed out after " +
                        GATEWAY_TIMEOUT.toMillis() + "ms", e);
            } catch (java.util.concurrent.ExecutionException e) {
                Throwable cause = e.getCause();
                if (cause instanceof RuntimeException) throw (RuntimeException) cause;
                throw new RuntimeException(cause);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Gateway call interrupted for: " + gatewayName, e);
            }
        });

        return protectedSupplier.get();
    }


    /**
     * Checks whether the circuit for a given gateway is currently OPEN (i.e., calls are blocked).
     * Used by the routing engine to skip a gateway before attempting a call.
     *
     * @param gatewayName the gateway to check
     * @return true if the circuit is OPEN or FORCED_OPEN (calls would be blocked)
     */
    public boolean isOpen(String gatewayName) {
        CircuitBreaker breaker = getBreaker(gatewayName);
        CircuitBreaker.State state = breaker.getState();
        return state == CircuitBreaker.State.OPEN || state == CircuitBreaker.State.FORCED_OPEN;
    }

    /**
     * Returns a snapshot of all circuit breaker states.
     * Useful for health endpoints and diagnostics.
     *
     * @return map of gateway name → circuit breaker state string
     */
    public Map<String, String> getCircuitStates() {
        Map<String, String> states = new ConcurrentHashMap<>();
        breakers.forEach((name, breaker) -> states.put(name, breaker.getState().name()));
        return states;
    }

    /**
     * Records a manual success event on a gateway's circuit breaker.
     * Call this when a gateway call succeeds outside of {@link #execute} (e.g., legacy code paths).
     */
    public void recordSuccess(String gatewayName) {
        getBreaker(gatewayName).onSuccess(0, java.util.concurrent.TimeUnit.MILLISECONDS);
    }

    /**
     * Records a manual failure event on a gateway's circuit breaker.
     * Call this when a gateway call fails outside of {@link #execute} (e.g., legacy code paths).
     */
    public void recordFailure(String gatewayName, Throwable throwable) {
        getBreaker(gatewayName).onError(0, java.util.concurrent.TimeUnit.MILLISECONDS, throwable);
    }

    private CircuitBreaker getBreaker(String gatewayName) {
        return breakers.computeIfAbsent(
                gatewayName.toUpperCase(),
                name -> {
                    log.info("[ArafiCircuitBreakerRegistry] Creating new breaker for gateway: {}", name);
                    return circuitBreakerRegistry.circuitBreaker(name);
                }
        );
    }
}
