package com.yourara.arafi.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "subscriptions", schema = "arafi")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Subscription {

    @Id
    private UUID id;

    @Column(name = "app_id", nullable = false)
    private UUID appId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(nullable = false)
    private String status; // "PENDING", "ACTIVE", "EXPIRED"

    @Column(name = "current_period_end")
    private Instant currentPeriodEnd;

    @Column(name = "nomba_token_key")
    private String nombaTokenKey; // Stored from tokenized card checkout webhooks

    @Column(name = "virtual_account_number")
    private String virtualAccountNumber; // Bound static transfer fallback account

    @Column(name = "nomba_reference")
    private String nombaReference;

    @Column(name = "gateway_used")
    private String gatewayUsed; // "FLUTTERWAVE", "ALATPAY", "PAYSTACK", "NOMBA"

    @Column(name = "gateway_reference")
    private String gatewayReference;

    @Column(name = "flutterwave_payment_method_id")
    private String flutterwavePaymentMethodId;

    @Column(name = "checkout_url", columnDefinition = "TEXT")
    private String checkoutUrl;

    @Column(name = "mode", nullable = false)
    private String mode; // "test" or "live"

    @Column(name = "redirect_url", columnDefinition = "TEXT")
    private String redirectUrl;

    @Column(name = "cancel_at_period_end")
    private Boolean cancelAtPeriodEnd;

    @Column(name = "paused")
    private Boolean paused;

    @Column(name = "discount_amount_kobo")
    private Long discountAmountKobo;

    @Column(name = "applied_coupon_code")
    private String appliedCouponCode;

    @Column(name = "grace_period_start")
    private Instant gracePeriodStart;

    @Column(name = "retry_count")
    private Integer retryCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) this.id = UUID.randomUUID();
        this.createdAt = Instant.now();
        if (this.cancelAtPeriodEnd == null) this.cancelAtPeriodEnd = false;
        if (this.paused == null) this.paused = false;
        if (this.retryCount == null) this.retryCount = 0;
    }
}
