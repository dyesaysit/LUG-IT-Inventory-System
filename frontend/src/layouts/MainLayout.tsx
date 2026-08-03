import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopNav } from '../components/TopNav';
import { Footer } from '../components/Footer';

/**
 * Authenticated layout shell with sidebar, compact top navigation, content area, and footer.
 * Uses off-white background and padded content with a constrained max-width on large screens.
 */
export function MainLayout() {
  return (
    <div className="min-h-screen bg-lug-off-white">
      <Sidebar />
      <TopNav />

      <main className="lg:pl-60 pt-12">
        <div className="px-6 py-5 sm:px-8 lg:px-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>

      <div className="lg:pl-60">
        <Footer />
      </div>
    </div>
  );
}