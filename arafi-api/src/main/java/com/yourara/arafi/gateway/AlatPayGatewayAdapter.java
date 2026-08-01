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

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * ALATPay Gateway Adapter — PRIMARY bank transfer rail.
 *
 * <p>ALATPay operates natively on Wema Bank's core banking rail, giving it
 * near-instant bank transfer delivery with significantly lower failure rates
 * during peak network spikes. It is the primary rail for all local NGN
 * bank transfer collections in Arafi.
 *
 * <h3>Supported Capabilities:</h3>
 * <ul>
 *   <li>Dynamic Virtual Accounts — one-time checkout via temporary NUBAN</li>
 *   <li>Static Wallets (Dedicated Accounts) — permanent account per customer
 *       for transfer-based recurring subscriptions (requires BVN)</li>
 *   <li>Transfer Status Queries</li>
 * </ul>
 *
 * <h3>Authentication:</h3>
 * All ALATPay requests use the {@code Ocp-Apim-Subscription-Key} header.
 *
 * <p>ALATPay does NOT support card tokenization — card charges will throw
 * {@link UnsupportedOperationException} and must be routed to Flutterwave.
 *
 * <h3>Fee Advantage (why ALATPay is the primary bank transfer rail):</h3>
 * <ul>
 *   <li>1.2% + ₦50 for local NGN (cheapest for ₦2,500–₦150,000 range)</li>
 *   <li>3.5% for international/FX — cheapest among fiat gateways</li>
 * </ul>
 */
@Slf4j
@Component
public class AlatPayGatewayAdapter implements GatewayAdapter {

    private static final String GATEWAY_NAME = "ALATPAY";

    private final RestTemplate restTemplate;
    private final Environment environment;

    @Value("${alatpay.test.subscription.key:}")
    private String testSubscriptionKey;

    @Value("${alatpay.live.subscription.key:}")
    private String liveSubscriptionKey;

    @Value("${alatpay.business.id:}")
    private String businessId;

    @Value("${alatpay.base.url:https://api.alatpay.com}")
    private String baseUrl;

    public AlatPayGatewayAdapter(RestTemplate restTemplate, Environment environment) {
        this.restTemplate = restTemplate;
        this.environment = environment;
    }

    @Override
    public String getGatewayName() {
        return GATEWAY_NAME;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CARD PAYMENTS — Not supported by ALATPay
    // ─────────────────────────────────────────────────────────────────────────────

    @Override
    public GatewayChargeResult chargeCard(CardChargeRequest request) {
        throw new UnsupportedOperationException(
                "ALATPay does not support card payments. " +
                "Route card transactions to FlutterwaveGatewayAdapter.");
    }

    @Override
    public GatewayChargeResult chargeRecurring(RecurringChargeRequest request) {
        throw new UnsupportedOperationException(
                "ALATPay does not support card tokenization or recurring card charges. " +
                "Route card recurring transactions to FlutterwaveGatewayAdapter.");
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // DYNAMIC VIRTUAL ACCOUNT — One-time checkout
    // POST /bank-transfer/api/v1/bankTransfer/virtualAccount
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Generates a temporary dynamic virtual account for a one-time checkout.
     * The customer transfers the exact amount to this account to complete payment.
     *
     * <p>Endpoint: {@code POST /bank-transfer/api/v1/bankTransfer/virtualAccount}
     */
    @Override
    @SuppressWarnings("unchecked")
    public GatewayAccountResult createDynamicVirtualAccount(VirtualAccountRequest request) {
        String url = baseUrl + "/bank-transfer/api/v1/bankTransfer/virtualAccount";

        Map<String, Object> customer = new HashMap<>();
        customer.put("email", request.getCustomerEmail());
        customer.put("phone", request.getCustomerPhone() != null ? request.getCustomerPhone() : "");
        customer.put("firstName", request.getFirstName() != null ? request.getFirstName() : "Customer");
        customer.put("lastName", request.getLastName() != null ? request.getLastName() : "");

        Map<String, Object> body = new HashMap<>();
        body.put("businessId", businessId);
        body.put("amount", request.getExpectedAmountNgn() != null ? request.getExpectedAmountNgn().doubleValue() : 0);
        body.put("currency", request.getCurrency() != null ? request.getCurrency() : "NGN");
        body.put("orderId", request.getOrderId() != null ? request.getOrderId() : request.getAccountRef());
        body.put("description", request.getDescription() != null ? request.getDescription() : "Arafi Payment");
        body.put("customer", customer);

        HttpHeaders headers = buildHeaders();
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        log.info("[ALATPay] createDynamicVirtualAccount — orderId={}, amount={}, email={}",
                body.get("orderId"), body.get("amount"), request.getCustomerEmail());

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();

            if (responseBody != null) {
                // ALATPay returns account details in the response body
                Object accountNumberObj = responseBody.get("accountNumber");
                Object bankNameObj = responseBody.get("bankName");

                // Try nested data object if flat structure not found
                if (accountNumberObj == null && responseBody.get("data") instanceof Map) {
                    Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
                    accountNumberObj = data.get("accountNumber");
                    bankNameObj = data.get("bankName");
                }

                if (accountNumberObj != null) {
                    String accountNumber = accountNumberObj.toString();
                    String bankName = bankNameObj != null ? bankNameObj.toString() : "Wema Bank";
                    log.info("[ALATPay] Dynamic VA created: accountNumber={}, bank={}", accountNumber, bankName);
                    return GatewayAccountResult.builder()
                            .success(true)
                            .bankAccountNumber(accountNumber)
                            .bankName(bankName)
                            .accountName(request.getAccountName())
                            .gatewayRef(request.getOrderId())
                            .build();
                }
            }

            log.error("[ALATPay] createDynamicVirtualAccount unexpected response: {}", responseBody);
            if (isSandboxMode()) {
                return sandboxAccountResult(request.getAccountName());
            }
            return GatewayAccountResult.builder()
                    .success(false)
                    .errorMessage("ALATPay virtual account creation returned unexpected response")
                    .build();

        } catch (HttpStatusCodeException e) {
            log.error("[ALATPay] createDynamicVirtualAccount HTTP error: {} — {}", e.getStatusCode(), e.getResponseBodyAsString());
            if (isSandboxMode()) return sandboxAccountResult(request.getAccountName());
            return GatewayAccountResult.builder()
                    .success(false)
                    .errorMessage("ALATPay VA creation HTTP error: " + e.getResponseBodyAsString())
                    .build();
        } catch (Exception e) {
            log.error("[ALATPay] createDynamicVirtualAccount exception: {}", e.getMessage());
            if (isSandboxMode()) return sandboxAccountResult(request.getAccountName());
            return GatewayAccountResult.builder()
                    .success(false)
                    .errorMessage("ALATPay VA creation exception: " + e.getMessage())
                    .build();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STATIC WALLET — Permanent dedicated account per customer
    // POST /alatpay-wallet/api/v1/staticaccount
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Creates a permanent dedicated virtual account (static wallet) for a customer.
     * This is used for transfer-based recurring subscriptions — customers always
     * pay to the same fixed account number each billing period.
     *
     * <p>Requires the customer's BVN for KYC compliance.
     *
     * <p>Endpoint: {@code POST /alatpay-wallet/api/v1/staticaccount}
     */
    @Override
    @SuppressWarnings("unchecked")
    public GatewayAccountResult createStaticWallet(StaticWalletRequest request) {
        String url = baseUrl + "/alatpay-wallet/api/v1/staticaccount";

        Map<String, Object> body = new HashMap<>();
        body.put("businessId", businessId);
        body.put("staticWalletType", request.getWalletType() > 0 ? request.getWalletType() : 1);
        body.put("bvn", request.getBvn());
        body.put("email", request.getCustomerEmail());

        HttpHeaders headers = buildHeaders();
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        log.info("[ALATPay] createStaticWallet — email={}, walletType={}", request.getCustomerEmail(), body.get("staticWalletType"));

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();

            if (responseBody != null) {
                Object accountNumberObj = responseBody.get("accountNumber");
                Object bankNameObj = responseBody.get("bankName");
                Object accountNameObj = responseBody.get("accountName");

                if (accountNumberObj == null && responseBody.get("data") instanceof Map) {
                    Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
                    accountNumberObj = data.get("accountNumber");
                    bankNameObj = data.get("bankName");
                    accountNameObj = data.get("accountName");
                }

                if (accountNumberObj != null) {
                    log.info("[ALATPay] Static wallet created: accountNumber={}", accountNumberObj);
                    return GatewayAccountResult.builder()
                            .success(true)
                            .bankAccountNumber(accountNumberObj.toString())
                            .bankName(bankNameObj != null ? bankNameObj.toString() : "Wema Bank")
                            .accountName(accountNameObj != null ? accountNameObj.toString() : request.getCustomerEmail())
                            .gatewayRef("alatpay_static_" + request.getCustomerEmail())
                            .build();
                }
            }

            log.error("[ALATPay] createStaticWallet unexpected response: {}", responseBody);
            if (isSandboxMode()) {
                return sandboxAccountResult("Static Wallet — " + request.getCustomerEmail());
            }
            return GatewayAccountResult.builder()
                    .success(false)
                    .errorMessage("ALATPay static wallet creation returned unexpected response")
                    .build();

        } catch (HttpStatusCodeException e) {
            log.error("[ALATPay] createStaticWallet HTTP error: {} — {}", e.getStatusCode(), e.getResponseBodyAsString());
            if (isSandboxMode()) return sandboxAccountResult(request.getCustomerEmail());
            return GatewayAccountResult.builder()
                    .success(false)
                    .errorMessage("ALATPay static wallet HTTP error: " + e.getResponseBodyAsString())
                    .build();
        } catch (Exception e) {
            log.error("[ALATPay] createStaticWallet exception: {}", e.getMessage());
            if (isSandboxMode()) return sandboxAccountResult(request.getCustomerEmail());
            return GatewayAccountResult.builder()
                    .success(false)
                    .errorMessage("ALATPay static wallet exception: " + e.getMessage())
                    .build();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PAYOUTS — Not yet implemented (ALATPay payout API TBD)
    // ─────────────────────────────────────────────────────────────────────────────

    @Override
    public GatewayTransferResult processTransfer(TransferRequest request) {
        throw new UnsupportedOperationException("ALATPay payout transfer not yet implemented in this adapter.");
    }

    @Override
    public GatewayChargeResult verifyTransaction(String gatewayReference, String orderReference) {
        String txId = (gatewayReference != null && !gatewayReference.isBlank()) ? gatewayReference : orderReference;
        String url = baseUrl + "/bank-transfer/api/v1/bankTransfer/transactions/" + txId;

        HttpHeaders headers = buildHeaders();
        HttpEntity<?> entity = new HttpEntity<>(headers);

        log.info("[ALATPay] verifyTransaction — url={}", url);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> body = response.getBody();
            if (body != null) {
                String status = body.get("status") != null ? body.get("status").toString() : "";
                boolean succeeded = status.toLowerCase().contains("success") || "00".equals(status) || "completed".equalsIgnoreCase(status);
                return GatewayChargeResult.builder()
                        .success(succeeded)
                        .gatewayTransactionId(txId)
                        .requiresCustomerAction(false)
                        .build();
            }
            return GatewayChargeResult.builder().success(false).errorMessage("ALATPay returned empty response").build();
        } catch (HttpStatusCodeException e) {
            log.error("[ALATPay] verifyTransaction HTTP error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            if (isSandboxMode()) {
                return GatewayChargeResult.builder().success(true).gatewayTransactionId(txId).requiresCustomerAction(false).build();
            }
            return GatewayChargeResult.builder().success(false).errorMessage("ALATPay verification HTTP error: " + e.getResponseBodyAsString()).build();
        } catch (Exception e) {
            log.error("[ALATPay] verifyTransaction exception: {}", e.getMessage());
            if (isSandboxMode()) {
                return GatewayChargeResult.builder().success(true).gatewayTransactionId(txId).requiresCustomerAction(false).build();
            }
            return GatewayChargeResult.builder().success(false).errorMessage("ALATPay verification exception: " + e.getMessage()).build();
        }
    }

    @Override
    public boolean isAvailable() {
        return true; // Passive telemetry — circuit breaker learns from real failures
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────────

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Ocp-Apim-Subscription-Key", getSubscriptionKey());
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private String getSubscriptionKey() {
        String mode = RequestContext.getMode();
        if ("live".equalsIgnoreCase(mode) && liveSubscriptionKey != null && !liveSubscriptionKey.isBlank()) {
            return liveSubscriptionKey;
        }
        return testSubscriptionKey;
    }

    private boolean isSandboxMode() {
        String mode = RequestContext.getMode();
        if (mode != null && "live".equalsIgnoreCase(mode)) return false;
        return environment != null &&
                environment.acceptsProfiles(
                        org.springframework.core.env.Profiles.of("dev", "development", "local", "test"));
    }

    private GatewayAccountResult sandboxAccountResult(String accountName) {
        String mockAccount = "99" + String.format("%08d", (long) (Math.random() * 100_000_000L));
        log.warn("[ALATPay] Sandbox fallback — returning mock virtual account: {}", mockAccount);
        return GatewayAccountResult.builder()
                .success(true)
                .bankAccountNumber(mockAccount)
                .bankName("Wema Bank (ALATPay Sandbox)")
                .accountName(accountName != null ? accountName : "Arafi Customer")
                .gatewayRef("alatpay_sandbox_" + UUID.randomUUID().toString().substring(0, 12))
                .build();
    }
}
