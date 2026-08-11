"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";

import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";

import { LexicalTheme } from "./Theme";
import { HtmlPlugin } from "./HtmlPlugin";
import { ToolbarPlugin } from "./ToolbarPlugin";

type LexicalEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minHeightClass?: string;
};

const initialConfig = {
  namespace: "dot-mag-editor",
  theme: LexicalTheme,
  onError: (error: Error) => {
    console.error("Lexical error:", error);
  },
  nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
};

export default function LexicalEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "متن این مراسم را وارد کنید...",
  minHeightClass = "min-h-[260px]",
}: LexicalEditorProps) {
  return (
    <LexicalComposer initialConfig={{ ...initialConfig, editable: !disabled }}>
      <div
        className={`flex flex-col overflow-hidden rounded-xl border border-card-border bg-background/70 ${
          disabled ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        <ToolbarPlugin />
        
        <div className="relative flex-grow">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={`prose article-content-prose w-full max-w-none px-4 py-3 outline-none ${minHeightClass}`}
              />
            }
            placeholder={
              <div className="pointer-events-none absolute left-4 right-4 top-3 text-slate-400">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <AutoFocusPlugin />
          <HtmlPlugin initialHtml={value} onChange={onChange} />
        </div>
      </div>
    </LexicalComposer>
  );
}
