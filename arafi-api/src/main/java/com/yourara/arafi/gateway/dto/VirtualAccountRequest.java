package com.yourara.arafi.gateway.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * Arafi-internal dynamic virtual account request.
 * Generates a one-time, temporary virtual account for a single checkout.
 */
@Getter
@Builder
public class VirtualAccountRequest {

    /** Unique reference for this virtual account — used as idempotency key. */
    private final String accountRef;

    /** Display name for the virtual account. */
    private final String accountName;

    /** Customer email. */
    private final String customerEmail;

    /** Customer phone number. */
    private final String customerPhone;

    /** Customer first name. */
    private final String firstName;

    /** Customer last name. */
    private final String lastName;

    /** Amount in NGN the account is expected to receive. */
    private final BigDecimal expectedAmountNgn;

    /** Currency — "NGN". */
    private final String currency;

    /** A developer-supplied order/transaction reference to tag this account to. */
    private final String orderId;

    /** Payment description shown to payer. */
    private final String description;
}
