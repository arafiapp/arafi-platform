const Footer = () => {
  return (
    <footer className="w-full py-16 backdrop-blur-xl bg-surface-container-lowest border-t border-outline-variant dark:border-outline-variant">
      <div className="flex flex-col md:flex-row justify-between items-center px-margin-desktop max-w-max-width mx-auto gap-8">
        <div className="flex flex-col items-center md:items-start gap-4">
          <span className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2">
            <span className="flex items-center gap-2">
              <img src="/logo.svg" alt="logo" />
              <p> Arafi</p>
            </span>
          </span>
          <p className="font-body-md text-on-surface/40">
            © 2026 Arafi. All rights reserved.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <a
            className="font-body-md text-on-surface-variant dark:text-on-surface-variant hover:text-on-surface dark:hover:text-on-surface underline transition-opacity duration-150"
            href="#"
          >
            Privacy Policy
          </a>
          <a
            className="font-body-md text-on-surface-variant dark:text-on-surface-variant hover:text-on-surface dark:hover:text-on-surface underline transition-opacity duration-150"
            href="#"
          >
            Terms of Service
          </a>
          <a
            className="font-body-md text-on-surface-variant dark:text-on-surface-variant hover:text-on-surface dark:hover:text-on-surface underline transition-opacity duration-150"
            href="#"
          >
            Security
          </a>
          <a
            className="font-body-md text-on-surface-variant dark:text-on-surface-variant hover:text-on-surface dark:hover:text-on-surface underline transition-opacity duration-150"
            href="#"
          >
            Status
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
