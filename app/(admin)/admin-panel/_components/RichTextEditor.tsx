"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minHeightClass?: string;
};

const FONT_SIZE_OPTIONS = [
  { label: "Small", value: "2" },
  { label: "Normal", value: "3" },
  { label: "Large", value: "5" },
  { label: "X-Large", value: "7" },
];

const SIZE_KEYWORD_TO_OPTION: Record<string, string> = {
  "xx-small": "2",
  "x-small": "2",
  small: "2",
  medium: "3",
  normal: "3",
  large: "5",
  "x-large": "7",
  "xx-large": "7",
  "xxx-large": "7",
  "-webkit-small": "2",
  "-webkit-medium": "3",
  "-webkit-large": "5",
  "-webkit-x-large": "7",
  "-webkit-xx-large": "7",
  "-webkit-xxx-large": "7",
};

function mapFontSizeTokenToOption(token?: string): string {
  if (!token) return "3";

  const normalizedToken = token.trim().toLowerCase();
  if (SIZE_KEYWORD_TO_OPTION[normalizedToken]) {
    return SIZE_KEYWORD_TO_OPTION[normalizedToken];
  }

  if (/^[1-7]$/.test(normalizedToken)) {
    if (normalizedToken === "1" || normalizedToken === "2") return "2";
    if (normalizedToken === "3" || normalizedToken === "4") return "3";
    if (normalizedToken === "5" || normalizedToken === "6") return "5";
    return "7";
  }

  const pxMatch = normalizedToken.match(/^(\d+(\.\d+)?)px$/);
  if (pxMatch) {
    const pxValue = Number(pxMatch[1]);
    if (pxValue <= 14) return "2";
    if (pxValue <= 19) return "3";
    if (pxValue <= 30) return "5";
    return "7";
  }

  return "3";
}

function getActiveFontSize(editorEl: HTMLDivElement): string | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const anchorNode = selection.anchorNode;
  if (!anchorNode || !editorEl.contains(anchorNode)) return null;

  const startElement =
    anchorNode.nodeType === Node.TEXT_NODE
      ? anchorNode.parentElement
      : (anchorNode as HTMLElement);

  if (!startElement) return "3";

  let current: HTMLElement | null = startElement;
  while (current && editorEl.contains(current)) {
    if (current.tagName.toLowerCase() === "font") {
      const legacySize = current.getAttribute("size") || undefined;
      if (legacySize) return mapFontSizeTokenToOption(legacySize);
    }

    if (current.style.fontSize) {
      return mapFontSizeTokenToOption(current.style.fontSize);
    }

    current = current.parentElement;
  }

  const computed = window.getComputedStyle(startElement).fontSize;
  return mapFontSizeTokenToOption(computed);
}

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
  minHeightClass = "min-h-[260px]",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFontSize, setActiveFontSize] = useState("3");

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

  const syncToolbarStateFromSelection = useCallback(() => {
    if (!editorRef.current) return;

    const nextSize = getActiveFontSize(editorRef.current);
    if (nextSize) {
      setActiveFontSize(nextSize);
    }
  }, []);

  useEffect(() => {
    syncToolbarStateFromSelection();
  }, [normalizedValue, syncToolbarStateFromSelection]);

  useEffect(() => {
    const handleSelectionChange = () => {
      syncToolbarStateFromSelection();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [syncToolbarStateFromSelection]);

  const runCommand = (command: string, commandValue?: string) => {
    if (disabled) return;

    editorRef.current?.focus();
    if (command === "fontSize") {
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand(command, false, commandValue);
      if (commandValue) {
        setActiveFontSize(commandValue);
      }
      emitChange();
      return;
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
          value={activeFontSize}
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
        onMouseUp={syncToolbarStateFromSelection}
        onKeyUp={syncToolbarStateFromSelection}
        className={`${minHeightClass} p-3 outline-none bg-white dark:bg-slate-800 dark:text-white`}
      />
    </div>
  );
}
