import type { ReactNode } from 'react';

// Form Fields & Components

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  children: ReactNode;
}

export function FormField({ label, required, error, helpText, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5 flex flex-col">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-lug-charcoal">
          {label}
          {required && <span className="text-lug-red ml-1">*</span>}
        </label>
      </div>
      {children}
      {error && <p className="text-xs font-semibold text-lug-red">{error}</p>}
      {helpText && !error && <p className="text-xs text-lug-gray">{helpText}</p>}
    </div>
  );
}

// Custom Standard Form Sections
interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="space-y-4 rounded-lg border border-lug-light-gray bg-white p-5">
      <div>
        <h3 className="text-base font-bold text-lug-charcoal">{title}</h3>
        {description && <p className="text-xs text-lug-gray mt-1">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

// Error Alerts
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
      <svg className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
