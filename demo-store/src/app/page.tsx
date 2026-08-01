"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Same disposable email guard used on the waitlist page
// ---------------------------------------------------------------------------
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "trashmail.com",
  "yopmail.com", "throwam.com", "fakeinbox.com", "sharklasers.com",
  "spam4.me", "tempr.email", "dispostable.com", "maildrop.cc",
  "mailnesia.com", "throwaway.email", "mail-temp.com",
]);

function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

// ---------------------------------------------------------------------------
// Cloudflare Turnstile
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onDemoTurnstileLoad?: () => void;
  }
}

// ---------------------------------------------------------------------------
// Product + Plan data (kept for the sandboxed preview UI)
// ---------------------------------------------------------------------------
interface ProductItem {
  id: string; name: string; price: number; sku: string; image: string; description: string;
}
interface PlanItem {
  id: string; name: string; price: number; period: string; description: string;
}

const DEMO_PRODUCTS: ProductItem[] = [
  { id: "ec7d6602-9e50-4448-953b-7deb474d0b50", name: "Arafi Tactile Mechanical Keyboard", price: 45000, sku: "KYBD-MEC-01", image: "⌨️", description: "Compact form factor with custom tuned brown switches and premium doubleshot PBT keycaps." },
  { id: "882cfa57-b036-41dc-8f83-3f978e912f55", name: "Arafi Studio Noise-Cancelling Headphones", price: 68000, sku: "HEAD-WRLS-BLK", image: "🎧", description: "High-fidelity drivers with active ANC, plush memory foam pads, and 40-hour battery life." },
];

const DEMO_PLANS: PlanItem[] = [
  { id: "7180d3bb-ca23-4dc3-8214-d1562836bfe8", name: "Arafi Developer Lite", price: 5000, period: "monthly", description: "Ideal for individual developers building side products. Up to 100 checkout sessions monthly." },
  { id: "ab3eabc5-7d54-439b-8f10-38b25e7046f3", name: "Arafi Scale Premium", price: 15000, period: "monthly", description: "Perfect for scaling SaaS platforms. Up to 5,000 active customer card tokens." },
];

// ---------------------------------------------------------------------------
// Maintenance Overlay — the main component
// ---------------------------------------------------------------------------
function MaintenanceOverlay({ onDismiss }: { onDismiss: () => void }) {
  const formRenderTime = useRef<number>(Date.now());
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const turnstileToken = useRef<string>("");

  const [email, setEmail] = useState("");
  const [intent, setIntent] = useState<"builder" | "curious">("builder");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);

  // Load Turnstile
  useEffect(() => {
    if (document.getElementById("cf-turnstile-demo-script")) {
      setTurnstileReady(true);
      return;
    }
    window.onDemoTurnstileLoad = () => setTurnstileReady(true);
    const script = document.createElement("script");
    script.id = "cf-turnstile-demo-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onDemoTurnstileLoad&render=explicit";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => { window.onDemoTurnstileLoad = undefined; };
  }, []);

  useEffect(() => {
    if (!turnstileReady || !turnstileRef.current || !window.turnstile) return;
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) return;
    widgetId.current = window.turnstile.render(turnstileRef.current, {
      sitekey: siteKey,
      theme: "dark",
      size: "normal",
      callback: (token: string) => { turnstileToken.current = token; },
      "error-callback": () => { turnstileToken.current = ""; },
      "expired-callback": () => { turnstileToken.current = ""; },
    });
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
    };
  }, [turnstileReady]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (honeypot) { setStatus("success"); return; }
    if (Date.now() - formRenderTime.current < 1500) { setStatus("success"); return; }

    if (isDisposableEmail(email)) {
      setErrorMsg("Please use a real email address.");
      return;
    }

    if (!turnstileToken.current) {
      setErrorMsg("Please complete the security check.");
      return;
    }

    setStatus("loading");
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "https://ara-be.onrender.com";

    try {
      const res = await fetch(`${apiBase}/api/v1/waitlist/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), intent, token: turnstileToken.current }),
      });
      const data = await res.json();
      if (res.status === 201 || res.status === 409) {
        setStatus("success");
      } else {
        setErrorMsg(data?.Message || "Something went wrong. Please try again.");
        setStatus("error");
        if (widgetId.current && window.turnstile) { window.turnstile.reset(widgetId.current); turnstileToken.current = ""; }
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
      if (widgetId.current && window.turnstile) { window.turnstile.reset(widgetId.current); turnstileToken.current = ""; }
    }
  }, [email, intent, honeypot]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#08090a]/95 backdrop-blur-2xl" />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-lg bg-[#0d0f13] border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl shadow-black/60">
        {/* Top glow bar */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

        <div className="p-8 md:p-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L10.5 6H15L11.2 9.1L12.6 14L8 11L3.4 14L4.8 9.1L1 6H5.5L8 1Z" fill="currentColor" className="text-indigo-400" />
                </svg>
              </div>
              <span className="font-mono text-[11px] text-white/40 uppercase tracking-widest">Arafi</span>
            </div>
            <button
              onClick={onDismiss}
              className="text-white/20 hover:text-white/50 transition-colors p-1 rounded-lg hover:bg-white/5"
              aria-label="Dismiss"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Main message */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              <span className="font-mono text-[10px] text-amber-400 uppercase tracking-widest">Sandbox Offline</span>
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight leading-snug mb-4">
              The Sandbox is taking a breath.
            </h1>

            <p className="text-[14px] text-white/50 leading-relaxed">
              We intentionally pulled the servers down to build actively and manage resources. 
              We're a few days from spinning up a live sandbox you can test against 
              your own integration — one that actually works end-to-end.
            </p>

            <div className="mt-5 bg-indigo-500/[0.06] border border-indigo-500/15 rounded-xl p-4">
              <p className="text-[13px] text-white/60 leading-relaxed">
                <span className="text-white/80 font-medium">What you're looking at</span> — below this overlay is the 
                Arafi Integration Sandbox UI. You'd normally use it to trigger real payment flows 
                and watch the API respond live. Leave your email and we'll tell you the moment it's back.
              </p>
            </div>
          </div>

          {status !== "success" ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Intent toggle */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest mr-1">I am</span>
                {([
                  { value: "builder", label: "A Developer" },
                  { value: "curious", label: "Just Curious" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIntent(opt.value)}
                    className={`px-3.5 py-1.5 rounded-full font-mono text-[11px] transition-all duration-200 border ${
                      intent === opt.value
                        ? "bg-indigo-500 text-white border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.35)]"
                        : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60 bg-white/[0.02]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Honeypot */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="absolute opacity-0 pointer-events-none w-0 h-0"
                aria-hidden="true"
              />

              {/* Email + submit */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/25 font-mono focus:outline-none focus:border-indigo-500/50 transition-all"
                  disabled={status === "loading"}
                />
                <button
                  type="submit"
                  disabled={status === "loading" || !email}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[12px] px-5 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                >
                  {status === "loading" ? (
                    <><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />Joining...</>
                  ) : (
                    <>Notify Me <span className="material-symbols-outlined text-[14px]">arrow_forward</span></>
                  )}
                </button>
              </div>

              {/* Turnstile */}
              <div className="flex justify-center">
                <div ref={turnstileRef} />
              </div>

              {status === "error" && errorMsg && (
                <p className="text-red-400 text-[12px] font-mono text-center">{errorMsg}</p>
              )}

              <p className="font-mono text-[10px] text-white/20 text-center tracking-wide">
                No spam. We'll only write when the sandbox is live.
              </p>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px] text-green-400">check_circle</span>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-[16px] mb-1">You're on the list.</p>
                <p className="text-white/40 text-[13px]">We'll email you the moment the sandbox is live.</p>
              </div>
              <button
                onClick={onDismiss}
                className="mt-2 text-white/40 hover:text-white/70 font-mono text-[12px] transition-colors flex items-center gap-1.5"
              >
                View the interface anyway
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          )}

          {/* Dismiss link — always visible until success */}
          {status !== "success" && (
            <button
              onClick={onDismiss}
              className="mt-5 w-full text-center text-white/25 hover:text-white/50 font-mono text-[11px] transition-colors flex items-center justify-center gap-1.5"
            >
              View the interface anyway (servers are offline)
              <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main demo store page — original layout preserved, wrapped in maintenance UX
// ---------------------------------------------------------------------------
export default function DemoStore() {
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [consoleLogs] = useState<string[]>([
    "// Welcome to Arafi Sandbox Console",
    "// The sandbox servers are currently offline.",
    "// Leave your email above to be notified when they're back.",
    "// This UI shows you what the live integration experience looks like.",
  ]);

  const OFFLINE_TOOLTIP = "Sandbox servers are offline — enter your email above to be notified when they're back.";

  return (
    <div className="relative min-h-screen">
      {/* Maintenance overlay */}
      {overlayVisible && <MaintenanceOverlay onDismiss={() => setOverlayVisible(false)} />}

      {/* Sandboxed UI — shown behind the overlay, fully visible after dismiss */}
      <div className={`flex-1 w-full max-w-[1500px] mx-auto px-6 md:px-12 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 bg-glow relative z-10 transition-all duration-500 ${overlayVisible ? "pointer-events-none blur-[2px] select-none" : ""}`}>

        {/* LEFT AREA */}
        <div className="lg:col-span-7 flex flex-col gap-10">
          {/* Brand Header */}
          <header className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1 rounded-full font-mono uppercase tracking-wider">
                Integration Sandbox Playground
              </span>
              {/* Offline badge */}
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-mono uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                Servers Offline
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              Arafi Store &amp; Billing Demo
            </h1>
            <p className="text-zinc-400 text-sm max-w-xl">
              The live sandbox is temporarily offline while we build. The UI below shows you exactly 
              how the integration experience works — leave your email above and we'll notify you when it's live.
            </p>
          </header>

          {/* Customer Context — disabled */}
          <section className="glass-card rounded-2xl p-6 border border-white/5 flex flex-col gap-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[#08090a]/60 flex items-center justify-center z-10 rounded-2xl">
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-400 text-[20px]">wifi_off</span>
                </div>
                <p className="text-[13px] text-white/60 font-mono max-w-xs leading-relaxed">
                  {OFFLINE_TOOLTIP}
                </p>
              </div>
            </div>
            <div className="opacity-30">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Step 1: Setup &amp; Verify Customer Context</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-[#0d0f12] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white/30">Jane Doe</div>
                <div className="bg-[#0d0f12] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white/30">buyer@example.com</div>
              </div>
              <div className="mt-4 w-full py-2.5 rounded-xl bg-purple-600/30 text-white/30 text-xs text-center font-mono">
                Register &amp; Verify Customer Context
              </div>
            </div>
          </section>

          {/* Products — disabled */}
          <section className="flex flex-col gap-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400">shopping_bag</span>
              Arafi Physical Store Inventory (One-off)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEMO_PRODUCTS.map((prod) => (
                <div key={prod.id} className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col gap-4 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{prod.image}</span>
                    <span className="text-[9px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded font-mono uppercase">{prod.sku}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm truncate">{prod.name}</h4>
                    <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2 mt-1">{prod.description}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <span className="text-sm font-bold font-mono text-purple-300">
                      {prod.price.toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 })}
                    </span>
                    <button
                      disabled
                      title={OFFLINE_TOOLTIP}
                      className="bg-white/10 text-white/30 text-xs font-semibold px-4 py-2 rounded-xl cursor-not-allowed flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[12px]">wifi_off</span>
                      Offline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Plans — disabled */}
          <section className="flex flex-col gap-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400">autorenew</span>
              Arafi SaaS Subscription Plans (Recurring)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEMO_PLANS.map((plan) => (
                <div key={plan.id} className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-white text-sm">{plan.name}</h4>
                      <span className="text-[9px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-semibold uppercase">Recurring</span>
                    </div>
                    <p className="text-zinc-500 text-xs leading-relaxed">{plan.description}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="flex items-baseline gap-0.5 font-mono">
                      <span className="text-sm font-bold text-purple-300">
                        {plan.price.toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[10px] text-zinc-500">/{plan.period}</span>
                    </div>
                    <button
                      disabled
                      title={OFFLINE_TOOLTIP}
                      className="border border-white/10 text-white/30 text-xs font-semibold px-4 py-2 rounded-xl cursor-not-allowed flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[12px]">wifi_off</span>
                      Offline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT AREA — Console */}
        <div className="lg:col-span-5 flex flex-col gap-4 lg:sticky lg:top-8 max-h-[calc(100vh-80px)]">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400">terminal</span>
              Arafi SDK API Console
            </h3>
            <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase">Offline</span>
          </div>
          <div className="flex-1 rounded-2xl border border-white/5 bg-[#090b0d] p-4 font-mono text-[10px] text-zinc-400 overflow-y-auto flex flex-col gap-3 custom-scrollbar min-h-[300px]">
            {consoleLogs.map((log, index) => (
              <pre key={index} className="whitespace-pre-wrap leading-relaxed select-text font-mono">{log}</pre>
            ))}
            <div className="mt-auto pt-4 border-t border-white/5 flex items-start gap-2 text-[10px] text-amber-400/70">
              <span className="material-symbols-outlined text-[14px] flex-shrink-0 mt-0.5">info</span>
              <p className="leading-relaxed">
                The sandbox API at{" "}
                <code className="text-amber-300">arafi-api.onrender.com</code> is intentionally 
                offline. Dismiss the overlay above and enter your email to be notified when it's back up.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
