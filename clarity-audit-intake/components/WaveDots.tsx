export function WaveDots({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 100 Q 50 60, 100 100 T 190 100"
        stroke="#8FA79A"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M10 120 Q 50 80, 100 120 T 190 120"
        stroke="#C97E63"
        strokeWidth="1"
        fill="none"
        opacity="0.7"
      />
      <circle cx="30" cy="160" r="2" fill="#3F5366" />
      <circle cx="60" cy="170" r="2" fill="#3F5366" />
      <circle cx="90" cy="160" r="2" fill="#3F5366" />
      <circle cx="120" cy="170" r="2" fill="#C97E63" />
      <circle cx="150" cy="160" r="2" fill="#3F5366" />
      <circle cx="180" cy="170" r="2" fill="#3F5366" />
    </svg>
  );
}
