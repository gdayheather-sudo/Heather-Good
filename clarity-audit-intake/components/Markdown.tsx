import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders Claude's markdown output with brand-matched Tailwind components.
// Used for any in-app document preview (e.g. a future admin view).
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: (p) => (
          <h1 className="font-display mb-2 text-3xl text-charcoal" {...p} />
        ),
        h2: (p) => (
          <h2 className="font-display mb-3 mt-8 text-xl text-navy" {...p} />
        ),
        h3: (p) => <h3 className="mb-2 mt-6 text-base font-semibold" {...p} />,
        p: (p) => (
          <p className="mb-3.5 text-[15px] leading-relaxed text-charcoal" {...p} />
        ),
        em: (p) => <em className="italic text-clay" {...p} />,
        ul: (p) => <ul className="mb-4 list-disc space-y-1.5 pl-5" {...p} />,
        ol: (p) => <ol className="mb-4 list-decimal space-y-1.5 pl-5" {...p} />,
        li: (p) => <li className="text-[15px] leading-relaxed" {...p} />,
        blockquote: (p) => (
          <blockquote
            className="my-4 border-l-2 border-clay pl-4 italic text-navy"
            {...p}
          />
        ),
        table: (p) => (
          <div className="my-5 overflow-x-auto">
            <table className="w-full border-collapse text-sm" {...p} />
          </div>
        ),
        th: (p) => (
          <th
            className="border border-[#E3DED4] bg-paper px-3 py-2 text-left text-navy"
            {...p}
          />
        ),
        td: (p) => (
          <td className="border border-[#E3DED4] px-3 py-2 align-top" {...p} />
        ),
        hr: () => <hr className="my-7 border-[#E3DED4]" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
