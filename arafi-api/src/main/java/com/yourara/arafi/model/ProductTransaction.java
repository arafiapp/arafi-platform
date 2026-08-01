package com.yourara.arafi.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "product_transactions", schema = "arafi")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductTransaction {

    @Id
    private UUID id;

    @Column(name = "app_id", nullable = false)
    private UUID appId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "amount_kobo", nullable = false)
    private Long amountKobo;

    @Column(nullable = false)
    private String status; // PENDING, SUCCESS, FAILED

    @Column(name = "payment_method", nullable = false)
    private String paymentMethod; // CARD, BANK_TRANSFER

    @Column(name = "virtual_account_number")
    private String virtualAccountNumber;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "bank_account_name")
    private String bankAccountName;

    @Column(name = "nomba_reference")
    private String nombaReference;

    @Column(name = "gateway_used")
    private String gatewayUsed; // "FLUTTERWAVE", "ALATPAY", "PAYSTACK", "NOMBA"

    @Column(name = "gateway_reference")
    private String gatewayReference;

    @Column(name = "checkout_url", length = 1024)
    private String checkoutUrl;

    @Column(name = "redirect_url", length = 1024)
    private String redirectUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) this.id = UUID.randomUUID();
        this.createdAt = Instant.now();
        if (this.status == null) this.status = "PENDING";
    }
}
