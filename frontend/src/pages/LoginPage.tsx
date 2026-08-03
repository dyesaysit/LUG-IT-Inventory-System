import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const logoPath = '/LUG-logo-200x84-transparent.png';

/**
 * Professional institutional login page for Lancaster University Ghana.
 * Uses a split-layout with branding panel and clean white form.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex bg-lug-off-white">
      {/* Branding panel — left side on desktop */}
      <div className="hidden lg:flex lg:w-5/12 bg-lug-charcoal relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-lug-burgundy/20 to-lug-charcoal" />
        <div className="relative flex flex-col justify-center px-14 py-12 w-full">
          <div className="mb-10">
            {/* Logo on a subtle white backing for visibility */}
            <div className="inline-block bg-white/95 rounded-md px-5 py-3 mb-8">
              <img
                src={logoPath}
                alt="Lancaster University Ghana"
                className="h-14 w-auto"
              />
            </div>
            <h1 className="text-3xl font-semibold text-white tracking-tight">
              LUG IT Inventory System
            </h1>
            <p className="mt-3 text-base text-gray-300 max-w-sm leading-relaxed">
              IT Asset and Inventory Management
            </p>
          </div>
          <div className="mt-auto pt-8 border-t border-white/10">
            <p className="text-sm text-gray-400">
              Lancaster University Ghana
            </p>
          </div>
        </div>
      </div>

      {/* Form panel — right side on desktop, full width on mobile */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          {/* Mobile/tablet logo and branding — hidden on desktop */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-block bg-white rounded-md px-4 py-2 shadow-sm border border-lug-light-gray mb-6">
              <img
                src={logoPath}
                alt="Lancaster University Ghana"
                className="h-12 w-auto mx-auto"
              />
            </div>
            <h1 className="text-2xl font-semibold text-lug-charcoal tracking-tight">
              LUG IT Inventory System
            </h1>
            <p className="mt-2 text-sm text-lug-gray">
              IT Asset and Inventory Management
            </p>
          </div>

          <div className="bg-white rounded-lg border border-lug-light-gray px-6 py-8 sm:px-10 sm:py-10">
            <div className="hidden lg:block mb-8">
              <h2 className="text-xl font-semibold text-lug-charcoal">Sign In</h2>
              <p className="mt-1 text-sm text-lug-gray">
                Enter your credentials to access the system
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3" role="alert">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-lug-charcoal mb-1.5">
                  Email or Username
                </label>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className="w-full rounded-md border border-lug-light-gray bg-white px-3.5 py-2.5 text-sm text-lug-charcoal placeholder:text-gray-400 focus:border-lug-red focus:ring-1 focus:ring-lug-red outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-lug-charcoal mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-md border border-lug-light-gray bg-white px-3.5 py-2.5 text-sm text-lug-charcoal placeholder:text-gray-400 focus:border-lug-red focus:ring-1 focus:ring-lug-red outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-lug-gray cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-lug-light-gray text-lug-red focus:ring-lug-red h-4 w-4"
                  />
                  Remember me
                </label>
                <button type="button" className="text-sm text-lug-gray hover:text-lug-red transition-colors">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-lug-red hover:bg-lug-burgundy text-white font-medium py-2.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-lug-red focus:ring-offset-2"
              >
                Sign in
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-lug-gray mt-6">
            Authorized access for Lancaster University Ghana staff
          </p>
        </div>
      </div>
    </div>
  );
}