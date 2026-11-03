import { useEffect, useState } from 'react';

/**
 * Debounce a rapidly changing value (search inputs).
 * Prevents firing an API request on every keystroke.
 */
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
