import { Link } from 'react-router-dom';

/** Shown when an authenticated user lacks the permission required to view a route. */
export function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded border border-lug-light-gray bg-white p-10 text-center shadow-sm">
        <div className="mb-4 text-5xl" aria-hidden="true">🔒</div>
        <h1 className="text-lg font-semibold text-lug-charcoal">Access denied</h1>
        <p className="mt-2 text-sm text-lug-gray">
          You do not have permission to view this page. Contact a system administrator if you
          believe this is an error.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block rounded bg-lug-red px-4 py-2 text-sm font-medium text-white hover:bg-lug-burgundy"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
