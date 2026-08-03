interface PlaceholderPageProps {
  title: string;
  description?: string;
}

/**
 * Generic placeholder page for sidebar navigation items not yet implemented.
 */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h2 className="text-lg font-semibold text-gray-700">Coming Soon</h2>
        <p className="text-sm text-gray-400 mt-1">
          The {title.toLowerCase()} module is under development.
        </p>
      </div>
    </div>
  );
}