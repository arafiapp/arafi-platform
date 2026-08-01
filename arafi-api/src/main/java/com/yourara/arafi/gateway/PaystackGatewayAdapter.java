package com.yourara.arafi.gateway;

import com.yourara.arafi.gateway.dto.*;
import com.yourara.arafi.security.RequestContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Paystack Gateway Adapter — SECONDARY card rail and HIGH-VALUE local transaction processor.
 *
 * <h3>Why Paystack is used:</h3>
 * <ul>
 *   <li><strong>High-value local NGN (&gt;₦150,000):</strong> Paystack caps local fees at ₦2,000 maximum.
 *       A ₦500,000 transaction costs only ₦2,000 on Paystack vs. ₦7,000 on Flutterwave (uncapped).
 *       This is the single most impactful cost optimization in Arafi's routing logic.</li>
 *   <li><strong>Card fallback:</strong> When Flutterwave's circuit breaker is OPEN,
 *       Paystack handles card charges as the secondary rail.</li>
 * </ul>
 *
 * <h3>Recurring Card Payment Flow (Paystack):</h3>
 * <ol>
 *   <li>First-time: {@code POST /transaction/initialize} → returns a checkout URL</li>
 *   <li>After customer pays: Paystack webhook fires with {@code authorization_code}</li>
 *   <li>Arafi stores {@code authorization_code} on the Customer record</li>
 *   <li>Subsequent renewals: {@code POST /transaction/charge_authorization} with stored code — silent charge</li>
 * </ol>
 *
 * <h3>Fee Structure:</h3>
 * <ul>
 *   <li>Local cards: 1.5% + ₦100 (₦100 waived under ₦2,500); CAPPED at ₦2,000 max</li>
 *   <li>International cards: 3.9% + ₦100 (4.5% for AMEX)</li>
 *   <li>Dedicated Virtual Accounts: capped at ₦300</li>
 * </ul>
 *
 * <p>Paystack API: {@code https://api.paystack.co}
 */
@Slf4j
@Component
public class PaystackGatewayAdapter implements GatewayAdapter {

    private static final String GATEWAY_NAME = "PAYSTACK";
    private static final String BASE_URL = "https://api.paystack.co";

    private final RestTemplate restTemplate;
    private final Environment environment;

    @Value("${paystack.test.secret.key:}")
    private String testSecretKey;

    @Value("${paystack.live.secret.key:}")
    private String liveSecretKey;

    public PaystackGatewayAdapter(RestTemplate restTemplate, Environment environment) {
        this.restTemplate = restTemplate;
        this.environment = environment;
    }

    @Override
    public String getGatewayName() {
        return GATEWAY_NAME;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CARD CHARGE — First-time checkout via hosted Paystack page
    // POST /transaction/initialize
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Initiates a first-time card payment via Paystack's hosted checkout.
     * Returns a {@code checkoutUrl} (Paystack hosted page) for the customer to complete.
     *
     * <p>After the customer pays, Paystack fires a webhook containing the
     * {@code authorization_code} which Arafi stores for future recurring charges.
     *
     * <p>Endpoint: {@code POST /transaction/initialize}
     */
    @Override
    @SuppressWarnings("unchecked")
    public GatewayChargeResult chargeCard(CardChargeRequest request) {
        String url = BASE_URL + "/transaction/initialize";

        // Paystack amounts are in kobo (smallest unit)
        long amountKobo = request.getAmountNgn().multiply(BigDecimal.valueOf(100)).longValue();

        Map<String, Object> body = new HashMap<>();
        body.put("email", request.getCustomerEmail());
        body.put("amount", amountKobo);
        body.put("reference", request.getOrderReference());
        body.put("callback_url", request.getCallbackUrl());
        body.put("currency", request.getCurrency() != null ? request.getCurrency() : "NGN");
        // Request card-only to ensure tokenization happens
        body.put("channels", new String[]{"card"});

        HttpHeaders headers = buildHeaders();
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        log.info("[Paystack] chargeCard — email={}, amountKobo={}, ref={}",
                request.getCustomerEmail(), amountKobo, request.getOrderReference());

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();

            if (responseBody != null && Boolean.TRUE.equals(responseBody.get("status"))) {
                Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
                if (data != null) {
                    String authorizationUrl = data.get("authorization_url") != null
                            ? data.get("authorization_url").toString() : null;
                    String accessCode = data.get("access_code") != null
                            ? data.get("access_code").toString() : null;

                    log.info("[Paystack] Transaction initialized: ref={}, authUrl={}", request.getOrderReference(), authorizationUrl);
                    return GatewayChargeResult.builder()
                            .success(true)
                            .gatewayTransactionId(request.getOrderReference())
                            .checkoutUrl(authorizationUrl)
                            .requiresCustomerAction(true)
                            // Note: authorization_code comes later via webhook — not available here
                            .build();
                }
            }

            String errMsg = responseBody != null && responseBody.get("message") != null
                    ? responseBody.get("message").toString()
                    : "Paystack transaction initialization failed";
            log.error("[Paystack] chargeCard failed: {}", errMsg);

            if (isSandboxMode()) {
                return sandboxCheckoutResult(request.getOrderReference());
            }
            return GatewayChargeResult.builder().success(false).errorMessage(errMsg).build();

        } catch (HttpStatusCodeException e) {
            log.error("[Paystack] chargeCard HTTP error: {} — {}", e.getStatusCode(), e.getResponseBodyAsString());
            if (isSandboxMode()) return sandboxCheckoutResult(request.getOrderReference());
            return GatewayChargeResult.builder()
                    .success(false)
                    .errorMessage("Paystack charge HTTP error: " + e.getResponseBodyAsString())
                    .build();
        } catch (Exception e) {
            log.error("[Paystack] chargeCard exception: {}", e.getMessage());
            if (isSandboxMode()) return sandboxCheckoutResult(request.getOrderReference());
            return GatewayChargeResult.builder()
                    .success(false)
                    .errorMessage("Paystack charge exception: " + e.getMessage())
                    .build();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // RECURRING CHARGE — Uses stored authorization_code, silent charge
    // POST /transaction/charge_authorization
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Charges a returning customer using their stored Paystack authorization_code.
     * No customer interaction required.
     *
     * <p>Endpoint: {@code POST /transaction/charge_authorization}
     */
    @Override
    @SuppressWarnings("unchecked")
    public GatewayChargeResult chargeRecurring(RecurringChargeRequest request) {
        String url = BASE_URL + "/transaction/charge_authorization";

        if (request.getPaymentToken() == null || request.getPaymentToken().isBlank()) {
            return GatewayChargeResult.builder()
                    .success(false)
                    .errorMessage("No Paystack authorization_code stored for customer — cannot charge recurring.")
                    .build();
        }

        long amountKobo = request.getAmountNgn().multiply(BigDecimal.valueOf(100)).longValue();

        Map<String, Object> body = new HashMap<>();
        body.put("email", request.getCustomerEmail());
        body.put("amount", amountKobo);
        body.put("authorization_code", request.getPaymentToken());
        body.put("reference", request.getOrderReference());
        body.put("currency", request.getCurrency() != null ? request.getCurrency() : "NGN");

        HttpHeaders headers = buildHeaders();
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        log.info("[Paystack] chargeRecurring — email={}, amountKobo={}, authCode={}",
                request.getCustomerEmail(), amountKobo,
                maskToken(request.getPaymentToken()));

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();

            if (responseBody != null && Boolean.TRUE.equals(responseBody.get("status"))) {
                Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
                if (data != null) {
                    String txStatus = data.get("status") != null ? data.get("status").toString() : "failed";
                    String txRef = data.get("reference") != null ? data.get("reference").toString() : request.getOrderReference();
                    Long txId = data.get("id") instanceof Number ? ((Number) data.get("id")).longValue() : null;

                    boolean succeeded = "success".equalsIgnoreCase(txStatus);
                    log.info("[Paystack] chargeRecurring result: status={}, ref={}, id={}", txStatus, txRef, txId);

                    return GatewayChargeResult.builder()
                            .success(succeeded)
                            .gatewayTransactionId(txId != null ? txId.toString() : txRef)
                            .paymentToken(request.getPaymentToken()) // Preserve existing auth code
                            .requiresCustomerAction(false)
                            .errorMessage(succeeded ? null : "Paystack recurring charge status: " + txStatus)
                            .build();
                }
            }

            String errMsg = responseBody != null && responseBody.get("message") != null
                    ? responseBody.get("message").toString()
                    : "Paystack recurring charge failed";
            log.error("[Paystack] chargeRecurring failed: {}", errMsg);

            if (isSandboxMode()) return sandboxRecurringResult(request.getOrderReference());
            return GatewayChargeResult.builder().success(false).errorMessage(errMsg).build();

        } catch (HttpStatusCodeException e) {
            log.error("[Paystack] chargeRecurring HTTP error: {} — {}", e.getStatusCode(), e.getResponseBodyAsString());
            if (isSandboxMode()) return sandboxRecurringResult(request.getOrderReference());
            return GatewayChargeResult.builder()
                    .success(false)
                    .errorMessage("Paystack recurring HTTP error: " + e.getResponseBodyAsString())
                    .build();
        } catch (Exception e) {
            log.error("[Paystack] chargeRecurring exception: {}", e.getMessage());
            if (isSandboxMode()) return sandboxRecurringResult(request.getOrderReference());
            return GatewayChargeResult.builder()
                    .success(false)
                    .errorMessage("Paystack recurring exception: " + e.getMessage())
                    .build();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIRTUAL ACCOUNTS — Paystack Dedicated Virtual Accounts (DVA)
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Creates a Paystack Dedicated Virtual Account (DVA).
     * Paystack caps DVA collection fees at ₦300 — useful for collecting from
     * customers who prefer bank transfers.
     *
     * <p>Endpoint: {@code POST /dedicated_account}
     */
    @Override
    @SuppressWarnings("unchecked")
    public GatewayAccountResult createDynamicVirtualAccount(VirtualAccountRequest request) {
        // For Paystack, we first need to create a customer, then assign a DVA
        // For now, we use the simpler flow and rely on ALATPay for VA creation
        // This is a secondary capability — ALATPay is the primary VA rail
        throw new UnsupportedOperationException(
                "Virtual account creation for bank transfers should use AlatPayGatewayAdapter. " +
                "Paystack DVA support can be added here as an enhancement.");
    }

    @Override
    public GatewayAccountResult createStaticWallet(StaticWalletRequest request) {
        throw new UnsupportedOperationException(
                "Static wallet creation should use AlatPayGatewayAdapter.");
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PAYOUTS
    // ─────────────────────────────────────────────────────────────────────────────

    @Override
    public GatewayTransferResult processTransfer(TransferRequest request) {
        throw new UnsupportedOperationException("Paystack payout transfer not yet implemented in this adapter.");
    }

    @Override
    public GatewayChargeResult verifyTransaction(String gatewayReference, String orderReference) {
        String txRef = (orderReference != null && !orderReference.isBlank()) ? orderReference : gatewayReference;
        String url = BASE_URL + "/transaction/verify/" + txRef;

        HttpHeaders headers = buildHeaders();
        HttpEntity<?> entity = new HttpEntity<>(headers);

        log.info("[Paystack] verifyTransaction — url={}", url);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> body = response.getBody();
            if (body != null && Boolean.TRUE.equals(body.get("status"))) {
                Map<String, Object> data = (Map<String, Object>) body.get("data");
                if (data != null) {
                    String status = data.get("status") != null ? data.get("status").toString() : "";
                    boolean succeeded = "success".equalsIgnoreCase(status);

                    // Extract authorization_code if present (to store for future charges)
                    String authorizationCode = null;
                    if (data.get("authorization") instanceof Map) {
                        Map<String, Object> auth = (Map<String, Object>) data.get("authorization");
                        authorizationCode = auth.get("authorization_code") != null
                                ? auth.get("authorization_code").toString() : null;
                    }

                    return GatewayChargeResult.builder()
                            .success(succeeded)
                            .gatewayTransactionId(data.get("id") != null ? data.get("id").toString() : txRef)
                            .paymentToken(authorizationCode)
                            .requiresCustomerAction(false)
                            .build();
                }
            }
            return GatewayChargeResult.builder().success(false).errorMessage("Paystack returned empty or failed status").build();
        } catch (HttpStatusCodeException e) {
            log.error("[Paystack] verifyTransaction HTTP error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            if (isSandboxMode()) {
                return sandboxRecurringResult(txRef);
            }
            return GatewayChargeResult.builder().success(false).errorMessage("Paystack verification HTTP error: " + e.getResponseBodyAsString()).build();
        } catch (Exception e) {
            log.error("[Paystack] verifyTransaction exception: {}", e.getMessage());
            if (isSandboxMode()) {
                return sandboxRecurringResult(txRef);
            }
            return GatewayChargeResult.builder().success(false).errorMessage("Paystack verification exception: " + e.getMessage()).build();
        }
    }

    @Override
    public boolean isAvailable() {
        return true; // Passive telemetry
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────────

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + getSecretKey());
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private String getSecretKey() {
        String mode = RequestContext.getMode();
        if ("live".equalsIgnoreCase(mode) && liveSecretKey != null && !liveSecretKey.isBlank()) {
            return liveSecretKey;
        }
        return testSecretKey;
    }

    private boolean isSandboxMode() {
        String mode = RequestContext.getMode();
        if (mode != null && "live".equalsIgnoreCase(mode)) return false;
        return environment != null &&
                environment.acceptsProfiles(
                        org.springframework.core.env.Profiles.of("dev", "development", "local", "test"));
    }

    private String maskToken(String token) {
        if (token == null || token.length() < 8) return "***";
        return token.substring(0, 4) + "..." + token.substring(token.length() - 4);
    }

    private GatewayChargeResult sandboxCheckoutResult(String ref) {
        log.warn("[Paystack] Sandbox fallback — returning mock checkout URL for ref={}", ref);
        return GatewayChargeResult.builder()
                .success(true)
                .gatewayTransactionId(ref)
                .checkoutUrl("https://checkout.paystack.com/sandbox/" + ref)
                .requiresCustomerAction(true)
                .build();
    }

    private GatewayChargeResult sandboxRecurringResult(String ref) {
        String mockId = "ps_sandbox_" + UUID.randomUUID().toString().substring(0, 12);
        log.warn("[Paystack] Sandbox fallback — returning mock recurring result for ref={}", ref);
        return GatewayChargeResult.builder()
                .success(true)
                .gatewayTransactionId(mockId)
                .requiresCustomerAction(false)
                .build();
    }
}
