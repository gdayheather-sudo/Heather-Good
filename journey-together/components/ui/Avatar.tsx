import { initialsColor } from "@/lib/utils";

export function Avatar({
  seed,
  size = 48,
  label,
}: {
  seed: string;
  size?: number;
  label?: string;
}) {
  const initials =
    label
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? seed.slice(0, 2);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: initialsColor(seed),
        fontSize: size * 0.36,
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
