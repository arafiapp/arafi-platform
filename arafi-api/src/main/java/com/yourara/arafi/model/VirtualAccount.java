package com.yourara.arafi.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "virtual_accounts", schema = "arafi")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class VirtualAccount {
    @Id
    private UUID id;

    @Column(name = "app_id", nullable = false)
    private UUID appId;

    @Column(name = "customer_reference", nullable = false)
    private String customerReference;

    @Column(name = "account_number", nullable = false, unique = true)
    private String bankAccountNumber;

    @Column(name = "bank_name", nullable = false)
    private String bankName;

    @Column(nullable = false)
    private String currency;

    @Column(name = "nomba_ref", nullable = false)
    private String nombaRef;

    @Column(name = "gateway_source")
    private String gatewaySource; // "FLUTTERWAVE", "ALATPAY", "PAYSTACK", "NOMBA"

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) this.id = UUID.randomUUID();
        this.createdAt = Instant.now();
    }
}