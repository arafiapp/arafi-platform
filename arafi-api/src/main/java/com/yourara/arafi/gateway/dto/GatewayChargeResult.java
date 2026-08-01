package com.yourara.arafi.gateway.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * Normalized result from any gateway charge operation (one-time or recurring).
 * All adapters translate their gateway-specific responses into this object.
 */
@Getter
@Builder
public class GatewayChargeResult {

    /** Whether the charge succeeded. */
    private final boolean success;

    /**
     * The gateway-native transaction / charge ID.
     * e.g. Flutterwave: "chg_XXX", Paystack: transaction reference, Nomba: transactionId.
     */
    private final String gatewayTransactionId;

    /**
     * The gateway-native payment method token to store for future recurring charges.
     * - Flutterwave: payment_method_id ("pmd_XXX")
     * - Paystack: authorization_code ("AUTH_XXX")
     * - Nomba: tokenKey
     * Null if charge failed or no token was issued.
     */
    private final String paymentToken;

    /**
     * The gateway's customer ID — store this for Flutterwave recurring charges.
     * - Flutterwave: "cus_XXX"
     * - Paystack: not applicable
     * - Nomba: not applicable
     */
    private final String gatewayCustomerId;

    /**
     * For first-time checkouts, the URL to redirect the customer to complete payment.
     * e.g. Flutterwave 3DS redirect URL, Nomba checkoutLink.
     * Null for direct/recurring charges.
     */
    private final String checkoutUrl;

    /**
     * Whether this result requires further customer authentication before it is confirmed.
     * True when a checkoutUrl is returned (3DS, PIN flow, etc.).
     */
    private final boolean requiresCustomerAction;

    /**
     * The name of the gateway that processed this transaction.
     * e.g., "FLUTTERWAVE", "PAYSTACK", "NOMBA"
     */
    private final String gatewayUsed;

    /** Human-readable error message when success = false. */
    private final String errorMessage;
}
