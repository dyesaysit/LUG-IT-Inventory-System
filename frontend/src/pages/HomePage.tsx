import { APP_NAME } from 'shared';

/**
 * Home / landing page placeholder.
 * Content will be expanded as features are implemented.
 */
export function HomePage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">{APP_NAME}</h2>
      <p className="text-gray-600">
        Welcome to the School IT Inventory System. This application helps you track and manage IT
        assets across your school.
      </p>
    </section>
  );
}