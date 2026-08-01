package com.yourara.arafi.webhook.normalizer;

import com.yourara.arafi.webhook.ArafiEvent;
import com.yourara.arafi.service.NombaClientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Normalizes Nomba webhook payloads into {@link ArafiEvent}.
 *
 * <p>Wraps existing Nomba webhook parsing logic to fit the normalized framework.
 * This normalizer handles legacy subscriptions that were enrolled via Nomba
 * before the gateway migration. New subscriptions will not produce Nomba webhooks.
 *
 * <h3>Key Nomba Events:</h3>
 * <ul>
 *   <li>Card payment completion → extracts {@code tokenizedCardData.tokenKey}</li>
 *   <li>Bank transfer credit → extracts {@code aliasAccountNumber}</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NombaWebhookNormalizer implements WebhookNormalizer {

    @Override
    public String getSupportedGateway() {
        return "NOMBA";
    }

    /**
     * Nomba uses a shared secret signature header.
     * Delegates to existing signature verification logic.
     * For now, returns true (existing controller handles verification before calling normalizer).
     */
    @Override
    public boolean verifySignature(String rawBody, String signatureHeader) {
        // Nomba signature verification is handled upstream in the existing controller.
        // This normalizer trusts that the caller has already verified the signature.
        return true;
    }

    @Override
    @SuppressWarnings("unchecked")
    public ArafiEvent normalize(Map<String, Object> rawPayload) {
        Object eventTypeObj = rawPayload.get("event");
        if (eventTypeObj == null) {
            eventTypeObj = rawPayload.get("event_type");
        }
        String eventTypeStr = eventTypeObj != null ? eventTypeObj.toString() : "";

        Object dataObj = rawPayload.get("data");

        Map<String, Object> data = dataObj instanceof Map
                ? (Map<String, Object>) dataObj : rawPayload;

        String transactionId = extractString(data, "transactionId", "id", "reference");
        String status = extractString(data, "status", "transactionStatus");

        BigDecimal amount = BigDecimal.ZERO;
        if (data.get("transaction") instanceof Map) {
            Map<String, Object> transaction = (Map<String, Object>) data.get("transaction");
            amount = extractAmountDecimal(transaction.get("transactionAmount"));
        }
        if (amount.compareTo(BigDecimal.ZERO) == 0) {
            amount = extractAmountDecimal(data.get("amount"));
        }

        String currency = "NGN";

        // Extract Nomba-specific fields
        String tokenKey = null;
        if (data.get("tokenizedCardData") instanceof Map) {
            Map<String, Object> tokenData = (Map<String, Object>) data.get("tokenizedCardData");
            tokenKey = extractString(tokenData, "tokenKey");
        }
        if (tokenKey == null) {
            tokenKey = extractString(data, "tokenKey");
        }

        String aliasAccountNumber = extractString(data, "aliasAccountNumber", "virtualAccount");
        if (aliasAccountNumber == null) {
            aliasAccountNumber = extractString(data, "bankAccountNumber"); // test compatibility
        }

        String customerEmail = extractString(data, "customerEmail", "email");
        String orderRef = extractString(data, "orderReference", "externalReference");
        if (orderRef == null) {
            orderRef = extractString(rawPayload, "requestId");
        }

        boolean isCard = tokenKey != null || aliasAccountNumber == null;
        String paymentType = isCard ? "card" : "bank_transfer";
        boolean succeeded = (status != null && (status.toLowerCase().contains("success") ||
                "completed".equalsIgnoreCase(status) || "successful".equalsIgnoreCase(status)))
                || eventTypeStr.toLowerCase().contains("success")
                || "virtual_account_payment".equalsIgnoreCase(eventTypeStr);
        String arafiEventType = succeeded ? "payment.succeeded" : "payment.failed";

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("nomba_transaction_id", transactionId);
        if (tokenKey != null) metadata.put("nomba_token_key", tokenKey);
        if (aliasAccountNumber != null) {
            metadata.put("alias_account_number", aliasAccountNumber);
            metadata.put("virtual_account_number", aliasAccountNumber);
        }
        metadata.put("customer_email", customerEmail);

        log.info("[Nomba Normalizer] Normalized: transactionId={}, eventType={}, amount={}, orderRef={}",
                transactionId, arafiEventType, amount, orderRef);

        return ArafiEvent.builder()
                .eventId(UUID.randomUUID())
                .eventType(arafiEventType)
                .gatewaySource("NOMBA")
                .gatewayReference(transactionId)
                .amount(amount)
                .currency(currency)
                .arafiCustomerRef(customerEmail)
                .arafiOrderRef(orderRef)
                .paymentMethodType(paymentType)
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

    private BigDecimal extractAmountDecimal(Object raw) {
        if (raw instanceof Number) {
            return BigDecimal.valueOf(((Number) raw).doubleValue());
        }
        if (raw instanceof String) {
            try {
                return new BigDecimal(raw.toString());
            } catch (Exception ignored) {}
        }
        return BigDecimal.ZERO;
    }
}
