import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'btn--primary',
  secondary: 'btn--secondary',
  ghost: 'btn--ghost',
  danger: 'btn--danger',
  success: 'btn--success',
};

const SIZES = { sm: 'btn--sm', md: '', lg: 'btn--lg' };

/**
 * Single button primitive used everywhere.
 * `icon` renders on the left, `iconRight` on the right.
 */
export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  type = 'button',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  block = false,
  className = '',
  disabled,
  ...rest
}) {
  const classes = [
    'btn',
    VARIANTS[variant] || '',
    SIZES[size] || '',
    block ? 'btn--block' : '',
    !children ? 'btn--icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 size={16} className="spin" /> : Icon ? <Icon size={16} /> : null}
      {children}
      {IconRight && !loading ? <IconRight size={16} /> : null}
    </button>
  );
}
