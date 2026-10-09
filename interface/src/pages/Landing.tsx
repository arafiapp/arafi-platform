import React, { useEffect, useState, useRef } from "react";
import Footer from "../components/shared/Footer";
import Navbar from "../components/shared/Navbar";
import Architecture from "../components/ui/Achitecture";
import BackgroundShader from "../components/ui/BackgroundShader";
import { useNavigate } from "react-router-dom";

const SpotlightCard = ({ children, className = "", style }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || isFocused) return;
    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setIsFocused(true);
    setOpacity(1);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setOpacity(0);
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden ${className}`}
      style={style}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.06), transparent 40%)`,
        }}
      />
      {children}
    </div>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const authString = '"Authorization: Bearer sk_live_7a8b9c..."';
  const payloadString = `'{
  "amount": 2500,
  "currency": "USD",
  "settlement": "stellar_usdc",
  "routing": "auto_failover",
  "destination": "GAB...SOROBAN_ESCROW"
}'`;
  const [typedAuth, setTypedAuth] = useState("");
  const [typedPayload, setTypedPayload] = useState("");
  const [copiedHero, setCopiedHero] = useState(false);
  const [copiedSdk, setCopiedSdk] = useState(false);
  const [activeIntegrationStep, setActiveIntegrationStep] = useState(2);

  // Interactive Widget States
  // 1. Failover Simulator
  const [isPaystackDown, setIsPaystackDown] = useState(false);
  const [failoverLog, setFailoverLog] = useState<string[]>([]);
  const [isSimulatingFailover, setIsSimulatingFailover] = useState(false);

  // 2. Lancer Milestone Stepper
  const [lancerStep, setLancerStep] = useState(1);

  // 3. BYOK Vault simulation
  const [vaultKeyMasked, setVaultKeyMasked] = useState(true);

  const simulateFailover = () => {
    setIsSimulatingFailover(true);
    setIsPaystackDown(true);
    setFailoverLog(["Initiating charge on Paystack rail...", "HTTP 504 Gateway Timeout detected from primary processor."]);
    setTimeout(() => {
      setFailoverLog((prev) => [
        ...prev,
        "Circuit breaker tripped. Dynamic Router activating Flutterwave fallback...",
        "Transaction settled on Flutterwave in 42ms.",
        "Emitting canonical event: payment.settled",
      ]);
      setIsSimulatingFailover(false);
    }, 1200);
  };

  const resetFailover = () => {
    setIsPaystackDown(false);
    setFailoverLog([]);
  };

  const copyHero = () => {
    navigator.clipboard.writeText(`curl -X POST https://api.arafi.com/v1/payments/charge \\\n  -H "Content-Type: application/json" \\\n  -H "Idempotency-Key: req_981a2b3c" \\\n  -H "Authorization: Bearer sk_live_7a8b9c..." \\\n  -d '{\n  "amount": 2500,\n  "currency": "USD",\n  "settlement": "stellar_usdc",\n  "routing": "auto_failover",\n  "destination": "GAB...SOROBAN_ESCROW"\n}'`);
    setCopiedHero(true);
    setTimeout(() => setCopiedHero(false), 2000);
  };

  const copySdk = () => {
    let code = "";
    if (activeIntegrationStep === 1) {
      code = "npm install @arafi/node\n# or\nyarn add @arafi/node";
    } else if (activeIntegrationStep === 2) {
      code = `import { Arafi } from '@arafi/node';

const arafi = new Arafi(process.env.ARAFI_SECRET_KEY);

// Dispatch a charge with dynamic failover and Stellar USDC settlement
const payment = await arafi.payments.charge({
  amount: 2500,
  currency: 'USD',
  settlement: 'stellar_usdc',
  routing_strategy: 'auto_failover',
  destination: 'GAB...SOROBAN_ESCROW',
});

console.log(payment.sessionId, payment.status);`;
    } else {
      code = `import express from 'express';

const app = express();

// Arafi normalizes all provider webhooks into a single canonical event
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const event = arafi.webhooks.constructEvent(
    req.body,
    req.headers['arafi-signature']
  );

  if (event.type === 'payment.settled') {
    // Transaction succeeded whether Paystack or Flutterwave was used
    console.log('Normalized settlement verified:', event.data.amount, event.data.destination);
  }

  res.sendStatus(200);
});`;
    }
    navigator.clipboard.writeText(code);
    setCopiedSdk(true);
    setTimeout(() => setCopiedSdk(false), 2000);
  };

  useEffect(() => {
    let authIndex = 0;
    let payloadIndex = 0;
    let typingAuth = true;

    const interval = setInterval(() => {
      if (typingAuth) {
        setTypedAuth(authString.substring(0, authIndex));
        authIndex++;
        if (authIndex > authString.length) {
          typingAuth = false;
        }
      } else {
        setTypedPayload(payloadString.substring(0, payloadIndex));
        payloadIndex++;
        if (payloadIndex > payloadString.length) {
          clearInterval(interval);
        }
      }
    }, 45);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll(".fade-up");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.1 },
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, []);

  return (
    <div className="text-on-surface antialiased min-h-screen flex flex-col font-body-md selection:bg-primary/30 selection:text-primary-fixed relative">
      {/* Global Background Grid */}
      <div className="fixed inset-0 z-[-1] pointer-events-none bg-grid [mask-image:radial-gradient(ellipse_at_top_center,black_40%,transparent_100%)] opacity-70"></div>

      {/* Background Shader */}
      <BackgroundShader />

      <Navbar />

      <main className="grow pt-40 pb-20">
        {/* ========================================================= */}
        {/* 1. HERO SECTION                                           */}
        {/* ========================================================= */}
        <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-1 lg:grid-cols-12 gap-16 items-center mb-20 relative">
          <div className="absolute top-0 left-1/4 w-125 h-125 bg-primary/10 blur-[120px] -z-10 rounded-full"></div>
          <div className="absolute bottom-0 right-1/4 w-100 h-100 bg-tertiary/5 blur-[100px] -z-10 rounded-full"></div>

          <div className="lg:col-span-6 flex flex-col items-start gap-7 z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface/60 border border-primary/20 fade-up shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-label-mono text-[11px] text-primary uppercase tracking-wider font-semibold">
                Infrastructure Translation Layer • Non-Custodial
              </span>
            </div>

            <h1
              className="font-headline-xl text-[44px] md:text-[56px] leading-[1.05] text-on-surface fade-up tracking-tighter font-bold"
              style={{ transitionDelay: "100ms" }}
            >
              One API. Every Gateway. <br />
              <span className="text-on-surface/50">Settled on Stellar.</span>
            </h1>

            <p
              className="font-body-lg text-body-lg text-on-surface/70 max-w-xl fade-up leading-relaxed"
              style={{ transitionDelay: "200ms" }}
            >
              Arafi is an <strong className="text-on-surface font-semibold">infrastructure translation layer and state machine</strong> that sits between your codebase and fragmented payment processors. Manage BYOK credentials with KMS envelope encryption, route across gateways with automatic failover, and relay fiat settlements directly into Stellar USDC—<strong className="text-on-surface font-semibold">zero custody, zero banking liability</strong>.
            </p>

            <div
              className="flex flex-wrap items-center gap-4 mt-2 fade-up"
              style={{ transitionDelay: "300ms" }}
            >
              <button
                onClick={() => navigate("/signup")}
                className="font-body-md text-[14px] font-semibold px-6 py-3.5 rounded-full btn-primary flex items-center gap-2 shadow-lg shadow-primary/20"
              >
                Get API Keys
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </button>
              <button
                className="font-body-md text-[14px] font-medium px-6 py-3.5 rounded-full btn-secondary flex items-center gap-2"
                onClick={() => {
                  const el = document.getElementById("architecture");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Explore Architecture
                <span className="material-symbols-outlined text-[18px]">
                  account_tree
                </span>
              </button>
            </div>

            {/* Zero Custody Trust Pill Ribbon */}
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-on-surface/10 w-full fade-up"
              style={{ transitionDelay: "350ms" }}
            >
              <div>
                <div className="font-headline-md text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">lock_reset</span>
                  Zero Custody
                </div>
                <div className="text-[11px] text-on-surface/50 font-label-mono mt-0.5">Never touch customer funds</div>
              </div>
              <div>
                <div className="font-headline-md text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-400 text-[16px]">alt_route</span>
                  Dynamic Failover
                </div>
                <div className="text-[11px] text-on-surface/50 font-label-mono mt-0.5">Paystack ⇄ Flutterwave</div>
              </div>
              <div>
                <div className="font-headline-md text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">public</span>
                  SEP-24 Bridge
                </div>
                <div className="text-[11px] text-on-surface/50 font-label-mono mt-0.5">Card to Stellar USDC</div>
              </div>
              <div>
                <div className="font-headline-md text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#ff5f56] text-[16px]">gavel</span>
                  Soroban Escrow
                </div>
                <div className="text-[11px] text-on-surface/50 font-label-mono mt-0.5">On-chain milestone locks</div>
              </div>
            </div>
          </div>

          {/* Hero Code Terminal */}
          <div
            className="lg:col-span-6 relative fade-up"
            style={{ transitionDelay: "400ms" }}
          >
            <div className="relative group w-full max-w-lg mx-auto lg:ml-auto lg:mr-0">
              <div className="absolute -inset-1 bg-gradient-to-tr from-primary/30 to-tertiary/20 blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-700"></div>

              <div className="relative rounded-2xl overflow-hidden border border-on-surface/10 bg-surface-container/95 backdrop-blur-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col h-[420px] transition-transform duration-500 group-hover:scale-[1.01]">
                <div className="flex items-center px-5 py-4 bg-surface-container-highest/50 border-b border-on-surface/10 gap-4 relative z-10 backdrop-blur-sm">
                  <div className="flex gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]"></div>
                  </div>
                  <div className="flex-1 text-center">
                    <span className="font-label-mono text-[11px] text-on-surface/50 font-medium tracking-widest uppercase">
                      POST /v1/payments/charge
                    </span>
                  </div>
                  <button
                    onClick={copyHero}
                    className="text-on-surface/40 hover:text-on-surface/80 transition-colors flex items-center justify-center p-1.5 rounded-md hover:bg-on-surface/5"
                    aria-label="Copy code"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copiedHero ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>

                <div className="p-6 font-code-sm text-[12.5px] leading-[1.8] text-on-surface/80 overflow-x-auto flex-1 flex flex-col justify-center relative z-10">
                  <pre className="flex">
                    <div className="flex flex-col text-on-surface/20 select-none text-right pr-4 mr-4 border-r border-on-surface/10 font-label-mono text-[11px] leading-[1.8]">
                      <span>1</span>
                      <span>2</span>
                      <span>3</span>
                      <span>4</span>
                      <span>5</span>
                      <span>6</span>
                      <span>7</span>
                      <span>8</span>
                      <span>9</span>
                      <span>10</span>
                      <span>11</span>
                      <span>12</span>
                    </div>
                    <code>
                      <span className="text-primary font-bold">curl</span> -X POST https://api.arafi.com/v1/payments/charge \
                      <br />
                      <span className="text-on-surface/50">  -H</span> <span className="text-emerald-400">"Content-Type: application/json"</span> \
                      <br />
                      <span className="text-on-surface/50">  -H</span> <span className="text-emerald-400">{typedAuth}</span> \
                      <br />
                      <span className="text-on-surface/50">  -d</span> <span className="text-emerald-400 whitespace-pre">{typedPayload}</span>
                      <span className="inline-block w-1.5 h-4 bg-primary/80 ml-1.5 align-middle animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span>
                    </code>
                  </pre>
                </div>

                {/* Footer status pill */}
                <div className="px-5 py-2.5 bg-surface-container-highest/30 border-t border-on-surface/5 flex items-center justify-between text-[11px] font-label-mono text-on-surface/50">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    KMS In-Memory Signer Ready
                  </span>
                  <span className="text-primary font-medium">Stellar Soroban Rail</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 2. LOGO CLOUD: INTEGRATED RAILS & PRIMITIVES              */}
        {/* ========================================================= */}
        <section className="max-w-max-width mx-auto mb-32 fade-up overflow-hidden">
          <p className="text-center font-body-md text-[12px] font-semibold text-on-surface/40 uppercase tracking-widest mb-8">
            Orchestrating traditional processors and blockchain primitives
          </p>
          <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="flex w-max animate-marquee items-center opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-14 md:gap-20 items-center px-8 md:px-14">
                  <span className="font-headline-md text-xl font-bold flex items-center gap-2.5 hover:text-[#00C3F7] transition-colors cursor-default">
                    <span className="material-symbols-outlined text-[26px]">account_balance_wallet</span> Paystack
                  </span>
                  <span className="font-headline-md text-xl font-bold flex items-center gap-2.5 hover:text-[#FB9129] transition-colors cursor-default">
                    <span className="material-symbols-outlined text-[26px]">payments</span> Flutterwave
                  </span>
                  <span className="font-headline-md text-xl font-bold flex items-center gap-2.5 hover:text-[#635BFF] transition-colors cursor-default">
                    <span className="material-symbols-outlined text-[26px]">credit_card</span> Stripe
                  </span>
                  <span className="font-headline-md text-xl font-bold flex items-center gap-2.5 hover:text-[#14B6EC] transition-colors cursor-default">
                    <span className="material-symbols-outlined text-[26px]">stars</span> Stellar Network
                  </span>
                  <span className="font-headline-md text-xl font-bold flex items-center gap-2.5 hover:text-[#8D5B4C] transition-colors cursor-default">
                    <span className="material-symbols-outlined text-[26px]">code</span> Soroban Contracts
                  </span>
                  <span className="font-headline-md text-xl font-bold flex items-center gap-2.5 hover:text-emerald-400 transition-colors cursor-default">
                    <span className="material-symbols-outlined text-[26px]">anchor</span> SEP-24 Anchors
                  </span>
                  <span className="font-headline-md text-xl font-bold flex items-center gap-2.5 hover:text-amber-400 transition-colors cursor-default">
                    <span className="material-symbols-outlined text-[26px]">key</span> AWS / GCP KMS
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. THE CONCRETE PROBLEM ARAFI SOLVES                      */}
        {/* ========================================================= */}
        <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mb-36">
          <div className="text-center mb-16 fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-error/10 border border-error/20 text-error text-[12px] font-label-mono mb-3 uppercase tracking-wider">
              The Reality of Payment Engineering
            </div>
            <h2 className="font-headline-lg text-3xl md:text-5xl text-on-surface tracking-tight font-bold">
              The Concrete Problem Arafi Solves
            </h2>
            <p className="font-body-md text-on-surface/60 mt-4 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
              When an engineering team builds an application that collects money, they are forced to spend weeks writing defensive, fragile plumbing.
            </p>
          </div>

          {/* Problem Architecture Schematic */}
          <div className="mb-12 bg-surface-container/70 border border-on-surface/10 rounded-3xl p-6 md:p-8 fade-up shadow-xl">
            <div className="text-center font-label-mono text-xs text-on-surface/40 uppercase tracking-widest mb-6">
              Before Arafi: Fragile, Entangled Gateway Codebases
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-surface-container-highest/60 border border-error/20 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-headline-md text-sm font-bold text-on-surface">Paystack API</span>
                    <span className="text-[10px] font-label-mono px-2 py-0.5 rounded bg-error/10 text-error">Fragmented</span>
                  </div>
                  <p className="text-[12px] font-body-md text-on-surface/60 leading-relaxed">
                    Sporadic gateway downtime, localized NGN focus, separate schema for charges, verify endpoints, and webhooks.
                  </p>
                </div>
                <div className="text-[11px] font-label-mono text-error/80 mt-4">⚠️ Requires custom fallback logic</div>
              </div>

              <div className="bg-surface-container-highest/60 border border-error/20 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-headline-md text-sm font-bold text-on-surface">Flutterwave API</span>
                    <span className="text-[10px] font-label-mono px-2 py-0.5 rounded bg-error/10 text-error">Conflicting</span>
                  </div>
                  <p className="text-[12px] font-body-md text-on-surface/60 leading-relaxed">
                    Different secret hash webhook headers, inconsistent payload keys, soft decline error representations.
                  </p>
                </div>
                <div className="text-[11px] font-label-mono text-error/80 mt-4">⚠️ Pollutes core business code</div>
              </div>

              <div className="bg-surface-container-highest/60 border border-error/20 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-headline-md text-sm font-bold text-on-surface">Stripe</span>
                    <span className="text-[10px] font-label-mono px-2 py-0.5 rounded bg-error/10 text-error">Restricted</span>
                  </div>
                  <p className="text-[12px] font-body-md text-on-surface/60 leading-relaxed">
                    Strict corporate incorporation barriers for emerging markets; international cards face abrupt merchant freezes.
                  </p>
                </div>
                <div className="text-[11px] font-label-mono text-error/80 mt-4">⚠️ Traps cross-border revenue</div>
              </div>

              <div className="bg-surface-container-highest/60 border border-error/20 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-headline-md text-sm font-bold text-on-surface">Stellar / Soroban</span>
                    <span className="text-[10px] font-label-mono px-2 py-0.5 rounded bg-error/10 text-error">Unreachable</span>
                  </div>
                  <p className="text-[12px] font-body-md text-on-surface/60 leading-relaxed">
                    Powerful crypto primitives and trustless escrow logic that traditional checkout forms and fiat buyers cannot access.
                  </p>
                </div>
                <div className="text-[11px] font-label-mono text-error/80 mt-4">⚠️ Missing fiat-to-contract bridge</div>
              </div>
            </div>
          </div>

          {/* The 3 Core Pain Points Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SpotlightCard className="fade-up rounded-3xl border border-on-surface/10 bg-surface-container p-8 flex flex-col justify-between shadow-lg">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center text-error mb-6">
                  <span className="material-symbols-outlined text-[26px]">heart_broken</span>
                </div>
                <h3 className="font-headline-md text-xl text-on-surface font-bold mb-3">
                  1. Gateway Fragility
                </h3>
                <p className="font-body-md text-on-surface/60 text-sm leading-relaxed">
                  If Paystack experiences downtime during checkout, the sale fails unless the developer wrote custom fallback logic. Maintaining real-time health checks across multiple providers is tedious and error-prone.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-on-surface/5 flex items-center justify-between text-xs font-label-mono text-error">
                <span>Direct Cart Abandonment</span>
                <span>Revenue Lost</span>
              </div>
            </SpotlightCard>

            <SpotlightCard className="fade-up delay-100 rounded-3xl border border-on-surface/10 bg-surface-container p-8 flex flex-col justify-between shadow-lg" style={{ transitionDelay: '100ms' }}>
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6">
                  <span className="material-symbols-outlined text-[26px]">schema</span>
                </div>
                <h3 className="font-headline-md text-xl text-on-surface font-bold mb-3">
                  2. Schema Chaos
                </h3>
                <p className="font-body-md text-on-surface/60 text-sm leading-relaxed">
                  Every processor uses a different format for errors, authorizations, and webhooks. Normalizing responses across three or four providers turns application code into compounding technical debt.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-on-surface/5 flex items-center justify-between text-xs font-label-mono text-amber-400">
                <span>Conflicting Signatures</span>
                <span>Brittle Glue Code</span>
              </div>
            </SpotlightCard>

            <SpotlightCard className="fade-up delay-200 rounded-3xl border border-on-surface/10 bg-surface-container p-8 flex flex-col justify-between shadow-lg" style={{ transitionDelay: '200ms' }}>
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6">
                  <span className="material-symbols-outlined text-[26px]">public_off</span>
                </div>
                <h3 className="font-headline-md text-xl text-on-surface font-bold mb-3">
                  3. Cross-Border Blockage
                </h3>
                <p className="font-body-md text-on-surface/60 text-sm leading-relaxed">
                  A local developer cannot easily accept a card payment from a client in London or New York and receive stable, inflation-resistant funds (USDC) without setting up complex foreign corporate entities or risking account freezes.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-on-surface/5 flex items-center justify-between text-xs font-label-mono text-primary">
                <span>Foreign Entity Traps</span>
                <span>Currency Devaluation</span>
              </div>
            </SpotlightCard>
          </div>

          <div className="mt-10 text-center fade-up">
            <div className="inline-block p-4 rounded-2xl bg-primary/10 border border-primary/20 text-on-surface font-headline-md text-sm md:text-base font-semibold">
              ✨ Arafi collapses all of that complexity into a single integration.
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. THE THREE ARCHITECTURAL PILLARS (DEEP DIVE)            */}
        {/* ========================================================= */}
        <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mb-40">
          <div className="text-center mb-16 fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[12px] font-label-mono mb-3 uppercase tracking-wider">
              Core Capabilities
            </div>
            <h2 className="font-headline-lg text-3xl md:text-5xl text-on-surface tracking-tight font-bold">
              The Three Architectural Pillars
            </h2>
            <p className="font-body-md text-on-surface/60 mt-4 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
              Engineered as pure software leverage: zero custody, autonomous failover, and non-custodial crypto settlement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* PILLAR 1: Zero-Custody BYOK Vault */}
            <SpotlightCard className="fade-up md:col-span-6 rounded-3xl border border-on-surface/10 bg-surface-container p-8 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[26px]">vpn_key</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-label-mono uppercase tracking-wider font-bold">
                    Pillar 1 • Zero-Custody
                  </span>
                </div>
                <h3 className="font-headline-md text-2xl text-on-surface font-bold mb-3">
                  Zero-Custody "BYOK" Key Vault
                </h3>
                <p className="font-body-md text-on-surface/70 text-sm leading-relaxed mb-6">
                  Developers plug their own live credentials (e.g., Paystack Secret Key, Flutterwave Key) into Arafi. 
                  Arafi encrypts each key using <strong className="text-on-surface">envelope encryption</strong> via an external Key Management Service (AWS or GCP KMS).
                </p>

                <ul className="space-y-3 font-body-md text-xs text-on-surface/70 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">verified</span>
                    <span><strong>Volatile Memory Only:</strong> Plain secret exists in RAM only for the milliseconds needed to sign outbound requests.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">verified</span>
                    <span><strong>Zero Disk Footprint:</strong> Secrets are never written to disk, database rows, or log files.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">verified</span>
                    <span><strong>No Banking Liability:</strong> We never touch customer money, eliminating banking licensing obligations.</span>
                  </li>
                </ul>
              </div>

              {/* Interactive Key Vault Widget */}
              <div className="bg-surface-container-highest/60 rounded-2xl border border-on-surface/10 p-5 mt-4">
                <div className="flex items-center justify-between mb-3 text-[11px] font-label-mono text-on-surface/60">
                  <span>Envelope Encryption Status</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    KMS Active
                  </span>
                </div>
                <div className="bg-surface-container p-3 rounded-xl border border-on-surface/10 font-code-sm text-[11px] text-on-surface/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-bold">PAYSTACK_KEY:</span>
                    <span>{vaultKeyMasked ? "enc_kms_98a72f00...[ENCRYPTED]" : "sk_live_948f2b01c...[IN-MEM DECRYPT]"}</span>
                  </div>
                  <button
                    onClick={() => setVaultKeyMasked(!vaultKeyMasked)}
                    className="text-xs text-on-surface/50 hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {vaultKeyMasked ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
                <div className="text-[10px] font-label-mono text-on-surface/40 mt-2 text-right">
                  Decryption TTL: 120ms • KMS Envelope
                </div>
              </div>
            </SpotlightCard>

            {/* PILLAR 2: Dynamic Routing & Failover Engine */}
            <SpotlightCard className="fade-up md:col-span-6 rounded-3xl border border-on-surface/10 bg-surface-container p-8 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary">
                    <span className="material-symbols-outlined text-[26px]">alt_route</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-tertiary/10 border border-tertiary/20 text-tertiary text-[10px] font-label-mono uppercase tracking-wider font-bold">
                    Pillar 2 • Failover
                  </span>
                </div>
                <h3 className="font-headline-md text-2xl text-on-surface font-bold mb-3">
                  Dynamic Routing &amp; Failover Engine
                </h3>
                <p className="font-body-md text-on-surface/70 text-sm leading-relaxed mb-6">
                  When the application initiates a charge, Arafi evaluates gateway health, latency, and transaction costs in real time to guarantee checkout delivery.
                </p>

                <ul className="space-y-3 font-body-md text-xs text-on-surface/70 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">check_circle</span>
                    <span><strong>Domestic Failover:</strong> If Paystack times out or throws a 5xx error, Arafi catches it and routes via Flutterwave seamlessly.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">check_circle</span>
                    <span><strong>State Normalization:</strong> You don't listen to five different webhook schemas. Arafi emits a single canonical event: <code className="text-emerald-400">payment.settled</code>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">check_circle</span>
                    <span><strong>Soft Decline Recovery:</strong> Smart retries and error parsing prevent lost merchant sales.</span>
                  </li>
                </ul>
              </div>

              {/* Interactive Failover Simulator */}
              <div className="bg-surface-container-highest/60 rounded-2xl border border-on-surface/10 p-5 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-label-mono text-on-surface/60">Live Failover Simulation</span>
                  <div className="flex gap-2">
                    {!isPaystackDown ? (
                      <button
                        onClick={simulateFailover}
                        disabled={isSimulatingFailover}
                        className="px-3 py-1 rounded-lg bg-error/10 text-error border border-error/20 text-xs font-semibold hover:bg-error/20 transition-colors"
                      >
                        {isSimulatingFailover ? "Simulating..." : "Trigger 504 Outage"}
                      </button>
                    ) : (
                      <button
                        onClick={resetFailover}
                        className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
                      >
                        Reset Simulator
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-surface-container p-3 rounded-xl border border-on-surface/10 font-code-sm text-[11px] min-h-[90px] flex flex-col justify-center">
                  {failoverLog.length === 0 ? (
                    <div className="text-on-surface/50 flex items-center justify-between">
                      <span>Primary: Paystack (Healthy • 28ms)</span>
                      <span className="text-emerald-400">● 100% Uptime</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {failoverLog.map((log, index) => (
                        <div key={index} className={index === 1 ? "text-error" : index >= 2 ? "text-emerald-400" : "text-on-surface/70"}>
                          &gt; {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </SpotlightCard>

            {/* PILLAR 3: Cross-Border On-Ramp Orchestration (The Stellar Bridge) */}
            <SpotlightCard className="fade-up md:col-span-12 rounded-3xl border border-on-surface/10 bg-surface-container p-8 md:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-3xl pointer-events-none"></div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                <div className="lg:col-span-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <span className="material-symbols-outlined text-[22px]">public</span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-label-mono uppercase tracking-wider font-bold">
                      Pillar 3 • Cross-Border
                    </span>
                  </div>

                  <h3 className="font-headline-lg text-2xl md:text-3xl text-on-surface font-bold mb-4">
                    Cross-Border On-Ramp Orchestration <br />
                    <span className="text-emerald-400">(The Stellar Bridge)</span>
                  </h3>

                  <p className="font-body-md text-on-surface/70 text-sm md:text-base leading-relaxed mb-6">
                    When an international buyer in London or New York needs to pay an African developer or agency:
                  </p>

                  <div className="space-y-3 font-body-md text-xs md:text-sm text-on-surface/80">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">1</div>
                      <p><strong>Interactive SEP-24 Session:</strong> Arafi provisions an interactive session with a licensed Stellar on-ramp anchor.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">2</div>
                      <p><strong>Zero Chargeback Liability:</strong> The licensed anchor runs the card, handles KYC, and absorbs all chargeback risk.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">3</div>
                      <p><strong>Direct USDC Minting:</strong> The anchor mints or transfers Stellar USDC directly into the developer's wallet or a Soroban milestone contract.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">4</div>
                      <p><strong>On-Chain Ledger Listener:</strong> Arafi's ledger listener detects on-chain ledger finality and confirms: <em>"Payment verified and locked on-chain."</em></p>
                    </div>
                  </div>
                </div>

                {/* Visual Stepper Diagram */}
                <div className="lg:col-span-6 bg-surface-container-highest/60 rounded-2xl border border-on-surface/10 p-6 md:p-8 flex flex-col justify-between">
                  <div className="font-label-mono text-xs text-on-surface/40 uppercase tracking-widest mb-6">
                    End-to-End Cross-Border Lifecycle
                  </div>

                  <div className="space-y-4">
                    <div className="bg-surface-container p-4 rounded-xl border border-on-surface/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-[22px]">credit_card</span>
                        <div>
                          <div className="font-headline-md text-xs font-bold text-on-surface">International Buyer</div>
                          <div className="text-[11px] text-on-surface/50">Pays via Card / Apple Pay in USD / EUR / GBP</div>
                        </div>
                      </div>
                      <span className="text-xs font-label-mono text-emerald-400">$3,500.00</span>
                    </div>

                    <div className="flex justify-center text-on-surface/30">
                      <span className="material-symbols-outlined">arrow_downward</span>
                    </div>

                    <div className="bg-surface-container p-4 rounded-xl border border-emerald-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-emerald-400 text-[22px]">anchor</span>
                        <div>
                          <div className="font-headline-md text-xs font-bold text-emerald-300">Licensed SEP-24 Anchor</div>
                          <div className="text-[11px] text-on-surface/50">KYC, Card Risk Absorbed • Mints USDC</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-label-mono font-semibold">Verified</span>
                    </div>

                    <div className="flex justify-center text-on-surface/30">
                      <span className="material-symbols-outlined">arrow_downward</span>
                    </div>

                    <div className="bg-surface-container p-4 rounded-xl border border-primary/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#ff5f56] text-[22px]">lock</span>
                        <div>
                          <div className="font-headline-md text-xs font-bold text-on-surface">Soroban Escrow / Wallet</div>
                          <div className="text-[11px] text-on-surface/50">Ledger finality detected in ~4s • Locked on-chain</div>
                        </div>
                      </div>
                      <span className="text-xs font-label-mono text-primary font-bold">3,500 USDC</span>
                    </div>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. ARCHITECTURE TOPOLOGY VISUALIZER                       */}
        {/* ========================================================= */}
        <Architecture />

        {/* ========================================================= */}
        {/* 6. HOW ARAFI FITS WITH LANCER (CUSTOMER ZERO)             */}
        {/* ========================================================= */}
        <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mb-40">
          <div className="rounded-[2rem] border border-primary/20 bg-gradient-to-b from-surface-container to-surface-container/80 p-8 md:p-14 shadow-2xl relative overflow-hidden fade-up">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 blur-[120px] pointer-events-none"></div>

            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[12px] font-label-mono mb-4 uppercase tracking-wider">
                Proof-of-Concept Client • Customer Zero
              </div>
              <h2 className="font-headline-lg text-3xl md:text-5xl text-on-surface tracking-tight font-bold">
                How Arafi Powers Lancer
              </h2>
              <p className="font-body-md text-on-surface/70 text-base md:text-lg mt-4 leading-relaxed">
                This is where the software synergy becomes practical. A real-world freelance platform where global clients hire developers with milestone guarantees.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-12">
              <div className="bg-surface-container-highest/60 border border-on-surface/10 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 font-bold">
                    01
                  </div>
                  <h3 className="font-headline-md text-lg text-on-surface font-bold mb-2">
                    Lancer is Customer Zero
                  </h3>
                  <p className="font-body-md text-sm text-on-surface/60 leading-relaxed">
                    A decentralized freelance platform where clients hire developers across Africa and Latin America. Lancer needs global card checkouts and milestone escrows without obtaining banking licenses.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-on-surface/5 text-[11px] font-label-mono text-primary">
                  The Freelance Marketplace
                </div>
              </div>

              <div className="bg-surface-container-highest/60 border border-emerald-500/20 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 font-bold">
                    02
                  </div>
                  <h3 className="font-headline-md text-lg text-on-surface font-bold mb-2">
                    Arafi is the Invisible Engine
                  </h3>
                  <p className="font-body-md text-sm text-on-surface/60 leading-relaxed">
                    When a client funds a milestone on Lancer, Lancer doesn't build a billing engine. It makes an API call to Arafi. Arafi handles debit card routing, SEP-24 anchor on-ramping, and notifies Lancer's Soroban contract.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-on-surface/5 text-[11px] font-label-mono text-emerald-400">
                  Invisible Billing &amp; Escrow Brain
                </div>
              </div>

              <div className="bg-surface-container-highest/60 border border-tertiary/20 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary mb-4 font-bold">
                    03
                  </div>
                  <h3 className="font-headline-md text-lg text-on-surface font-bold mb-2">
                    The Standalone Product
                  </h3>
                  <p className="font-body-md text-sm text-on-surface/60 leading-relaxed">
                    Once Arafi reliably powers Lancer, any external developer, SaaS founder, or gig platform can integrate Arafi’s API to solve payment routing, failover, and crypto settlement hurdles in days.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-on-surface/5 text-[11px] font-label-mono text-tertiary">
                  Scalable Developer Infrastructure
                </div>
              </div>
            </div>

            {/* Interactive Milestone Simulator */}
            <div className="bg-surface-container-highest/80 border border-on-surface/10 rounded-2xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h4 className="font-headline-md text-base text-on-surface font-bold">Interactive Lancer Milestone Flow</h4>
                  <p className="text-xs text-on-surface/50 font-label-mono">See how an API call to Arafi orchestrates client card payment to Soroban escrow</p>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4].map((step) => (
                    <button
                      key={step}
                      onClick={() => setLancerStep(step)}
                      className={`px-3 py-1 rounded-full text-xs font-label-mono transition-colors ${
                        lancerStep === step
                          ? "bg-primary text-white font-bold"
                          : "bg-surface-container text-on-surface/60 hover:bg-surface-container-highest"
                      }`}
                    >
                      Step {step}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-surface-container p-6 rounded-xl border border-on-surface/10">
                {lancerStep === 1 && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-primary text-3xl">shopping_cart_checkout</span>
                      <div>
                        <div className="font-headline-md text-sm font-bold text-on-surface">Client Initiates Milestone Funding</div>
                        <div className="text-xs text-on-surface/60">London client pays $2,000 for "Mobile App UI Overhaul" on Lancer.</div>
                      </div>
                    </div>
                    <span className="text-xs font-label-mono px-3 py-1 rounded bg-primary/10 text-primary">POST /v1/payments/charge</span>
                  </div>
                )}
                {lancerStep === 2 && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-emerald-400 text-3xl">sync_alt</span>
                      <div>
                        <div className="font-headline-md text-sm font-bold text-on-surface">Arafi Routes Through SEP-24 Anchor</div>
                        <div className="text-xs text-on-surface/60">Anchor processes Mastercard, absorbs KYC/fraud risk, and converts fiat to Stellar USDC.</div>
                      </div>
                    </div>
                    <span className="text-xs font-label-mono px-3 py-1 rounded bg-emerald-500/10 text-emerald-400">Zero Chargeback Risk</span>
                  </div>
                )}
                {lancerStep === 3 && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-[#ff5f56] text-3xl">lock</span>
                      <div>
                        <div className="font-headline-md text-sm font-bold text-on-surface">Soroban Milestone Smart Contract Locked</div>
                        <div className="text-xs text-on-surface/60">Funds locked on Stellar ledger. Arafi ledger listener notifies Lancer backend: "Verified and locked".</div>
                      </div>
                    </div>
                    <span className="text-xs font-label-mono px-3 py-1 rounded bg-error/10 text-error">Contract Escrow Active</span>
                  </div>
                )}
                {lancerStep === 4 && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-emerald-400 text-3xl">task_alt</span>
                      <div>
                        <div className="font-headline-md text-sm font-bold text-on-surface">Work Approved &amp; Instant On-Chain Release</div>
                        <div className="text-xs text-on-surface/60">Client approves pull request. Contract releases 2,000 USDC directly to African developer's wallet.</div>
                      </div>
                    </div>
                    <span className="text-xs font-label-mono px-3 py-1 rounded bg-emerald-500/10 text-emerald-400">1.0% Settlement Surcharge</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 7. THE ECONOMIC MODEL / PRICING TABLE                     */}
        {/* ========================================================= */}
        <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mb-40">
          <div className="text-center mb-16 fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[12px] font-label-mono mb-3 uppercase tracking-wider">
              Transparent Economics
            </div>
            <h2 className="font-headline-lg text-3xl md:text-5xl text-on-surface tracking-tight font-bold">
              The Economic Model
            </h2>
            <p className="font-body-md text-on-surface/60 mt-4 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
              Arafi is <strong className="text-on-surface">pure software leverage</strong>: an orchestration brain that sits above payment rails to ensure transactions succeed, settles cross-border capital without taking custody, and lets builders integrate once.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tier 1: Routing / Orchestration Fee */}
            <SpotlightCard className="fade-up rounded-3xl border border-on-surface/10 bg-surface-container p-8 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-label-mono text-xs text-primary font-semibold uppercase tracking-wider">
                    Infrastructure Rail
                  </span>
                </div>
                <h3 className="font-headline-md text-xl text-on-surface font-bold mb-2">
                  Routing &amp; Orchestration
                </h3>
                <div className="flex items-baseline gap-1 my-4">
                  <span className="font-headline-xl text-3xl md:text-4xl text-on-surface font-extrabold">$0.05 – $0.10</span>
                  <span className="text-on-surface/50 text-sm font-label-mono">+ 0.2%</span>
                </div>
                <div className="text-xs text-on-surface/60 font-label-mono mb-6 pb-6 border-b border-on-surface/10">
                  Per routed transaction
                </div>

                <ul className="space-y-3.5 text-xs text-on-surface/80 mb-8">
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">check</span>
                    <span>Dynamic multi-gateway router (Paystack, Flutterwave, Stripe)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">check</span>
                    <span>Automatic failover on 5xx downtime &amp; soft declines</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">check</span>
                    <span>Zero-custody KMS envelope encrypted BYOK key vault</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">check</span>
                    <span>Canonical webhook normalization (<code className="text-primary">payment.settled</code>)</span>
                  </li>
                </ul>
              </div>

              <div className="bg-surface-container-highest/60 p-4 rounded-xl border border-on-surface/10">
                <div className="text-[10px] font-label-mono text-on-surface/50 uppercase tracking-wider mb-1">
                  Why Customers Accept It
                </div>
                <p className="text-xs font-body-md text-on-surface/80 leading-relaxed">
                  Cheaper than the engineering cost of maintaining multiple gateway SDKs and losing sales to processor downtime.
                </p>
              </div>
            </SpotlightCard>

            {/* Tier 2: Escrow Settlement Surcharge (Popular) */}
            <SpotlightCard className="fade-up delay-100 rounded-3xl border border-emerald-500/30 bg-surface-container p-8 flex flex-col justify-between shadow-2xl relative" style={{ transitionDelay: '100ms' }}>
              <div className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 rounded-full bg-emerald-500 text-black text-[11px] font-label-mono font-bold uppercase tracking-wider shadow-lg">
                Most Popular
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-label-mono text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                    Soroban Milestone Engine
                  </span>
                </div>
                <h3 className="font-headline-md text-xl text-on-surface font-bold mb-2">
                  Escrow Settlement Surcharge
                </h3>
                <div className="flex items-baseline gap-1 my-4">
                  <span className="font-headline-xl text-4xl text-emerald-400 font-extrabold">1.0%</span>
                  <span className="text-on-surface/50 text-sm font-label-mono">flat</span>
                </div>
                <div className="text-xs text-on-surface/60 font-label-mono mb-6 pb-6 border-b border-on-surface/10">
                  Deducted programmatically when funds release on-chain
                </div>

                <ul className="space-y-3.5 text-xs text-on-surface/80 mb-8">
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">check</span>
                    <span>Licensed Stellar SEP-24 on-ramp anchor orchestration</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">check</span>
                    <span>Soroban smart contract milestone escrow deployment</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">check</span>
                    <span>On-chain ledger finality listener and verification</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">check</span>
                    <span>Zero chargeback liability &amp; institutional KYC absorbed</span>
                  </li>
                </ul>
              </div>

              <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                <div className="text-[10px] font-label-mono text-emerald-400 uppercase tracking-wider mb-1">
                  Why Customers Accept It
                </div>
                <p className="text-xs font-body-md text-on-surface/80 leading-relaxed">
                  Replaces Upwork and Fiverr’s 10%–20% fee while automating programmatic delivery guarantees.
                </p>
              </div>
            </SpotlightCard>

            {/* Tier 3: Developer Tier */}
            <SpotlightCard className="fade-up delay-200 rounded-3xl border border-on-surface/10 bg-surface-container p-8 flex flex-col justify-between shadow-xl" style={{ transitionDelay: '200ms' }}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-label-mono text-xs text-primary font-semibold uppercase tracking-wider">
                    Production SaaS Plan
                  </span>
                </div>
                <h3 className="font-headline-md text-xl text-on-surface font-bold mb-2">
                  Developer Tier
                </h3>
                <div className="flex items-baseline gap-1 my-4">
                  <span className="font-headline-xl text-3xl md:text-4xl text-on-surface font-extrabold">$29</span>
                  <span className="text-on-surface/50 text-sm font-label-mono">/ month</span>
                </div>
                <div className="text-xs text-on-surface/60 font-label-mono mb-6 pb-6 border-b border-on-surface/10">
                  Standard developer SaaS production access
                </div>

                <ul className="space-y-3.5 text-xs text-on-surface/80 mb-8">
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">check</span>
                    <span>High-volume production API endpoints with priority queues</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">check</span>
                    <span>Custom webhook retry schedules &amp; dead-letter queue inspection</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">check</span>
                    <span>Multi-seat team access with RBAC &amp; audit logging</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5">check</span>
                    <span>Real-time gateway uptime and latency telemetry API</span>
                  </li>
                </ul>
              </div>

              <div className="bg-surface-container-highest/60 p-4 rounded-xl border border-on-surface/10">
                <div className="text-[10px] font-label-mono text-on-surface/50 uppercase tracking-wider mb-1">
                  Why Customers Accept It
                </div>
                <p className="text-xs font-body-md text-on-surface/80 leading-relaxed">
                  Predictable monthly developer SaaS pricing for mission-critical payment infrastructure.
                </p>
              </div>
            </SpotlightCard>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 8. SDK & INTEGRATION SECTION                              */}
        {/* ========================================================= */}
        <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mb-40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="fade-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[12px] font-label-mono mb-4 uppercase tracking-wider">
                Developer Experience
              </div>
              <h2 className="font-headline-lg text-[36px] md:text-[44px] leading-tight text-on-surface tracking-tight mb-6 font-bold">
                Integrate once.<br />Route everywhere.
              </h2>
              <p className="font-body-md text-body-lg text-on-surface/60 mb-8 max-w-md leading-relaxed">
                A single deterministic API client. Install the SDK, specify your routing strategy, and let Arafi handle failover, KMS signatures, and Stellar settlement.
              </p>

              <div className="flex flex-col gap-8 relative before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-on-surface/10">
                <button
                  onClick={() => setActiveIntegrationStep(1)}
                  className={`relative pl-12 text-left transition-opacity duration-300 ${activeIntegrationStep === 1 ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
                >
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-surface-container border border-on-surface/20 flex items-center justify-center z-10 transition-colors ${activeIntegrationStep === 1 ? 'border-primary' : ''}`}>
                    <div className={`w-2 h-2 rounded-full transition-colors ${activeIntegrationStep === 1 ? 'bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-on-surface/20'}`}></div>
                  </div>
                  <h3 className={`font-headline-md text-lg font-bold mb-1 transition-colors ${activeIntegrationStep === 1 ? 'text-on-surface' : 'text-on-surface/70'}`}>1. Install the SDK</h3>
                  <p className="text-on-surface-variant font-body-sm">Add our official library via npm, yarn, pip, or go get.</p>
                </button>

                <button
                  onClick={() => setActiveIntegrationStep(2)}
                  className={`relative pl-12 text-left transition-opacity duration-300 ${activeIntegrationStep === 2 ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
                >
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-surface-container border border-on-surface/20 flex items-center justify-center z-10 transition-colors ${activeIntegrationStep === 2 ? 'border-primary' : ''}`}>
                    <div className={`w-2 h-2 rounded-full transition-colors ${activeIntegrationStep === 2 ? 'bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-on-surface/20'}`}></div>
                  </div>
                  <h3 className={`font-headline-md text-lg font-bold mb-1 transition-colors ${activeIntegrationStep === 2 ? 'text-on-surface' : 'text-on-surface/70'}`}>2. Create Charge Intent</h3>
                  <p className="text-on-surface-variant font-body-sm">Define routing, failover rail, and non-custodial settlement destination.</p>
                </button>

                <button
                  onClick={() => setActiveIntegrationStep(3)}
                  className={`relative pl-12 text-left transition-opacity duration-300 ${activeIntegrationStep === 3 ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
                >
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-surface-container border border-on-surface/20 flex items-center justify-center z-10 transition-colors ${activeIntegrationStep === 3 ? 'border-primary' : ''}`}>
                    <div className={`w-2 h-2 rounded-full transition-colors ${activeIntegrationStep === 3 ? 'bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-on-surface/20'}`}></div>
                  </div>
                  <h3 className={`font-headline-md text-lg font-bold mb-1 transition-colors ${activeIntegrationStep === 3 ? 'text-on-surface' : 'text-on-surface/70'}`}>3. Listen to Canonical Webhook</h3>
                  <p className="text-on-surface-variant font-body-sm">Receive a single normalized payment.settled event across all processors.</p>
                </button>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-on-surface/10 bg-surface-container shadow-2xl h-[460px] flex flex-col">
              <div className="flex items-center px-4 pt-4 pb-0 bg-surface-container-highest border-b border-on-surface/10 gap-2">
                <button className="px-4 py-2 border-b-2 border-primary text-primary font-code-sm text-[12px] bg-on-surface/5 rounded-t-lg transition-colors">Node.js</button>
                <div className="flex-1"></div>
                <button
                  onClick={copySdk}
                  className="text-on-surface/40 hover:text-on-surface/80 transition-colors flex items-center justify-center pb-2"
                  aria-label="Copy SDK code"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copiedSdk ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
              <div className="p-6 font-code-sm text-[12.5px] leading-[1.8] text-on-surface/80 overflow-x-auto flex-1 flex flex-col justify-center">
                <pre>
                  <code>
                    {activeIntegrationStep === 1 && (
                      <>
                        <span className="text-on-surface/40"># Install the official Node.js SDK</span><br />
                        <span className="text-primary font-bold">npm</span> install @arafi/node<br /><br />
                        <span className="text-on-surface/40"># Or with yarn</span><br />
                        <span className="text-primary font-bold">yarn</span> add @arafi/node<br /><br />
                        <span className="text-on-surface/40"># Or with pnpm</span><br />
                        <span className="text-primary font-bold">pnpm</span> add @arafi/node
                      </>
                    )}
                    {activeIntegrationStep === 2 && (
                      <>
                        <span className="text-on-surface/40">import</span> {'{ Arafi }'} <span className="text-on-surface/40">from</span> <span className="text-emerald-400">'@arafi/node'</span>;<br /><br />
                        <span className="text-on-surface/40">const</span> arafi <span className="text-on-surface/40">= new</span> Arafi(process.env.ARAFI_SECRET_KEY);<br /><br />
                        <span className="text-on-surface/40">const</span> charge <span className="text-on-surface/40">= await</span> arafi.payments.charge({'{'}<br />
                        {'  '}amount: <span className="text-tertiary">2500</span>,<br />
                        {'  '}currency: <span className="text-emerald-400">'USD'</span>,<br />
                        {'  '}settlement: <span className="text-emerald-400">'stellar_usdc'</span>,<br />
                        {'  '}routing_strategy: <span className="text-emerald-400">'auto_failover'</span>,<br />
                        {'  '}destination: <span className="text-emerald-400">'GAB...SOROBAN_ESCROW'</span>,<br />
                        {'}'});
                      </>
                    )}
                    {activeIntegrationStep === 3 && (
                      <>
                        <span className="text-on-surface/40">app.post(</span><span className="text-emerald-400">'/webhook'</span><span className="text-on-surface/40">, (req, res) =&gt; {'{'}</span><br />
                        {'  '}<span className="text-on-surface/40">const</span> event <span className="text-on-surface/40">=</span> arafi.webhooks.constructEvent(<br />
                        {'    '}req.body,<br />
                        {'    '}req.headers[<span className="text-emerald-400">'arafi-signature'</span>]<br />
                        {'  '});<br /><br />
                        {'  '}<span className="text-on-surface/40">if (event.type ===</span> <span className="text-emerald-400">'payment.settled'</span><span className="text-on-surface/40">) {'{'}</span><br />
                        {'    '}console.log(<span className="text-emerald-400">'Settlement final on-chain:'</span>, event.data);<br />
                        {'  }'}<br />
                        {'  '}res.sendStatus(200);<br />
                        <span className="text-on-surface/40">{'}'});</span>
                      </>
                    )}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 9. BOTTOM CTA SECTION                                     */}
        {/* ========================================================= */}
        <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mb-40 text-center fade-up relative">
          <div className="absolute inset-0 bg-primary/10 blur-[120px] -z-10 rounded-full"></div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[12px] font-label-mono mb-4 uppercase tracking-wider">
            Pure Software Leverage
          </div>
          <h2 className="font-headline-xl text-[40px] md:text-[54px] text-on-surface tracking-tighter font-bold mb-6">
            Stop writing defensive payment plumbing.
          </h2>
          <p className="font-body-md text-[16px] md:text-[18px] text-on-surface/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            Integrate once. Let Arafi manage gateway failover, BYOK KMS envelope encryption, and non-custodial Stellar settlement while you focus on your product.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate("/signup")}
              className="font-body-md text-[14px] font-semibold px-8 py-4 rounded-full btn-primary flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              Start Building for Free
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("architecture");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="font-body-md text-[14px] font-medium px-8 py-4 rounded-full btn-secondary"
            >
              View System Topology
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
