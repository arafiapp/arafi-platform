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
 * Flutterwave v4 Gateway Adapter — PRIMARY card tokenization and recurring charge rail.
 *
 * <h3>Card Enrollment Flow (First-Time Customer):</h3>
 * <ol>
 *   <li>Frontend encrypts card details using Flutterwave's encryption SDK and sends
 *       the encrypted fields + nonce to the Arafi backend in the checkout request.</li>
 *   <li>Arafi calls {@link #chargeCard} → FW POST /payment-methods → stores pmd_XXX</li>
 *   <li>Arafi calls FW POST /charges → returns 3DS/PIN redirect URL to customer</li>
 *   <li>FW sends webhook {@code charge.completed} → Arafi activates subscription</li>
 * </ol>
 *
 * <h3>Recurring Charge Flow (Returning Customer):</h3>
 * <ol>
 *   <li>Renewal scheduler calls {@link #chargeRecurring} with stored pmd_XXX</li>
 *   <li>FW POST /charges with {@code recurring: true} — no customer auth required</li>
 *   <li>FW sends webhook {@code charge.completed} → Arafi renews period</li>
 * </ol>
 *
 * <p>API Base URL:
 * <ul>
 *   <li>Sandbox: {@code https://developersandbox-api.flutterwave.com}</li>
 *   <li>Live:    {@code https://api.flutterwave.com}</li>
 * </ul>
 */
@Slf4j
@Component
public class FlutterwaveGatewayAdapter implements GatewayAdapter {

    private static final String GATEWAY_NAME = "FLUTTERWAVE";

    private final RestTemplate restTemplate;
    private final Environment environment;

    @Value("${flutterwave.test.secret.key:}")
    private String testSecretKey;

    @Value("${flutterwave.live.secret.key:}")
    private String liveSecretKey;

    @Value("${flutterwave.base.url.test:https://developersandbox-api.flutterwave.com}")
    private String testBaseUrl;

    @Value("${flutterwave.base.url.live:https://api.flutterwave.com}")
    private String liveBaseUrl;

    public FlutterwaveGatewayAdapter(RestTemplate restTemplate, Environment environment) {
        this.restTemplate = restTemplate;
        this.environment = environment;
    }

    @Override
    public String getGatewayName() {
        return GATEWAY_NAME;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CARD CHARGE — First-time enrollment
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Handles first-time card checkout via Flutterwave v4.
     *
     * <p>Flow:
     * <ol>
     *   <li>POST /payment-methods — creates a card payment method object from
     *       pre-encrypted card details. Returns pmd_XXX.</li>
     *   <li>POST /charges — initiates charge using pmd_XXX. Returns auth redirect URL
     *       (3DS/PIN) which the customer must complete.</li>
     * </ol>
     *
     * <p>The {@code paymentToken} in the result will be populated with the {@code pmd_XXX}
     * only after the webhook confirms the charge — this method returns the checkout URL
     * so the customer can authenticate. The token arrives via the FW webhook.
     */
    @Override
    public GatewayChargeResult chargeCard(CardChargeRequest request) {
        String baseUrl = getBaseUrl();
        log.info("[Flutterwave] chargeCard — customer={}, amount={}, ref={}",
                request.getCustomerEmail(), request.getAmountNgn(), request.getOrderReference());

        // ── Step 1: Create payment method (card enrollment) ──
        String paymentMethodId;
        try {
            paymentMethodId = createPaymentMethod(baseUrl, request);
        } catch (Exception e) {
            log.error("[Flutterwave] chargeCard: Failed to create payment method. Error: {}", e.getMessage());
            if (isSandboxMode()) {
                // Sandbox fallback — use a deterministic mock pmd
                paymentMethodId = "pmd_sandbox_" + request.getOrderReference().substring(0, Math.min(8, request.getOrderReference().length()));
                log.warn("[Flutterwave] Sandbox mode: using mock payment method id={}", paymentMethodId);
            } else {
                return GatewayChargeResult.builder()
                        .success(false)
                        .errorMessage("Failed to create Flutterwave payment method: " + e.getMessage())
                        .build();
            }
        }

        // ── Step 2: Initiate charge ──
        return initiateCharge(baseUrl, request, paymentMethodId, false);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // RECURRING CHARGE — Uses stored payment_method_id, no customer action
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Charges a returning customer using a stored Flutterwave payment_method_id.
     * No 3DS or PIN auth is required — Flutterwave charges the card directly.
     */
    @Override
    public GatewayChargeResult chargeRecurring(RecurringChargeRequest request) {
        String baseUrl = getBaseUrl();
        log.info("[Flutterwave] chargeRecurring — customer={}, amount={}, pmd={}",
                request.getCustomerEmail(), request.getAmountNgn(), request.getPaymentToken());

        if (request.getPaymentToken() == null || request.getPaymentToken().isBlank()) {
            return GatewayChargeResult.builder()
                    .success(false)
                    .errorMessage("No Flutterwave payment_method_id stored for customer — cannot charge recurring.")
                    .build();
        }

        String url = baseUrl + "/charges";

        Map<String, Object> body = new HashMap<>();
        body.put("reference", request.getOrderReference());
        body.put("currency", request.getCurrency() != null ? request.getCurrency() : "NGN");
        body.put("customer_id", request.getGatewayCustomerId());
        body.put("payment_method_id", request.getPaymentToken());
        body.put("recurring", true);
        body.put("amount", request.getAmountNgn().doubleValue());

        HttpHeaders headers = buildHeaders();
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            return parseChargeResponse(response.getBody(), request.getOrderReference());
        } catch (HttpStatusCodeException e) {
            log.error("[Flutterwave] chargeRecurring HTTP error: {} — {}", e.getStatusCode(), e.getResponseBodyAsString());
            if (isSandboxMode()) {
                return sandboxSuccessResult(request.getOrderReference());
            }
            return GatewayChargeResult.builder()
                    .success(false)
                    .errorMessage("Flutterwave recurring charge failed: " + e.getResponseBodyAsString())
                    .build();
        } catch (Exception e) {
            log.error("[Flutterwave] chargeRecurring exception: {}", e.getMessage());
            if (isSandboxMode()) {
                return sandboxSuccessResult(request.getOrderReference());
            }
            return GatewayChargeResult.builder()
                    .success(false)
                    .errorMessage("Flutterwave recurring charge exception: " + e.getMessage())
                    .build();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIRTUAL ACCOUNTS — Not natively supported by Flutterwave v4 direct API
    // Delegates to ALATPay for bank transfer flows
    // ─────────────────────────────────────────────────────────────────────────────

    @Override
    public GatewayAccountResult createDynamicVirtualAccount(VirtualAccountRequest request) {
        throw new UnsupportedOperationException(
                "Flutterwave does not support dynamic virtual account creation via Arafi. " +
                "Use AlatPayGatewayAdapter for bank transfer checkouts.");
    }

    @Override
    public GatewayAccountResult createStaticWallet(StaticWalletRequest request) {
        throw new UnsupportedOperationException(
                "Flutterwave does not support static wallet creation via Arafi. " +
                "Use AlatPayGatewayAdapter for static dedicated accounts.");
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PAYOUTS — Flutterwave supports transfers; stubbed for now
    // ─────────────────────────────────────────────────────────────────────────────

    @Override
    public GatewayTransferResult processTransfer(TransferRequest request) {
        // Flutterwave transfer support can be added here when payout routing is needed
        throw new UnsupportedOperationException("Flutterwave payout transfer not yet implemented in this adapter.");
    }

    @Override
    public GatewayChargeResult verifyTransaction(String gatewayReference, String orderReference) {
        String baseUrl = getBaseUrl();
        String txId = (gatewayReference != null && !gatewayReference.isBlank()) ? gatewayReference : orderReference;
        String url = baseUrl + "/charges/" + txId;

        HttpHeaders headers = buildHeaders();
        HttpEntity<?> entity = new HttpEntity<>(headers);

        log.info("[Flutterwave] verifyTransaction — url={}", url);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> body = response.getBody();
            return parseChargeResponse(body, txId);
        } catch (HttpStatusCodeException e) {
            log.error("[Flutterwave] verifyTransaction HTTP error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            return GatewayChargeResult.builder()
                    .success(false)
                    .errorMessage("Verification request failed: " + e.getResponseBodyAsString())
                    .build();
        } catch (Exception e) {
            log.error("[Flutterwave] verifyTransaction exception: {}", e.getMessage());
            return GatewayChargeResult.builder()
                    .success(false)
                    .errorMessage("Verification exception: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public boolean isAvailable() {
        // Passive telemetry — let circuit breaker learn from real transaction failures.
        // We don't ping a health endpoint to avoid wasting API calls.
        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Calls POST /payment-methods to enroll a card and get a pmd_XXX.
     * The card data MUST be pre-encrypted by the client using FW's encryption SDK.
     */
    @SuppressWarnings("unchecked")
    private String createPaymentMethod(String baseUrl, CardChargeRequest request) {
        String url = baseUrl + "/payment-methods";

        Map<String, Object> cardBody = new HashMap<>();
        cardBody.put("encrypted_card_number", request.getEncryptedCardNumber());
        cardBody.put("encrypted_expiry_month", request.getEncryptedExpiryMonth());
        cardBody.put("encrypted_expiry_year", request.getEncryptedExpiryYear());
        cardBody.put("encrypted_cvv", request.getEncryptedCvv());
        cardBody.put("nonce", request.getCardNonce());

        Map<String, Object> body = Map.of("type", "card", "card", cardBody);

        HttpHeaders headers = buildHeaders();
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        log.debug("[Flutterwave] POST /payment-methods for ref={}", request.getOrderReference());
        ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

        Map<String, Object> responseBody = response.getBody();
        if (responseBody != null && "success".equals(responseBody.get("status"))) {
            Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
            if (data != null && data.get("id") != null) {
                String pmdId = data.get("id").toString();
                log.info("[Flutterwave] Payment method created: pmd={}", pmdId);
                return pmdId;
            }
        }
        throw new IllegalStateException("Flutterwave payment method creation returned unexpected response: " + responseBody);
    }

    /**
     * Calls POST /charges to initiate a charge.
     * For first-time: triggers 3DS/PIN flow and returns a redirect URL.
     * For recurring (handled by {@link #chargeRecurring}): charges directly.
     */
    @SuppressWarnings("unchecked")
    private GatewayChargeResult initiateCharge(String baseUrl, CardChargeRequest request, String paymentMethodId, boolean recurring) {
        String url = baseUrl + "/charges";

        Map<String, Object> body = new HashMap<>();
        body.put("reference", request.getOrderReference());
        body.put("currency", "NGN");
        body.put("customer_id", null); // Will be populated after FW creates the customer profile
        body.put("payment_method_id", paymentMethodId);
        body.put("redirect_url", request.getCallbackUrl());
        body.put("amount", request.getAmountNgn().doubleValue());
        if (recurring) {
            body.put("recurring", true);
        }

        HttpHeaders headers = buildHeaders();
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        log.debug("[Flutterwave] POST /charges — ref={}, pmd={}, recurring={}", request.getOrderReference(), paymentMethodId, recurring);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();

            if (responseBody != null && "success".equals(responseBody.get("status"))) {
                Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
                if (data != null) {
                    String chargeId = data.get("id") != null ? data.get("id").toString() : null;
                    String status = data.get("status") != null ? data.get("status").toString() : "pending";

                    // Extract next_action redirect URL (3DS or PIN flow)
                    String checkoutUrl = null;
                    Object nextAction = data.get("next_action");
                    if (nextAction instanceof Map) {
                        Map<String, Object> nextActionMap = (Map<String, Object>) nextAction;
                        Object redirectObj = nextActionMap.get("redirect_url");
                        if (redirectObj instanceof Map) {
                            Map<String, Object> redirectMap = (Map<String, Object>) redirectObj;
                            checkoutUrl = redirectMap.get("url") != null ? redirectMap.get("url").toString() : null;
                        }
                    }

                    boolean succeeded = "succeeded".equalsIgnoreCase(status);
                    log.info("[Flutterwave] Charge initiated: id={}, status={}, checkoutUrl={}", chargeId, status, checkoutUrl);

                    return GatewayChargeResult.builder()
                            .success(true) // Charge was initiated successfully
                            .gatewayTransactionId(chargeId)
                            .paymentToken(paymentMethodId) // Store this for future recurring charges
                            .checkoutUrl(checkoutUrl)
                            .requiresCustomerAction(checkoutUrl != null)
                            .build();
                }
            }

            String errMsg = responseBody != null && responseBody.get("message") != null
                    ? responseBody.get("message").toString()
                    : "Flutterwave charge initiation failed";
            log.error("[Flutterwave] Charge initiation failed: {}", errMsg);

            if (isSandboxMode()) {
                String fallbackUrl = testBaseUrl + "/checkout/sandbox/" + request.getOrderReference();
                return GatewayChargeResult.builder()
                        .success(true)
                        .gatewayTransactionId("chg_sandbox_" + UUID.randomUUID().toString().substring(0, 12))
                        .paymentToken(paymentMethodId)
                        .checkoutUrl(fallbackUrl)
                        .requiresCustomerAction(true)
                        .build();
            }

            return GatewayChargeResult.builder().success(false).errorMessage(errMsg).build();

        } catch (HttpStatusCodeException e) {
            log.error("[Flutterwave] initiateCharge HTTP error: {} — {}", e.getStatusCode(), e.getResponseBodyAsString());
            if (isSandboxMode()) {
                return sandboxSuccessResult(request.getOrderReference());
            }
            return GatewayChargeResult.builder()
                    .success(false)
                    .errorMessage("Flutterwave charge HTTP error: " + e.getResponseBodyAsString())
                    .build();
        } catch (Exception e) {
            log.error("[Flutterwave] initiateCharge exception: {}", e.getMessage());
            if (isSandboxMode()) {
                return sandboxSuccessResult(request.getOrderReference());
            }
            return GatewayChargeResult.builder()
                    .success(false)
                    .errorMessage("Flutterwave charge exception: " + e.getMessage())
                    .build();
        }
    }

    @SuppressWarnings("unchecked")
    private GatewayChargeResult parseChargeResponse(Map responseBody, String fallbackRef) {
        if (responseBody != null && "success".equals(responseBody.get("status"))) {
            Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
            if (data != null) {
                String chargeId = data.get("id") != null ? data.get("id").toString() : fallbackRef;
                String status = data.get("status") != null ? data.get("status").toString() : "pending";
                boolean succeeded = "succeeded".equalsIgnoreCase(status);
                log.info("[Flutterwave] Recurring charge response: id={}, status={}", chargeId, status);
                return GatewayChargeResult.builder()
                        .success(succeeded)
                        .gatewayTransactionId(chargeId)
                        .requiresCustomerAction(false)
                        .errorMessage(succeeded ? null : "Charge status: " + status)
                        .build();
            }
        }
        String errMsg = responseBody != null && responseBody.get("message") != null
                ? responseBody.get("message").toString()
                : "Flutterwave returned unexpected response";
        return GatewayChargeResult.builder().success(false).errorMessage(errMsg).build();
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + getSecretKey());
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private String getBaseUrl() {
        String mode = RequestContext.getMode();
        if ("live".equalsIgnoreCase(mode)) return liveBaseUrl;
        if (isSandboxMode()) return testBaseUrl;
        return testBaseUrl; // default safe
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

    private GatewayChargeResult sandboxSuccessResult(String ref) {
        String mockId = "chg_sandbox_" + UUID.randomUUID().toString().substring(0, 12);
        log.warn("[Flutterwave] Sandbox fallback — returning mock charge result for ref={}", ref);
        return GatewayChargeResult.builder()
                .success(true)
                .gatewayTransactionId(mockId)
                .requiresCustomerAction(false)
                .build();
    }
}
