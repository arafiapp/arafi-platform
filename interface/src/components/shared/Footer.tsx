const Footer = () => {
  return (
    <footer className="w-full pt-20 pb-10 bg-surface-container-lowest border-t border-on-surface/10 relative z-10">
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Logo & Tagline */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <span className="flex items-center gap-2 font-headline-md text-xl font-bold text-on-surface">
              <img src="/logo.svg" alt="Arafi Logo" className="w-8 h-8" />
              <span>Arafi</span>
            </span>
            <p className="font-body-md text-on-surface-variant text-sm max-w-xs leading-relaxed">
              The deterministic payment logic layer. Build, scale, and abstract your complex money movement with ease.
            </p>
          </div>

          {/* Links Columns */}
          <div className="flex flex-col gap-4">
            <h4 className="font-headline-md text-sm font-semibold text-on-surface mb-2">Product</h4>
            <a href="#" className="font-body-md text-sm text-on-surface-variant hover:text-on-surface transition-colors">Pricing</a>
            <a href="#" className="font-body-md text-sm text-on-surface-variant hover:text-on-surface transition-colors">Enterprise</a>
            <a href="#" className="font-body-md text-sm text-on-surface-variant hover:text-on-surface transition-colors">Changelog</a>
            <a href="#" className="font-body-md text-sm text-on-surface-variant hover:text-on-surface transition-colors">Integrations</a>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="font-headline-md text-sm font-semibold text-on-surface mb-2">Developers</h4>
            <a href="#" className="font-body-md text-sm text-on-surface-variant hover:text-on-surface transition-colors">Documentation</a>
            <a href="#" className="font-body-md text-sm text-on-surface-variant hover:text-on-surface transition-colors">API Reference</a>
            <a href="#" className="font-body-md text-sm text-on-surface-variant hover:text-on-surface transition-colors">Status</a>
            <a href="#" className="font-body-md text-sm text-on-surface-variant hover:text-on-surface transition-colors">GitHub</a>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="font-headline-md text-sm font-semibold text-on-surface mb-2">Company</h4>
            <a href="#" className="font-body-md text-sm text-on-surface-variant hover:text-on-surface transition-colors">About</a>
            <a href="#" className="font-body-md text-sm text-on-surface-variant hover:text-on-surface transition-colors">Blog</a>
            <a href="#" className="font-body-md text-sm text-on-surface-variant hover:text-on-surface transition-colors">Careers</a>
            <a href="#" className="font-body-md text-sm text-on-surface-variant hover:text-on-surface transition-colors">Contact</a>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-on-surface/10 gap-6">
          <div className="flex gap-6 items-center">
            {/* Social Icons Placeholder */}
            <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors" aria-label="Twitter">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors" aria-label="GitHub">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </a>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 md:gap-8 items-center">
            <span className="font-body-md text-sm text-on-surface-variant/60">
              © 2026 Arafi Inc.
            </span>
            <div className="flex gap-6">
              <a href="#" className="font-body-md text-sm text-on-surface-variant hover:text-on-surface transition-colors">Privacy Policy</a>
              <a href="#" className="font-body-md text-sm text-on-surface-variant hover:text-on-surface transition-colors">Terms of Service</a>
              <a href="#" className="font-body-md text-sm text-on-surface-variant hover:text-on-surface transition-colors">Security</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
