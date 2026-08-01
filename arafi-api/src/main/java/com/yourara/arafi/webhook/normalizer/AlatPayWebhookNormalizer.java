package com.yourara.arafi.webhook.normalizer;

import com.yourara.arafi.webhook.ArafiEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Normalizes ALATPay webhook payloads into {@link ArafiEvent}.
 *
 * <h3>ALATPay Webhook Auth:</h3>
 * ALATPay webhooks are authenticated via the {@code Ocp-Apim-Subscription-Key} header
 * presence and value check. No HMAC signature is used.
 *
 * <h3>Relevant Events:</h3>
 * <ul>
 *   <li>Transfer credit notifications — inbound transfer received on a dynamic/static VA</li>
 *   <li>Transaction status updates</li>
 * </ul>
 */
@Slf4j
@Component
public class AlatPayWebhookNormalizer implements WebhookNormalizer {

    @Value("${alatpay.test.subscription.key:}")
    private String testSubscriptionKey;

    @Value("${alatpay.live.subscription.key:}")
    private String liveSubscriptionKey;

    @Override
    public String getSupportedGateway() {
        return "ALATPAY";
    }

    /**
     * ALATPay uses the subscription key as its auth mechanism.
     * Validates that the incoming header matches the configured key.
     */
    @Override
    public boolean verifySignature(String rawBody, String signatureHeader) {
        String activeKey = (liveSubscriptionKey != null && !liveSubscriptionKey.isBlank())
                ? liveSubscriptionKey : testSubscriptionKey;

        if (activeKey == null || activeKey.isBlank()) {
            log.warn("[ALAT Normalizer] Subscription key not configured — accepting webhook (configure in production!)");
            return true;
        }
        boolean valid = activeKey.equals(signatureHeader);
        if (!valid) log.warn("[ALAT Normalizer] Subscription key mismatch");
        return valid;
    }

    @Override
    @SuppressWarnings("unchecked")
    public ArafiEvent normalize(Map<String, Object> rawPayload) {
        // ALATPay sends transfer credit notifications with transaction details
        // Field names may vary — we extract the most common patterns

        String transactionId = extractString(rawPayload, "transactionId", "transactionReference", "reference");
        String status = extractString(rawPayload, "status", "transactionStatus");
        Object amountRaw = rawPayload.get("amount");
        if (amountRaw == null) amountRaw = rawPayload.get("settledAmount");

        BigDecimal amount = extractAmount(amountRaw);
        String currency = extractString(rawPayload, "currency");
        if (currency == null) currency = "NGN";

        String orderId = extractString(rawPayload, "orderId", "externalReference");
        String accountNumber = extractString(rawPayload, "accountNumber", "virtualAccountNumber");

        // ALATPay "successful" / "success" → payment.succeeded; others → payment.failed
        boolean succeeded = status != null && (status.toLowerCase().contains("success") ||
                "00".equals(status) || "completed".equalsIgnoreCase(status));
        String arafiEventType = succeeded ? "transfer.received" : "payment.failed";

        Map<String, Object> metadata = new HashMap<>(rawPayload);
        metadata.put("alatpay_transaction_id", transactionId);
        metadata.put("virtual_account_number", accountNumber);

        log.info("[ALAT Normalizer] Normalized: transactionId={}, eventType={}, amount={} {}, orderId={}",
                transactionId, arafiEventType, amount, currency, orderId);

        return ArafiEvent.builder()
                .eventId(UUID.randomUUID())
                .eventType(arafiEventType)
                .gatewaySource("ALATPAY")
                .gatewayReference(transactionId)
                .amount(amount)
                .currency(currency)
                .arafiCustomerRef(null) // ALATPay does not include customer email in webhook
                .arafiOrderRef(orderId)
                .paymentMethodType("bank_transfer")
                .occurredAt(Instant.now())
                .metadata(metadata)
                .build();
    }

    private String extractString(Map<String, Object> map, String... keys) {
        for (String key : keys) {
            Object val = map.get(key);
            if (val != null && !val.toString().isBlank()) return val.toString();
        }
        return null;
    }

    private BigDecimal extractAmount(Object raw) {
        if (raw instanceof Number) return BigDecimal.valueOf(((Number) raw).doubleValue());
        if (raw instanceof String) { try { return new BigDecimal(raw.toString()); } catch (Exception ignored) {} }
        return BigDecimal.ZERO;
    }
}
