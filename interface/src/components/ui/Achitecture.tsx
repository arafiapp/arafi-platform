const Architecture = () => {
  return (
    <section id="architecture" className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mb-40">
      <div className="relative rounded-[2rem] p-8 md:p-14 overflow-hidden border border-on-surface/10 bg-surface-container shadow-2xl fade-up">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[100px] -z-10 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-tertiary/10 blur-[100px] -z-10 rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[12px] font-label-mono mb-4 uppercase tracking-wider">
            System Topology
          </div>
          <h2 className="font-headline-lg text-3xl md:text-5xl text-on-surface tracking-tight leading-tight">
            The Translation Layer & State Machine
          </h2>
          <p className="font-body-md text-on-surface-variant text-base md:text-lg mt-4 leading-relaxed">
            Arafi sits between your codebase and fragmented payment providers. A single integration manages credentials in an encrypted vault, dynamic failover across gateways, and non-custodial relay into Stellar USDC.
          </p>
        </div>

        {/* Visual Architectural Diagram */}
        <div className="relative rounded-2xl border border-on-surface/10 bg-surface-container-highest/60 p-6 md:p-10 shadow-inner overflow-hidden">
          {/* Subtle Grid Backdrop */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_90%)] pointer-events-none"></div>

          {/* Level 1: Developer's Application */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-full max-w-md bg-surface-container border border-on-surface/15 rounded-xl px-6 py-4 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">terminal</span>
                </div>
                <div>
                  <div className="font-headline-md text-sm text-on-surface font-bold">Developer's Application</div>
                  <div className="text-[11px] font-label-mono text-on-surface/50">Your backend, SaaS, or gig platform</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-label-mono text-[10px]">
                1 API Integration
              </span>
            </div>

            {/* Connecting Pipe */}
            <div className="relative h-10 w-full flex justify-center items-center">
              <div className="h-full w-px bg-gradient-to-b from-primary/60 to-primary/80"></div>
              <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse absolute"></div>
            </div>

            {/* Level 2: Arafi Engine (The Core) */}
            <div className="w-full max-w-4xl bg-surface-container/90 border border-primary/30 rounded-2xl p-6 md:p-8 shadow-2xl relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-tertiary/20 to-primary/20 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-700 pointer-events-none"></div>

              <div className="relative z-10 flex items-center justify-between mb-6 border-b border-on-surface/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[16px]">hub</span>
                  </div>
                  <span className="font-headline-md text-base text-on-surface font-bold tracking-wide">
                    ARAFI ENGINE (STATE MACHINE & ORCHESTRATOR)
                  </span>
                </div>
                <span className="font-label-mono text-[11px] text-primary/80 uppercase tracking-widest hidden sm:inline-block">
                  Zero-Custody Software Layer
                </span>
              </div>

              {/* Three Engine Modules */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Module 1 */}
                <div className="bg-surface-container-highest border border-on-surface/10 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">key</span>
                      <h4 className="font-headline-md text-xs font-bold text-on-surface uppercase tracking-wider">1. BYOK Key Vault</h4>
                    </div>
                    <p className="font-body-md text-[12px] text-on-surface-variant leading-relaxed">
                      Envelope encrypted via external AWS/GCP KMS. Decrypted purely in volatile memory per request. Never written to disk.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-on-surface/5 flex items-center justify-between">
                    <span className="text-[10px] font-label-mono text-emerald-400">Zero Disk Storage</span>
                    <span className="text-[10px] font-label-mono text-on-surface/40">In-memory only</span>
                  </div>
                </div>

                {/* Module 2 */}
                <div className="bg-surface-container-highest border border-on-surface/10 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-tertiary text-[18px]">alt_route</span>
                      <h4 className="font-headline-md text-xs font-bold text-on-surface uppercase tracking-wider">2. Dynamic Router</h4>
                    </div>
                    <p className="font-body-md text-[12px] text-on-surface-variant leading-relaxed">
                      Monitors provider health & latency in real time. Automatically catches 5xx errors and soft declines to reroute transactions.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-on-surface/5 flex items-center justify-between">
                    <span className="text-[10px] font-label-mono text-tertiary">Real-time Failover</span>
                    <span className="text-[10px] font-label-mono text-on-surface/40">&lt;45ms latency</span>
                  </div>
                </div>

                {/* Module 3 */}
                <div className="bg-surface-container-highest border border-on-surface/10 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-emerald-400 text-[18px]">sync_saved_locally</span>
                      <h4 className="font-headline-md text-xs font-bold text-on-surface uppercase tracking-wider">3. Canonical Engine</h4>
                    </div>
                    <p className="font-body-md text-[12px] text-on-surface-variant leading-relaxed">
                      Enforces strict idempotency, normalizes inconsistent provider schemas, and emits a single unified webhook event.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-on-surface/5 flex items-center justify-between">
                    <span className="text-[10px] font-label-mono text-emerald-400">payment.settled</span>
                    <span className="text-[10px] font-label-mono text-on-surface/40">Normalized state</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Split Fork Connectors */}
            <div className="relative h-14 w-full max-w-4xl mt-1">
              {/* Center stem */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1/2 w-px bg-primary/40"></div>
              {/* Horizontal crossbar */}
              <div className="absolute top-1/2 left-[25%] right-[25%] h-px bg-gradient-to-r from-primary/50 via-tertiary/50 to-emerald-400/50"></div>
              {/* Left drop line */}
              <div className="absolute top-1/2 left-[25%] h-1/2 w-px bg-primary/40"></div>
              {/* Right drop line */}
              <div className="absolute top-1/2 right-[25%] h-1/2 w-px bg-emerald-400/40"></div>

              {/* Pulsing Dots */}
              <div className="absolute top-1/2 left-[25%] -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary animate-ping"></div>
              <div className="absolute top-1/2 right-[25%] translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 animate-ping" style={{ animationDelay: '0.4s' }}></div>
            </div>

            {/* Level 3: Downstream Rails (BYOK Fiat vs Stellar Non-Custodial) */}
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 mt-1">
              {/* Left Rail: Local BYOK Rails */}
              <div className="bg-surface-container border border-on-surface/10 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">account_balance</span>
                      <h4 className="font-headline-md text-sm font-bold text-on-surface">Local BYOK Rails</h4>
                    </div>
                    <span className="text-[10px] font-label-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      Direct Merchant Payout
                    </span>
                  </div>
                  <p className="font-body-md text-[13px] text-on-surface-variant mb-4 leading-relaxed">
                    Transactions execute using developer credentials. Fiat settles straight into your merchant account on Paystack or Flutterwave without Arafi ever handling deposits.
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-surface-container-highest p-2.5 rounded-lg border border-on-surface/5">
                      <div className="font-headline-md text-xs text-on-surface font-semibold">Paystack</div>
                      <div className="text-[10px] text-on-surface/50 font-label-mono">Primary / Fallback</div>
                    </div>
                    <div className="bg-surface-container-highest p-2.5 rounded-lg border border-on-surface/5">
                      <div className="font-headline-md text-xs text-on-surface font-semibold">Flutterwave</div>
                      <div className="text-[10px] text-on-surface/50 font-label-mono">Multi-Rail Backup</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-on-surface/5 flex items-center justify-between text-[11px] text-on-surface/50 font-label-mono">
                  <span>Merchant Liability: 0% Arafi</span>
                  <span className="text-emerald-400 font-semibold">Fiat Direct</span>
                </div>
              </div>

              {/* Right Rail: Cross-Border Stellar Bridge */}
              <div className="bg-surface-container border border-emerald-500/20 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-2xl pointer-events-none"></div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-400 text-[20px]">public</span>
                      <h4 className="font-headline-md text-sm font-bold text-on-surface">Cross-Border Stellar Bridge</h4>
                    </div>
                    <span className="text-[10px] font-label-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Non-Custodial USDC
                    </span>
                  </div>
                  <p className="font-body-md text-[13px] text-on-surface-variant mb-4 leading-relaxed">
                    Licensed SEP-24 anchors process global card payments, handle KYC, and absorb chargeback risk. Stellar USDC is minted directly to destination wallets or Soroban escrows.
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-surface-container-highest p-2.5 rounded-lg border border-emerald-500/10">
                      <div className="font-headline-md text-xs text-emerald-300 font-semibold">SEP-24 Anchor</div>
                      <div className="text-[10px] text-on-surface/50 font-label-mono">Card &amp; KYC Absorbed</div>
                    </div>
                    <div className="bg-surface-container-highest p-2.5 rounded-lg border border-emerald-500/10">
                      <div className="font-headline-md text-xs text-emerald-300 font-semibold">Soroban Escrow</div>
                      <div className="text-[10px] text-on-surface/50 font-label-mono">On-Chain Milestone Lock</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-on-surface/5 flex items-center justify-between text-[11px] text-on-surface/50 font-label-mono">
                  <span>Ledger Finality: ~4-5s</span>
                  <span className="text-emerald-400 font-semibold">Stellar USDC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Architecture;

