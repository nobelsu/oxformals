import { useState } from "react";

/**
 * Runs `sync` during render on the first render and whenever `key` changes.
 * For state that has to follow a prop or the URL: React's recommended
 * alternative to setting state from an effect, without the extra paint.
 */
export function useOnChange(key: string, sync: () => void) {
  const [prev, setPrev] = useState<string | null>(null);
  if (prev !== key) {
    setPrev(key);
    sync();
  }
}
