import { AlertCircle } from 'lucide-react';

/**
 * Form field wrapper: label, required marker, hint, error text.
 * Keeps every form visually identical without repeating markup.
 */
export default function Field({ label, htmlFor, required, error, hint, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="field__error">
          <AlertCircle size={12} />
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </div>
  );
}
