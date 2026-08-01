package com.yourara.arafi.webhook;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Arafi's normalized webhook event — the single event format delivered to
 * developer applications regardless of which underlying gateway processed
 * the payment.
 *
 * <p>Developers who build on Arafi never need to know whether a payment was
 * processed by Flutterwave, ALATPay, Paystack, or Nomba. They subscribe to
 * Arafi webhooks and receive {@code ArafiEvent} objects with a consistent schema.
 *
 * <h3>Event Types:</h3>
 * <ul>
 *   <li>{@code payment.succeeded} — a charge was successfully collected</li>
 *   <li>{@code payment.failed} — a charge attempt failed</li>
 *   <li>{@code subscription.activated} — a subscription moved to ACTIVE</li>
 *   <li>{@code subscription.renewed} — a recurring subscription renewal succeeded</li>
 *   <li>{@code subscription.expired} — a subscription lapsed (grace period ended)</li>
 *   <li>{@code transfer.received} — an inbound bank transfer was received on a virtual account</li>
 * </ul>
 */
@Getter
@Builder
public class ArafiEvent {

    /** Arafi-generated UUID for this event (idempotency key for developer systems). */
    private final UUID eventId;

    /**
     * Normalized event type — one of the values documented above.
     * Developers switch on this to handle different payment lifecycle events.
     */
    private final String eventType;

    /**
     * The gateway that processed this payment behind the scenes.
     * Informational only — developers should not need to act on this.
     * Values: "FLUTTERWAVE", "ALATPAY", "PAYSTACK", "NOMBA"
     */
    private final String gatewaySource;

    /**
     * Gateway-native transaction or charge ID.
     * e.g. Flutterwave: "chg_XXX", Paystack: transaction ID, Nomba: transactionId.
     * Useful for reconciliation and support queries.
     */
    private final String gatewayReference;

    /**
     * Payment amount in the transaction currency.
     * Always a positive number — use {@code eventType} to determine direction.
     */
    private final BigDecimal amount;

    /** Transaction currency code, e.g. "NGN", "USD". */
    private final String currency;

    /** The Arafi customer ID (UUID) associated with this payment. */
    private final String arafiCustomerRef;

    /**
     * The developer's workspace / app ID.
     * Used to route this event to the correct developer webhook endpoint.
     */
    private final String workspaceId;

    /**
     * The Arafi subscription or transaction reference this event relates to.
     * Developers use this to look up the subscription or order in their own database.
     */
    private final String arafiOrderRef;

    /**
     * Payment method used by the customer.
     * Values: "card", "bank_transfer"
     */
    private final String paymentMethodType;

    /** ISO 8601 timestamp of when this event occurred at the gateway. */
    private final Instant occurredAt;

    /**
     * Gateway-specific extras for reconciliation.
     * Developers do not need to parse this for normal flows,
     * but it is available for debugging and custom integrations.
     */
    private final Map<String, Object> metadata;
}
