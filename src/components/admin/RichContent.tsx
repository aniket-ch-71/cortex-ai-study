import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

/**
 * Renders question / explanation content with Markdown + GFM + LaTeX math ($...$, $$...$$).
 * Supports code blocks and tables via remark-gfm.
 */
export function RichContent({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "prose-pre:rounded-lg prose-pre:bg-muted/60",
        "prose-code:before:content-none prose-code:after:content-none",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {children || ""}
      </ReactMarkdown>
    </div>
  );
}
