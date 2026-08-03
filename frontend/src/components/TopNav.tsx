import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MobileMenu } from './MobileMenu';

const pageNames: Record<string, string> = {
  '/dashboard': 'Overview',
  '/assets': 'Assets',
  '/assignments': 'Assignments',
  '/people': 'People',
  '/departments': 'Departments',
  '/locations': 'Locations',
  '/maintenance': 'Maintenance',
  '/repairs': 'Repairs',
  '/reports': 'Reports',
  '/audit-log': 'Audit log',
  '/settings': 'Settings',
};

/**
 * Top navigation bar with breadcrumb, search, notifications, and user profile.
 */
export function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const currentPage = pageNames[location.pathname] || '';

  return (
    <>
      <header className="sticky top-0 z-20 bg-white border-b border-lug-light-gray lg:pl-60">
        <div className="flex items-center justify-between h-12 px-4 sm:px-6">
          {/* Left: hamburger + breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden text-lug-gray hover:text-lug-charcoal p-1 rounded focus:outline-none focus:ring-2 focus:ring-lug-red/30 flex-shrink-0"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div className="hidden lg:flex items-center gap-1.5 text-xs text-lug-gray truncate">
              <span className="text-lug-charcoal font-medium">Dashboard</span>
              {currentPage && currentPage !== 'Overview' && (
                <>
                  <span>/</span>
                  <span>{currentPage}</span>
                </>
              )}
            </div>

            {/* Mobile title */}
            <span className="lg:hidden text-sm font-semibold text-lug-charcoal truncate">
              LUG IT Inventory
            </span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search */}
            <div className="hidden sm:flex items-center">
              <label htmlFor="search" className="sr-only">
                Search
              </label>
              <div className="relative">
                <svg
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-lug-gray pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  id="search"
                  type="search"
                  placeholder="Search assets..."
                  className="w-40 pl-7 pr-2.5 py-1 text-xs border border-lug-light-gray rounded bg-lug-off-white text-lug-charcoal placeholder:text-gray-400 focus:border-lug-red focus:ring-1 focus:ring-lug-red outline-none transition-colors"
                />
              </div>
            </div>

            {/* Notifications */}
            <button
              type="button"
              className="relative p-1.5 text-lug-gray hover:text-lug-charcoal rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-lug-red/30"
              aria-label="Notifications"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-lug-red rounded-full ring-2 ring-white" />
            </button>

            {/* User profile */}
            <div className="flex items-center gap-2 pl-2 ml-1 border-l border-lug-light-gray">
              <div className="w-6 h-6 rounded-full bg-lug-red flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                AU
              </div>
              <div className="hidden sm:block text-xs leading-tight">
                <p className="font-medium text-lug-charcoal">Admin User</p>
                <p className="text-lug-gray text-[11px]">IT Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}