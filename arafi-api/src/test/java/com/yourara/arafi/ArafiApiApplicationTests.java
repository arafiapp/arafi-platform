package com.yourara.arafi;

import com.yourara.arafi.model.*;
import com.yourara.arafi.model.request.CreateSubscriptionRequest;
import com.yourara.arafi.model.response.SubscriptionResponse;
import com.yourara.arafi.repository.*;
import com.yourara.arafi.service.SubscriptionService;
import com.yourara.arafi.service.PayoutService;
import com.yourara.arafi.scheduler.PayoutProcessingScheduler;
import com.yourara.arafi.scheduler.WebhookDispatchScheduler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class ArafiApiApplicationTests {

    @Autowired
    private SubscriptionService subscriptionService;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private PlanRepository planRepository;

    @Autowired
    private WebhookRepository webhookRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private AppRepository appRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PayoutService payoutService;

    @Autowired
    private PayoutRepository payoutRepository;

    @Autowired
    private WebhookDispatchRepository webhookDispatchRepository;

    @Autowired
    private WebhookDispatchScheduler webhookDispatchScheduler;

    @Autowired
    private PayoutProcessingScheduler payoutProcessingScheduler;

    @Test
    void testFullPaymentFlows() {
        // 1. Create a User (developer)
        User user = User.builder()
                .email("dev_" + UUID.randomUUID() + "@example.com")
                .passwordHash("hashed_password")
                .build();
        userRepository.save(user);

        // 2. Create an App Workspace
        App app = App.builder()
                .user(user)
                .name("Arafi Test App")
                .webhookUrl("http://localhost:9999/merchant-callback")
                .status("active")
                .build();
        appRepository.save(app);

        // 3. Create a Plan
        Plan plan = Plan.builder()
                .appId(app.getId())
                .name("Standard Plan")
                .amountKobo(500000L) // 5000.00 NGN
                .billingInterval("monthly")
                .build();
        planRepository.save(plan);

        // 4. Create Customer (subscriber)
        Customer customer = Customer.builder()
                .appId(app.getId())
                .email("subscriber_" + UUID.randomUUID() + "@example.com")
                .externalRef("ext_sub_001")
                .mode("test")
                .build();
        customerRepository.save(customer);

        // ==========================================
        // FLOW A: FIRST-TIME CARD CHECKOUT
        // ==========================================
        CreateSubscriptionRequest cardReq = new CreateSubscriptionRequest();
        cardReq.setCustomerId(customer.getId());
        cardReq.setPlanId(plan.getId());
        cardReq.setPaymentMethod("CARD");

        SubscriptionResponse cardResp = subscriptionService.createSubscription(app.getId(), cardReq);
        assertNotNull(cardResp);
        assertEquals("PENDING", cardResp.getStatus());
        assertNotNull(cardResp.getCheckoutUrl());
        assertNotNull(cardResp.getNombaReference());

        // Verify checkout URL structure
        assertTrue(cardResp.getCheckoutUrl().startsWith("http"));

        // Simulate incoming card checkout success webhook (payment_success)
        String orderRef = cardResp.getNombaReference();
        String tokenKey = "nbr_tok_fail_" + UUID.randomUUID().toString().substring(0, 6);
        
        Map<String, Object> cardPayload = Map.of(
            "requestId", "req_" + UUID.randomUUID(),
            "event_type", "payment_success",
            "data", Map.of(
                "orderReference", orderRef,
                "tokenKey", tokenKey,
                "amount", 5000.00
            )
        );

        WebhookEvent cardWebhook = WebhookEvent.builder()
                .nombaEventId("req_card_" + UUID.randomUUID().toString().substring(0,8))
                .eventType("payment_success")
                .rawPayload(cardPayload)
                .isSignatureVerified(true)
                .processingStatus("received")
                .build();
        webhookRepository.save(cardWebhook);

        // Process webhooks asynchronously (runs the webhook processor state machine)
        subscriptionService.processReceivedWebhooks();

        // Verify CARD subscription is now ACTIVE and vaulted the card details
        Subscription cardSub = subscriptionRepository.findById(cardResp.getId()).orElse(null);
        assertNotNull(cardSub);
        assertEquals("ACTIVE", cardSub.getStatus());
        assertEquals(tokenKey, cardSub.getNombaTokenKey());
        assertNotNull(cardSub.getCurrentPeriodEnd());

        // Verify Customer record also received the vaulted nombaTokenKey
        Customer updatedCustomer = customerRepository.findById(customer.getId()).orElse(null);
        assertNotNull(updatedCustomer);
        assertEquals(tokenKey, updatedCustomer.getNombaTokenKey());

        // Verify Ledger Entry credit was logged
        BigDecimal balance = ledgerEntryRepository.computeBalanceForApp(app.getId());
        assertEquals(0, new BigDecimal("5000.00").compareTo(balance));

        // ==========================================
        // FLOW B: FIRST-TIME BANK TRANSFER VBAN
        // ==========================================
        CreateSubscriptionRequest bankReq = new CreateSubscriptionRequest();
        bankReq.setCustomerId(customer.getId());
        bankReq.setPlanId(plan.getId());
        bankReq.setPaymentMethod("BANK_TRANSFER");

        SubscriptionResponse bankResp = subscriptionService.createSubscription(app.getId(), bankReq);
        assertNotNull(bankResp);
        assertEquals("PENDING", bankResp.getStatus());
        assertNotNull(bankResp.getVirtualAccountNumber());

        // Verify the customer record now has the virtual account number saved permanently
        Customer customerWithVban = customerRepository.findById(customer.getId()).orElse(null);
        assertNotNull(customerWithVban);
        assertEquals(bankResp.getVirtualAccountNumber(), customerWithVban.getVirtualAccountNumber());

        // Simulate incoming bank transfer credit webhook (virtual_account_payment)
        String vban = bankResp.getVirtualAccountNumber();
        Map<String, Object> bankPayload = Map.of(
            "requestId", "req_bank_" + UUID.randomUUID(),
            "event_type", "virtual_account_payment",
            "data", Map.of(
                "bankAccountNumber", vban,
                "amount", 5000.00
            )
        );

        WebhookEvent bankWebhook = WebhookEvent.builder()
                .nombaEventId("req_va_" + UUID.randomUUID().toString().substring(0,8))
                .eventType("virtual_account_payment")
                .rawPayload(bankPayload)
                .isSignatureVerified(true)
                .processingStatus("received")
                .build();
        webhookRepository.save(bankWebhook);

        // Process webhooks
        subscriptionService.processReceivedWebhooks();

        // Verify BANK subscription is now ACTIVE
        Subscription bankSub = subscriptionRepository.findById(bankResp.getId()).orElse(null);
        assertNotNull(bankSub);
        assertEquals("ACTIVE", bankSub.getStatus());
        assertNotNull(bankSub.getCurrentPeriodEnd());

        // Verify Ledger Entry credit was logged for this bank account, total balance is now 10000.00
        BigDecimal bankBalance = ledgerEntryRepository.computeBalanceForApp(app.getId());
        assertEquals(0, new BigDecimal("10000.00").compareTo(bankBalance));

        // ==========================================
        // FLOW C: CRON RENEWALS & EXPIRATION
        // ==========================================
        // 1. Manually expire the BANK TRANSFER subscription in the database
        bankSub.setCurrentPeriodEnd(Instant.now().minusSeconds(10));
        subscriptionRepository.save(bankSub);

        // 2. Manually expire the CARD subscription in the database
        cardSub.setCurrentPeriodEnd(Instant.now().minusSeconds(10));
        subscriptionRepository.save(cardSub);

        // Run subscription renewals cron worker
        subscriptionService.processSubscriptionRenewals();

        // Verify Bank Transfer subscription status transitioned to EXPIRED (requiring manual bank transfer reminder)
        Subscription renewedBankSub = subscriptionRepository.findById(bankSub.getId()).orElse(null);
        assertNotNull(renewedBankSub);
        assertEquals("EXPIRED", renewedBankSub.getStatus());

        // Verify Card subscription status transitioned to EXPIRED (because no sandbox credentials exist to charge it successfully)
        Subscription renewedCardSub = subscriptionRepository.findById(cardSub.getId()).orElse(null);
        assertNotNull(renewedCardSub);
        assertEquals("EXPIRED", renewedCardSub.getStatus());
        assertNotNull(renewedCardSub.getCheckoutUrl()); // Verify a recovery checkout URL is provided in the Card failure email info!
    }

    @Test
    void testNewSubscriptionLifecycleAndPayouts() {
        // 1. Create User
        User user = User.builder()
                .email("dev_lifecycle_" + UUID.randomUUID() + "@example.com")
                .passwordHash("hashed")
                .build();
        userRepository.save(user);

        // 2. Create App with payout bank details
        App app = App.builder()
                .user(user)
                .name("Arafi Payout App")
                .webhookUrl("http://localhost:9999/merchant-callback")
                .payoutBankAccountNumber("0123456789")
                .payoutBankCode("035")
                .payoutBankName("Wema Bank")
                .status("active")
                .build();
        appRepository.save(app);

        // 3. Create Plan
        Plan plan = Plan.builder()
                .appId(app.getId())
                .name("Pro Plan")
                .amountKobo(1000000L) // 10000.00 NGN
                .billingInterval("monthly")
                .build();
        planRepository.save(plan);

        // 4. Create Customer
        Customer customer = Customer.builder()
                .appId(app.getId())
                .email("customer_lifecycle_" + UUID.randomUUID() + "@example.com")
                .externalRef("ext_lifecycle_001")
                .mode("test")
                .build();
        customerRepository.save(customer);

        // Create subscription
        CreateSubscriptionRequest req = new CreateSubscriptionRequest();
        req.setCustomerId(customer.getId());
        req.setPlanId(plan.getId());
        req.setPaymentMethod("CARD");

        SubscriptionResponse resp = subscriptionService.createSubscription(app.getId(), req);
        assertNotNull(resp);
        assertEquals("PENDING", resp.getStatus());

        // Process webhook to make active
        String tokenKey = "nbr_tok_" + UUID.randomUUID().toString().substring(0, 10);
        Map<String, Object> cardPayload = Map.of(
            "requestId", "req_" + UUID.randomUUID(),
            "event_type", "payment_success",
            "data", Map.of(
                "orderReference", resp.getNombaReference(),
                "tokenKey", tokenKey,
                "amount", 10000.00
            )
        );
        WebhookEvent webhook = WebhookEvent.builder()
                .nombaEventId("req_card_lc_" + UUID.randomUUID().toString().substring(0,8))
                .eventType("payment_success")
                .rawPayload(cardPayload)
                .isSignatureVerified(true)
                .processingStatus("received")
                .build();
        webhookRepository.save(webhook);

        subscriptionService.processReceivedWebhooks();

        Subscription sub = subscriptionRepository.findById(resp.getId()).orElse(null);
        assertNotNull(sub);
        assertEquals("ACTIVE", sub.getStatus());
        assertFalse(sub.getPaused());
        assertFalse(sub.getCancelAtPeriodEnd());

        // Test Pause Subscription
        SubscriptionResponse pausedResp = subscriptionService.pauseSubscription(app.getId(), sub.getId());
        assertEquals("PAUSED", pausedResp.getStatus());
        assertTrue(subscriptionRepository.findById(sub.getId()).get().getPaused());

        // Test Resume Subscription
        SubscriptionResponse resumedResp = subscriptionService.resumeSubscription(app.getId(), sub.getId());
        assertEquals("ACTIVE", resumedResp.getStatus());
        assertFalse(subscriptionRepository.findById(sub.getId()).get().getPaused());

        // Test cancel at period end
        SubscriptionResponse cancelledPeriodEndResp = subscriptionService.cancelSubscription(app.getId(), sub.getId(), false);
        assertTrue(cancelledPeriodEndResp.getCancelAtPeriodEnd());
        assertEquals("ACTIVE", cancelledPeriodEndResp.getStatus());

        // Move period end to past and process renewals
        Subscription subToCancel = subscriptionRepository.findById(sub.getId()).orElse(null);
        subToCancel.setCurrentPeriodEnd(Instant.now().minusSeconds(10));
        subscriptionRepository.save(subToCancel);

        subscriptionService.processSubscriptionRenewals();
        assertEquals("CANCELLED", subscriptionRepository.findById(sub.getId()).get().getStatus());

        // Re-activate by creating a new subscription
        SubscriptionResponse activeResp = subscriptionService.createSubscription(app.getId(), req);
        
        // Mock success payment for activeResp
        Map<String, Object> cardPayload2 = Map.of(
            "requestId", "req_" + UUID.randomUUID(),
            "event_type", "payment_success",
            "data", Map.of(
                "orderReference", activeResp.getNombaReference(),
                "tokenKey", tokenKey,
                "amount", 10000.00
            )
        );
        WebhookEvent webhook2 = WebhookEvent.builder()
                .nombaEventId("req_card_lc2_" + UUID.randomUUID().toString().substring(0,8))
                .eventType("payment_success")
                .rawPayload(cardPayload2)
                .isSignatureVerified(true)
                .processingStatus("received")
                .build();
        webhookRepository.save(webhook2);
        subscriptionService.processReceivedWebhooks();

        Subscription activeSub = subscriptionRepository.findById(activeResp.getId()).orElse(null);
        assertEquals("ACTIVE", activeSub.getStatus());

        // Test Plan Upgrade (Change Plan)
        Plan plan2 = Plan.builder()
                .appId(app.getId())
                .name("Enterprise Plan")
                .amountKobo(2500000L) // 25000.00 NGN
                .billingInterval("monthly")
                .build();
        planRepository.save(plan2);

        SubscriptionResponse upgradeResp = subscriptionService.changePlan(app.getId(), activeSub.getId(), plan2.getId());
        assertNotNull(upgradeResp);
        assertEquals("ACTIVE", upgradeResp.getStatus());
        assertEquals(plan2.getId(), upgradeResp.getPlanId());

        // Outbox assertions
        List<WebhookDispatch> dispatches = webhookDispatchRepository.findAll();
        assertFalse(dispatches.isEmpty());

        // Process Outbox
        webhookDispatchScheduler.processPendingWebhooks();

        // Payout Tests
        BigDecimal currentBalance = ledgerEntryRepository.computeBalanceForApp(app.getId());
        assertTrue(currentBalance.compareTo(BigDecimal.ZERO) > 0);

        // Request Payout
        BigDecimal payoutAmount = new BigDecimal("5000.00");
        Payout payout = payoutService.requestPayout(app.getId(), payoutAmount, null, null, null);
        assertNotNull(payout);
        assertEquals("SUCCESS", payout.getStatus());

        // Verify balance debited
        BigDecimal balanceAfterPayout = ledgerEntryRepository.computeBalanceForApp(app.getId());
        assertEquals(0, currentBalance.subtract(payoutAmount).compareTo(balanceAfterPayout));

        // Process payout
        payoutProcessingScheduler.processPendingPayouts();
        assertEquals("SUCCESS", payoutRepository.findById(payout.getId()).get().getStatus());

        // Test Payout failure rollback
        // Credit workspace to ensure enough balance
        LedgerEntry entry = LedgerEntry.builder()
                .appId(app.getId())
                .bankAccountNumber("N/A")
                .amount(new BigDecimal("10000.00"))
                .entryType("CREDIT")
                .build();
        ledgerEntryRepository.save(entry);

        BigDecimal balanceBeforeFail = ledgerEntryRepository.computeBalanceForApp(app.getId());
        // Set mode to live to force processTransfer to fail in test context
        Payout failedPayout = Payout.builder()
                .appId(app.getId())
                .amount(new BigDecimal("8000.00"))
                .bankAccountNumber("123456")
                .bankCode("999")
                .status("PENDING")
                .mode("live") // Forces failure
                .build();
        payoutRepository.save(failedPayout);

        // Debit ledger to match requested payout
        LedgerEntry debitEntry = LedgerEntry.builder()
                .appId(app.getId())
                .bankAccountNumber("123456")
                .amount(new BigDecimal("-8000.00"))
                .entryType("DEBIT")
                .webhookEventId("payout_" + failedPayout.getId())
                .build();
        ledgerEntryRepository.save(debitEntry);

        // Process failed payout
        payoutProcessingScheduler.processPendingPayouts();
        assertEquals("FAILED", payoutRepository.findById(failedPayout.getId()).get().getStatus());

        // Verify refund credit was posted and balance is restored
        BigDecimal balanceAfterFail = ledgerEntryRepository.computeBalanceForApp(app.getId());
        assertEquals(0, balanceBeforeFail.compareTo(balanceAfterFail));

        // Test customer card deletion
        subscriptionService.deleteVaultedCard(app.getId(), customer.getId());
        Customer updatedCust = customerRepository.findById(customer.getId()).get();
        assertNull(updatedCust.getNombaTokenKey());
    }
}
