package com.yourara.arafi.gateway.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * Normalized result from any gateway virtual account creation operation.
 */
@Getter
@Builder
public class GatewayAccountResult {

    /** Whether the account was successfully created. */
    private final boolean success;

    /** The provisioned bank account number (NUBAN). */
    private final String bankAccountNumber;

    /** The bank name associated with the virtual account. */
    private final String bankName;

    /**
     * The account holder name as registered with the bank.
     * May differ from the customer name if sanitized by the gateway.
     */
    private final String accountName;

    /** The gateway-internal reference for this virtual account. */
    private final String gatewayRef;

    /** The gateway name that processed the virtual account creation. */
    private final String gatewayUsed;

    /** Human-readable error message when success = false. */
    private final String errorMessage;
}
