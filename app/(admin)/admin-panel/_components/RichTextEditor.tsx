"use client";

import { useEffect, useMemo, useRef } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

const FONT_SIZE_OPTIONS = [
  { label: "Small", value: "2" },
  { label: "Normal", value: "3" },
  { label: "Large", value: "5" },
  { label: "X-Large", value: "7" },
];

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function looksLikeHtml(content: string): boolean {
  return /<[^>]+>/.test(content);
}

function plainTextToHtml(content: string): string {
  const lines = content.split("\n");
  return lines
    .map((line) => {
      const safe = escapeHtml(line.trim());
      return safe ? `<p>${safe}</p>` : "<p><br /></p>";
    })
    .join("");
}

export default function RichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Write your article content...",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const normalizedValue = useMemo(() => {
    if (!value?.trim()) return "";
    return looksLikeHtml(value) ? value : plainTextToHtml(value);
  }, [value]);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== normalizedValue) {
      editorRef.current.innerHTML = normalizedValue;
    }
  }, [normalizedValue]);

  const emitChange = () => {
    onChange(editorRef.current?.innerHTML || "");
  };

  const runCommand = (command: string, commandValue?: string) => {
    if (disabled) return;

    editorRef.current?.focus();
    if (command === "fontSize") {
      document.execCommand("styleWithCSS", false, "true");
    }
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  return (
    <div className="border border-slate-300 rounded-md dark:border-slate-600 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-2 border-b border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => runCommand("bold")}
          disabled={disabled}
          className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          aria-label="Bold"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => runCommand("italic")}
          disabled={disabled}
          className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 text-sm italic hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          aria-label="Italic"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => runCommand("underline")}
          disabled={disabled}
          className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 text-sm underline hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          aria-label="Underline"
          title="Underline"
        >
          U
        </button>
        <button
          type="button"
          onClick={() => runCommand("strikeThrough")}
          disabled={disabled}
          className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 text-sm line-through hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          aria-label="Strikethrough"
          title="Strikethrough"
        >
          S
        </button>
        <select
          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-800"
          defaultValue="3"
          onChange={(e) => runCommand("fontSize", e.target.value)}
          disabled={disabled}
          aria-label="Font size"
          title="Font size"
        >
          {FONT_SIZE_OPTIONS.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        dir="rtl"
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        className="min-h-[260px] p-3 outline-none bg-white dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
