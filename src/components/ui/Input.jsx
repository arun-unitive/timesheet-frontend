import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

/** Text input with optional error state. */
export function Input({ error, className = '', ...rest }) {
  return <input className={`input ${error ? 'input--error' : ''} ${className}`} {...rest} />;
}

/** Native select styled to match the design system. */
export function Select({ error, className = '', children, ...rest }) {
  return (
    <select className={`select ${error ? 'select--error' : ''} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ error, className = '', ...rest }) {
  return <textarea className={`textarea ${error ? 'textarea--error' : ''} ${className}`} {...rest} />;
}

/** Search box used in table toolbars. */
export function SearchInput({ value, onChange, placeholder = 'Search…', ...rest }) {
  return (
    <div className="input-group">
      <span className="input-group__icon">
        <Search size={16} />
      </span>
      <input
        className="input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        {...rest}
      />
    </div>
  );
}

/**
 * Multi-select dropdown with an optional search box.
 * `options` is a list of `{ value, label, hint }`; `value` is an array of selected values.
 */
export function MultiSelect({
  options = [],
  value = [],
  onChange,
  placeholder = 'All',
  searchable = true,
  searchPlaceholder = 'Search…',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // The search box should be empty each time the menu opens.
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const selected = useMemo(() => new Set(value), [value]);
  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label?.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (optionValue) => {
    const next = new Set(selected);
    if (next.has(optionValue)) next.delete(optionValue);
    else next.add(optionValue);
    onChange?.(Array.from(next));
  };

  const summary =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? options.find((option) => option.value === value[0])?.label || '1 selected'
        : `${value.length} selected`;

  return (
    <div className="multiselect" ref={ref}>
      <div className={`multiselect__control${open ? ' is-open' : ''}`}>
        <button
          type="button"
          className="multiselect__trigger"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={`multiselect__summary truncate${value.length ? '' : ' is-placeholder'}`}>
            {summary}
          </span>
          <ChevronDown size={16} className="multiselect__caret" />
        </button>
        {value.length > 0 && (
          <button
            type="button"
            className="multiselect__clear"
            onClick={() => onChange?.([])}
            title="Clear selection"
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="multiselect__menu">
          {searchable && (
            <div className="multiselect__search">
              <input
                className="input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
              />
            </div>
          )}
          <div className="multiselect__options" role="listbox">
            {visibleOptions.length === 0 ? (
              <div className="multiselect__empty">No matches</div>
            ) : (
              visibleOptions.map((option) => {
                const isSelected = selected.has(option.value);
                return (
                  <button
                    type="button"
                    key={option.value}
                    className={`multiselect__option${isSelected ? ' is-selected' : ''}`}
                    onClick={() => toggle(option.value)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className={`multiselect__check${isSelected ? ' is-checked' : ''}`}>
                      {isSelected && <Check size={12} />}
                    </span>
                    <span className="multiselect__label truncate">{option.label}</span>
                    {option.hint && <span className="multiselect__hint truncate">{option.hint}</span>}
                  </button>
                );
              })
            )}
          </div>
          <div className="multiselect__footer">
            <button
              type="button"
              className="multiselect__action"
              onClick={() => onChange?.(options.map((option) => option.value))}
            >
              Select all
            </button>
            <button
              type="button"
              className="multiselect__action"
              onClick={() => onChange?.([])}
              disabled={value.length === 0}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
