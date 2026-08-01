package com.yourara.arafi.service;

import com.yourara.arafi.model.*;
import com.yourara.arafi.model.request.CreateProductCheckoutRequest;
import com.yourara.arafi.model.request.CreateProductRequest;
import com.yourara.arafi.repository.*;
import com.yourara.arafi.gateway.GatewayRoutingEngine;
import com.yourara.arafi.gateway.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductTransactionRepository productTransactionRepository;
    private final CustomerRepository customerRepository;
    private final AppRepository appRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final WebhookDispatchRepository webhookDispatchRepository;
    private final NombaClientService nombaClientService;
    private final ResendEmailService resendEmailService;
    private final GatewayRoutingEngine gatewayRoutingEngine;

    @org.springframework.beans.factory.annotation.Value("${nomba.callback.url:https://arafi.yourara.com/checkout/callback}")
    private String nombaCallbackUrl;

    @Transactional
    public Product createProduct(UUID appId, CreateProductRequest request) {
        log.info("[ProductService] Creating product for app: {}, name: {}", appId, request.getName());
        Product product = Product.builder()
                .appId(appId)
                .name(request.getName())
                .sku(request.getSku())
                .priceKobo(request.getPriceKobo())
                .description(request.getDescription())
                .active(true)
                .build();
        return productRepository.save(product);
    }

    @Transactional(readOnly = true)
    public List<Product> listProducts(UUID appId) {
        return productRepository.findByAppIdAndActiveTrue(appId);
    }

    @Transactional
    public void deleteProduct(UUID appId, UUID productId) {
        Product p = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found."));
        if (!p.getAppId().equals(appId)) {
            throw new IllegalStateException("Unauthorized access to this product.");
        }
        p.setActive(false);
        productRepository.save(p);
    }

    @Transactional
    public Map<String, String> createProductCheckout(UUID appId, UUID productId, CreateProductCheckoutRequest request) {
        log.info("[ProductService] Creating product checkout: appId={}, productId={}, customerEmail={}",
                appId, productId, request.getCustomerEmail());

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found."));

        if (!product.getActive()) {
            throw new IllegalStateException("This product has been archived.");
        }

        // 1. Resolve or create customer profile
        List<Customer> customers = customerRepository.findByAppIdAndEmail(appId, request.getCustomerEmail());
        Customer customer;
        if (!customers.isEmpty()) {
            customer = customers.get(0);
        } else {
            Customer newCust = Customer.builder()
                    .appId(appId)
                    .email(request.getCustomerEmail())
                    .name(request.getCustomerName() != null ? request.getCustomerName() : "")
                    .externalRef("auto_product_" + System.currentTimeMillis())
                    .build();
            customer = customerRepository.save(newCust);
        }

        if (request.getCustomerName() != null && !request.getCustomerName().isBlank() &&
                (customer.getName() == null || customer.getName().isBlank())) {
            customer.setName(request.getCustomerName());
            customerRepository.save(customer);
        }

        // Amount calculation
        BigDecimal amountDecimal = BigDecimal.valueOf(product.getPriceKobo()).divide(BigDecimal.valueOf(100));

        // Create transaction placeholder
        ProductTransaction ptx = ProductTransaction.builder()
                .appId(appId)
                .productId(productId)
                .customerId(customer.getId())
                .amountKobo(product.getPriceKobo())
                .status("PENDING")
                .paymentMethod(request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank()
                        ? request.getPaymentMethod()
                        : "PORTAL")
                .redirectUrl(request.getRedirectUrl())
                .build();
        ptx = productTransactionRepository.save(ptx);

        String paymentMethod = request.getPaymentMethod();
        String checkoutUrl = "";
        String virtualAccountNumber = null;
        String bankName = null;
        String bankAccountName = null;
        String nombaRef = ptx.getId().toString();

        com.yourara.arafi.security.RequestContext.setContext(appId, "TEST"); // Default to context app mode

        try {
            if (paymentMethod == null || paymentMethod.isBlank()) {
                // Redirect link to our Arafi frontend checkout page
                checkoutUrl = "https://arafi-platform.vercel.app/checkout/" + ptx.getId().toString() + "?type=product";
            } else if ("CARD".equalsIgnoreCase(paymentMethod)) {
                String redirectCallbackUrl = nombaCallbackUrl;
                if (redirectCallbackUrl != null) {
                    redirectCallbackUrl = redirectCallbackUrl.contains("?")
                            ? redirectCallbackUrl + "&type=product"
                            : redirectCallbackUrl + "?type=product";
                }

                CardChargeRequest cardRequest = CardChargeRequest.builder()
                        .arafiCustomerId(customer.getId().toString())
                        .customerEmail(customer.getEmail())
                        .amountNgn(amountDecimal)
                        .currency("NGN")
                        .orderReference(ptx.getId().toString())
                        .callbackUrl(redirectCallbackUrl)
                        .build();

                GatewayChargeResult checkoutResult = gatewayRoutingEngine.routeCardCharge(
                        cardRequest, amountDecimal, "NGN",
                        request.getPreferredGateway(),
                        request.isAllowFallback(),
                        request.isInternational());

                if (checkoutResult.isSuccess()) {
                    checkoutUrl = checkoutResult.getCheckoutUrl();
                    nombaRef = ptx.getId().toString();
                    ptx.setGatewayReference(checkoutResult.getGatewayTransactionId());
                    ptx.setGatewayUsed(checkoutResult.getGatewayUsed());
                } else {
                    throw new IllegalStateException("Gateway checkout API failed: " + checkoutResult.getErrorMessage());
                }
            } else if ("BANK_TRANSFER".equalsIgnoreCase(paymentMethod)) {
                String accountRef = "arafi_vban_prod_" + ptx.getId().toString() + "_" + System.currentTimeMillis();
                String accountName = customer.getName() != null && !customer.getName().isBlank()
                        ? customer.getName()
                        : "ARAFI " + customer.getEmail();

                String[] nameParts = accountName.split(" ", 2);
                String firstName = nameParts[0];
                String lastName = nameParts.length > 1 ? nameParts[1] : "";

                VirtualAccountRequest vaRequest = VirtualAccountRequest.builder()
                        .accountRef(accountRef)
                        .accountName(accountName)
                        .customerEmail(customer.getEmail())
                        .customerPhone("")
                        .firstName(firstName)
                        .lastName(lastName)
                        .expectedAmountNgn(amountDecimal)
                        .currency("NGN")
                        .orderId(ptx.getId().toString())
                        .description("Arafi Product Purchase")
                        .build();

                GatewayAccountResult accountResult = gatewayRoutingEngine.routeDynamicVirtualAccount(
                        vaRequest,
                        request.getPreferredGateway(),
                        request.isAllowFallback());

                if (accountResult.isSuccess()) {
                    virtualAccountNumber = accountResult.getBankAccountNumber();
                    bankName = accountResult.getBankName();
                    bankAccountName = accountResult.getAccountName();
                    ptx.setGatewayReference(accountResult.getGatewayRef());
                    ptx.setGatewayUsed(accountResult.getGatewayUsed());
                } else {
                    throw new IllegalStateException("Gateway virtual account API failed: " + accountResult.getErrorMessage());
                }

                checkoutUrl = "https://arafi-platform.vercel.app/checkout/" + ptx.getId().toString() + "?type=product";
            } else {
                throw new IllegalArgumentException("Unsupported payment method: " + paymentMethod);
            }

            ptx.setNombaReference(nombaRef);
            ptx.setCheckoutUrl(checkoutUrl);
            ptx.setVirtualAccountNumber(virtualAccountNumber);
            ptx.setBankName(bankName);
            ptx.setBankAccountName(bankAccountName);
            productTransactionRepository.save(ptx);

            return Map.of(
                    "checkoutId", ptx.getId().toString(),
                    "checkoutUrl", checkoutUrl);

        } finally {
            com.yourara.arafi.security.RequestContext.clear();
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicGetCheckoutDetails(UUID checkoutId) {
        ProductTransaction ptx = productTransactionRepository.findById(checkoutId)
                .orElseThrow(() -> new IllegalArgumentException("Product checkout transaction context not found."));

        Product product = productRepository.findById(ptx.getProductId()).orElse(null);
        App app = appRepository.findById(ptx.getAppId()).orElse(null);
        Customer customer = customerRepository.findById(ptx.getCustomerId()).orElse(null);

        String appName = app != null ? app.getName() : "Unknown App";
        String productName = product != null ? product.getName() : "Unknown Product";
        BigDecimal amountDecimal = BigDecimal.valueOf(ptx.getAmountKobo()).divide(BigDecimal.valueOf(100));

        Map<String, Object> result = new HashMap<>();
        result.put("id", ptx.getId().toString());
        result.put("appName", appName);
        result.put("planName", productName); // Differentiate key on checkout screen if needed, or map unified planName
        result.put("baseAmount", amountDecimal.toPlainString());
        result.put("finalAmount", amountDecimal.toPlainString());
        result.put("discountAmount", "0.00");
        result.put("customerEmail", customer != null ? customer.getEmail() : "N/A");
        result.put("customerName", customer != null ? customer.getName() : null);
        result.put("virtualAccountNumber", ptx.getVirtualAccountNumber());
        result.put("bankName", ptx.getBankName());
        result.put("bankAccountName", ptx.getBankAccountName());
        result.put("status", ptx.getStatus());
        result.put("paymentMethod", ptx.getPaymentMethod());
        result.put("redirectUrl", ptx.getRedirectUrl());
        return result;
    }

    @Transactional
    public Map<String, String> publicProvisionProductBankTransfer(UUID checkoutId) {
        ProductTransaction ptx = productTransactionRepository.findById(checkoutId)
                .orElseThrow(() -> new IllegalArgumentException("Product checkout context not found."));

        if (ptx.getVirtualAccountNumber() != null && !ptx.getVirtualAccountNumber().isBlank()) {
            return Map.of(
                    "bankAccountNumber", ptx.getVirtualAccountNumber(),
                    "bankName", ptx.getBankName() != null ? ptx.getBankName() : "Nomba Bank",
                    "bankAccountName", ptx.getBankAccountName() != null ? ptx.getBankAccountName() : "ARAFI");
        }

        Customer customer = customerRepository.findById(ptx.getCustomerId())
                .orElseThrow(() -> new IllegalStateException("Customer profile not found."));

        BigDecimal amountDecimal = BigDecimal.valueOf(ptx.getAmountKobo()).divide(BigDecimal.valueOf(100));

        com.yourara.arafi.security.RequestContext.setContext(ptx.getAppId(), "TEST");

        try {
            String accountRef = "arafi_vban_prod_" + ptx.getId().toString() + "_" + System.currentTimeMillis();
            String accountName = customer.getName() != null && !customer.getName().isBlank()
                    ? customer.getName()
                    : "ARAFI " + customer.getEmail();

            Map<String, String> accountDetails = nombaClientService.createVirtualAccount(accountRef, accountName,
                    amountDecimal);

            if ("success".equals(accountDetails.get("status"))) {
                String virtualAccountNumber = accountDetails.get("bankAccountNumber");
                String bankName = accountDetails.get("bankName");
                String bankAccountName = customer.getName() != null && !customer.getName().isBlank()
                        ? "ARAFI * " + customer.getName()
                        : "ARAFI * " + customer.getEmail();

                ptx.setVirtualAccountNumber(virtualAccountNumber);
                ptx.setBankName(bankName);
                ptx.setBankAccountName(bankAccountName);
                ptx.setPaymentMethod("BANK_TRANSFER");
                productTransactionRepository.save(ptx);

                return Map.of(
                        "bankAccountNumber", virtualAccountNumber,
                        "bankName", bankName,
                        "bankAccountName", bankAccountName);
            } else {
                throw new IllegalStateException("Nomba virtual account error: " + accountDetails.get("message"));
            }
        } finally {
            com.yourara.arafi.security.RequestContext.clear();
        }
    }

    @Transactional
    public Map<String, String> publicGenerateCardCheckoutUrl(UUID checkoutId) {
        ProductTransaction ptx = productTransactionRepository.findById(checkoutId)
                .orElseThrow(() -> new IllegalArgumentException("Product checkout transaction context not found."));

        if ("SUCCESS".equalsIgnoreCase(ptx.getStatus())) {
            throw new IllegalStateException("This transaction has already been completed.");
        }

        Customer customer = customerRepository.findById(ptx.getCustomerId())
                .orElseThrow(() -> new IllegalStateException("Customer profile not found."));

        com.yourara.arafi.security.RequestContext.setContext(ptx.getAppId(), "TEST");

        try {
            String redirectCallbackUrl = nombaCallbackUrl;
            if (redirectCallbackUrl != null) {
                redirectCallbackUrl = redirectCallbackUrl.contains("?")
                        ? redirectCallbackUrl + "&type=product"
                        : redirectCallbackUrl + "?type=product";
            }

            Map<String, String> checkoutResult = nombaClientService.createCheckoutOrder(
                    ptx.getId().toString(),
                    ptx.getAmountKobo(),
                    customer.getEmail(),
                    redirectCallbackUrl,
                    List.of("Card"));

            if ("success".equals(checkoutResult.get("status"))) {
                ptx.setNombaReference(ptx.getId().toString());
                ptx.setCheckoutUrl(checkoutResult.get("checkoutLink"));
                ptx.setPaymentMethod("CARD");
                productTransactionRepository.save(ptx);
                return Map.of("checkoutLink", checkoutResult.get("checkoutLink"));
            } else {
                throw new IllegalStateException("Nomba checkout API failed: " + checkoutResult.get("message"));
            }
        } finally {
            com.yourara.arafi.security.RequestContext.clear();
        }
    }

    @Transactional
    public Map<String, String> publicVerifyProductCardCheckout(String orderReference) {
        ProductTransaction ptx = productTransactionRepository.findById(UUID.fromString(orderReference))
                .orElseThrow(() -> new IllegalArgumentException("Product checkout transaction context not found."));

        if ("SUCCESS".equalsIgnoreCase(ptx.getStatus())) {
            return Map.of("status", "SUCCESS", "redirectUrl", ptx.getRedirectUrl() != null ? ptx.getRedirectUrl() : "");
        }

        // Verify with gateway routing engine
        com.yourara.arafi.security.RequestContext.setContext(ptx.getAppId(), "TEST");
        try {
            String gatewayUsed = ptx.getGatewayUsed() != null ? ptx.getGatewayUsed() : "NOMBA";
            GatewayChargeResult verifyResult = gatewayRoutingEngine.verifyTransaction(ptx.getGatewayReference(), orderReference, gatewayUsed);

            if (verifyResult.isSuccess()) {
                ptx.setStatus("SUCCESS");
                ptx.setGatewayReference(verifyResult.getGatewayTransactionId());
                productTransactionRepository.save(ptx);

                BigDecimal amount = BigDecimal.valueOf(ptx.getAmountKobo()).divide(BigDecimal.valueOf(100));

                // Save double-entry ledger entry
                LedgerEntry entry = LedgerEntry.builder()
                        .appId(ptx.getAppId())
                        .bankAccountNumber("CARD GATEWAY - " + gatewayUsed)
                        .amount(amount)
                        .entryType("CREDIT")
                        .webhookEventId(verifyResult.getGatewayTransactionId() != null ? verifyResult.getGatewayTransactionId() : ptx.getId().toString())
                        .build();
                ledgerEntryRepository.save(entry);

                // Queue Merchant webhook callback
                triggerMerchantProductCallback(ptx);

                // Send email alert receipt
                Customer customer = customerRepository.findById(ptx.getCustomerId()).orElse(null);
                if (customer != null) {
                    resendEmailService.sendBillingAlert(ptx.getAppId(), customer.getEmail(), customer.getEmail(),
                            amount, "card", "SUCCESS", gatewayUsed + " Checkout Gateway", "N/A");
                }

                return Map.of("status", "SUCCESS", "redirectUrl",
                        ptx.getRedirectUrl() != null ? ptx.getRedirectUrl() : "");
            } else {
                return Map.of("status", ptx.getStatus(), "redirectUrl", "");
            }
        } finally {
            com.yourara.arafi.security.RequestContext.clear();
        }
    }

    @Transactional
    public void markProductTransactionSuccess(String orderReference, String gatewayReference, String gatewayUsed) {
        ProductTransaction ptx = productTransactionRepository.findById(UUID.fromString(orderReference))
                .orElseThrow(() -> new IllegalArgumentException("Product transaction not found: " + orderReference));
        if ("SUCCESS".equalsIgnoreCase(ptx.getStatus())) {
            return;
        }

        com.yourara.arafi.security.RequestContext.setContext(ptx.getAppId(), "TEST");
        try {
            ptx.setStatus("SUCCESS");
            ptx.setGatewayReference(gatewayReference);
            ptx.setGatewayUsed(gatewayUsed);
            productTransactionRepository.save(ptx);

            BigDecimal amount = BigDecimal.valueOf(ptx.getAmountKobo()).divide(BigDecimal.valueOf(100));

            // Save double-entry ledger entry
            LedgerEntry entry = LedgerEntry.builder()
                    .appId(ptx.getAppId())
                    .bankAccountNumber("CARD GATEWAY - " + gatewayUsed)
                    .amount(amount)
                    .entryType("CREDIT")
                    .webhookEventId(gatewayReference != null ? gatewayReference : ptx.getId().toString())
                    .build();
            ledgerEntryRepository.save(entry);

            // Queue Merchant webhook callback
            triggerMerchantProductCallback(ptx);

            // Send email alert receipt
            Customer customer = customerRepository.findById(ptx.getCustomerId()).orElse(null);
            if (customer != null) {
                resendEmailService.sendBillingAlert(ptx.getAppId(), customer.getEmail(), customer.getEmail(),
                        amount, "card", "SUCCESS", gatewayUsed + " Card Checkout", "N/A");
            }
        } finally {
            com.yourara.arafi.security.RequestContext.clear();
        }
    }

    @Transactional
    public void processProductBankTransferPayment(String virtualAccountNumber, BigDecimal amount,
            String transactionId) {
        log.info("[ProductService] Processing virtual account transfer credit: VBAN={}, amount={}",
                virtualAccountNumber, amount);
        Optional<ProductTransaction> optTx = productTransactionRepository
                .findByVirtualAccountNumber(virtualAccountNumber);
        if (optTx.isEmpty()) {
            log.warn("[ProductService] No pending product transaction matches VBAN: {}", virtualAccountNumber);
            return;
        }

        ProductTransaction ptx = optTx.get();
        if ("SUCCESS".equalsIgnoreCase(ptx.getStatus())) {
            log.info("[ProductService] Transaction already marked SUCCESS: {}", ptx.getId());
            return;
        }

        com.yourara.arafi.security.RequestContext.setContext(ptx.getAppId(), "TEST");
        try {
            ptx.setStatus("SUCCESS");
            productTransactionRepository.save(ptx);

            // Double entry ledger log
            LedgerEntry entry = LedgerEntry.builder()
                    .appId(ptx.getAppId())
                    .bankAccountNumber(virtualAccountNumber)
                    .amount(amount)
                    .entryType("CREDIT")
                    .webhookEventId(transactionId)
                    .build();
            ledgerEntryRepository.save(entry);

            // Trigger callback
            triggerMerchantProductCallback(ptx);

            // Send email
            Customer customer = customerRepository.findById(ptx.getCustomerId()).orElse(null);
            if (customer != null) {
                resendEmailService.sendBillingAlert(ptx.getAppId(), customer.getEmail(), customer.getEmail(),
                        amount, "bank_transfer", "SUCCESS", ptx.getBankName(), virtualAccountNumber);
            }
        } finally {
            com.yourara.arafi.security.RequestContext.clear();
        }
    }

    @Transactional
    public void simulateProductVirtualAccountTransfer(String virtualAccountNumber, BigDecimal amount) {
        String mockTxId = "sim_prod_trsf_" + UUID.randomUUID().toString().substring(0, 15);
        processProductBankTransferPayment(virtualAccountNumber, amount, mockTxId);
    }

    private void triggerMerchantProductCallback(ProductTransaction pt) {
        App app = appRepository.findById(pt.getAppId()).orElse(null);
        String webhookUrl = app != null ? app.getWebhookUrl() : null;
        if (webhookUrl == null || webhookUrl.isBlank()) {
            webhookUrl = "https://mock.arafi.com/webhook-fallback";
        }

        try {
            Map<String, Object> dataMap = new HashMap<>();
            dataMap.put("transactionId", pt.getId().toString());
            dataMap.put("productId", pt.getProductId().toString());
            dataMap.put("appId", pt.getAppId().toString());
            dataMap.put("customerId", pt.getCustomerId().toString());
            dataMap.put("status", "SUCCESS");
            dataMap.put("paymentMethod", pt.getPaymentMethod());
            dataMap.put("amount", BigDecimal.valueOf(pt.getAmountKobo()).divide(BigDecimal.valueOf(100)).toString());

            String eventType = "product.payment.success";
            Map<String, Object> payload = Map.of(
                    "event", eventType,
                    "data", dataMap);

            WebhookDispatch dispatch = WebhookDispatch.builder()
                    .appId(pt.getAppId())
                    .webhookUrl(webhookUrl)
                    .eventType(eventType)
                    .payload(payload)
                    .status("PENDING")
                    .attempts(0)
                    .nextAttemptAt(Instant.now())
                    .build();

            webhookDispatchRepository.save(dispatch);
            log.info("[ProductService] Queued merchant webhook product.payment.success callback to outbox for app: {}",
                    pt.getAppId());
        } catch (Exception e) {
            log.error("[ProductService] Failed to queue product callback webhook: {}", e.getMessage());
        }
    }
}
