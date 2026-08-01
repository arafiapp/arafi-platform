<div align="center">

<img src="./interface/public/logo.svg" alt="Arafi Logo" width="100" />

# Arafi

### Payment Orchestration API for Developers

**Bring your own gateway keys. Arafi's Smart Router handles the rest.**

[Join the Waitlist](https://arafi.yourara.com) · [Integration Sandbox](https://demoapp-sandy-chi.vercel.app) · [API Docs](https://arafi.yourara.com/docs)

</div>

---

## What is Arafi?

Arafi is a **payment orchestration layer** for developers who are tired of rewriting the same payment logic for every project.

Subscriptions, escrow, checkout state, multi-gateway routing — you shouldn't have to build any of that yourself.

**How it works (Phase 1 — BYOK):**
1. Connect your own gateway credentials (Paystack, Flutterwave, ALATPay, Stripe, etc.)
2. Arafi validates them immediately and encrypts them in a dedicated secrets manager
3. At transaction time, Arafi's **Smart Router** picks whichever of your connected rails is the cheapest and most reliable at that moment
4. Money settles directly into **your own gateway account** — Arafi never touches it
5. You get a single, normalised API for subscriptions, one-off checkouts, escrow, and unified webhooks — regardless of which gateway executed the transaction

This is not a Merchant of Record model. Arafi is infrastructure software. You keep your funds, your gateway relationships, and your settlement flow. Arafi handles the orchestration.

---

## What You Can Build

### Recurring Subscriptions
Set up billing cycles, grace periods, dunning logic, and state transitions in a single API call. Arafi manages the state machine and fires normalised webhooks on every transition.

```bash
POST /v1/subscriptions
{
  "customer_id": "cus_...",
  "plan_id": "plan_pro_monthly",
  "redirect_url": "https://yourapp.com/success"
}
```

### One-off Product Checkouts
Generate a hosted checkout link for a physical or digital product without building a checkout UI.

```bash
POST /v1/products/{product_id}/checkout
{
  "customerEmail": "buyer@example.com",
  "customerName": "Jane Doe",
  "redirectUrl": "https://yourapp.com/success"
}
```

### Escrow Vaults *(coming soon)*
Lock funds in a secure vault tied to a condition. Release only when milestones are confirmed. Built for two-sided marketplaces, freelance platforms, and any trust-dependent transaction.

### Customer Identity & Ledger
Arafi maintains a double-entry ledger per customer across all payment flows. Every customer gets a persistent profile, and every transaction is tied to it — giving you unified reporting across all your connected gateways.

---

## Smart Router

Every transaction runs through a routing engine that selects the optimal gateway from your connected rails:

| Routing Criterion | How Arafi Uses It |
|---|---|
| **Cost** | Routes sub-₦150k NGN transfers to ALATPay (lower base rate). Routes ₦150k+ to Paystack (₦2,000 fee cap applies). |
| **Reliability** | Tracks real-time failure rates and rate-limit headers per gateway. Falls over to your next connected rail automatically. |
| **Type** | Routes card tokenization and recurring charges to whichever of your connected rails supports it best. |
| **Developer Override** | Pass `preferred_gateway: "PAYSTACK"` in your payload to force a rail. Set `allow_fallback: true` to keep resilience. |

---

## Security Architecture

Arafi's value proposition under BYOK rests entirely on merchants trusting us with live credentials. The security model is designed around this:

- **Envelope encryption** — Each gateway key is encrypted with its own data key. That data key is encrypted by a master key in a separate secrets manager (AWS/GCP KMS). One breach doesn't equal total compromise.
- **Decrypt only in memory** — Decrypted keys are never written to disk, logs, or error reporters. They exist in memory only at the moment of use.
- **Webhook signature verification** — Every incoming webhook is HMAC-verified against the stored signing secret. Then Arafi makes a second server-to-server call back to the gateway to confirm the transaction status independently. Belt and suspenders.
- **Key validation at onboarding** — When a merchant connects a key, Arafi immediately makes a lightweight authenticated call to validate it. You discover a bad key at connection time, not on the first real transaction.
- **Idempotent outbound calls** — Every request to a gateway carries an idempotency key. Retries after timeouts can't double-charge.
- **IP-based rate limiting** — Bucket4j token-bucket rate limiter per endpoint, per IP. 5 req/hour on auth and waitlist endpoints. 10 req/min on signin. Built to defend against brute-force and scripted abuse.
- **SSRF protection** — Gateway calls are only ever made to an explicit, code-level allowlist of known hostnames. No user-supplied URLs are ever followed.

---

## Architecture Overview

```
Your Application
      │
      ▼
 ┌─────────────────────────────────────────┐
 │              Arafi API                  │
 │  ┌─────────────┐  ┌──────────────────┐  │
 │  │ Smart Router│  │  Ledger / State  │  │
 │  └─────────────┘  └──────────────────┘  │
 └────────────┬──────────────┬─────────────┘
              │              │
      ┌───────┘              └───────┐
      ▼                             ▼
 Your Paystack              Your Flutterwave
   Account                    Account
      │                             │
      ▼                             ▼
 Customer's                  Customer's
  Bank Account               Bank Account
```

**Key architectural properties:**
- Arafi never sits in the money path under Phase 1 (BYOK)
- Every gateway adapter is circuit-breaker wrapped (Resilience4j, 2,500ms hard timeout)
- Webhook events are normalised into a single `ArafiEvent` schema — your app talks to one format, not each gateway's unique payload shape
- Stateless Spring Boot API — horizontally scalable

---

## Repository Structure

```
arafi-platform/
├── interface/          # React + Vite + Tailwind frontend (dashboard + waitlist)
│   ├── src/
│   │   ├── pages/      # Route-level components
│   │   │   ├── Waitlist.tsx        # Public waitlist page (currently at /)
│   │   │   ├── LandingOriginal.tsx # Original landing (at /platform)
│   │   │   ├── Dashboard.tsx
│   │   │   └── ...
│   │   └── components/
├── demo-store/         # Next.js integration sandbox demo
├── arafi-api/          # Spring Boot REST API (Java 21)
│   └── src/main/java/com/ara/
│       ├── config/     # Security, CORS, Flyway
│       ├── waitlist/   # Waitlist endpoint (public, no auth)
│       ├── shared/
│       │   ├── ratelimit/  # Bucket4j IP rate limiting
│       │   └── mail/       # Email service
│       └── ...
└── webhookreceiver/    # Standalone webhook ingestion service
```

---

## Getting Started

> **Note:** Arafi is currently in private beta / waitlist mode. The public-facing surface is the waitlist page. Development continues actively.

### Running the Interface Locally

```bash
cd interface
pnpm install

# Copy env file and fill in values
cp .env.example .env.local

pnpm dev
# → http://localhost:5173
```

### Running the Demo Store Locally

```bash
cd demo-store
pnpm install
cp .env.example .env.local
pnpm dev
# → http://localhost:3000
```

### Environment Variables

**Interface (`interface/.env.local`):**
```env
VITE_API_BASE_URL=https://ara-be.onrender.com
VITE_TURNSTILE_SITE_KEY=<your_cloudflare_turnstile_public_key>
VITE_WAITLIST_MODE=true   # Set to false to re-enable /signup and /login
```

**Demo Store (`demo-store/.env.local`):**
```env
NEXT_PUBLIC_API_BASE_URL=https://ara-be.onrender.com
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<your_cloudflare_turnstile_public_key>
```

---

## Roadmap

| Phase | Status | Description |
|---|---|---|
| **Phase 1: BYOK** | 🔨 Building | Bring Your Own Key — connect your gateway accounts, Arafi routes across them |
| **Phase 2: MoR** | 📋 Planned | Merchant of Record — Arafi handles settlement via native sub-account splits (Paystack, Flutterwave, Squadco) or a BaaS banking partner |
| **Escrow** | 📋 Planned | Trustless fund vaults with milestone-based release |
| **Multi-currency** | 📋 Planned | Cross-border routing and FX normalisation |

---

## Contributing

The team is actively building. If you're on the core team, ask for access. If you're not but want to be involved — [join the waitlist](https://arafi.yourara.com) and reach out directly.

---

<div align="center">
<p>© 2026 Arafi. Built with care.</p>
</div>