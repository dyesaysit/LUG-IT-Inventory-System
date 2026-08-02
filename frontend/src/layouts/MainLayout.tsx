import { Outlet } from 'react-router-dom';

/**
 * Main application layout.
 * Wraps all page content with a consistent header and footer shell.
 */
export function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">School IT Inventory System</h1>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} School IT Inventory System &mdash; Lancaster University
        Group Project
      </footer>
    </div>
  );
}