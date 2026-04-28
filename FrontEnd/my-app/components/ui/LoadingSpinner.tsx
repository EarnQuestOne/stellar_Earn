'use client';

type SpinnerSize = 'sm' | 'md' | 'lg';
type SpinnerVariant = 'primary' | 'neutral' | 'white';

/**
 * Props for the loading spinner component.
 */
interface LoadingSpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  label?: string;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-3',
};

const variantClasses: Record<SpinnerVariant, string> = {
  primary: 'border-[#089ec3] border-t-transparent',
  neutral: 'border-zinc-400 border-t-transparent dark:border-zinc-500',
  white: 'border-white border-t-transparent',
};

/**
 * A simple spinner used to indicate loading states.
 */
export function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  label = 'Loading',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`animate-spin-smooth rounded-full ${sizeClasses[size]} ${variantClasses[variant]}`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
