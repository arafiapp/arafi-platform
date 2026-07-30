const Architecture = () => {
  return (
    <section className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mb-40">
      <div className="glass-card rounded-3xl p-10 md:p-16 relative overflow-hidden border border-on-surface/10 fade-up">
        <div className="absolute top-0 right-0 w-150 h-150 bg-primary/5 blur-[120px] -z-10 rounded-full"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-headline-lg text-3xl text-on-surface tracking-tight mb-6">
              Abstracting the complexity of modern payments.
            </h2>
            <p className="font-body-md text-on-surface/60 leading-relaxed mb-8">
              Arafi sits between your application and underlying payment
              processors (like Stripe, Adyen, or local bank APIs). You define
              the high-level business logic—who pays whom, when, and under what
              conditions—and we orchestrate the underlying provider APIs, handle
              idempotency, and maintain the source of truth ledger.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl">
                  check_circle
                </span>
                <span className="font-body-md text-on-surface/80">
                  Processor-agnostic state machine
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl">
                  check_circle
                </span>
                <span className="font-body-md text-on-surface/80">
                  Idempotent by default
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl">
                  check_circle
                </span>
                <span className="font-body-md text-on-surface/80">
                  Zero data lock-in
                </span>
              </li>
            </ul>
          </div>
          <div className="relative bg-surface-container-lowest/50 rounded-2xl border border-on-surface/10 p-8 h-full min-h-75 flex items-center justify-center">
            {/* Abstract Diagram */}
            <div className="flex flex-col gap-6 w-full max-w-sm relative z-10">
              <div className="bg-on-surface/5 border border-on-surface/10 rounded-lg p-4 text-center font-label-mono text-sm">
                Your Application
              </div>
              <div className="flex justify-center">
                <span className="material-symbols-outlined text-primary animate-bounce">
                  arrow_downward
                </span>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-6 text-center shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                <div className="font-headline-md text-primary mb-1">
                  Arafi Logic Layer
                </div>
                <div className="font-code-sm text-on-surface/40 text-[10px]">
                  State Machine &amp; Ledger
                </div>
              </div>
              <div className="flex justify-between px-8">
                <span className="material-symbols-outlined text-on-surface/20">
                  arrow_downward
                </span>
                <span className="material-symbols-outlined text-on-surface/20">
                  arrow_downward
                </span>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 bg-on-surface/5 border border-on-surface/10 rounded-lg p-4 text-center font-label-mono text-[10px] text-on-surface/50">
                  Stripe
                </div>
                <div className="flex-1 bg-on-surface/5 border border-on-surface/10 rounded-lg p-4 text-center font-label-mono text-[10px] text-on-surface/50">
                  Local Banks
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
