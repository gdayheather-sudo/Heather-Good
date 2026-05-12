import { cn } from '@/lib/utils';

// Simple inline wordmark for Clarity. The wave-and-dots motif lives in
// brand-decoration.tsx; this is the literal name in DM Serif Display.
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('font-serif text-xl tracking-tight text-charcoal', className)}>
      Clarity
    </span>
  );
}
