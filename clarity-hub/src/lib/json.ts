/**
 * Strip ```json fences (or plain ```) and return the inner JSON string.
 * Tolerant of leading prose Claude sometimes adds despite instructions.
 */
export function stripFences(raw: string): string {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const m = s.match(fence);
  if (m) s = m[1].trim();
  // Fall back: take the substring between the first { and the last }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }
  return s;
}

export function parseJsonLoose<T = unknown>(raw: string): T {
  return JSON.parse(stripFences(raw)) as T;
}
