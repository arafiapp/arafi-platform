import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import Waitlist from "./pages/Waitlist";
import LandingOriginal from "./pages/LandingOriginal";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EmptyDashboard from "./pages/EmptyDashboard";
import Initialize from "./pages/Initialize";
import ComingSoon from "./components/shared/ComingSoon";
import ToastContainer from "./components/ui/ToastContainer";

// New modules
import Accounts from "./pages/Accounts";
import Products from "./pages/Products";
import PayoutHistory from "./pages/PayoutHistory";
import CreateEscrow from "./pages/CreateEscrow";
import EscrowTransactions from "./pages/EscrowTransactions";
import Plans from "./pages/Plans";
import Subscribers from "./pages/Subscribers";
import Customers from "./pages/Customers";
import Coupons from "./pages/Coupons";
import EmailTemplates from "./pages/EmailTemplates";
import EmailTemplateBuilder from "./pages/EmailTemplateBuilder";
import Webhooks from "./pages/Webhooks";
import CheckoutCallback from "./pages/CheckoutCallback";
import CheckoutPage from "./pages/CheckoutPage";
import Docs from "./pages/Docs";
import Settings from "./pages/Settings";
import DashboardDocs from "./pages/DashboardDocs";

import { useTheme } from "./store/useTheme";

function App() {
  const { theme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (currentTheme: 'light' | 'dark' | 'system') => {
      if (currentTheme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else if (currentTheme === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
      } else {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
        root.classList.remove(systemTheme === 'dark' ? 'light' : 'dark');
      }
    };

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);
  return (
      <Router>
        <ToastContainer />
        <Routes>
           {/* Public routes */}
          <Route path="/" element={<Waitlist />} />

          {/* ── Developer-only: original landing page preserved ── */}
          {/* The frontend dev accesses this directly: /platform */}
          <Route path="/platform" element={<LandingOriginal />} />

          {/* ── Waitlist mode guard ── */}
          {/* When VITE_WAITLIST_MODE=true, redirect /signup and /login to the waitlist. */}
          {/* The team bypasses this by navigating directly to /dashboard (which still requires auth). */}
          {import.meta.env.VITE_WAITLIST_MODE === "true" ? (
            <>
              <Route path="/signup" element={<Navigate to="/" replace />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
            </>
          )}

          <Route path="/checkout/callback" element={<CheckoutCallback />} />
          <Route path="/checkout/:subscriptionId" element={<CheckoutPage />} />
          <Route path="/docs" element={<Docs />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/empty" element={<ProtectedRoute><EmptyDashboard /></ProtectedRoute>} />
          <Route path="/initialize" element={<ProtectedRoute><Initialize /></ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/payouts/history" element={<ProtectedRoute><PayoutHistory /></ProtectedRoute>} />
          <Route path="/escrow/create" element={<ProtectedRoute><CreateEscrow /></ProtectedRoute>} />
          <Route path="/escrow/transactions" element={<ProtectedRoute><EscrowTransactions /></ProtectedRoute>} />
          <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
          <Route path="/subscribers" element={<ProtectedRoute><Subscribers /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
          <Route path="/coupons" element={<ProtectedRoute><Coupons /></ProtectedRoute>} />
          <Route path="/email" element={<ProtectedRoute><EmailTemplates /></ProtectedRoute>} />
          <Route path="/email/builder" element={<ProtectedRoute><EmailTemplateBuilder /></ProtectedRoute>} />
          <Route path="/webhooks" element={<ProtectedRoute><Webhooks /></ProtectedRoute>} />
          <Route path="/dashboard/docs" element={<ProtectedRoute><DashboardDocs /></ProtectedRoute>} />
          
          <Route path="/team" element={<ProtectedRoute><ComingSoon moduleName="Team" /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><ComingSoon moduleName="Support" /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
  );
}

export default App;
