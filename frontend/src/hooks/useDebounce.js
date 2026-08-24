import { useEffect, useState } from "react";

/**
 * Returns a copy of `value` that only updates after `delay` ms of no changes.
 * Use the debounced value for queries so typing doesn't refetch on every keypress.
 */
export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
