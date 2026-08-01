package com.yourara.arafi.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "customers", schema = "arafi")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Customer {

    @Id
    private UUID id;

    @Column(name = "app_id", nullable = false)
    private UUID appId;

    @Column(nullable = false)
    private String email;

    @Column(name = "name")
    private String name;

    @Column(name = "external_ref")
    private String externalRef;

    /**
     * Legacy Nomba card token — retained for existing subscriptions enrolled before the gateway migration.
     * New subscriptions use {@code flutterwavePaymentMethodId} or {@code paystackAuthorizationCode}.
     */
    @Column(name = "nomba_token_key")
    private String nombaTokenKey;

    /**
     * Flutterwave customer ID (cus_XXX) — stored after first Flutterwave checkout.
     * Required for recurring charges via Flutterwave's payment_method_id.
     */
    @Column(name = "flutterwave_customer_id")
    private String flutterwaveCustomerId;

    /**
     * Flutterwave payment method ID (pmd_XXX) — the recurring card token.
     * Replaces Nomba tokenKey for new card subscriptions.
     * Used in POST /charges with recurring: true.
     */
    @Column(name = "flutterwave_payment_method_id")
    private String flutterwavePaymentMethodId;

    /**
     * Paystack authorization code (AUTH_XXX) — the recurring card token for Paystack.
     * Stored after a successful first-time Paystack checkout webhook is received.
     * Used in POST /transaction/charge_authorization for silent recurring charges.
     */
    @Column(name = "paystack_authorization_code")
    private String paystackAuthorizationCode;

    /**
     * Customer BVN — optional, required only when creating an ALATPay static wallet
     * for transfer-based recurring subscriptions. Stored encrypted.
     */
    @Column(name = "bvn", length = 11)
    private String bvn;

    @Column(name = "virtual_account_number")
    private String virtualAccountNumber;

    @Column(name = "mode", nullable = false)
    private String mode; // "test" or "live"

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) this.id = UUID.randomUUID();
        this.createdAt = Instant.now();
    }
}
