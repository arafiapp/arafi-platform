package com.yourara.arafi.webhook.normalizer;

import com.yourara.arafi.webhook.ArafiEvent;

import java.util.Map;

/**
 * Strategy interface for normalizing raw gateway webhook payloads into
 * the Arafi-canonical {@link ArafiEvent} format.
 *
 * <p>One implementation exists per supported gateway:
 * <ul>
 *   <li>{@link FlutterwaveWebhookNormalizer}</li>
 *   <li>{@link AlatPayWebhookNormalizer}</li>
 *   <li>{@link PaystackWebhookNormalizer}</li>
 *   <li>{@link NombaWebhookNormalizer}</li>
 * </ul>
 *
 * <p>All four implementations are auto-discovered by
 * {@link com.yourara.arafi.webhook.WebhookNormalizerRegistry}.
 */
public interface WebhookNormalizer {

    /**
     * Returns the gateway name this normalizer handles.
     * Must match the gateway names used across Arafi: "FLUTTERWAVE", "ALATPAY", "PAYSTACK", "NOMBA".
     */
    String getSupportedGateway();

    /**
     * Verifies the webhook's authenticity using the gateway-specific signature mechanism.
     *
     * <ul>
     *   <li>Flutterwave: HMAC-SHA256 of raw body using FW secret key, compared to {@code verif-hash} header</li>
     *   <li>Paystack: HMAC-SHA512 of raw body using Paystack secret key, compared to {@code x-paystack-signature}</li>
     *   <li>ALATPay: subscription key presence check</li>
     *   <li>Nomba: existing signature logic</li>
     * </ul>
     *
     * @param rawBody         the raw HTTP request body bytes as a string (before JSON parsing)
     * @param signatureHeader the value of the gateway's signature header
     * @return true if the signature is valid
     */
    boolean verifySignature(String rawBody, String signatureHeader);

    /**
     * Translates a raw gateway webhook payload map into an {@link ArafiEvent}.
     *
     * @param rawPayload the deserialized JSON payload from the gateway's POST request
     * @return a normalized ArafiEvent, or null if the payload should be skipped (e.g., non-payment events)
     */
    ArafiEvent normalize(Map<String, Object> rawPayload);
}
