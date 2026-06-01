import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'danger' | 'neutral' | 'warning';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success-50 text-success-700 ring-success-100',
  danger: 'bg-danger-50 text-danger-700 ring-danger-100',
  neutral: 'bg-brand-cream text-brand-navy ring-brand-navy/10',
  warning: 'bg-warning-50 text-warning-700 ring-warning-100',
};

export function Badge({
  variant = 'neutral',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ring-1 ring-inset',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
