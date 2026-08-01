package com.yourara.arafi.gateway.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * Arafi-internal recurring charge request.
 * Used when a customer already has a stored payment method token
 * (Flutterwave payment_method_id, Paystack authorization_code, or Nomba tokenKey).
 * No customer interaction is required for this charge.
 */
@Getter
@Builder
public class RecurringChargeRequest {

    /** Customer email — required by all gateways for logging. */
    private final String customerEmail;

    /** Amount in NGN (not kobo). */
    private final BigDecimal amountNgn;

    /** Currency code — e.g. "NGN". */
    private final String currency;

    /** Unique idempotency reference for this renewal attempt. */
    private final String orderReference;

    /**
     * The stored payment method token.
     * - Flutterwave: payment_method_id ("pmd_XXX")
     * - Paystack: authorization_code ("AUTH_XXX")
     * - Nomba: tokenKey (fallback)
     */
    private final String paymentToken;

    /**
     * The gateway-specific customer ID (if required by the gateway).
     * - Flutterwave: cus_XXX
     * - Paystack: not required (uses authorization_code alone)
     * - Nomba: uses email
     */
    private final String gatewayCustomerId;

    /**
     * Gateway sub-account / merchant account target.
     * Used by Nomba only; null for Flutterwave/Paystack.
     */
    private final String gatewaySubAccountId;
}
