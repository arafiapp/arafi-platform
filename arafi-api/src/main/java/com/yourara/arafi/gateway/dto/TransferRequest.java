package com.yourara.arafi.gateway.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * Arafi-internal payout / bank transfer request.
 */
@Getter
@Builder
public class TransferRequest {

    /** Destination bank code (NIBSS code). */
    private final String bankCode;

    /** Destination account number. */
    private final String accountNumber;

    /** Amount in NGN. */
    private final BigDecimal amountNgn;

    /** Unique transfer reference for idempotency. */
    private final String transferRef;

    /** Narrative / description for the transfer. */
    private final String narration;
}
