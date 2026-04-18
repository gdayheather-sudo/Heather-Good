type Props = {
  className?: string;
  ariaHidden?: boolean;
};

export default function Wave({ className = "", ariaHidden = true }: Props) {
  return (
    <svg
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      role={ariaHidden ? "presentation" : undefined}
      aria-hidden={ariaHidden}
      className={className}
    >
      <path
        d="M0,70 C200,20 400,110 600,60 C800,15 1000,95 1200,55"
        fill="none"
        stroke="#8FA79A"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="280" cy="48" r="4" fill="#C97E63" />
      <circle cx="620" cy="62" r="4" fill="#C97E63" />
      <circle cx="960" cy="74" r="4" fill="#C97E63" />
    </svg>
  );
}
