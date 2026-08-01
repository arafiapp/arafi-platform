package com.yourara.arafi.gateway.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * Arafi-internal card charge request passed to any GatewayAdapter.
 * Adapters translate this into their gateway-specific payload.
 */
@Getter
@Builder
public class CardChargeRequest {

    /** Arafi customer ID (UUID string) — for reference/idempotency. */
    private final String arafiCustomerId;

    /** Customer email — required by all gateways. */
    private final String customerEmail;

    /** Amount in NGN (not kobo). */
    private final BigDecimal amountNgn;

    /** Currency code — e.g. "NGN", "USD". */
    private final String currency;

    /** Unique idempotency / order reference for this charge attempt. */
    private final String orderReference;

    /** URL to redirect the customer's browser after checkout completes. */
    private final String callbackUrl;

    /**
     * Pre-encrypted card number (encrypted client-side using the gateway's SDK/nonce).
     * Null when the customer already has a stored payment method.
     */
    private final String encryptedCardNumber;

    private final String encryptedExpiryMonth;

    private final String encryptedExpiryYear;

    private final String encryptedCvv;

    /** Nonce used during client-side encryption. */
    private final String cardNonce;
}
