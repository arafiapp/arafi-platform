package com.yourara.arafi.model.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateCustomerRequest {

    private String email;

    private String name;

    @JsonProperty("external_ref")
    private String externalRef; // id from the devs app

    private String bvn; // optional BVN for wallet creation
}
