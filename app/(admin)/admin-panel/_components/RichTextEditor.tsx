"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minHeightClass?: string;
};

type MarkState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
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

function isBoldWeight(fontWeight: string): boolean {
  const normalized = fontWeight.trim().toLowerCase();
  if (normalized === "bold") return true;

  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) && numericValue >= 600;
}

function getActiveMarks(editorEl: HTMLDivElement): MarkState | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const anchorNode = selection.anchorNode;
  if (!anchorNode || !editorEl.contains(anchorNode)) return null;

  const startElement =
    anchorNode.nodeType === Node.TEXT_NODE
      ? anchorNode.parentElement
      : (anchorNode as HTMLElement);

  if (!startElement) {
    return {
      bold: false,
      italic: false,
      underline: false,
      strikeThrough: false,
    };
  }

  let marks: MarkState = {
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
  };

  let current: HTMLElement | null = startElement;
  while (current && editorEl.contains(current)) {
    const tagName = current.tagName.toLowerCase();

    if (tagName === "b" || tagName === "strong") {
      marks.bold = true;
    }

    if (tagName === "i" || tagName === "em") {
      marks.italic = true;
    }

    if (tagName === "u") {
      marks.underline = true;
    }

    if (tagName === "s" || tagName === "strike") {
      marks.strikeThrough = true;
    }

    if (current.style.fontStyle.trim().toLowerCase() === "italic") {
      marks.italic = true;
    }

    if (isBoldWeight(current.style.fontWeight)) {
      marks.bold = true;
    }

    const inlineDecoration = (
      current.style.textDecorationLine || current.style.textDecoration
    )
      .trim()
      .toLowerCase();

    if (inlineDecoration.includes("underline")) {
      marks.underline = true;
    }

    if (inlineDecoration.includes("line-through")) {
      marks.strikeThrough = true;
    }

    current = current.parentElement;
  }

  const computed = window.getComputedStyle(startElement);
  if (isBoldWeight(computed.fontWeight)) {
    marks.bold = true;
  }

  if (computed.fontStyle.trim().toLowerCase() === "italic") {
    marks.italic = true;
  }

  const computedDecoration = (
    computed.textDecorationLine || computed.textDecoration
  )
    .trim()
    .toLowerCase();

  if (computedDecoration.includes("underline")) {
    marks.underline = true;
  }

  if (computedDecoration.includes("line-through")) {
    marks.strikeThrough = true;
  }

  try {
    marks = {
      bold: marks.bold || document.queryCommandState("bold"),
      italic: marks.italic || document.queryCommandState("italic"),
      underline: marks.underline || document.queryCommandState("underline"),
      strikeThrough:
        marks.strikeThrough || document.queryCommandState("strikeThrough"),
    };
  } catch {
    // Keep DOM-based detection result when queryCommandState is unavailable.
  }

  return marks;
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
  const [activeMarks, setActiveMarks] = useState<MarkState>({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
  });

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

    const nextMarks = getActiveMarks(editorRef.current);
    if (nextMarks) {
      setActiveMarks(nextMarks);
    }

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
      syncToolbarStateFromSelection();
      return;
    }
    document.execCommand(command, false, commandValue);
    emitChange();
    syncToolbarStateFromSelection();
  };

  const getToolbarButtonClass = (isActive: boolean) =>
    [
      "px-2.5 py-1 rounded border text-sm disabled:opacity-50 transition-colors",
      isActive
        ? "border-primary bg-primary text-white hover:bg-primary/90"
        : "border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800",
    ].join(" ");

  return (
    <div className="border border-slate-300 rounded-md dark:border-slate-600 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-2 border-b border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => runCommand("bold")}
          disabled={disabled}
          className={`${getToolbarButtonClass(activeMarks.bold)} font-bold`}
          aria-label="Bold"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => runCommand("italic")}
          disabled={disabled}
          className={`${getToolbarButtonClass(activeMarks.italic)} italic`}
          aria-label="Italic"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => runCommand("underline")}
          disabled={disabled}
          className={`${getToolbarButtonClass(activeMarks.underline)} underline`}
          aria-label="Underline"
          title="Underline"
        >
          U
        </button>
        <button
          type="button"
          onClick={() => runCommand("strikeThrough")}
          disabled={disabled}
          className={`${getToolbarButtonClass(activeMarks.strikeThrough)} line-through`}
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
