package com.yourara.arafi.gateway.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * Normalized result from any gateway payout / transfer operation.
 */
@Getter
@Builder
public class GatewayTransferResult {

    /** Whether the transfer was initiated successfully. */
    private final boolean success;

    /** The gateway-native transfer / payout ID. */
    private final String gatewayTransferId;

    /** Human-readable error message when success = false. */
    private final String errorMessage;
}
