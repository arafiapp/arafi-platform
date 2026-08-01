package com.yourara.arafi.gateway;

import com.yourara.arafi.gateway.dto.*;
import com.yourara.arafi.service.NombaClientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Nomba Gateway Adapter — FALLBACK ONLY.
 *
 * <p>This adapter wraps the existing {@link NombaClientService} behind the
 * {@link GatewayAdapter} interface. It is intentionally kept as a thin
 * delegation layer — all Nomba-specific logic remains in {@link NombaClientService}.
 *
 * <p><strong>Nomba is the last resort in Arafi's fallback chain:</strong>
 * <ol>
 *   <li>Flutterwave (primary card rail)</li>
 *   <li>Paystack (secondary card rail)</li>
 *   <li><strong>Nomba ← this adapter (fallback)</strong></li>
 * </ol>
 *
 * <p>Nomba is retained because:
 * <ul>
 *   <li>Existing subscriptions with Nomba {@code tokenKey}s are already live in production</li>
 *   <li>It provides virtual account provisioning on Wema Bank's rail</li>
 *   <li>Graceful migration path — existing customers are not disrupted</li>
 * </ul>
 *
 * <p>No new recurring subscriptions should be enrolled via Nomba.
 * The {@link com.yourara.arafi.gateway.GatewayRoutingEngine} will not select Nomba
 * for new transactions unless all primary and secondary rails are unavailable.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NombaGatewayAdapter implements GatewayAdapter {

    private static final String GATEWAY_NAME = "NOMBA";

    private final NombaClientService nombaClientService;

    @Override
    public String getGatewayName() {
        return GATEWAY_NAME;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CARD CHARGE — Delegates to NombaClientService checkout order
    // ─────────────────────────────────────────────────────────────────────────────

    @Override
    public GatewayChargeResult chargeCard(CardChargeRequest request) {
        log.warn("[Nomba] chargeCard invoked — this is a fallback path. ref={}", request.getOrderReference());

        Map<String, String> result = nombaClientService.createCheckoutOrder(
                request.getOrderReference(),
                request.getAmountNgn().multiply(BigDecimal.valueOf(100)).longValue(),
                request.getCustomerEmail(),
                request.getCallbackUrl()
        );

        if ("success".equals(result.get("status"))) {
            return GatewayChargeResult.builder()
                    .success(true)
                    .gatewayTransactionId(request.getOrderReference())
                    .checkoutUrl(result.get("checkoutLink"))
                    .requiresCustomerAction(true)
                    .build();
        }

        return GatewayChargeResult.builder()
                .success(false)
                .errorMessage("Nomba checkout order failed: " + result.get("message"))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // RECURRING CHARGE — Uses stored Nomba tokenKey
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Charges using a stored Nomba {@code tokenKey}.
     * This path is used ONLY for existing subscriptions that were enrolled via
     * Nomba before the gateway migration. New enrollments use Flutterwave.
     */
    @Override
    public GatewayChargeResult chargeRecurring(RecurringChargeRequest request) {
        log.warn("[Nomba] chargeRecurring invoked — fallback for legacy Nomba-enrolled subscriptions. email={}",
                request.getCustomerEmail());

        if (request.getPaymentToken() == null || request.getPaymentToken().isBlank()) {
            return GatewayChargeResult.builder()
                    .success(false)
                    .errorMessage("No Nomba tokenKey available for recurring charge.")
                    .build();
        }

        long amountKobo = request.getAmountNgn().multiply(BigDecimal.valueOf(100)).longValue();

        Map<String, String> result = nombaClientService.chargeTokenizedCard(
                request.getCustomerEmail(),
                amountKobo,
                request.getPaymentToken(),
                request.getGatewaySubAccountId()
        );

        if ("success".equals(result.get("status"))) {
            log.info("[Nomba] Legacy recurring charge succeeded. transactionId={}", result.get("transactionId"));
            return GatewayChargeResult.builder()
                    .success(true)
                    .gatewayTransactionId(result.get("transactionId"))
                    .paymentToken(request.getPaymentToken()) // Preserve the existing token
                    .requiresCustomerAction(false)
                    .build();
        }

        return GatewayChargeResult.builder()
                .success(false)
                .errorMessage("Nomba recurring charge failed: " + result.get("message"))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIRTUAL ACCOUNTS — Delegates to NombaClientService
    // ─────────────────────────────────────────────────────────────────────────────

    @Override
    public GatewayAccountResult createDynamicVirtualAccount(VirtualAccountRequest request) {
        log.info("[Nomba] createDynamicVirtualAccount — ref={}, name={}", request.getAccountRef(), request.getAccountName());

        Map<String, String> result = nombaClientService.createVirtualAccount(
                request.getAccountRef(),
                request.getAccountName(),
                request.getExpectedAmountNgn()
        );

        if ("success".equals(result.get("status"))) {
            return GatewayAccountResult.builder()
                    .success(true)
                    .bankAccountNumber(result.get("bankAccountNumber"))
                    .bankName(result.get("bankName"))
                    .accountName(request.getAccountName())
                    .gatewayRef(result.get("accountRef"))
                    .build();
        }

        return GatewayAccountResult.builder()
                .success(false)
                .errorMessage("Nomba virtual account creation failed: " + result.get("message"))
                .build();
    }

    @Override
    public GatewayAccountResult createStaticWallet(StaticWalletRequest request) {
        throw new UnsupportedOperationException(
                "Nomba does not support static wallet creation. Use AlatPayGatewayAdapter.");
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PAYOUTS
    // ─────────────────────────────────────────────────────────────────────────────

    @Override
    public GatewayTransferResult processTransfer(TransferRequest request) {
        log.info("[Nomba] processTransfer — bankCode={}, account={}, amount={}",
                request.getBankCode(), request.getAccountNumber(), request.getAmountNgn());

        long amountKobo = request.getAmountNgn().multiply(BigDecimal.valueOf(100)).longValue();

        Map<String, String> result = nombaClientService.processTransfer(
                request.getBankCode(),
                request.getAccountNumber(),
                amountKobo,
                request.getTransferRef()
        );

        if ("success".equals(result.get("status"))) {
            return GatewayTransferResult.builder()
                    .success(true)
                    .gatewayTransferId(result.get("transferId"))
                    .build();
        }

        return GatewayTransferResult.builder()
                .success(false)
                .errorMessage("Nomba transfer failed: " + result.get("message"))
                .build();
    }

    @Override
    public GatewayChargeResult verifyTransaction(String gatewayReference, String orderReference) {
        log.info("[Nomba] verifyTransaction — ref={}", orderReference);
        Map<String, Object> response = nombaClientService.fetchTransactionByOrderReference(orderReference);
        if (response != null && "00".equals(response.get("code")) && response.get("data") instanceof Map) {
            Map<String, Object> data = (Map<String, Object>) response.get("data");
            String status = data.get("status") != null ? data.get("status").toString() : "UNKNOWN";
            boolean succeeded = "SUCCESS".equalsIgnoreCase(status);
            return GatewayChargeResult.builder()
                    .success(succeeded)
                    .gatewayTransactionId(data.get("id") != null ? data.get("id").toString() : orderReference)
                    .requiresCustomerAction(false)
                    .build();
        }
        String errMsg = response != null && response.get("description") != null
                ? response.get("description").toString() : "Nomba lookup failed";
        return GatewayChargeResult.builder().success(false).errorMessage(errMsg).build();
    }

    @Override
    public boolean isAvailable() {
        return true; // Passive telemetry
    }
}
