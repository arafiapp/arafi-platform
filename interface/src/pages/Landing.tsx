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
  const authString = '"Authorization: Bearer sk_live_51M..."';
  const payloadString = `'{
  "amount": 20000,
  "currency": "USD",
  "flow": "escrow",
  "metadata": {
    "order_id": "ord_98765",
    "customer": "cus_123"
  }
}'`;
  const [typedAuth, setTypedAuth] = useState("");
  const [typedPayload, setTypedPayload] = useState("");
  const [copiedHero, setCopiedHero] = useState(false);
  const [copiedSdk, setCopiedSdk] = useState(false);
  const [activeIntegrationStep, setActiveIntegrationStep] = useState(2);

  // Bento Box UI States
  const [bentoSubInterval, setBentoSubInterval] = useState('Monthly');
  const [bentoPromoCode, setBentoPromoCode] = useState('');
  const [bentoPromoApplied, setBentoPromoApplied] = useState(false);
  const [bentoEscrowProgress, setBentoEscrowProgress] = useState(0);
  const [bentoAccGenerated, setBentoAccGenerated] = useState(false);
  const [bentoAccLoading, setBentoAccLoading] = useState(false);

  const generateVirtualAccount = () => {
    setBentoAccLoading(true);
    setTimeout(() => {
      setBentoAccLoading(false);
      setBentoAccGenerated(true);
    }, 1500);
  };

  const copyHero = () => {
    navigator.clipboard.writeText(`curl -X POST https://api.arafi.com/v1/intents \\\n  -H "Content-Type: application/json" \\\n  -H "Idempotency-Key: req_abc123" \\\n  -H "Authorization: Bearer sk_live_51M..." \\\n  -d '{\n  "amount": 20000,\n  "currency": "USD",\n  "flow": "escrow",\n  "metadata": {\n    "order_id": "ord_98765",\n    "customer": "cus_123"\n  }\n}'`);
    setCopiedHero(true);
    setTimeout(() => setCopiedHero(false), 2000);
  };

  const copySdk = () => {
    let code = "";
    if (activeIntegrationStep === 1) {
      code = "npm install @arafi/node\n# or\nyarn add @arafi/node";
    } else if (activeIntegrationStep === 2) {
      code = "import { Arafi } from '@arafi/node';\n\nconst arafi = new Arafi(process.env.ARAFI_SECRET_KEY);\n\nconst intent = await arafi.payments.create({\n  amount: 2000,\n  currency: 'USD',\n  flow: 'escrow',\n});\n\nconsole.log(intent.clientSecret);";
    } else {
      code = "import express from 'express';\n\nconst app = express();\n\napp.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {\n  const event = arafi.webhooks.constructEvent(req.body, req.headers['arafi-signature']);\n  if (event.type === 'payment_intent.succeeded') {\n    console.log('Payment successful!', event.data.object);\n  }\n  res.send();\n});";
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
    }, 50);

    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    // Intersection Observer for fade-up animation
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
        {/* Hero Section */}
        <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-1 lg:grid-cols-12 gap-16 items-center mb-24 relative">
          <div className="absolute top-0 left-1/4 w-125 h-125 bg-primary/10 blur-[120px] -z-10 rounded-full"></div>
          <div className="absolute bottom-0 right-1/4 w-100 h-100 bg-tertiary/5 blur-[100px] -z-10 rounded-full"></div>
          <div className="lg:col-span-6 flex flex-col items-start gap-8 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/50 border border-on-surface/10 fade-up shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-body-md text-[13px] text-on-surface/80 font-medium">
                API v1.0 Now Live
              </span>
            </div>
            <h1
              className="font-headline-xl text-[56px] leading-[1.05] text-on-surface fade-up tracking-tighter font-bold"
              style={{ transitionDelay: "100ms" }}
            >
              The Payment Logic Layer for{" "}
              <span className="text-on-surface/50">Modern Apps</span>.
            </h1>
            <p
              className="font-body-lg text-body-lg text-on-surface/60 max-w-lg fade-up leading-relaxed"
              style={{ transitionDelay: "200ms" }}
            >
              Abstract your subscription, escrow, and complex payment flows into
              a single API. Built for developers who move fast.
            </p>
            <div
              className="flex items-center gap-5 mt-4 fade-up"
              style={{ transitionDelay: "300ms" }}
            >
              <button
                onClick={() => navigate("/signup")}
                className="font-body-md text-[14px] font-medium px-6 py-3 rounded-full btn-primary flex items-center gap-2"
              >
                Start Building
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </button>
              <button
                className="font-body-md text-[14px] font-medium px-6 py-3 rounded-full btn-secondary flex items-center gap-2"
                onClick={() => window.open("https://demoapp-sandy-chi.vercel.app/", "_blank")}
              >
                View Live Demo{" "}
                <span className="material-symbols-outlined text-[18px]">
                  open_in_new
                </span>
              </button>
            </div>
          </div>
          <div
            className="lg:col-span-6 relative fade-up"
            style={{ transitionDelay: "400ms" }}
          >
            <div className="relative group w-full max-w-lg mx-auto lg:ml-auto lg:mr-0">
              {/* Outer Glow */}
              <div className="absolute -inset-1 bg-gradient-to-tr from-primary/30 to-tertiary/20 blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-700"></div>

              {/* Terminal Window */}
              <div className="relative rounded-2xl overflow-hidden border border-on-surface/10 bg-surface-container/95 backdrop-blur-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col h-[400px] transition-transform duration-500 group-hover:scale-[1.01]">

                {/* Inner Ambient Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none"></div>

                {/* macOS Window Header */}
                <div className="flex items-center px-5 py-4 bg-surface-container-highest/50 border-b border-on-surface/10 gap-4 relative z-10 backdrop-blur-sm">
                  <div className="flex gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]"></div>
                  </div>
                  <div className="flex-1 text-center">
                    <span className="font-label-mono text-[11px] text-on-surface/50 font-medium tracking-widest uppercase">
                      bash — arafi-cli
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

                {/* Code Body */}
                <div className="p-6 font-code-sm text-[13px] leading-[1.8] text-on-surface/80 overflow-x-auto flex-1 flex flex-col justify-center relative z-10">
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
                      <span>13</span>
                    </div>
                    <code>
                      <span className="text-primary font-bold">curl</span> -X POST https://api.arafi.com/v1/intents \
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
              </div>
            </div>
          </div>
        </section>

        {/* Logo Cloud Section */}
        <section className="max-w-max-width mx-auto mb-32 fade-up overflow-hidden">
          <p className="text-center font-body-md text-[13px] font-medium text-on-surface/40 uppercase tracking-widest mb-10">
            Built for modern development stacks
          </p>
          <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="flex w-max animate-marquee items-center opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-16 md:gap-28 items-center px-8 md:px-14">
                  <span className="font-headline-md text-2xl font-bold flex items-center gap-3 hover:text-[#61DAFB] transition-colors cursor-default"><span className="material-symbols-outlined text-[32px]">code</span> React</span>
                  <span className="font-headline-md text-2xl font-bold flex items-center gap-3 hover:text-[#339933] transition-colors cursor-default"><span className="material-symbols-outlined text-[32px]">javascript</span> Node.js</span>
                  <span className="font-headline-md text-2xl font-bold flex items-center gap-3 hover:text-[#3776AB] transition-colors cursor-default"><span className="material-symbols-outlined text-[32px]">terminal</span> Python</span>
                  <span className="font-headline-md text-2xl font-bold flex items-center gap-3 hover:text-on-surface transition-colors cursor-default"><span className="material-symbols-outlined text-[32px]">api</span> Next.js</span>
                  <span className="font-headline-md text-2xl font-bold flex items-center gap-3 hover:text-[#00ADD8] transition-colors cursor-default"><span className="material-symbols-outlined text-[32px]">database</span> Go</span>
                  <span className="font-headline-md text-2xl font-bold flex items-center gap-3 hover:text-[#FF2D20] transition-colors cursor-default"><span className="material-symbols-outlined text-[32px]">integration_instructions</span> Laravel</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento Box Features Section */}
        <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mb-40">
          <div className="text-center mb-16 fade-up">
            <h2 className="font-headline-lg text-headline-xl text-on-surface tracking-tight">
              Everything you need to scale.
            </h2>
            <p className="font-body-md text-body-lg text-on-surface/50 mt-4 max-w-2xl mx-auto">
              A unified platform handling the edge cases so you don't have to.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-min md:auto-rows-[340px]">
            {/* Large Bento Item: Subscriptions */}
            <SpotlightCard className="fade-up md:col-span-2 group rounded-3xl border border-on-surface/5 bg-surface-container flex flex-col p-8 transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-3xl rounded-full -mr-20 -mt-20 transition-opacity group-hover:bg-primary/20 pointer-events-none"></div>

              <div className="flex flex-col md:flex-row gap-8 h-full relative z-10">
                <div className="flex flex-col h-full flex-1 pointer-events-none">
                  <span className="material-symbols-outlined text-[32px] text-primary mb-4">loop</span>
                  <h3 className="font-headline-md text-2xl text-on-surface font-bold mb-2">Automated Subscriptions</h3>
                  <p className="text-on-surface-variant font-body-md max-w-sm mb-6">Set up recurring billing, grace periods, and automatic retries. We handle the webhooks and state transitions automatically.</p>

                  <div className="mt-auto flex gap-2 pointer-events-auto">
                    {['Dayly', 'Monthly', 'Yearly'].map((interval) => (
                      <button
                        key={interval}
                        onClick={() => setBentoSubInterval(interval)}
                        className={`px-4 py-1.5 rounded-full border text-[12px] font-label-mono transition-colors ${bentoSubInterval === interval ? 'bg-primary/20 border-primary/30 text-primary' : 'border-outline-variant text-on-surface hover:bg-surface-container-highest'}`}
                      >
                        {interval}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interactive UI Widget inside the Bento */}
                <div className="flex-1 bg-surface-container-highest/50 rounded-2xl border border-on-surface/10 p-6 flex flex-col justify-center pointer-events-auto relative overflow-hidden transition-all duration-300 shadow-inner group-hover:bg-surface-container-highest">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><span className="material-symbols-outlined text-4xl">receipt_long</span></div>
                  <div className="font-label-mono text-on-surface/50 text-[10px] uppercase tracking-widest mb-2">Next Charge</div>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="font-headline-lg text-4xl text-on-surface font-bold transition-all">
                      {bentoSubInterval === 'Dayly' ? '$1.99' : bentoSubInterval === 'Monthly' ? '$29.00' : '$290.00'}
                    </span>
                    <span className="font-body-sm text-on-surface-variant mb-1 transition-all">/{bentoSubInterval.toLowerCase().replace('ly', '')}</span>
                  </div>

                  <div className="h-px w-full bg-on-surface/10 my-4"></div>

                  <div className="flex justify-between items-center">
                    <span className="font-body-sm text-on-surface-variant">Status</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-bold">Active</span>
                  </div>
                </div>
              </div>
            </SpotlightCard>

            {/* Small Bento Item: Virtual Accounts */}
            <SpotlightCard className="fade-up delay-100 group rounded-3xl border border-on-surface/5 bg-surface-container flex flex-col p-8 transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-tertiary/5" style={{ transitionDelay: '100ms' }}>
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-tertiary/10 blur-2xl rounded-full -mr-10 -mb-10 transition-opacity group-hover:bg-tertiary/20 pointer-events-none"></div>
              <div className="relative z-10 flex flex-col h-full pointer-events-none">
                <span className="material-symbols-outlined text-[32px] text-tertiary mb-4">account_balance</span>
                <h3 className="font-headline-md text-xl text-on-surface font-bold mb-2">Dedicated Virtual Accounts</h3>
                <p className="text-on-surface-variant font-body-sm mb-6">Provision unique bank accounts instantly for receiving wire transfers.</p>

                <div className="mt-auto pointer-events-auto">
                  {!bentoAccGenerated ? (
                    <button onClick={generateVirtualAccount} disabled={bentoAccLoading} className="w-full py-2.5 rounded-xl bg-tertiary/10 text-tertiary border border-tertiary/20 hover:bg-tertiary/20 transition-colors font-headline-md text-sm font-bold flex items-center justify-center gap-2">
                      {bentoAccLoading ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <><span className="material-symbols-outlined text-[18px]">add_circle</span> Generate Account</>}
                    </button>
                  ) : (
                    <div className="bg-surface-container-highest p-3 rounded-xl border border-on-surface/10 flex flex-col gap-1 fade-up shadow-inner">
                      <div className="flex justify-between items-center"><span className="text-[10px] text-on-surface-variant uppercase font-label-mono">Routing</span><span className="text-[11px] font-code-sm text-on-surface">122105155</span></div>
                      <div className="flex justify-between items-center"><span className="text-[10px] text-on-surface-variant uppercase font-label-mono">Account</span><span className="text-[11px] font-code-sm text-on-surface text-tertiary font-bold">0003928174</span></div>
                    </div>
                  )}
                </div>
              </div>
            </SpotlightCard>

            {/* Small Bento Item: Coupons */}
            <SpotlightCard className="fade-up group rounded-3xl border border-on-surface/5 bg-surface-container flex flex-col p-8 transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-secondary/5">
              <div className="absolute top-0 left-0 w-48 h-48 bg-secondary/10 blur-2xl rounded-full -ml-10 -mt-10 transition-opacity group-hover:bg-secondary/20 pointer-events-none"></div>
              <div className="relative z-10 flex flex-col h-full pointer-events-none">
                <span className="material-symbols-outlined text-[32px] text-secondary mb-4">loyalty</span>
                <h3 className="font-headline-md text-xl text-on-surface font-bold mb-2">Smart Promotions</h3>
                <p className="text-on-surface-variant font-body-sm mb-6">Incentivize users with dynamic coupons and auto-expiring promos.</p>

                <div className="mt-auto pointer-events-auto">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="SUMMER20"
                      value={bentoPromoCode}
                      onChange={(e) => setBentoPromoCode(e.target.value.toUpperCase())}
                      className="flex-1 w-full bg-surface-container-highest border border-on-surface/10 rounded-xl px-3 py-2 text-[13px] font-code-sm text-on-surface placeholder:text-on-surface/20 focus:outline-none focus:border-secondary/50 shadow-inner"
                    />
                    <button
                      onClick={() => setBentoPromoApplied(true)}
                      className={`px-3 py-2 rounded-xl text-[13px] font-bold transition-all shadow-sm ${bentoPromoApplied ? 'bg-emerald-500/20 text-emerald-500' : 'bg-secondary hover:bg-secondary/90 text-white'}`}
                    >
                      {bentoPromoApplied ? 'Applied' : 'Apply'}
                    </button>
                  </div>
                  {bentoPromoApplied && (
                    <p className="text-[11px] text-emerald-500 font-bold mt-2 fade-up text-center border border-emerald-500/20 bg-emerald-500/10 rounded px-2 py-1">20% discount activated!</p>
                  )}
                </div>
              </div>
            </SpotlightCard>

            {/* Large Bento Item: Escrow */}
            <SpotlightCard className="fade-up delay-100 md:col-span-2 group rounded-3xl border border-on-surface/5 bg-surface-container flex flex-col p-8 transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-error/5" style={{ transitionDelay: '100ms' }}>
              <div className="absolute bottom-0 left-1/4 w-full h-32 bg-error/10 blur-3xl transition-opacity group-hover:bg-error/20 pointer-events-none"></div>

              <div className="flex flex-col md:flex-row gap-8 h-full relative z-10">
                <div className="flex flex-col h-full flex-1 pointer-events-none">
                  <div className="flex items-center justify-between mb-4">
                    <span className="material-symbols-outlined text-[32px] text-[#ff5f56]">handshake</span>
                    <span className="px-3 py-1 rounded-full bg-error/10 text-error text-[10px] font-label-mono font-bold tracking-widest uppercase border border-error/20">Coming Soon</span>
                  </div>
                  <h3 className="font-headline-md text-2xl text-on-surface font-bold mb-2">Trustless Escrow</h3>
                  <p className="text-on-surface-variant font-body-md max-w-sm mb-6">Lock funds in secure digital vaults. Release payments only when milestones are met, building instant trust.</p>

                  <button
                    onClick={() => setBentoEscrowProgress((prev) => (prev >= 100 ? 0 : prev + 50))}
                    className="mt-auto self-start px-4 py-2 rounded-xl bg-error/10 text-error border border-error/20 font-bold text-sm pointer-events-auto hover:bg-error/20 transition-colors shadow-sm"
                  >
                    {bentoEscrowProgress === 0 ? 'Lock Funds ($5,000)' : bentoEscrowProgress === 50 ? 'Complete Milestone 1' : 'Reset Contract'}
                  </button>
                </div>

                <div className="flex-1 bg-surface-container-highest/30 rounded-2xl border border-on-surface/5 flex flex-col justify-center items-center pointer-events-none p-6 shadow-inner">
                  <div className="w-full max-w-[220px] flex flex-col gap-3">
                    <div className="flex justify-between text-[11px] font-label-mono text-on-surface-variant uppercase tracking-wider">
                      <span>Locked</span>
                      <span>Released</span>
                    </div>
                    <div className="h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden relative border border-on-surface/10 shadow-inner">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-error to-[#ff5f56] transition-all duration-700 ease-in-out"
                        style={{ width: `${bentoEscrowProgress}%` }}
                      ></div>
                    </div>
                    <div className="text-center mt-1">
                      <span className="font-headline-md text-on-surface text-2xl font-bold transition-all">${bentoEscrowProgress === 0 ? '0' : bentoEscrowProgress === 50 ? '2,500' : '5,000'}</span>
                      <span className="text-on-surface-variant text-[12px]"> / $5,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </div>
        </section>

        {/* Dense Feature Grid */}
        <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mb-40">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-8">
            <div className="flex flex-col gap-2 fade-up" style={{ transitionDelay: '50ms' }}>
              <span className="material-symbols-outlined text-primary text-[24px]">verified_user</span>
              <h4 className="font-headline-md text-sm text-on-surface font-bold">Idempotent API</h4>
              <p className="text-on-surface-variant font-body-sm text-[13px]">Never process the same payment twice, even on network failures.</p>
            </div>
            <div className="flex flex-col gap-2 fade-up" style={{ transitionDelay: '100ms' }}>
              <span className="material-symbols-outlined text-emerald-400 text-[24px]">sync</span>
              <h4 className="font-headline-md text-sm text-on-surface font-bold">Smart Retries</h4>
              <p className="text-on-surface-variant font-body-sm text-[13px]">Configurable retry schedules for failed subscription charges.</p>
            </div>
            <div className="flex flex-col gap-2 fade-up" style={{ transitionDelay: '150ms' }}>
              <span className="material-symbols-outlined text-tertiary text-[24px]">webhook</span>
              <h4 className="font-headline-md text-sm text-on-surface font-bold">Reliable Webhooks</h4>
              <p className="text-on-surface-variant font-body-sm text-[13px]">Guaranteed delivery with cryptographic signature verification.</p>
            </div>
            <div className="flex flex-col gap-2 fade-up" style={{ transitionDelay: '200ms' }}>
              <span className="material-symbols-outlined text-secondary text-[24px]">speed</span>
              <h4 className="font-headline-md text-sm text-on-surface font-bold">Global Edge Network</h4>
              <p className="text-on-surface-variant font-body-sm text-[13px]">API requests routed to the nearest geographic location for &lt;50ms latency.</p>
            </div>
            <div className="flex flex-col gap-2 fade-up" style={{ transitionDelay: '250ms' }}>
              <span className="material-symbols-outlined text-on-surface/60 text-[24px]">lock</span>
              <h4 className="font-headline-md text-sm text-on-surface font-bold">PCI Compliant</h4>
              <p className="text-on-surface-variant font-body-sm text-[13px]">We handle the heavy lifting of compliance and tokenization.</p>
            </div>
            <div className="flex flex-col gap-2 fade-up" style={{ transitionDelay: '300ms' }}>
              <span className="material-symbols-outlined text-on-surface/60 text-[24px]">money_off</span>
              <h4 className="font-headline-md text-sm text-on-surface font-bold">Fraud Prevention</h4>
              <p className="text-on-surface-variant font-body-sm text-[13px]">Integrated 3D Secure and machine-learning based fraud checks.</p>
            </div>
            <div className="flex flex-col gap-2 fade-up" style={{ transitionDelay: '350ms' }}>
              <span className="material-symbols-outlined text-on-surface/60 text-[24px]">account_tree</span>
              <h4 className="font-headline-md text-sm text-on-surface font-bold">Multi-Environment</h4>
              <p className="text-on-surface-variant font-body-sm text-[13px]">Isolated sandboxes for development, staging, and production.</p>
            </div>
            <div className="flex flex-col gap-2 fade-up" style={{ transitionDelay: '400ms' }}>
              <span className="material-symbols-outlined text-on-surface/60 text-[24px]">terminal</span>
              <h4 className="font-headline-md text-sm text-on-surface font-bold">CLI Tools</h4>
              <p className="text-on-surface-variant font-body-sm text-[13px]">Test webhooks locally and manage environments directly from your terminal.</p>
            </div>
          </div>
        </section>

        {/* SDK & Integration Section */}
        <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mb-40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="fade-up">
              <h2 className="font-headline-lg text-[40px] leading-tight text-on-surface tracking-tight mb-6">
                Start building in minutes.
              </h2>
              <p className="font-body-md text-body-lg text-on-surface/50 mb-8 max-w-md">
                A deterministic API designed to stay out of your way. We provide official SDKs for major frameworks, fully typed and ready to go.
              </p>

              <div className="flex flex-col gap-8 relative before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-on-surface/10">
                <button
                  onClick={() => setActiveIntegrationStep(1)}
                  className={`relative pl-12 text-left transition-opacity duration-300 ${activeIntegrationStep === 1 ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
                >
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-surface-container border border-on-surface/20 flex items-center justify-center z-10 transition-colors ${activeIntegrationStep === 1 ? 'border-primary' : ''}`}>
                    <div className={`w-2 h-2 rounded-full transition-colors ${activeIntegrationStep === 1 ? 'bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-on-surface/20'}`}></div>
                  </div>
                  <h3 className={`font-headline-md text-lg font-bold mb-1 transition-colors ${activeIntegrationStep === 1 ? 'text-on-surface' : 'text-on-surface/70'}`}>1. Install</h3>
                  <p className="text-on-surface-variant font-body-sm">Drop our SDK into your project via npm, pip, or go get.</p>
                </button>
                <button
                  onClick={() => setActiveIntegrationStep(2)}
                  className={`relative pl-12 text-left transition-opacity duration-300 ${activeIntegrationStep === 2 ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
                >
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-surface-container border border-on-surface/20 flex items-center justify-center z-10 transition-colors ${activeIntegrationStep === 2 ? 'border-primary' : ''}`}>
                    <div className={`w-2 h-2 rounded-full transition-colors ${activeIntegrationStep === 2 ? 'bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-on-surface/20'}`}></div>
                  </div>
                  <h3 className={`font-headline-md text-lg font-bold mb-1 transition-colors ${activeIntegrationStep === 2 ? 'text-on-surface' : 'text-on-surface/70'}`}>2. Configure</h3>
                  <p className="text-on-surface-variant font-body-sm">Set your API keys and default routing rules.</p>
                </button>
                <button
                  onClick={() => setActiveIntegrationStep(3)}
                  className={`relative pl-12 text-left transition-opacity duration-300 ${activeIntegrationStep === 3 ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
                >
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-surface-container border border-on-surface/20 flex items-center justify-center z-10 transition-colors ${activeIntegrationStep === 3 ? 'border-primary' : ''}`}>
                    <div className={`w-2 h-2 rounded-full transition-colors ${activeIntegrationStep === 3 ? 'bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-on-surface/20'}`}></div>
                  </div>
                  <h3 className={`font-headline-md text-lg font-bold mb-1 transition-colors ${activeIntegrationStep === 3 ? 'text-on-surface' : 'text-on-surface/70'}`}>3. Launch</h3>
                  <p className="text-on-surface-variant font-body-sm">Process payments globally with automatic edge-case handling.</p>
                </button>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-on-surface/10 bg-surface-container shadow-2xl h-[450px] flex flex-col">
              <div className="flex items-center px-4 pt-4 pb-0 bg-surface-container-highest border-b border-on-surface/10 gap-2">
                <button className="px-4 py-2 border-b-2 border-primary text-primary font-code-sm text-[12px] bg-on-surface/5 rounded-t-lg transition-colors">Node.js</button>
                <button className="px-4 py-2 border-b-2 border-transparent text-on-surface/40 hover:text-on-surface/80 font-code-sm text-[12px] transition-colors">Python</button>
                <button className="px-4 py-2 border-b-2 border-transparent text-on-surface/40 hover:text-on-surface/80 font-code-sm text-[12px] transition-colors">Go</button>
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
              <div className="p-6 font-code-sm text-[13px] leading-[1.8] text-on-surface/80 overflow-x-auto flex-1 flex flex-col justify-center">
                <pre>
                  <code>
                    {activeIntegrationStep === 1 && (
                      <>
                        <span className="text-on-surface/40"># Install the official Node.js SDK</span><br />
                        <span className="text-primary font-bold">npm</span> install @arafi/node<br /><br />
                        <span className="text-on-surface/40"># Or using yarn</span><br />
                        <span className="text-primary font-bold">yarn</span> add @arafi/node<br /><br />
                        <span className="text-on-surface/40"># Or using pnpm</span><br />
                        <span className="text-primary font-bold">pnpm</span> add @arafi/node
                      </>
                    )}
                    {activeIntegrationStep === 2 && (
                      <>
                        <span className="text-on-surface/40">import</span> {'{ Arafi }'} <span className="text-on-surface/40">from</span> <span className="text-emerald-400">'@arafi/node'</span>;<br /><br />
                        <span className="text-on-surface/40">const</span> arafi <span className="text-on-surface/40">= new</span> Arafi('{<span className="text-emerald-400">process.env.ARAFI_SECRET_KEY</span>}');<br /><br />
                        <span className="text-on-surface/40">const</span> intent <span className="text-on-surface/40">= await</span> arafi.payments.create({'{'}<br />
                        {'  '}amount: <span className="text-tertiary">2000</span>,<br />
                        {'  '}currency: <span className="text-emerald-400">'USD'</span>,<br />
                        {'  '}flow: <span className="text-emerald-400">'escrow'</span>,<br />
                        {'}'});<br /><br />
                        console.log(intent.clientSecret);
                      </>
                    )}
                    {activeIntegrationStep === 3 && (
                      <>
                        <span className="text-on-surface/40">import</span> express <span className="text-on-surface/40">from</span> <span className="text-emerald-400">'express'</span>;<br /><br />
                        <span className="text-on-surface/40">const</span> app <span className="text-on-surface/40">=</span> express();<br /><br />
                        app.post(<span className="text-emerald-400">'/webhook'</span>, express.raw({'{'}type: <span className="text-emerald-400">'application/json'</span>{'}'}), (req, res) <span className="text-on-surface/40">=&gt;</span> {'{'}<br />
                        {'  '}<span className="text-on-surface/40">const</span> event <span className="text-on-surface/40">=</span> arafi.webhooks.constructEvent(req.body, req.headers[<span className="text-emerald-400">'arafi-signature'</span>]);<br /><br />
                        {'  '}<span className="text-on-surface/40">if</span> (event.type <span className="text-on-surface/40">===</span> <span className="text-emerald-400">'payment_intent.succeeded'</span>) {'{'}<br />
                        {'    '}console.log(<span className="text-emerald-400">'Payment successful!'</span>, event.data.object);<br />
                        {'  }'}<br /><br />
                        {'  '}res.send(200);<br />
                        {'}'});
                      </>
                    )}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Section */}
        <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mb-40 text-center fade-up relative">
          <div className="absolute inset-0 bg-primary/5 blur-[100px] -z-10 rounded-full"></div>
          <h2 className="font-headline-xl text-[48px] text-on-surface tracking-tighter font-bold mb-6">
            Ready to scale your payments?
          </h2>
          <p className="font-body-md text-[16px] text-on-surface/50 mb-10 max-w-xl mx-auto">
            Join thousands of developers building the next generation of fintech applications with Arafi.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate("/signup")}
              className="font-body-md text-[14px] font-medium px-8 py-4 rounded-full btn-primary flex items-center gap-2"
            >
              Start building for free
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            <button
              onClick={() => navigate("/docs")}
              className="font-body-md text-[14px] font-medium px-8 py-4 rounded-full btn-secondary"
            >
              Read the docs
            </button>
          </div>
        </section>

        {/* Architecture Deep Dive */}
        <Architecture />
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
