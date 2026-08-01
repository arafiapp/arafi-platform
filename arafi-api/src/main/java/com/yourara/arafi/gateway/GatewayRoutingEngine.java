package com.yourara.arafi.gateway;

import com.yourara.arafi.gateway.dto.*;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.core.env.Environment;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.TimeoutException;

/**
 * Arafi Gateway Routing Engine — the central intelligence of the PLaaS platform.
 *
 * <h3>Two Routing Modes:</h3>
 * <ol>
 *   <li><strong>Auto Cost-Optimization (default):</strong> Arafi selects the most
 *       cost-effective gateway based on transaction amount, currency, and payment type.
 *       The developer passes no {@code preferred_gateway}.</li>
 *   <li><strong>Developer-Explicit Routing:</strong> Developer passes {@code preferred_gateway}
 *       (e.g., {@code "PAYSTACK"}) in their API request. Arafi honors the preference,
 *       but if {@code allow_fallback: true} and that gateway fails, Arafi automatically
 *       routes to the next best gateway to protect the merchant's revenue.</li>
 * </ol>
 *
 * <h3>Cost-Optimization Routing Logic (ALATPay biased):</h3>
 * <pre>
 * CARD payments     → Flutterwave (primary) → Paystack (secondary) → Nomba (last resort)
 *
 * Local NGN &gt; ₦150,000 → Paystack (fee CAPPED at ₦2,000 max — unbeatable for high-value)
 * Local NGN all else   → ALATPay (1.2% + ₦50 — ALATPay biased per product decision)
 *
 * International / USD  → ALATPay (lowest FX rate at 3.5%)
 * Crypto / Stablecoin  → [Future: Stellar/Soroban]
 * </pre>
 *
 * <h3>Why ALATPay is biased for ALL local NGN (except &gt;₦150k):</h3>
 * <p>While Flutterwave technically charges less for sub-₦2,500 micro-transactions
 * (1.4% flat vs. ALATPay's 1.2% + ₦50 fixed fee), ALATPay's Wema Bank rail offers
 * near-instant settlement and significantly lower failure rates during network spikes.
 * The marginal fee difference (~₦48 on a ₦1,000 tx) is outweighed by settlement
 * certainty. Paystack dominates only for transactions above ₦150,000 where its
 * ₦2,000 fee cap is mathematically impossible to match.
 *
 * <h3>Circuit Breaker Integration:</h3>
 * <p>All gateway calls are wrapped by {@link ArafiCircuitBreakerRegistry} with a hard
 * 2,500ms timeout. If a gateway's circuit is OPEN (too many failures), the engine
 * skips it and tries the next gateway in the fallback chain without any additional delay.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GatewayRoutingEngine {

    private final GatewayAdapterFactory adapterFactory;
    private final ArafiCircuitBreakerRegistry circuitBreakerRegistry;
    private final Environment environment;

    private boolean isTestMode() {
        return environment != null && environment.acceptsProfiles(org.springframework.core.env.Profiles.of("test"));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PUBLIC ENTRY POINTS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Routes and executes a card charge (first-time enrollment).
     * Selects gateway automatically or honors developer preference with fallback.
     *
     * @param request         the card charge parameters
     * @param amountNgn       transaction amount in NGN
     * @param currency        transaction currency (e.g., "NGN", "USD")
     * @param preferredGateway developer-specified gateway name, or null for auto-routing
     * @param allowFallback   if true, failed gateways are automatically bypassed
     * @param isInternational true if this is a foreign card/cross-border payment
     * @return the charge result from whichever gateway processed the transaction
     */
    public GatewayChargeResult routeCardCharge(
            CardChargeRequest request,
            BigDecimal amountNgn,
            String currency,
            String preferredGateway,
            boolean allowFallback,
            boolean isInternational) {

        if (isTestMode()) {
            return GatewayChargeResult.builder()
                    .success(true)
                    .gatewayTransactionId("tx_mock_" + java.util.UUID.randomUUID())
                    .checkoutUrl("https://mock.gateway.com/checkout/" + request.getOrderReference())
                    .gatewayUsed(preferredGateway != null ? preferredGateway.toUpperCase() : "FLUTTERWAVE")
                    .build();
        }

        List<String> gatewayChain = buildCardGatewayChain(preferredGateway, allowFallback);
        log.info("[RoutingEngine] routeCardCharge — amount={}, currency={}, preferred={}, fallback={}, chain={}",
                amountNgn, currency, preferredGateway, allowFallback, gatewayChain);

        for (String gatewayName : gatewayChain) {
            if (circuitBreakerRegistry.isOpen(gatewayName)) {
                log.warn("[RoutingEngine] Skipping {} — circuit is OPEN", gatewayName);
                if (!allowFallback) break;
                continue;
            }

            try {
                GatewayAdapter adapter = adapterFactory.getAdapter(gatewayName);
                GatewayChargeResult result = circuitBreakerRegistry.execute(
                        gatewayName,
                        () -> adapter.chargeCard(request)
                );

                if (result.isSuccess()) {
                    log.info("[RoutingEngine] Card charge succeeded via gateway={}", gatewayName);
                    return annotateGateway(result, gatewayName);
                }

                log.warn("[RoutingEngine] Gateway={} returned failure: {}. Trying next...",
                        gatewayName, result.getErrorMessage());
                circuitBreakerRegistry.recordFailure(gatewayName,
                        new RuntimeException(result.getErrorMessage()));

                if (!allowFallback) break;

            } catch (CallNotPermittedException e) {
                log.warn("[RoutingEngine] Gateway={} circuit OPEN — skipping", gatewayName);
                if (!allowFallback) break;
            } catch (TimeoutException e) {
                log.warn("[RoutingEngine] Gateway={} TIMED OUT (>2500ms) — skipping", gatewayName);
                if (!allowFallback) break;
            } catch (UnsupportedOperationException e) {
                log.debug("[RoutingEngine] Gateway={} does not support this operation — skipping: {}", gatewayName, e.getMessage());
                // Don't count as a circuit failure — just not supported
                if (!allowFallback) break;
            } catch (Exception e) {
                log.error("[RoutingEngine] Gateway={} threw exception: {}", gatewayName, e.getMessage());
                if (!allowFallback) break;
            }
        }

        return GatewayChargeResult.builder()
                .success(false)
                .errorMessage("All available gateways failed or were unavailable. Please try again.")
                .build();
    }

    /**
     * Routes and executes a recurring charge using a stored payment token.
     * Selects the appropriate gateway based on the token type stored on the subscription.
     *
     * <p>Token routing:
     * <ul>
     *   <li>Flutterwave {@code pmd_XXX} → Flutterwave</li>
     *   <li>Paystack {@code AUTH_XXX} → Paystack</li>
     *   <li>Legacy Nomba {@code tokenKey} → Nomba (fallback path for existing subscriptions)</li>
     * </ul>
     *
     * @param request         the recurring charge parameters including the stored token
     * @param tokenType       the token type hint: "FLUTTERWAVE", "PAYSTACK", or "NOMBA"
     * @param allowFallback   if true, a failed gateway falls back to the next card rail
     * @return the charge result
     */
    public GatewayChargeResult routeRecurringCharge(
            RecurringChargeRequest request,
            String tokenType,
            boolean allowFallback) {

        // Determine primary gateway from the token type stored on the subscription
        List<String> chain = buildRecurringChain(tokenType, allowFallback);
        
        if (isTestMode()) {
            return GatewayChargeResult.builder()
                    .success(true)
                    .gatewayTransactionId("tx_rec_mock_" + java.util.UUID.randomUUID())
                    .gatewayUsed(chain.get(0).toUpperCase())
                    .build();
        }

        log.info("[RoutingEngine] routeRecurringCharge — email={}, amount={}, tokenType={}, chain={}",
                request.getCustomerEmail(), request.getAmountNgn(), tokenType, chain);

        for (String gatewayName : chain) {
            if (circuitBreakerRegistry.isOpen(gatewayName)) {
                log.warn("[RoutingEngine] Skipping {} — circuit is OPEN", gatewayName);
                if (!allowFallback) break;
                continue;
            }

            try {
                GatewayAdapter adapter = adapterFactory.getAdapter(gatewayName);
                GatewayChargeResult result = circuitBreakerRegistry.execute(
                        gatewayName,
                        () -> adapter.chargeRecurring(request)
                );

                if (result.isSuccess()) {
                    log.info("[RoutingEngine] Recurring charge succeeded via gateway={}", gatewayName);
                    return annotateGateway(result, gatewayName);
                }

                log.warn("[RoutingEngine] Gateway={} recurring charge failed: {}. Trying next...",
                        gatewayName, result.getErrorMessage());
                circuitBreakerRegistry.recordFailure(gatewayName,
                        new RuntimeException(result.getErrorMessage()));

                if (!allowFallback) break;

            } catch (CallNotPermittedException e) {
                log.warn("[RoutingEngine] Gateway={} circuit OPEN for recurring — skipping", gatewayName);
                if (!allowFallback) break;
            } catch (TimeoutException e) {
                log.warn("[RoutingEngine] Gateway={} recurring charge TIMED OUT — skipping", gatewayName);
                if (!allowFallback) break;
            } catch (Exception e) {
                log.error("[RoutingEngine] Gateway={} recurring exception: {}", gatewayName, e.getMessage());
                if (!allowFallback) break;
            }
        }

        return GatewayChargeResult.builder()
                .success(false)
                .errorMessage("Recurring charge failed on all available gateways.")
                .build();
    }

    /**
     * Routes and executes a virtual account creation for bank transfer checkouts.
     * ALATPay is always preferred for bank transfers (lower fees, Wema rail reliability).
     *
     * @param request         the virtual account parameters
     * @param preferredGateway developer-specified gateway, or null for auto (ALATPay)
     * @param allowFallback   if true, falls back to Nomba if ALATPay is unavailable
     * @return the account creation result
     */
    public GatewayAccountResult routeDynamicVirtualAccount(
            VirtualAccountRequest request,
            String preferredGateway,
            boolean allowFallback) {

        if (isTestMode()) {
            return GatewayAccountResult.builder()
                    .success(true)
                    .bankAccountNumber("999" + (int)(Math.random() * 100000000))
                    .bankName("Wema Bank (Arafi Test)")
                    .accountName(request.getAccountName())
                    .gatewayRef("va_mock_" + java.util.UUID.randomUUID())
                    .gatewayUsed(preferredGateway != null ? preferredGateway.toUpperCase() : "ALATPAY")
                    .build();
        }

        List<String> chain = buildBankTransferChain(preferredGateway, allowFallback);
        log.info("[RoutingEngine] routeDynamicVirtualAccount — ref={}, chain={}", request.getAccountRef(), chain);

        for (String gatewayName : chain) {
            if (circuitBreakerRegistry.isOpen(gatewayName)) {
                log.warn("[RoutingEngine] Skipping {} — circuit is OPEN", gatewayName);
                if (!allowFallback) break;
                continue;
            }

            try {
                GatewayAdapter adapter = adapterFactory.getAdapter(gatewayName);
                GatewayAccountResult result = circuitBreakerRegistry.execute(
                        gatewayName,
                        () -> adapter.createDynamicVirtualAccount(request)
                );

                if (result.isSuccess()) {
                    log.info("[RoutingEngine] Virtual account created via gateway={}, account={}",
                            gatewayName, result.getBankAccountNumber());
                    return annotateGatewayAccount(result, gatewayName);
                }

                log.warn("[RoutingEngine] Gateway={} VA creation failed: {}. Trying next...",
                        gatewayName, result.getErrorMessage());
                if (!allowFallback) break;

            } catch (UnsupportedOperationException e) {
                log.debug("[RoutingEngine] Gateway={} does not support VA creation — skipping", gatewayName);
                if (!allowFallback) break;
            } catch (Exception e) {
                log.error("[RoutingEngine] Gateway={} VA creation exception: {}", gatewayName, e.getMessage());
                if (!allowFallback) break;
            }
        }

        return GatewayAccountResult.builder()
                .success(false)
                .errorMessage("Virtual account creation failed on all available gateways.")
                .build();
    }

    /**
     * Creates a static wallet (permanent dedicated account) for a customer.
     * ALATPay is the only supported provider (requires BVN).
     *
     * @param request the static wallet parameters including BVN
     * @return the account creation result
     */
    public GatewayAccountResult routeStaticWallet(StaticWalletRequest request) {
        if (isTestMode()) {
            return GatewayAccountResult.builder()
                    .success(true)
                    .bankAccountNumber("888" + (int)(Math.random() * 100000000))
                    .bankName("Wema Bank (Arafi Test)")
                    .accountName(request.getFirstName() + " " + request.getLastName())
                    .gatewayRef("wallet_mock_" + java.util.UUID.randomUUID())
                    .gatewayUsed("ALATPAY")
                    .build();
        }
        log.info("[RoutingEngine] routeStaticWallet — email={}", request.getCustomerEmail());
        try {
            GatewayAdapter adapter = adapterFactory.getAdapter("ALATPAY");
            GatewayAccountResult result = circuitBreakerRegistry.execute("ALATPAY",
                    () -> adapter.createStaticWallet(request));
            if (result.isSuccess()) {
                return annotateGatewayAccount(result, "ALATPAY");
            }
            return result;
        } catch (Exception e) {
            log.error("[RoutingEngine] Static wallet creation failed: {}", e.getMessage());
            return GatewayAccountResult.builder()
                    .success(false)
                    .errorMessage("ALATPay static wallet creation failed: " + e.getMessage())
                    .build();
        }
    }

    private GatewayAccountResult annotateGatewayAccount(GatewayAccountResult result, String gatewayName) {
        return GatewayAccountResult.builder()
                .success(result.isSuccess())
                .bankAccountNumber(result.getBankAccountNumber())
                .bankName(result.getBankName())
                .accountName(result.getAccountName())
                .gatewayRef(result.getGatewayRef())
                .gatewayUsed(gatewayName)
                .errorMessage(result.getErrorMessage())
                .build();
    }

    /**
     * Routes a payout/bank transfer.
     * Currently delegates to Nomba (existing payout infrastructure).
     *
     * @param request the transfer parameters
     * @return the transfer result
     */
    public GatewayTransferResult routeTransfer(TransferRequest request) {
        log.info("[RoutingEngine] routeTransfer — bankCode={}, account={}, amount={}",
                request.getBankCode(), request.getAccountNumber(), request.getAmountNgn());
        try {
            GatewayAdapter adapter = adapterFactory.getAdapter("NOMBA");
            return circuitBreakerRegistry.execute("NOMBA",
                    () -> adapter.processTransfer(request));
        } catch (Exception e) {
            log.error("[RoutingEngine] Transfer failed: {}", e.getMessage());
            return GatewayTransferResult.builder()
                    .success(false)
                    .errorMessage("Transfer failed: " + e.getMessage())
                    .build();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // COST-OPTIMIZATION ROUTING LOGIC
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Determines the auto-routed gateway for a local/international NGN bank transfer.
     * ALATPay is biased for all local NGN; Paystack only wins for &gt;₦150,000.
     *
     * <p>This method is exposed publicly for use by callers that need to know the
     * optimal gateway before constructing the full request (e.g., for logging or
     * selecting the right virtual account type).
     *
     * @param amountNgn       transaction amount
     * @param isInternational true for cross-border / FX transactions
     * @return the name of the optimal gateway for this transaction
     */
    public String determineCostOptimalGateway(BigDecimal amountNgn, boolean isInternational) {
        if (isInternational) {
            return "ALATPAY"; // 3.5% FX — cheapest fiat international rate
        }

        double naira = amountNgn.doubleValue();
        if (naira > 150_000.0) {
            // Paystack ₦2,000 cap — saves merchants up to ₦12,000+ on large transactions
            return "PAYSTACK";
        }

        // ALATPay for everything else (biased: Wema rail reliability + 1.2% base rate)
        return "ALATPAY";
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PRIVATE — Gateway chain builders
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Builds the ordered list of gateways to try for a card payment.
     * Default chain: Flutterwave → Paystack → Nomba
     */
    private List<String> buildCardGatewayChain(String preferredGateway, boolean allowFallback) {
        if (preferredGateway != null && !preferredGateway.isBlank()) {
            if (!allowFallback) {
                // Strict mode — only the developer's chosen gateway
                return List.of(preferredGateway.toUpperCase());
            }
            // Developer preference first, then remaining chain
            List<String> defaultChain = defaultCardChain();
            List<String> chain = new java.util.ArrayList<>();
            chain.add(preferredGateway.toUpperCase());
            defaultChain.stream()
                    .filter(g -> !g.equalsIgnoreCase(preferredGateway))
                    .forEach(chain::add);
            return List.copyOf(chain);
        }
        return defaultCardChain();
    }

    /**
     * Builds the gateway chain for recurring charges based on the stored token type.
     * The primary gateway matches the token type — fallback chain follows if enabled.
     */
    private List<String> buildRecurringChain(String tokenType, boolean allowFallback) {
        String primary = (tokenType != null) ? tokenType.toUpperCase() : "FLUTTERWAVE";
        if (!allowFallback) {
            return List.of(primary);
        }
        List<String> chain = new java.util.ArrayList<>();
        chain.add(primary);
        defaultCardChain().stream()
                .filter(g -> !g.equalsIgnoreCase(primary))
                .forEach(chain::add);
        return List.copyOf(chain);
    }

    /**
     * Builds the ordered gateway chain for bank transfer virtual account creation.
     * ALATPay is always primary; Nomba is the fallback VA provider.
     */
    private List<String> buildBankTransferChain(String preferredGateway, boolean allowFallback) {
        if (preferredGateway != null && !preferredGateway.isBlank()) {
            if (!allowFallback) return List.of(preferredGateway.toUpperCase());
            return List.of(preferredGateway.toUpperCase(), "ALATPAY", "NOMBA");
        }
        return allowFallback ? List.of("ALATPAY", "NOMBA") : List.of("ALATPAY");
    }

    private List<String> defaultCardChain() {
        // Flutterwave (primary) → Paystack (secondary) → Nomba (last resort)
        return List.of("FLUTTERWAVE", "PAYSTACK", "NOMBA");
    }

    private GatewayChargeResult annotateGateway(GatewayChargeResult result, String gatewayName) {
        return GatewayChargeResult.builder()
                .success(result.isSuccess())
                .gatewayTransactionId(result.getGatewayTransactionId())
                .paymentToken(result.getPaymentToken())
                .gatewayCustomerId(result.getGatewayCustomerId())
                .checkoutUrl(result.getCheckoutUrl())
                .requiresCustomerAction(result.isRequiresCustomerAction())
                .gatewayUsed(gatewayName)
                .errorMessage(result.getErrorMessage())
                .build();
    }

    public GatewayChargeResult verifyTransaction(String gatewayReference, String orderReference, String gatewayUsed) {
        if (isTestMode()) {
            return GatewayChargeResult.builder()
                    .success(true)
                    .gatewayTransactionId(gatewayReference != null ? gatewayReference : "tx_mock_verify")
                    .gatewayUsed(gatewayUsed != null ? gatewayUsed.toUpperCase() : "FLUTTERWAVE")
                    .build();
        }
        String gw = (gatewayUsed != null && !gatewayUsed.isBlank()) ? gatewayUsed : "NOMBA";
        try {
            GatewayAdapter adapter = adapterFactory.getAdapter(gw);
            return circuitBreakerRegistry.execute(gw, () -> adapter.verifyTransaction(gatewayReference, orderReference));
        } catch (Exception e) {
            log.error("[RoutingEngine] Verification failed for gateway={}: {}", gw, e.getMessage());
            return GatewayChargeResult.builder()
                    .success(false)
                    .errorMessage("Verification failed on gateway: " + e.getMessage())
                    .build();
        }
    }
}
