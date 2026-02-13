import React, { useEffect, useRef } from 'react';

/* ━━━ Card ━━━ */
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', onClick, padding = 'md' }: CardProps) {
  const paddings = { none: '', sm: 'p-3', md: 'p-4 sm:p-5', lg: 'p-5 sm:p-6' };
  const interactive = onClick
    ? 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0 active:shadow-card transition-all duration-200'
    : '';

  return (
    <div
      className={`bg-surface-raised border border-border rounded-lg shadow-card ${paddings[padding]} ${interactive} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

/* ━━━ Badge ━━━ */
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', dot, className = '' }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-surface-sunken text-txt-secondary border-border',
    primary: 'bg-primary-light text-primary-700 border-primary-200',
    success: 'bg-success-light text-green-700 border-green-200',
    warning: 'bg-warning-light text-orange-700 border-orange-200',
    danger: 'bg-danger-light text-red-700 border-red-200',
    info: 'bg-info-light text-blue-700 border-blue-200',
  };
  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium border ${variants[variant]} ${sizes[size]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

/* ━━━ Input ━━━ */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-txt-secondary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary">
            {icon}
          </div>
        )}
        <input
          className={`w-full touch-target border rounded-md bg-surface-raised text-txt transition-all duration-150
            focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none
            ${icon ? 'pl-10 pr-4' : 'px-4'} py-3 text-base
            ${error ? 'border-danger' : 'border-border hover:border-border-strong'}
            placeholder:text-txt-tertiary ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}

/* ━━━ TextArea ━━━ */
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextArea({ label, error, className = '', ...props }: TextAreaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-txt-secondary mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-4 py-3 border rounded-md bg-surface-raised text-txt transition-all duration-150
          focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none
          ${error ? 'border-danger' : 'border-border hover:border-border-strong'}
          placeholder:text-txt-tertiary ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}

/* ━━━ LoadingSpinner ━━━ */
export function LoadingSpinner({ size = 'md', label }: { size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6">
      <div className={`animate-spin ${sizes[size]} rounded-full border-2 border-border border-t-primary`} />
      {label && <p className="text-sm text-txt-secondary">{label}</p>}
    </div>
  );
}

/* ━━━ Modal ━━━ */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 glass animate-fade-in"
        onClick={onClose}
      />

      {/* Panel — slides up on mobile, scales in on desktop */}
      <div className="relative w-full sm:max-w-lg mx-auto sm:mx-4
        bg-surface-raised border-t sm:border border-border
        rounded-t-xl sm:rounded-lg shadow-modal
        p-5 sm:p-6
        animate-slide-up sm:animate-scale-in
        max-h-[85vh] overflow-y-auto">
        
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-txt">{title}</h3>
          <button
            onClick={onClose}
            className="touch-target p-2 -mr-2 rounded-md text-txt-tertiary hover:text-txt hover:bg-surface-sunken transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/* ━━━ Divider ━━━ */
export function Divider({ className = '' }: { className?: string }) {
  return <div className={`h-px bg-border ${className}`} />;
}

/* ━━━ EmptyState ━━━ */
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-sunken border border-border flex items-center justify-center mb-4 text-txt-tertiary">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-txt mb-1">{title}</h3>
      {description && <p className="text-sm text-txt-secondary mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
