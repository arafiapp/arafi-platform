package com.yourara.arafi.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourara.arafi.model.WebhookEvent;
import com.yourara.arafi.repository.WebhookRepository;
import com.yourara.arafi.webhook.normalizer.WebhookNormalizer;
import com.yourara.arafi.webhook.normalizer.WebhookNormalizerRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

/**
 * Controller to receive public webhook events from all configured payment gateways
 * (Flutterwave, ALATPay, Paystack, Nomba).
 *
 * <p>Webhooks are verified synchronously using signature/HMAC verification headers
 * before being queued in the database. Pending events are processed asynchronously
 * by the scheduler.
 */
@Slf4j
@RestController
@RequestMapping("/v1/webhooks")
@RequiredArgsConstructor
@Tag(name = "Gateway Webhooks", description = "Endpoints for receiving async webhook alerts from payment gateways")
public class GatewayWebhookController {

    private final WebhookRepository webhookRepository;
    private final WebhookNormalizerRegistry normalizerRegistry;
    private final ObjectMapper objectMapper;

    @PostMapping("/flutterwave")
    @Operation(summary = "Flutterwave webhook receiver")
    public ResponseEntity<?> receiveFlutterwave(
            @RequestBody String rawBody,
            @RequestHeader(value = "verif-hash", required = false) String signature) {
        return processWebhook("FLUTTERWAVE", rawBody, signature);
    }

    @PostMapping("/paystack")
    @Operation(summary = "Paystack webhook receiver")
    public ResponseEntity<?> receivePaystack(
            @RequestBody String rawBody,
            @RequestHeader(value = "x-paystack-signature", required = false) String signature) {
        return processWebhook("PAYSTACK", rawBody, signature);
    }

    @PostMapping("/alatpay")
    @Operation(summary = "ALATPay webhook receiver")
    public ResponseEntity<?> receiveAlatPay(
            @RequestBody String rawBody,
            @RequestHeader(value = "Ocp-Apim-Subscription-Key", required = false) String signature) {
        return processWebhook("ALATPAY", rawBody, signature);
    }

    @PostMapping("/nomba")
    @Operation(summary = "Nomba webhook receiver (fallback)")
    public ResponseEntity<?> receiveNomba(
            @RequestBody String rawBody,
            @RequestHeader(value = "nomba-signature", required = false) String signature) {
        return processWebhook("NOMBA", rawBody, signature);
    }

    private ResponseEntity<?> processWebhook(String gateway, String rawBody, String signature) {
        log.info("[GatewayWebhookController] Received {} webhook signature={}", gateway, signature);

        try {
            WebhookNormalizer normalizer = normalizerRegistry.getNormalizer(gateway);

            // Verify signature (bypassed in test sandbox profiles if keys are blank)
            boolean isValid = normalizer.verifySignature(rawBody, signature);
            if (!isValid) {
                log.warn("[GatewayWebhookController] Invalid signature for gateway={}", gateway);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid webhook signature.");
            }

            // Parse body
            Map<String, Object> payload = objectMapper.readValue(rawBody, Map.class);

            // Run lightweight validation/normalization check to ensure we can parse
            var arafiEvent = normalizer.normalize(payload);
            if (arafiEvent == null) {
                // Return 200 OK so the gateway doesn't retry events we intentionally skip (e.g. non-payment)
                return ResponseEntity.ok("Event received and skipped.");
            }

            // Save verified event to DB
            WebhookEvent dbEvent = WebhookEvent.builder()
                    .nombaEventId(arafiEvent.getGatewayReference() != null ? arafiEvent.getGatewayReference() : java.util.UUID.randomUUID().toString())
                    .eventType(arafiEvent.getEventType())
                    .gatewaySource(gateway)
                    .rawPayload(payload)
                    .isSignatureVerified(true)
                    .processingStatus("received")
                    .receivedAt(Instant.now())
                    .build();

            webhookRepository.save(dbEvent);
            log.info("[GatewayWebhookController] Saved verified event from gateway={} ref={}", gateway, arafiEvent.getGatewayReference());
            return ResponseEntity.ok("Webhook received and queued successfully.");

        } catch (IllegalArgumentException e) {
            log.error("[GatewayWebhookController] Unsupported gateway error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("[GatewayWebhookController] Error processing webhook for gateway={}: {}", gateway, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal error processing webhook.");
        }
    }
}
