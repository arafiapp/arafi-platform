package com.yourara.arafi.gateway.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * Arafi-internal static wallet request.
 * Creates a permanent dedicated virtual account bound to a customer.
 * Currently supported by ALATPay only (requires BVN).
 */
@Getter
@Builder
public class StaticWalletRequest {

    /** Customer BVN — required by ALATPay for KYC compliance. */
    private final String bvn;

    /** Customer email — used as a unique identifier. */
    private final String customerEmail;

    /**
     * Static wallet type.
     * ALATPay uses: 1 = individual, 2 = business.
     * Default: 1.
     */
    private final int walletType;
}
