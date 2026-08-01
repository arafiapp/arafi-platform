package com.yourara.arafi.model.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;
import java.util.UUID;

@Getter
@Setter
public class CreateSubscriptionRequest {

    @JsonProperty("customer_id")
    private UUID customerId;

    @JsonProperty("plan_id")
    private UUID planId;

    /**
     * Payment method type: "CARD" or "BANK_TRANSFER".
     * Null/omitted → Arafi Hosted Checkout (customer selects on-page).
     */
    @JsonProperty("payment_method")
    private String paymentMethod;

    @JsonProperty("redirect_url")
    private String redirectUrl;

    @JsonProperty("coupon_code")
    private String couponCode;

    // ─── Gateway Routing Controls ────────────────────────────────────────────
    // All optional. If omitted, Arafi auto-routes to the cost-optimal gateway.

    /**
     * Developer-specified gateway preference.
     * Values: "FLUTTERWAVE", "ALATPAY", "PAYSTACK", "NOMBA"
     * If null/omitted, Arafi picks the cheapest gateway automatically.
     */
    @JsonProperty("preferred_gateway")
    private String preferredGateway;

    /**
     * If true (default), Arafi automatically retries failed charges on the next
     * available gateway. If false, the charge fails immediately without fallback.
     * Default: true (safe for most use cases).
     */
    @JsonProperty("allow_fallback")
    private boolean allowFallback = true;

    /**
     * Set to true for international/cross-border payments.
     * Routes to ALATPay (FX) or Stellar (crypto) instead of local rails.
     */
    @JsonProperty("is_international")
    private boolean isInternational = false;

    // ─── Flutterwave Card Encryption Fields ──────────────────────────────────
    // Required for first-time card enrollment when using Flutterwave direct-charge flow.
    // The developer's frontend must encrypt these using Flutterwave's encryption SDK.
    // All fields are null when using the hosted checkout redirect flow.

    /** Client-side encrypted card number (using Flutterwave's SDK + nonce). */
    @JsonProperty("encrypted_card_number")
    private String encryptedCardNumber;

    /** Client-side encrypted card expiry month. */
    @JsonProperty("encrypted_expiry_month")
    private String encryptedExpiryMonth;

    /** Client-side encrypted card expiry year. */
    @JsonProperty("encrypted_expiry_year")
    private String encryptedExpiryYear;

    /** Client-side encrypted card CVV. */
    @JsonProperty("encrypted_cvv")
    private String encryptedCvv;

    /** Nonce used during client-side encryption — required by Flutterwave. */
    @JsonProperty("card_nonce")
    private String cardNonce;
}
