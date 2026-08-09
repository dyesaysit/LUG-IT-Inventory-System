import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApplicationSettings } from '../context/ApplicationSettingsContext';
import { UnreadNotificationBell } from '../components/UnreadNotificationBell';

const navItems = [
  { to: '/portal', label: 'My Assets / Report Issue', end: true },
  { to: '/portal/tickets', label: 'My Tickets', end: false },
  { to: '/portal/requests', label: 'Request Equipment / My Requests', end: false },
  { to: '/portal/profile', label: 'Profile / Change Password', end: false },
];

/** Simplified shell for the staff self-service portal. */
export function PortalLayout() {
  const { user, logout, hasPermission } = useAuth();
  const { settings } = useApplicationSettings();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-lug-off-white">
      <header className="sticky top-0 z-20 border-b border-lug-light-gray bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {settings?.logoUrl && <img src={settings.logoUrl} alt="" className="h-7 w-auto" />}
            <div>
              <p className="text-sm font-semibold text-lug-charcoal">{settings?.systemName ?? 'IT Inventory'}</p>
              <p className="text-[11px] text-lug-gray">Staff Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasPermission('dashboard.view') && (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="hidden text-sm text-lug-gray hover:text-lug-charcoal sm:inline"
              >
                Admin view
              </button>
            )}
            <span className="hidden text-sm text-lug-charcoal sm:inline">{user?.username}</span>
            <UnreadNotificationBell />
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded border border-lug-light-gray px-3 py-1.5 text-sm text-lug-charcoal hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4 sm:px-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'border-lug-red text-lug-red' : 'border-transparent text-lug-gray hover:text-lug-charcoal'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
