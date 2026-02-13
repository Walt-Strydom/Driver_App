import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const base = 'touch-target inline-flex items-center justify-center gap-2 font-semibold rounded-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]';

  const variants: Record<string, string> = {
    primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow',
    secondary: 'bg-surface-sunken text-txt border border-border hover:bg-border/60 hover:border-border-strong',
    danger: 'bg-danger text-white hover:bg-red-700 shadow-sm hover:shadow',
    ghost: 'bg-transparent text-primary hover:bg-primary-light',
    outline: 'bg-transparent text-txt border border-border hover:bg-surface-sunken hover:border-border-strong',
  };

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3.5 text-base',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
