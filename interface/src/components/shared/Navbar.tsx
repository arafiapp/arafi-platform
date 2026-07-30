import { useTheme } from "../../store/useTheme";

const Navbar = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-surface/40 border-b border-on-surface/10 transition-all duration-200">
      <div className="flex justify-between items-center px-margin-desktop h-16 max-w-max-width mx-auto">
        <div className="flex items-center gap-8">
          <a
            className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2"
            href="#"
          >
            <span className="flex items-center gap-2">
              <img src="/logo.svg" alt="logo" />
              <p> Arafi</p>
            </span>
          </a>
          <div className="hidden md:flex items-center gap-8 ml-12">
            <a
              className="font-body-md text-body-md text-on-surface/60 hover:text-on-surface transition-colors"
              href="#"
            >
              Solutions
            </a>
            <a
              className="font-body-md text-body-md text-on-surface/60 hover:text-on-surface transition-colors"
              href="/docs"
            >
              Documentation
            </a>
            <a
              className="font-body-md text-body-md text-on-surface/60 hover:text-on-surface transition-colors"
              href="#"
            >
              Pricing
            </a>
            <a
              className="font-body-md text-body-md text-on-surface/60 hover:text-on-surface transition-colors"
              href="#"
            >
              Changelog
            </a>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleTheme}
            className="text-on-surface/60 hover:text-on-surface transition-colors flex items-center justify-center p-2 rounded-full hover:bg-on-surface/5"
            aria-label="Toggle theme"
          >
            <span className="material-symbols-outlined text-[20px]">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <a
            className="font-label-mono text-label-mono text-on-surface/60 hover:text-on-surface transition-colors hidden md:block"
            href="/login"
          >
            Log In
          </a>
          <a
            className="font-label-mono text-label-mono bg-inverse-primary text-on-primary px-5 py-2.5 rounded-DEFAULT shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-transform border-t border-on-surface/20"
            href="/signup"
          >
            Get Started
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
