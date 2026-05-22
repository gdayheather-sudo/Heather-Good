import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

// Brand-styled markdown for long-form bodies (Substack articles).
// Headings render in DM Serif; body in DM Sans via the prose overrides.
export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-stone max-w-none prose-headings:font-serif prose-headings:text-navy prose-a:text-clay prose-strong:text-charcoal",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
