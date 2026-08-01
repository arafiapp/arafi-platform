package com.yourara.arafi.webhook.normalizer;

import com.yourara.arafi.webhook.ArafiEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Normalizes Flutterwave v4 webhook payloads into {@link ArafiEvent}.
 *
 * <h3>Flutterwave Webhook Auth:</h3>
 * Flutterwave sends a {@code verif-hash} header containing a static hash
 * configured in the FW dashboard. We compare it directly (not HMAC).
 *
 * <h3>Relevant FW Webhook Events:</h3>
 * <ul>
 *   <li>{@code charge.completed} — payment succeeded</li>
 *   <li>{@code charge.failed} — payment failed</li>
 * </ul>
 *
 * <h3>Sample FW Payload (charge.completed):</h3>
 * <pre>
 * {
 *   "webhook_id": "wbk_XXX",
 *   "type": "charge.completed",
 *   "data": {
 *     "id": "chg_XXX",
 *     "amount": 2000,
 *     "currency": "NGN",
 *     "status": "succeeded",
 *     "reference": "arafi-order-ref",
 *     "customer": { "id": "cus_XXX", "email": "user@example.com" },
 *     "payment_method": { "id": "pmd_XXX", "type": "card" }
 *   }
 * }
 * </pre>
 */
@Slf4j
@Component
public class FlutterwaveWebhookNormalizer implements WebhookNormalizer {

    @Value("${flutterwave.webhook.hash:}")
    private String webhookHash;

    @Override
    public String getSupportedGateway() {
        return "FLUTTERWAVE";
    }

    /**
     * Flutterwave uses a static hash string (not HMAC) set in the FW dashboard.
     * The {@code verif-hash} header must match exactly.
     */
    @Override
    public boolean verifySignature(String rawBody, String signatureHeader) {
        if (webhookHash == null || webhookHash.isBlank()) {
            log.warn("[FW Normalizer] Webhook hash not configured — accepting all webhooks (configure in production!)");
            return true;
        }
        boolean valid = webhookHash.equals(signatureHeader);
        if (!valid) {
            log.warn("[FW Normalizer] Signature mismatch — received: {}", signatureHeader);
        }
        return valid;
    }

    @Override
    @SuppressWarnings("unchecked")
    public ArafiEvent normalize(Map<String, Object> rawPayload) {
        String eventType = rawPayload.get("type") != null ? rawPayload.get("type").toString() : "";

        // Only process charge events
        if (!eventType.startsWith("charge.")) {
            log.debug("[FW Normalizer] Skipping non-charge event: {}", eventType);
            return null;
        }

        Map<String, Object> data = (Map<String, Object>) rawPayload.get("data");
        if (data == null) {
            log.error("[FW Normalizer] Missing 'data' in payload");
            return null;
        }

        String chargeId = data.get("id") != null ? data.get("id").toString() : null;
        String status = data.get("status") != null ? data.get("status").toString() : "";
        String reference = data.get("reference") != null ? data.get("reference").toString() : null;
        BigDecimal amount = extractAmount(data.get("amount"));
        String currency = data.get("currency") != null ? data.get("currency").toString() : "NGN";

        // Extract customer info
        String customerEmail = null;
        if (data.get("customer") instanceof Map) {
            Map<String, Object> customer = (Map<String, Object>) data.get("customer");
            customerEmail = customer.get("email") != null ? customer.get("email").toString() : null;
        }

        // Map FW status to Arafi event type
        String arafiEventType = mapEventType(eventType, status);
        if (arafiEventType == null) {
            log.debug("[FW Normalizer] Unmapped event type/status: {}/{}", eventType, status);
            return null;
        }

        // Collect metadata for reconciliation
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("flutterwave_charge_id", chargeId);
        metadata.put("flutterwave_status", status);
        metadata.put("customer_email", customerEmail);
        if (data.get("payment_method") instanceof Map) {
            Map<String, Object> pm = (Map<String, Object>) data.get("payment_method");
            metadata.put("payment_method_id", pm.get("id"));
            metadata.put("payment_method_type", pm.get("type"));
        }

        log.info("[FW Normalizer] Normalized: chargeId={}, eventType={}, amount={} {}, ref={}",
                chargeId, arafiEventType, amount, currency, reference);

        return ArafiEvent.builder()
                .eventId(UUID.randomUUID())
                .eventType(arafiEventType)
                .gatewaySource("FLUTTERWAVE")
                .gatewayReference(chargeId)
                .amount(amount)
                .currency(currency)
                .arafiCustomerRef(customerEmail)
                .arafiOrderRef(reference)
                .paymentMethodType("card")
                .occurredAt(Instant.now())
                .metadata(metadata)
                .build();
    }

    private String mapEventType(String fwType, String status) {
        return switch (fwType.toLowerCase()) {
            case "charge.completed" -> "succeeded".equalsIgnoreCase(status) || "successful".equalsIgnoreCase(status)
                    ? "payment.succeeded" : "payment.failed";
            case "charge.failed" -> "payment.failed";
            default -> null;
        };
    }

    private BigDecimal extractAmount(Object raw) {
        if (raw instanceof Number) return BigDecimal.valueOf(((Number) raw).doubleValue());
        if (raw instanceof String) { try { return new BigDecimal(raw.toString()); } catch (Exception ignored) {} }
        return BigDecimal.ZERO;
    }
}
