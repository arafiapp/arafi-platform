import { useTheme } from "../../store/useTheme";

const Navbar = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-5xl z-50 glass-nav transition-all duration-200">
      <div className="flex justify-between items-center px-6 h-14">
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
              className="font-body-md text-[13px] font-medium text-on-surface/60 hover:text-on-surface transition-colors"
              href="#"
            >
              Solutions
            </a>
            <a
              className="font-body-md text-[13px] font-medium text-on-surface/60 hover:text-on-surface transition-colors"
              href="/docs"
            >
              Documentation
            </a>
            <a
              className="font-body-md text-[13px] font-medium text-on-surface/60 hover:text-on-surface transition-colors"
              href="#"
            >
              Pricing
            </a>
            <a
              className="font-body-md text-[13px] font-medium text-on-surface/60 hover:text-on-surface transition-colors"
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
            className="font-label-mono text-[13px] btn-primary px-5 py-2 rounded-full hover:scale-[1.02] transition-transform"
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
