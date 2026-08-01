package com.yourara.arafi.gateway;

import com.yourara.arafi.gateway.dto.*;

/**
 * Core abstraction for all payment gateway integrations in Arafi.
 *
 * <p>Every gateway (Flutterwave, ALATPay, Paystack, Nomba) implements this interface.
 * The {@link com.yourara.arafi.gateway.GatewayRoutingEngine} selects the appropriate
 * adapter at runtime based on transaction parameters and circuit breaker state.
 *
 * <p><strong>Adapter responsibility:</strong> Each adapter translates Arafi-internal DTOs
 * into gateway-specific HTTP requests and normalizes the response back into Arafi DTOs.
 * No business logic lives in adapters — only I/O translation and error normalization.
 */
public interface GatewayAdapter {

    /**
     * Returns the canonical name of this gateway.
     * Used for logging, routing decisions, and storing {@code gateway_used} on transactions.
     * Values: {@code "FLUTTERWAVE"}, {@code "ALATPAY"}, {@code "PAYSTACK"}, {@code "NOMBA"}.
     */
    String getGatewayName();

    /**
     * Initiates a first-time card checkout.
     * Returns either a {@code checkoutUrl} for the customer to complete 3DS/PIN auth,
     * or a direct charge result if the gateway processes without redirect.
     *
     * @param request card charge parameters (may include pre-encrypted card fields)
     * @return normalized charge result
     */
    GatewayChargeResult chargeCard(CardChargeRequest request);

    /**
     * Executes a recurring charge against a previously stored payment token.
     * No customer interaction is required — the gateway charges silently.
     *
     * <p>Token semantics per gateway:
     * <ul>
     *   <li>Flutterwave: {@code payment_method_id} (pmd_XXX)</li>
     *   <li>Paystack: {@code authorization_code} (AUTH_XXX)</li>
     *   <li>Nomba: {@code tokenKey}</li>
     * </ul>
     *
     * @param request recurring charge parameters including the stored token
     * @return normalized charge result
     */
    GatewayChargeResult chargeRecurring(RecurringChargeRequest request);

    /**
     * Creates a dynamic (one-time) virtual account for a single checkout.
     * The account expires after the transaction is confirmed or after a timeout.
     *
     * @param request virtual account parameters
     * @return normalized account result with NUBAN and bank name
     */
    GatewayAccountResult createDynamicVirtualAccount(VirtualAccountRequest request);

    /**
     * Creates a static (permanent) dedicated virtual account bound to a customer.
     * Used for transfer-based recurring subscriptions where customers pay via
     * direct bank transfer to a fixed account number.
     *
     * <p>Currently implemented by ALATPay only. Requires a customer BVN.
     * Unsupported adapters should throw {@link UnsupportedOperationException}.
     *
     * @param request static wallet parameters including BVN
     * @return normalized account result
     */
    GatewayAccountResult createStaticWallet(StaticWalletRequest request);

    /**
     * Initiates a bank transfer payout from Arafi's merchant account to a
     * beneficiary bank account.
     *
     * @param request transfer parameters
     * @return normalized transfer result
     */
    GatewayTransferResult processTransfer(TransferRequest request);

    /**
     * Verifies the status of a transaction on the gateway.
     *
     * @param gatewayReference the gateway-native transaction ID (e.g. chg_XXX)
     * @param orderReference the unique order reference sent to the gateway
     * @return normalized charge result showing status
     */
    GatewayChargeResult verifyTransaction(String gatewayReference, String orderReference);

    /**
     * Performs a lightweight availability check on this gateway adapter.
     * Used by the {@link com.yourara.arafi.gateway.ArafiCircuitBreakerRegistry}
     * to evaluate half-open probe requests.
     *
     * <p>Implementations should return {@code true} if the gateway is reachable
     * and credentials are valid, {@code false} otherwise. This check MUST NOT
     * make a live payment request — use a lightweight status/ping endpoint where
     * available, or return {@code true} by default to let the circuit breaker
     * learn from real transaction failures (passive telemetry mode).
     */
    boolean isAvailable();
}
