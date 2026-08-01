package com.yourara.arafi.model.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class CreateProductCheckoutRequest {
    private String customerEmail;
    private String customerName;
    private String paymentMethod; // CARD or BANK_TRANSFER
    private String redirectUrl;

    @JsonProperty("preferred_gateway")
    private String preferredGateway;

    @JsonProperty("allow_fallback")
    private boolean allowFallback = true;

    @JsonProperty("is_international")
    private boolean isInternational = false;
}
