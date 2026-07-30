const Architecture = () => {
  return (
    <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mb-40">
      <div className="relative rounded-[2rem] p-10 md:p-16 overflow-hidden border border-on-surface/10 bg-surface-container shadow-2xl fade-up">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[100px] -z-10 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-tertiary/10 blur-[100px] -z-10 rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-headline-lg text-4xl md:text-5xl text-on-surface tracking-tight mb-6 leading-tight">
              Abstracting the complexity of modern payments.
            </h2>
            <p className="font-body-md text-on-surface-variant text-lg leading-relaxed mb-8">
              Arafi sits between your application and underlying payment
              processors. You define the high-level business logic—who pays whom, when, and under what
              conditions—and we orchestrate the underlying provider APIs, handle
              idempotency, and maintain a highly-available ledger.
            </p>
            <ul className="space-y-5">
              <li className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                  <span className="material-symbols-outlined text-primary text-[18px]">account_tree</span>
                </div>
                <span className="font-headline-md text-on-surface text-base">
                  Processor-agnostic state machine
                </span>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <span className="material-symbols-outlined text-emerald-500 text-[18px]">verified_user</span>
                </div>
                <span className="font-headline-md text-on-surface text-base">
                  Idempotent by default
                </span>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center border border-tertiary/20 shrink-0">
                  <span className="material-symbols-outlined text-tertiary text-[18px]">database</span>
                </div>
                <span className="font-headline-md text-on-surface text-base">
                  Zero data lock-in
                </span>
              </li>
            </ul>
          </div>
          
          <div className="relative rounded-2xl border border-on-surface/5 bg-surface-container-highest/50 p-8 md:p-12 h-full min-h-[450px] flex items-center justify-center shadow-inner overflow-hidden">
            {/* Grid pattern background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"></div>
            
            {/* Abstract Diagram */}
            <div className="flex flex-col gap-6 w-full max-w-sm relative z-10">
              
              {/* App Block */}
              <div className="bg-surface-container border border-on-surface/10 rounded-xl p-4 flex items-center justify-center gap-3 shadow-lg transform transition-transform hover:-translate-y-1 duration-300 relative z-20">
                <span className="material-symbols-outlined text-on-surface/60">language</span>
                <span className="font-headline-md text-on-surface text-sm">Your Application</span>
              </div>
              
              {/* Connector 1 */}
              <div className="relative h-10 w-full flex justify-center items-center">
                <div className="absolute h-full w-px bg-gradient-to-b from-on-surface/20 to-primary/50"></div>
                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse relative top-3"></div>
              </div>
              
              {/* Core Block (Arafi) */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-tertiary rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                <div className="relative bg-surface-container-highest border border-on-surface/20 rounded-xl p-6 text-center shadow-2xl flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mb-2">
                    <span className="material-symbols-outlined text-primary text-2xl">hub</span>
                  </div>
                  <div className="font-headline-md text-on-surface text-lg font-bold">
                    Arafi Logic Layer
                  </div>
                  <div className="font-label-mono text-primary/80 text-[10px] tracking-widest uppercase">
                    State Machine & Ledger
                  </div>
                </div>
              </div>
              
              {/* Connector 2 (Forked) */}
              <div className="relative h-12 w-full mt-2">
                {/* Vertical split trunk */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1/2 w-px bg-primary/50"></div>
                {/* Horizontal branch */}
                <div className="absolute top-1/2 left-1/4 right-1/4 h-px bg-gradient-to-r from-on-surface/10 via-primary/50 to-on-surface/10"></div>
                {/* Left Drop */}
                <div className="absolute top-1/2 left-1/4 h-1/2 w-px bg-gradient-to-b from-primary/50 to-on-surface/20"></div>
                {/* Right Drop */}
                <div className="absolute top-1/2 right-1/4 h-1/2 w-px bg-gradient-to-b from-primary/50 to-on-surface/20"></div>
                
                {/* Animated Particles */}
                <div className="absolute top-1/2 left-1/4 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-on-surface/40 animate-pulse"></div>
                <div className="absolute top-1/2 right-1/4 translate-x-1/2 w-1.5 h-1.5 rounded-full bg-on-surface/40 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              </div>
              
              {/* Provider Blocks */}
              <div className="flex gap-4 relative z-20">
                <div className="flex-1 bg-surface-container border border-on-surface/10 rounded-xl p-4 flex flex-col items-center gap-2 shadow-lg hover:-translate-y-1 transition-transform duration-300">
                  <span className="material-symbols-outlined text-on-surface/40 text-[20px]">credit_card</span>
                  <span className="font-label-mono text-[10px] text-on-surface/70 uppercase tracking-wider">Stripe</span>
                </div>
                <div className="flex-1 bg-surface-container border border-on-surface/10 rounded-xl p-4 flex flex-col items-center gap-2 shadow-lg hover:-translate-y-1 transition-transform duration-300">
                  <span className="material-symbols-outlined text-on-surface/40 text-[20px]">account_balance</span>
                  <span className="font-label-mono text-[10px] text-on-surface/70 uppercase tracking-wider">Local Banks</span>
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
