import { useEffect, useState } from "react";
import StepCard from "../components/ui/StepCard";
import Footer from "../components/shared/Footer";
import Navbar from "../components/shared/Navbar";
import Architecture from "../components/ui/Achitecture";
import BackgroundShader from "../components/ui/BackgroundShader";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();
  const authString = '"Authorization: Bearer sk_test_..."';
  const payloadString = `'{ "flow": "escrow", "amount": 2000 }'`;
  const [typedAuth, setTypedAuth] = useState("");
  const [typedPayload, setTypedPayload] = useState("");

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
    <div className="text-on-surface antialiased min-h-screen flex flex-col font-body-md selection:bg-primary/30 selection:text-primary-fixed">
      {/* Background Shader */}
      <BackgroundShader />

      <Navbar />

      <main className="grow pt-40 pb-20">
        {/* Hero Section */}
        <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-1 lg:grid-cols-12 gap-16 items-center mb-24 relative">
          <div className="absolute top-0 left-1/4 w-125 h-125 bg-primary/10 blur-[120px] -z-10 rounded-full"></div>
          <div className="absolute bottom-0 right-1/4 w-100 h-100 bg-tertiary/5 blur-[100px] -z-10 rounded-full"></div>
          <div className="lg:col-span-6 flex flex-col items-start gap-8 z-10">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full backdrop-blur-xl bg-on-surface/5 border border-on-surface/10 fade-up">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              <span className="font-label-mono text-label-mono text-on-surface/60 text-[11px] uppercase tracking-wider">
                API v1.0 Now Live
              </span>
            </div>
            <h1
              className="font-headline-xl text-[56px] leading-[1.1] text-on-surface fade-up tracking-tight"
              style={{ transitionDelay: "100ms" }}
            >
              The Payment Logic Layer for{" "}
              <span className="text-primary">Modern Apps</span>.
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
                className="glow-button font-label-mono text-label-mono bg-inverse-primary text-on-primary px-8 py-4 rounded-DEFAULT transition-all duration-300 hover:scale-[1.02] border-t border-on-surface/20 flex items-center gap-2 shadow-2xl shadow-indigo-500/30"
                onClick={() => window.open("https://demoapp-sandy-chi.vercel.app/", "_blank")}
              >
                View Live Demo{" "}
                <span className="material-symbols-outlined text-[18px]">
                  open_in_new
                </span>
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="font-label-mono text-label-mono text-on-surface backdrop-blur-xl bg-on-surface/5 px-8 py-4 rounded-DEFAULT border border-on-surface/10 hover:border-on-surface/20 hover:bg-on-surface/10 transition-all flex items-center gap-2"
              >
                Start Building
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
          <div
            className="lg:col-span-6 relative fade-up"
            style={{ transitionDelay: "400ms" }}
          >
            <div className="relative group">
              <div className="absolute -inset-4 bg-linear-to-tr from-primary/30 to-transparent blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative rounded-2xl overflow-hidden border border-on-surface/10 backdrop-blur-3xl bg-on-surface/5 shadow-2xl p-2">
                <img
                  alt="Payment Logic Visual"
                  className="w-full h-auto rounded-xl opacity-90 group-hover:opacity-100 transition-opacity duration-700"
                  src="hero.jpg"
                />
                <div className="absolute bottom-6 left-6 right-6 backdrop-blur-2xl bg-surface/90 border border-on-surface/10 rounded-xl overflow-hidden shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                  <div className="flex items-center px-4 py-2.5 bg-on-surface/5 border-b border-on-surface/10 gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-on-surface/10"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-on-surface/10"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-on-surface/10"></div>
                    </div>
                    <span className="ml-2 font-code-sm text-[11px] text-on-surface/40 uppercase tracking-widest">
                      create_payment_intent.sh
                    </span>
                  </div>
                  <div className="p-5 font-code-sm text-[13px] leading-relaxed text-secondary-fixed/80 overflow-x-auto">
                    <pre>
                      <code>
                        {`curl https://api.arafi.com/v1/intents \\
  -H `}
                        <span className="text-tertiary">
                          {typedAuth}
                        </span>
                        {` \\
  -d `}
                        <span className="text-tertiary">{typedPayload}</span>
                        <span className="inline-block w-1.5 h-4 bg-primary ml-1 align-middle cursor-blink"></span>
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Box Features Section */}
        <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mb-40 fade-up">
          <div className="text-center mb-16">
            <h2 className="font-headline-lg text-headline-xl text-on-surface tracking-tight">
              Everything you need to scale.
            </h2>
            <p className="font-body-md text-body-lg text-on-surface/50 mt-4 max-w-2xl mx-auto">
              A unified platform handling the edge cases so you don't have to.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
            {/* Large Bento Item: Subscriptions */}
            <div className="md:col-span-2 relative group rounded-3xl border border-on-surface/10 bg-surface-container-lowest overflow-hidden flex flex-col p-8 transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-3xl rounded-full -mr-20 -mt-20 transition-opacity group-hover:bg-primary/20"></div>
              <div className="relative z-10 flex flex-col h-full">
                <span className="material-symbols-outlined text-[32px] text-primary mb-4">loop</span>
                <h3 className="font-headline-md text-2xl text-on-surface font-bold mb-2">Automated Subscriptions</h3>
                <p className="text-on-surface-variant font-body-md max-w-md">Set up recurring billing, grace periods, and automatic retries in 3 lines of code. We handle the webhooks and state transitions automatically.</p>
                <div className="mt-auto flex gap-2">
                  <span className="px-3 py-1 rounded-full border border-outline-variant text-[11px] font-label-mono text-on-surface">Daily</span>
                  <span className="px-3 py-1 rounded-full border border-outline-variant text-[11px] font-label-mono text-on-surface">Monthly</span>
                  <span className="px-3 py-1 rounded-full border border-outline-variant text-[11px] font-label-mono text-on-surface">Yearly</span>
                </div>
              </div>
            </div>

            {/* Small Bento Item: Virtual Accounts */}
            <div className="relative group rounded-3xl border border-on-surface/10 bg-surface-container-lowest overflow-hidden flex flex-col p-8 transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-tertiary/5">
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-tertiary/10 blur-2xl rounded-full -mr-10 -mb-10 transition-opacity group-hover:bg-tertiary/20"></div>
              <div className="relative z-10 flex flex-col h-full">
                <span className="material-symbols-outlined text-[32px] text-tertiary mb-4">account_balance</span>
                <h3 className="font-headline-md text-xl text-on-surface font-bold mb-2">Dedicated Virtual Accounts</h3>
                <p className="text-on-surface-variant font-body-sm">Provision unique bank accounts for every customer. Instantly receive transfers with zero reconciliation overhead.</p>
              </div>
            </div>

            {/* Small Bento Item: Coupons */}
            <div className="relative group rounded-3xl border border-on-surface/10 bg-surface-container-lowest overflow-hidden flex flex-col p-8 transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-secondary/5">
              <div className="absolute top-0 left-0 w-48 h-48 bg-secondary/10 blur-2xl rounded-full -ml-10 -mt-10 transition-opacity group-hover:bg-secondary/20"></div>
              <div className="relative z-10 flex flex-col h-full">
                <span className="material-symbols-outlined text-[32px] text-secondary mb-4">loyalty</span>
                <h3 className="font-headline-md text-xl text-on-surface font-bold mb-2">Smart Promotions</h3>
                <p className="text-on-surface-variant font-body-sm">Create fixed-amount coupons programmatically to incentivize upgrades and reward loyal customers.</p>
              </div>
            </div>

            {/* Large Bento Item: Escrow */}
            <div className="md:col-span-2 relative group rounded-3xl border border-on-surface/10 bg-surface-container-lowest overflow-hidden flex flex-col p-8 transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-error/5">
              <div className="absolute bottom-0 left-1/4 w-full h-32 bg-error/10 blur-3xl transition-opacity group-hover:bg-error/20"></div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="material-symbols-outlined text-[32px] text-[#ff5f56]">handshake</span>
                  <span className="px-3 py-1 rounded-full bg-error/10 text-error text-[10px] font-label-mono font-bold tracking-widest uppercase border border-error/20">Coming Soon</span>
                </div>
                <h3 className="font-headline-md text-2xl text-on-surface font-bold mb-2">Trustless Escrow</h3>
                <p className="text-on-surface-variant font-body-md max-w-md">Lock funds in secure digital vaults. Release payments only when milestones are met, building instant trust in two-sided marketplaces.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section - Integrated Flow */}
        <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mb-40">
          <div className="text-center mb-24 fade-up">
            <h2 className="font-headline-lg text-headline-xl text-on-surface tracking-tight">
              Integration in minutes, not months.
            </h2>
            <p className="font-body-md text-body-lg text-on-surface/50 mt-4 max-w-2xl mx-auto">
              A deterministic API designed to stay out of your way, with
              state-of-the-art logic orchestration.
            </p>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-linear-to-r from-transparent via-on-surface/10 to-transparent -translate-y-1/2 -z-10"></div>
            <StepCard
              icon="app_registration"
              stepNumber="Step 01"
              title="Sign Up & Configure"
              description="Create your workspace and define your default webhook endpoints and routing rules in the dashboard."
            />
            <StepCard
              icon="vpn_key"
              stepNumber="Step 02"
              title="Get API Keys"
              description="Generate environment-specific keys. We support granular scoping for high-security environments."
              delay="100ms"
            />
            <StepCard
              icon="terminal"
              stepNumber="Step 03"
              title="Call the API"
              description="Initialize complex logic flows with a single POST request. We handle the edge cases and state management."
              delay="200ms"
            />
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
