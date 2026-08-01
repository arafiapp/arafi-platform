package com.yourara.arafi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "webhook_events", schema = "arafi")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebhookEvent {

    @Id
    private UUID id;

    @Column(name = "nomba_event_id", nullable = false, unique = true)
    private String nombaEventId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_payload", columnDefinition = "jsonb")
    private Map<String, Object> rawPayload;

    @Column(name = "is_signature_verified")
    private boolean isSignatureVerified;

    @Column(name = "processing_status")
    private String processingStatus;

    @Column(name = "gateway_source", length = 20)
    private String gatewaySource; // "FLUTTERWAVE", "ALATPAY", "PAYSTACK", "NOMBA"

    @Column(name = "received_at")
    private Instant receivedAt;

    @PrePersist
    protected void onCreate(){
        if(this.id == null) this.id = UUID.randomUUID();
        this.receivedAt = Instant.now();
    }
}
