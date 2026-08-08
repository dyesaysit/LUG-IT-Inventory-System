import { Spinner } from './Spinner';

/** Shared loading state displayed while a lazy route module is downloaded. */
export function RouteLoadingFallback() {
  return (
    <div className="flex min-h-48 items-center justify-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-lug-gray">
        <Spinner className="h-5 w-5" />
        <span>Loading page…</span>
      </div>
    </div>
  );
}
