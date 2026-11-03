import { getInitials } from '../../lib/format';

const SIZES = { sm: 'avatar--sm', md: '', lg: 'avatar--lg' };

/** Initials avatar - deterministic, no external image requests. */
export default function Avatar({ name, size = 'md', title }) {
  return (
    <span className={`avatar ${SIZES[size] || ''}`} title={title || name}>
      {getInitials(name)}
    </span>
  );
}
