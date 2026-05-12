import { cn } from '@/lib/utils';

// Wave-and-dots motif — used as a subtle decoration on marketing surfaces
// and around brand moments. Intentionally lightweight; renders cleanly at
// any size. The pattern repeats horizontally.
export function WaveAndDots({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 24"
      preserveAspectRatio="none"
      className={cn('h-6 w-full text-sage-300', className)}
    >
      <path
        d="M0 12 C 30 0, 60 24, 90 12 S 150 0, 180 12 S 240 24, 240 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <g fill="currentColor">
        <circle cx="15" cy="6" r="1" />
        <circle cx="75" cy="18" r="1" />
        <circle cx="135" cy="6" r="1" />
        <circle cx="195" cy="18" r="1" />
        <circle cx="225" cy="9" r="1" />
      </g>
    </svg>
  );
}
