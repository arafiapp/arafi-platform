import { useEffect, useRef, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Basic client-side format check — real validation happens server-side.
// ---------------------------------------------------------------------------
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "trashmail.com",
  "yopmail.com", "throwam.com", "fakeinbox.com", "sharklasers.com",
  "guerrillamailblock.com", "grr.la", "guerrillamail.info", "spam4.me",
  "tempr.email", "dispostable.com", "mailnull.com", "spamgourmet.com",
  "trashmail.me", "trashmail.at", "discard.email", "throwaway.email",
  "maildrop.cc", "mailnesia.com", "spamcowboy.com", "spamfence.net",
  "mailforspam.com", "spaml.de", "mail-temp.com", "tempinbox.com",
]);

function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

// ---------------------------------------------------------------------------
// Scroll-driven step card data
// ---------------------------------------------------------------------------
const STEPS = [
  {
    number: "01",
    icon: "vpn_key",
    title: "Connect your gateway keys",
    subtitle: "Bring your own rails",
    description:
      "Add your Paystack, Flutterwave, or other gateway credentials. Arafi validates them instantly — not on the first real transaction. Your keys are encrypted at rest and never touch our logs. We never touch your funds.",
    accent: "primary",
    code: `// Connect a payment gateway\narafi.gateways.connect({\n  provider: "paystack",\n  credentials: { /* your keys */ }\n});`,
  },
  {
    number: "02",
    icon: "alt_route",
    title: "The Smart Router takes over",
    subtitle: "Real-time cost & reliability routing",
    description:
      "Every transaction is routed to whichever of your connected rails is the cheapest and most reliable at that exact moment. If one rail is rate-limited or down, the router automatically fails over to the next. You never think about this again.",
    accent: "tertiary",
    code: `// Router selects based on cost + reliability\narafi.charge({\n  amount: 5000,\n  currency: "NGN",\n  // optimal gateway chosen automatically\n});`,
  },
  {
    number: "03",
    icon: "loop",
    title: "Complex flows. One API call.",
    subtitle: "Subscriptions, escrow, checkout",
    description:
      "Set up recurring billing with grace periods, automatic retries, and state transitions in 3 lines. Create escrow vaults that release only when milestones are met. Generate product checkouts with a single POST. We handle the edge cases and the webhooks.",
    accent: "secondary",
    code: `// Start a subscription\narafi.subscriptions.create({\n  customer: customer.id,\n  plan: plan.id,\n  // retries, webhooks, state — handled\n});`,
  },
];

const FEATURE_CARDS = [
  {
    icon: "shield_lock",
    title: "Credentials encrypted at rest",
    description:
      "Your gateway keys are encrypted at rest and never touch our logs. They are only ever decrypted inside an isolated execution context at the moment of a transaction — and immediately discarded.",
    accent: "primary",
  },
  {
    icon: "alt_route",
    title: "Cost-based smart routing",
    description:
      "The router tracks rate-limit headers and failure rates in real time. It picks the optimal rail per transaction across all your connected gateways — automatically.",
    accent: "tertiary",
  },
  {
    icon: "loop",
    title: "Automated subscriptions",
    description:
      "Set billing cycles, grace periods, and retry logic in one API call. Arafi manages the state machine, fires webhooks on every transition, and handles dunning automatically.",
    accent: "secondary",
  },
  {
    icon: "receipt_long",
    title: "Unified webhook schema",
    description:
      "Every gateway event is normalised into a single ArafiEvent format. Your app talks to one schema — not Paystack's, not Flutterwave's — regardless of which rail fired.",
    accent: "primary",
  },
  {
    icon: "handshake",
    title: "Trustless escrow (coming soon)",
    description:
      "Lock funds in secure vaults. Release only when conditions are met. Build two-sided marketplaces and freelance platforms with instant trust and zero custom code.",
    accent: "tertiary",
    comingSoon: true,
  },
  {
    icon: "manage_accounts",
    title: "Per-merchant virtual accounts",
    description:
      "Provision dedicated bank accounts for your customers via API. Instant settlement confirmation, zero reconciliation overhead, automatic ledger entries.",
    accent: "secondary",
    comingSoon: true,
  },
];

// (counter removed — fake launch metrics erode trust)

// ---------------------------------------------------------------------------
// Turnstile widget loader
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

// ---------------------------------------------------------------------------
// Scroll-driven step card component
// ---------------------------------------------------------------------------
function ScrollSteps() {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers = stepRefs.current.map((el, i) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setActiveStep(i);
          });
        },
        { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((obs) => obs?.disconnect());
  }, []);

  const accentMap: Record<string, string> = {
    primary: "text-primary",
    tertiary: "text-tertiary",
    secondary: "text-secondary",
  };

  const borderMap: Record<string, string> = {
    primary: "border-primary/40",
    tertiary: "border-tertiary/40",
    secondary: "border-secondary/40",
  };

  const glowMap: Record<string, string> = {
    primary: "shadow-[0_0_40px_rgba(99,102,241,0.2)]",
    tertiary: "shadow-[0_0_40px_rgba(245,158,11,0.15)]",
    secondary: "shadow-[0_0_40px_rgba(161,161,170,0.1)]",
  };

  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-24">
      {/* Left — scrolling text steps */}
      <div className="flex flex-col">
        {STEPS.map((step, i) => (
          <div
            key={i}
            ref={(el) => { stepRefs.current[i] = el; }}
            className="min-h-[50vh] lg:min-h-[70vh] flex flex-col justify-center py-12 lg:py-20"
          >
            <div
              className={`transition-all duration-700 ease-out ${
                activeStep === i ? "opacity-100 translate-x-0" : "opacity-30 -translate-x-2"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`font-label-mono text-[10px] tracking-[0.2em] uppercase ${accentMap[step.accent]}`}
                >
                  Step {step.number}
                </span>
                <span className={`w-8 h-px bg-current ${accentMap[step.accent]} opacity-45`} />
                <span className="text-[10px] font-label-mono tracking-wider text-on-surface/40 uppercase">
                  {step.subtitle}
                </span>
              </div>

              <div className="flex items-start gap-4 mb-4">
                <span className={`material-symbols-outlined text-[24px] ${accentMap[step.accent]} mt-1 flex-shrink-0`}>
                  {step.icon}
                </span>
                <h3 className="font-headline-lg text-[24px] lg:text-[30px] leading-tight text-on-surface tracking-tight">
                  {step.title}
                </h3>
              </div>

              <p className="font-body-lg text-[15px] text-on-surface/60 leading-relaxed max-w-md mb-6">
                {step.description}
              </p>

              {/* Mobile code block (visible only on mobile) */}
              <div className={`block lg:hidden rounded-xl border bg-surface-container-lowest overflow-hidden mb-6 ${borderMap[step.accent]}`}>
                <pre className="p-4 font-label-mono text-[11px] leading-relaxed text-on-surface/75 overflow-x-auto">
                  <code>{step.code}</code>
                </pre>
              </div>

              {/* Progress dots */}
              <div className="flex items-center gap-2">
                {STEPS.map((_, j) => (
                  <div
                    key={j}
                    className={`h-[3px] rounded-full transition-all duration-500 ${
                      j === i
                        ? `w-8 bg-current ${accentMap[step.accent]}`
                        : j < i
                        ? `w-4 ${accentMap[step.accent]} bg-current opacity-40`
                        : "w-4 bg-on-surface/20"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right — sticky code preview (desktop only) */}
      <div className="hidden lg:flex items-center justify-center sticky top-1/4 h-fit self-start pt-20">
        <div
          className={`w-full max-w-sm rounded-2xl border bg-surface-container-lowest overflow-hidden transition-all duration-700 ${
            borderMap[STEPS[activeStep].accent]
          } ${glowMap[STEPS[activeStep].accent]}`}
        >
          {/* Terminal chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-on-surface/10 bg-on-surface/5">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-error/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-tertiary/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-primary/30" />
            </div>
            <span className="ml-2 font-label-mono text-[10px] text-on-surface/30 uppercase tracking-widest">
              arafi api
            </span>
          </div>
          <pre
            className="p-6 font-label-mono text-[12px] leading-relaxed text-on-surface/80"
          >
            <code>{STEPS[activeStep].code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Waitlist Page
// ---------------------------------------------------------------------------
export default function Waitlist() {
  const formRef = useRef<HTMLFormElement>(null);
  const formRenderTime = useRef<number>(Date.now());
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const turnstileToken = useRef<string>("");

  const [email, setEmail] = useState("");
  const [intent, setIntent] = useState<"builder" | "curious">("builder");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLight, setIsLight] = useState(false);

  // Monitor prefers-color-scheme setting changes to apply light theme correctly
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    setIsLight(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => {
      setIsLight(e.matches);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Load Cloudflare Turnstile script and render widget
  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const renderWidget = () => {
      if (!turnstileRef.current || !window.turnstile) return;

      const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;
      if (!siteKey) return;

      // Remove existing widget to avoid duplicates on theme change or re-mount
      if (widgetId.current) {
        try { window.turnstile.remove(widgetId.current); } catch { /* ignore */ }
        widgetId.current = null;
      }

      widgetId.current = window.turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        theme: isLight ? "light" : "dark",
        size: "normal",
        callback: (token: string) => {
          turnstileToken.current = token;
        },
        "error-callback": () => {
          turnstileToken.current = "";
        },
        "expired-callback": () => {
          turnstileToken.current = "";
        },
      });

    };

    const startPolling = () => {
      // If Turnstile is already available on the window, render immediately
      if (window.turnstile) {
        renderWidget();
        return;
      }
      // Otherwise poll every 50ms until it loads (max 10s)
      let attempts = 0;
      pollTimer = setInterval(() => {
        attempts++;
        if (window.turnstile) {
          clearInterval(pollTimer!);
          pollTimer = null;
          renderWidget();
        } else if (attempts > 200) {
          // 200 * 50ms = 10s — give up
          clearInterval(pollTimer!);
          pollTimer = null;
        }
      }, 50);
    };

    // Inject the script only once; if already present, just start polling
    if (!document.getElementById("cf-turnstile-script")) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = startPolling;
      document.head.appendChild(script);
    } else {
      startPolling();
    }

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* ignore */ }
        widgetId.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLight]);

  // Staged fade-up entry
  useEffect(() => {
    const elements = document.querySelectorAll(".fade-up");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.05 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => {
      elements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg("");

      // Honeypot check
      if (honeypot) {
        setStatus("success");
        return;
      }

      // Timing check
      const elapsed = Date.now() - formRenderTime.current;
      if (elapsed < 1500) {
        setStatus("success");
        return;
      }

      // Disposable email check
      if (isDisposableEmail(email)) {
        setErrorMsg("Please use a real email address — we'll only write when it matters.");
        return;
      }

      // Turnstile check
      if (!turnstileToken.current) {
        setErrorMsg("Please complete the verification check below before submitting.");
        return;
      }

      setStatus("loading");

      const apiBase = import.meta.env.VITE_API_BASE_URL as string;

      try {
        const res = await fetch(`${apiBase}/api/v1/waitlist/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            intent,
            token: turnstileToken.current,
          }),
        });

        const data = await res.json();

        if (res.status === 201 || res.status === 409) {
          setStatus("success");
        } else {
          setErrorMsg(data?.Message || "Something went wrong. Please try again.");
          setStatus("error");
          if (widgetId.current && window.turnstile) {
            window.turnstile.reset(widgetId.current);
            turnstileToken.current = "";
          }
        }
      } catch {
        setErrorMsg("Network error. Please check your connection and try again.");
        setStatus("error");
        if (widgetId.current && window.turnstile) {
          window.turnstile.reset(widgetId.current);
          turnstileToken.current = "";
        }
      }
    },
    [email, intent, honeypot]
  );

  return (
    <div
      className={`min-h-screen flex flex-col antialiased selection:bg-primary/30 selection:text-primary-fixed overflow-x-hidden ${
        isLight ? "waitlist-light" : "waitlist-dark"
      }`}
    >
      {/* Static CSS grid lines background overlay — No Shader Animation */}
      <div className="fixed inset-0 pointer-events-none -z-10 waitlist-grid-bg" aria-hidden="true">
        <div className="absolute inset-0 waitlist-grid-lines" />
        <div className="absolute inset-0 waitlist-grid-mask" />
      </div>

      {/* ── Minimal Navbar ── */}
      <nav className="fixed top-0 w-full z-50 waitlist-nav">
        <div className="flex justify-between items-center px-6 md:px-12 h-14 max-w-[1200px] mx-auto">
          <a href="#" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Arafi" className="h-6 w-auto" />
            <span className="font-headline-md text-[16px] font-semibold tracking-tight waitlist-text">
              Arafi
            </span>
          </a>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <main className="flex-1">
        <section className="relative min-h-screen flex flex-col items-center justify-center px-6 md:px-12 pt-24 pb-16">
          {/* Subtle static radial glow behind hero */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[550px] bg-primary/[0.05] blur-[130px] rounded-full pointer-events-none -z-10" />

          {/* Hero text container — opened up to fit headline on same line at desktop */}
          <div className="w-full max-w-[960px] mx-auto text-center">

            {/* Headline — Cal Sans. One line on desktop. No badge. */}
            {/* Headline — Cal Sans. "One API." on line 1, "Every Payment Flow." on line 2 */}
            <h1
              className="waitlist-headline text-on-surface leading-[1.05] tracking-tight mb-8 fade-up"
              style={{ transitionDelay: "60ms" }}
            >
              One API.
              <br />
              <span className="waitlist-headline-accent">Every Payment Flow.</span>
            </h1>

            {/* Body paragraph — exact requested text */}
            <p
              className="waitlist-body-text text-[16px] sm:text-[17px] leading-[1.8] max-w-[720px] mx-auto mb-10 fade-up"
              style={{ transitionDelay: "140ms" }}
            >
              I got tired of rewriting the same payment logic for every project. Subscriptions, escrow, checkout state every single time.
              <br className="hidden sm:inline" />
              So I built Arafi. Bring your own gateway keys (Paystack, Flutterwave, and more) and hey, they are heavily secured by the way, and Arafi's Smart Router handles the rest, routing every transaction to whichever rail you own that is the cheapest and most reliable right now.
              <br />
              <span className="waitlist-body-strong">You keep your money. We handle the logic.</span>
            </p>

            {/* ── Waitlist Form ── */}
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="fade-up"
              style={{ transitionDelay: "220ms" }}
              noValidate
            >
              {status !== "success" ? (
                <div className="flex flex-col gap-4 sm:gap-5">
                  {/* Intent toggle */}
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span className="font-label-mono text-[10px] waitlist-muted uppercase tracking-widest mr-1">
                      I am
                    </span>
                    {(
                      [
                        { value: "builder", label: "A Developer" },
                        { value: "curious", label: "Just Curious" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setIntent(opt.value)}
                        className={`px-4 py-2 rounded-full font-label-mono text-[11px] transition-all duration-200 border ${
                          intent === opt.value
                            ? "bg-primary text-on-primary border-primary shadow-[0_0_16px_rgba(99,102,241,0.35)]"
                            : "waitlist-pill-idle"
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

                  {/* Email + submit row */}
                  <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-[500px] mx-auto">
                    <input
                      type="email"
                      id="waitlist-email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="flex-1 min-w-0 waitlist-input rounded-xl px-5 py-3.5 text-[14px] font-body-md transition-all"
                      disabled={status === "loading"}
                    />
                    <button
                      type="submit"
                      id="waitlist-submit"
                      disabled={status === "loading" || !email}
                      className="bg-primary text-on-primary font-label-mono text-[13px] px-7 py-3.5 rounded-xl transition-all duration-300 hover:brightness-110 hover:scale-[1.02] shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap flex-shrink-0"
                    >
                      {status === "loading" ? (
                        <>
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-on-primary/30 border-t-on-primary animate-spin flex-shrink-0" />
                          Joining...
                        </>
                      ) : (
                        <>
                          Join Waitlist
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Turnstile widget */}
                  <div className="flex justify-center">
                    <div ref={turnstileRef} />
                  </div>

                  {/* Error message */}
                  {status === "error" && errorMsg && (
                    <p className="text-error text-[13px] font-body-md text-center">
                      {errorMsg}
                    </p>
                  )}

                  {/* Micro-copy */}
                  <p className="font-label-mono text-[10px] waitlist-muted tracking-wider text-center">
                    No spam. We only write when something real happens.
                  </p>
                </div>
              ) : (
                /* ── Success state ── */
                <div className="flex flex-col items-center gap-5 py-4">
                  <div className="relative">
                    <div className="w-15 h-15 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[28px] text-primary">
                        check_circle
                      </span>
                    </div>
                    <div className="absolute inset-0 rounded-full border border-primary/15 animate-ping" />
                  </div>
                  <div>
                    <p className="font-headline-md text-[19px] waitlist-text mb-1">
                      You're on the list.
                    </p>
                    <p className="font-body-md text-[14px] waitlist-muted">
                      We'll reach out when Arafi is ready for you. Check your inbox.
                    </p>
                  </div>
                </div>
              )}
            </form>

            {/* No fake counter — we only show real data */}
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-35">
            <div className="w-px h-6 waitlist-scroll-line" />
            <span className="material-symbols-outlined text-[16px] waitlist-muted">
              keyboard_arrow_down
            </span>
          </div>
        </section>

        {/* ── FEATURE SECTION — Bento ── */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-12 py-20 md:py-28">
          <div className="text-center mb-16 fade-up">
            <p className="font-label-mono text-[10px] uppercase tracking-[0.2em] text-primary/70 mb-4">
              What Arafi does
            </p>
            <h2 className="font-headline-xl text-[32px] sm:text-[40px] lg:text-[48px] waitlist-text tracking-tight leading-tight mb-4">
              Everything around payment logic.
              <br />
              <span className="waitlist-muted">Nothing around your money.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 fade-up" style={{ transitionDelay: "80ms" }}>
            {FEATURE_CARDS.map((card, i) => (
              <div
                key={i}
                className="group relative rounded-2xl waitlist-card overflow-hidden p-6 md:p-7 flex flex-col gap-4 transition-all duration-400 hover:-translate-y-1"
              >
                <div className={`absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-600 ${
                  card.accent === "primary" ? "bg-primary/8" :
                  card.accent === "tertiary" ? "bg-tertiary/8" :
                  "bg-secondary/8"
                }`} />

                <div className="relative z-10 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    card.accent === "primary" ? "bg-primary/10" :
                    card.accent === "tertiary" ? "bg-tertiary/10" :
                    "bg-secondary/10"
                  }`}>
                    <span className={`material-symbols-outlined text-[18px] ${
                      card.accent === "primary" ? "text-primary" :
                      card.accent === "tertiary" ? "text-tertiary" :
                      "text-secondary"
                    }`}>
                      {card.icon}
                    </span>
                  </div>
                  {card.comingSoon && (
                    <span className="ml-auto text-[9px] px-2.5 py-0.5 rounded-full waitlist-badge font-label-mono uppercase tracking-widest flex-shrink-0">
                      Soon
                    </span>
                  )}
                </div>

                <div className="relative z-10">
                  <h3 className="font-headline-md text-[15px] waitlist-text mb-2 leading-snug">
                    {card.title}
                  </h3>
                  <p className="font-body-md text-[13px] waitlist-muted leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-12 py-20 md:py-28">
          <div className="text-center mb-16 fade-up">
            <p className="font-label-mono text-[10px] uppercase tracking-[0.2em] text-primary/70 mb-4">
              How it works
            </p>
            <h2 className="font-headline-xl text-[32px] sm:text-[40px] lg:text-[48px] waitlist-text tracking-tight leading-tight">
              Built for how developers actually work.
            </h2>
          </div>
          <ScrollSteps />
        </section>

        {/* ── ARCHITECTURE ── */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-12 py-20 md:py-28">
          <div className="waitlist-arch-card rounded-2xl md:rounded-3xl p-8 md:p-14 relative overflow-hidden fade-up">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/[0.04] blur-[100px] -z-10 rounded-full pointer-events-none" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <p className="font-label-mono text-[10px] uppercase tracking-[0.2em] text-primary/70 mb-5">
                  Architecture
                </p>
                <h2 className="font-headline-lg text-[26px] md:text-[32px] waitlist-text tracking-tight mb-5 leading-tight">
                  Your money never touches us.
                  <br />
                  <span className="waitlist-muted">Your logic always does.</span>
                </h2>
                <p className="font-body-md text-[14px] waitlist-muted leading-relaxed mb-7">
                  Arafi operates as a pure orchestration layer. In Phase 1 (BYOK), money moves
                  directly between your customer and your own gateway account. Arafi's job is routing,
                  state management, ledger reconciliation, and reliability — not custody.
                </p>
                <ul className="space-y-3">
                  {[
                    "Processor-agnostic state machine",
                    "Idempotent by default — every outbound call carries an idempotency key",
                    "Zero custody — you own your gateway accounts",
                    "Envelope-encrypted credential storage",
                    "Webhook signature verification + server-to-server cross-confirmation",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 flex-shrink-0">
                        check_circle
                      </span>
                      <span className="font-body-md text-[13px] waitlist-sub">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Diagram */}
              <div className="waitlist-diagram-bg rounded-2xl p-6 md:p-8 flex items-center justify-center">
                <div className="flex flex-col gap-4 w-full max-w-xs">
                  <div className="waitlist-diagram-node rounded-xl p-4 text-center font-label-mono text-[12px] waitlist-muted">
                    Your Application
                  </div>

                  <div className="flex justify-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-px h-4 bg-primary/30" />
                      <span className="material-symbols-outlined text-primary text-[18px]">
                        arrow_downward
                      </span>
                    </div>
                  </div>

                  <div className="bg-primary/[0.08] border border-primary/20 rounded-2xl p-5 text-center shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                    <div className="font-headline-md text-[15px] text-primary mb-0.5">
                      Arafi
                    </div>
                    <div className="font-label-mono text-[9px] waitlist-muted uppercase tracking-widest">
                      Smart Router · Ledger · State
                    </div>
                  </div>

                  <div className="flex justify-between px-5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="w-px h-4 bg-on-surface/15" />
                        <span className="material-symbols-outlined text-on-surface/25 text-[16px]">
                          arrow_downward
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2.5">
                    {["Paystack", "Flutterwave", "ALATPay"].map((gw) => (
                      <div
                        key={gw}
                        className="flex-1 waitlist-diagram-node rounded-lg p-3 text-center font-label-mono text-[9px] waitlist-muted"
                      >
                        {gw}
                      </div>
                    ))}
                  </div>

                  <p className="text-center font-label-mono text-[9px] waitlist-muted uppercase tracking-widest">
                    Your own gateway accounts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <section className="max-w-[760px] mx-auto px-6 md:px-12 py-20 text-center fade-up">
          <h2 className="font-headline-xl text-[30px] sm:text-[38px] lg:text-[46px] waitlist-text tracking-tight leading-tight mb-6">
            Stop rewriting.
            <br />
            <span className="waitlist-muted">Start shipping.</span>
          </h2>
          <p className="font-body-lg text-[15px] waitlist-muted mb-10">
            Arafi is launching soon. Get early access and be the first to know when the API goes live.
          </p>
          <a
            href="#waitlist-email"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("waitlist-email")?.scrollIntoView({ behavior: "smooth" });
              setTimeout(() => document.getElementById("waitlist-email")?.focus(), 600);
            }}
            className="inline-flex items-center gap-2 bg-primary text-on-primary font-label-mono text-[13px] px-8 py-4 rounded-xl transition-all duration-300 hover:brightness-110 hover:scale-[1.02] shadow-lg shadow-primary/20"
          >
            Join the Waitlist
            <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
          </a>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="waitlist-footer py-10">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 flex items-center justify-center">
          <span className="font-body-md text-[12px] waitlist-muted">
            © 2026 Arafi. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
