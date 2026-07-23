import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RichContent } from "./RichContent";
import { Bold, Italic, Code2, List, ListOrdered, Sigma, Link as LinkIcon, Image as ImageIcon, Table as TableIcon } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
};

const shortcuts = [
  { key: "Ctrl/Cmd + B", label: "Bold" },
  { key: "Ctrl/Cmd + I", label: "Italic" },
  { key: "Ctrl/Cmd + K", label: "Link" },
  { key: "Ctrl/Cmd + E", label: "Inline code" },
  { key: "Ctrl/Cmd + M", label: "Math ($...$)" },
];

export function RichEditor({ value, onChange, placeholder, rows = 10, label }: Props) {
  const [ref, setRef] = useState<HTMLTextAreaElement | null>(null);

  const wrap = (before: string, after = before, placeholderText = "") => {
    if (!ref) return;
    const start = ref.selectionStart;
    const end = ref.selectionEnd;
    const selected = value.slice(start, end) || placeholderText;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ref.focus();
      const pos = start + before.length + selected.length + after.length;
      ref.setSelectionRange(pos, pos);
    });
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === "b") { e.preventDefault(); wrap("**", "**", "bold"); }
    else if (k === "i") { e.preventDefault(); wrap("*", "*", "italic"); }
    else if (k === "k") { e.preventDefault(); wrap("[", "](https://)", "link"); }
    else if (k === "e") { e.preventDefault(); wrap("`", "`", "code"); }
    else if (k === "m") { e.preventDefault(); wrap("$", "$", "x^2"); }
  };

  return (
    <div className="space-y-2">
      {label && <div className="text-sm font-medium">{label}</div>}
      <div className="rounded-lg border border-border/60 bg-card">
        <Tabs defaultValue="write">
          <div className="flex items-center justify-between border-b border-border/50 px-2 py-1">
            <TabsList className="h-8">
              <TabsTrigger value="write" className="text-xs">Write</TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
              <TabsTrigger value="help" className="text-xs">Shortcuts</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-0.5">
              <IconBtn onClick={() => wrap("**", "**", "bold")} title="Bold (Ctrl+B)"><Bold className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn onClick={() => wrap("*", "*", "italic")} title="Italic (Ctrl+I)"><Italic className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn onClick={() => wrap("`", "`", "code")} title="Inline code"><Code2 className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn onClick={() => wrap("$", "$", "x^2")} title="Math (Ctrl+M)"><Sigma className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn onClick={() => wrap("\n- ", "", "item")} title="Bulleted list"><List className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn onClick={() => wrap("\n1. ", "", "item")} title="Numbered list"><ListOrdered className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn onClick={() => wrap("[", "](https://)", "link")} title="Link (Ctrl+K)"><LinkIcon className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn onClick={() => wrap("![alt](", ")", "https://")} title="Image"><ImageIcon className="h-3.5 w-3.5" /></IconBtn>
              <IconBtn onClick={() => wrap("\n| A | B |\n|---|---|\n| ", " |  |\n", "cell")} title="Table"><TableIcon className="h-3.5 w-3.5" /></IconBtn>
            </div>
          </div>
          <TabsContent value="write" className="m-0">
            <Textarea
              ref={setRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKey}
              placeholder={placeholder ?? "Write in Markdown. Use $...$ for inline math and $$...$$ for block math."}
              rows={rows}
              className="rounded-t-none border-0 font-mono text-sm focus-visible:ring-0"
            />
          </TabsContent>
          <TabsContent value="preview" className="m-0 min-h-[10rem] p-4">
            <RichContent>{value}</RichContent>
          </TabsContent>
          <TabsContent value="help" className="m-0 p-4 text-xs text-muted-foreground">
            <ul className="grid grid-cols-2 gap-1">
              {shortcuts.map((s) => (
                <li key={s.key}><kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">{s.key}</kbd> — {s.label}</li>
              ))}
              <li>$$ x = \frac{"{-b}"}{"{2a}"} $$ for block math</li>
              <li>```js code fences``` for code blocks</li>
            </ul>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" title={title} onClick={onClick}>
      {children}
    </Button>
  );
}
