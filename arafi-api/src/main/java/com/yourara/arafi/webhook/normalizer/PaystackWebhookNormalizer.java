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
 * Normalizes Paystack webhook payloads into {@link ArafiEvent}.
 *
 * <h3>Paystack Webhook Auth (HMAC-SHA512):</h3>
 * Paystack signs the raw request body using HMAC-SHA512 with the Paystack secret key.
 * Compare the result to the {@code x-paystack-signature} header (hex-encoded).
 *
 * <h3>Key Paystack Events:</h3>
 * <ul>
 *   <li>{@code charge.success} — payment collected</li>
 *   <li>{@code charge.failed} — payment failed</li>
 *   <li>{@code transfer.success} — payout succeeded</li>
 * </ul>
 *
 * <h3>Critical: Authorization Code Extraction</h3>
 * When {@code charge.success} fires for a first-time customer, the payload contains
 * {@code data.authorization.authorization_code}. This code must be stored on the
 * Customer record for future recurring charges via {@code POST /transaction/charge_authorization}.
 */
@Slf4j
@Component
public class PaystackWebhookNormalizer implements WebhookNormalizer {

    @Value("${paystack.test.secret.key:}")
    private String testSecretKey;

    @Value("${paystack.live.secret.key:}")
    private String liveSecretKey;

    @Override
    public String getSupportedGateway() {
        return "PAYSTACK";
    }

    /**
     * Verifies HMAC-SHA512 signature.
     * Paystack sends: HMAC-SHA512(raw_body, secret_key) as hex in {@code x-paystack-signature}.
     */
    @Override
    public boolean verifySignature(String rawBody, String signatureHeader) {
        String key = (liveSecretKey != null && !liveSecretKey.isBlank()) ? liveSecretKey : testSecretKey;
        if (key == null || key.isBlank()) {
            log.warn("[PS Normalizer] Secret key not configured — skipping signature check in dev mode");
            return true;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] computed = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
            String computedHex = bytesToHex(computed);
            boolean valid = computedHex.equalsIgnoreCase(signatureHeader);
            if (!valid) log.warn("[PS Normalizer] HMAC mismatch");
            return valid;
        } catch (Exception e) {
            log.error("[PS Normalizer] Signature verification error: {}", e.getMessage());
            return false;
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public ArafiEvent normalize(Map<String, Object> rawPayload) {
        String event = rawPayload.get("event") != null ? rawPayload.get("event").toString() : "";

        if (!event.startsWith("charge.")) {
            log.debug("[PS Normalizer] Skipping non-charge event: {}", event);
            return null;
        }

        Map<String, Object> data = (Map<String, Object>) rawPayload.get("data");
        if (data == null) {
            log.error("[PS Normalizer] Missing 'data' in Paystack payload");
            return null;
        }

        String reference = data.get("reference") != null ? data.get("reference").toString() : null;
        String status = data.get("status") != null ? data.get("status").toString() : "";
        BigDecimal amountKobo = extractAmount(data.get("amount"));
        BigDecimal amountNgn = amountKobo.divide(BigDecimal.valueOf(100));
        String currency = data.get("currency") != null ? data.get("currency").toString() : "NGN";

        // Extract customer email
        String customerEmail = null;
        if (data.get("customer") instanceof Map) {
            Map<String, Object> customer = (Map<String, Object>) data.get("customer");
            customerEmail = customer.get("email") != null ? customer.get("email").toString() : null;
        }

        // Extract authorization code for recurring charges (critical for card tokenization)
        String authorizationCode = null;
        if (data.get("authorization") instanceof Map) {
            Map<String, Object> auth = (Map<String, Object>) data.get("authorization");
            authorizationCode = auth.get("authorization_code") != null
                    ? auth.get("authorization_code").toString() : null;
        }

        String arafiEventType = "charge.success".equalsIgnoreCase(event) ? "payment.succeeded" : "payment.failed";

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("paystack_reference", reference);
        metadata.put("paystack_status", status);
        metadata.put("customer_email", customerEmail);
        // Include authorization_code in metadata so the webhook processor can store it on the Customer
        if (authorizationCode != null) {
            metadata.put("paystack_authorization_code", authorizationCode);
        }

        log.info("[PS Normalizer] Normalized: event={}, arafiType={}, amount={} {}, ref={}, authCode={}",
                event, arafiEventType, amountNgn, currency, reference,
                authorizationCode != null ? "PRESENT" : "NULL");

        return ArafiEvent.builder()
                .eventId(UUID.randomUUID())
                .eventType(arafiEventType)
                .gatewaySource("PAYSTACK")
                .gatewayReference(reference)
                .amount(amountNgn)
                .currency(currency)
                .arafiCustomerRef(customerEmail)
                .arafiOrderRef(reference)
                .paymentMethodType("card")
                .occurredAt(Instant.now())
                .metadata(metadata)
                .build();
    }

    private BigDecimal extractAmount(Object raw) {
        if (raw instanceof Number) return BigDecimal.valueOf(((Number) raw).doubleValue());
        if (raw instanceof String) { try { return new BigDecimal(raw.toString()); } catch (Exception ignored) {} }
        return BigDecimal.ZERO;
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
