"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";

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
  blockquote: boolean;
  primaryColor: boolean;
};

type FeatureState = "all" | "none" | "mixed";

type SelectionFeatureStates = {
  hasRangeSelection: boolean;
  hasCaretSelection: boolean;
  bold: FeatureState;
  italic: FeatureState;
  underline: FeatureState;
  strikeThrough: FeatureState;
  blockquote: FeatureState;
  primaryColor: FeatureState;
  firstFontSize: string;
};

const PRIMARY_COLOR_HEX = "#d73b3a";
const PRIMARY_COLOR_RGB = "rgb(215, 59, 58)";

const FONT_SIZE_OPTIONS = [
  { label: "کوچک", value: "2" },
  { label: "عادی", value: "3" },
  { label: "بزرگ", value: "5" },
  { label: "خیلی بزرگ", value: "7" },
];

const DEFAULT_SELECTION_FEATURE_STATES: SelectionFeatureStates = {
  hasRangeSelection: false,
  hasCaretSelection: false,
  bold: "none",
  italic: "none",
  underline: "none",
  strikeThrough: "none",
  blockquote: "none",
  primaryColor: "none",
  firstFontSize: "3",
};

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
};

function mapFontSizeTokenToOption(token?: string): string {
  if (!token) return "3";
  const normalized = token.trim().toLowerCase();
  if (SIZE_KEYWORD_TO_OPTION[normalized]) {
    return SIZE_KEYWORD_TO_OPTION[normalized];
  }

  if (/^[1-7]$/.test(normalized)) {
    if (normalized === "1" || normalized === "2") return "2";
    if (normalized === "3" || normalized === "4") return "3";
    if (normalized === "5" || normalized === "6") return "5";
    return "7";
  }

  const pxMatch = normalized.match(/^(\d+(\.\d+)?)px$/);
  if (pxMatch) {
    const px = Number(pxMatch[1]);
    if (px <= 14) return "2";
    if (px <= 19) return "3";
    if (px <= 30) return "5";
    return "7";
  }

  return "3";
}

function deriveFeatureState(values: boolean[]): FeatureState {
  if (values.length === 0 || values.every((item) => !item)) {
    return "none";
  }

  if (values.every((item) => item)) {
    return "all";
  }

  return "mixed";
}

function isBoldWeight(fontWeight: string): boolean {
  const normalized = fontWeight.trim().toLowerCase();
  if (normalized === "bold") return true;
  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) && numericValue >= 600;
}

function normalizeColorToken(token?: string): string {
  return (token || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isPrimaryColorToken(token?: string): boolean {
  const normalized = normalizeColorToken(token);
  if (!normalized) return false;
  return (
    normalized === PRIMARY_COLOR_HEX ||
    normalized === PRIMARY_COLOR_RGB ||
    normalized === "rgba(215, 59, 58, 1)" ||
    normalized === "215,59,58"
  );
}

function isSelectionInsideEditor(
  selection: Selection,
  editorEl: HTMLDivElement,
): boolean {
  if (selection.rangeCount === 0) {
    return false;
  }

  try {
    const range = selection.getRangeAt(0);
    return editorEl.contains(range.commonAncestorContainer);
  } catch {
    return false;
  }
}

function resolveNodeFontSizeOption(node: Text): string {
  const parent = node.parentElement;
  if (!parent) {
    return "3";
  }

  let current: HTMLElement | null = parent;
  while (current) {
    if (current.tagName.toLowerCase() === "font") {
      const legacySize = current.getAttribute("size") || undefined;
      if (legacySize) {
        return mapFontSizeTokenToOption(legacySize);
      }
    }

    if (current.style.fontSize) {
      return mapFontSizeTokenToOption(current.style.fontSize);
    }

    current = current.parentElement;
  }

  return mapFontSizeTokenToOption(window.getComputedStyle(parent).fontSize);
}

/** Collect all non-empty text nodes that intersect the given range. */
function getTextNodesInRange(range: Range, root: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;

  while (node) {
    if (node.textContent?.trim() && range.intersectsNode(node)) {
      nodes.push(node);
    }
    node = walker.nextNode() as Text | null;
  }

  return nodes;
}

/** Collect all non-empty block elements that intersect the given range. */
function getBlockElementsInRange(
  range: Range,
  root: HTMLElement,
): HTMLElement[] {
  const BLOCK_TAGS = new Set([
    "p",
    "blockquote",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "li",
    "pre",
  ]);

  const blocks: HTMLElement[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode() as HTMLElement | null;

  while (node) {
    if (
      BLOCK_TAGS.has(node.tagName.toLowerCase()) &&
      node.textContent?.trim() &&
      range.intersectsNode(node)
    ) {
      blocks.push(node);
    }
    node = walker.nextNode() as HTMLElement | null;
  }

  return blocks;
}

function getSelectionFeatureStates(
  editorEl: HTMLDivElement,
): SelectionFeatureStates {
  const selection = window.getSelection();
  if (!selection || !isSelectionInsideEditor(selection, editorEl)) {
    return DEFAULT_SELECTION_FEATURE_STATES;
  }

  if (selection.isCollapsed) {
    const anchorNode = selection.anchorNode;
    const anchorElement =
      anchorNode?.nodeType === Node.ELEMENT_NODE
        ? (anchorNode as HTMLElement)
        : anchorNode?.parentElement || editorEl;

    const computed = window.getComputedStyle(anchorElement || editorEl);
    const blockquote = !!anchorElement?.closest("blockquote");

    return {
      hasRangeSelection: false,
      hasCaretSelection: true,
      bold: isBoldWeight(computed.fontWeight) ? "all" : "none",
      italic:
        computed.fontStyle === "italic" || computed.fontStyle === "oblique"
          ? "all"
          : "none",
      underline: computed.textDecorationLine.includes("underline")
        ? "all"
        : "none",
      strikeThrough: computed.textDecorationLine.includes("line-through")
        ? "all"
        : "none",
      blockquote: blockquote ? "all" : "none",
      primaryColor: isPrimaryColorToken(computed.color) ? "all" : "none",
      firstFontSize: mapFontSizeTokenToOption(computed.fontSize),
    };
  }

  const range = selection.getRangeAt(0);
  const textNodes = getTextNodesInRange(range, editorEl);
  const blockNodes = getBlockElementsInRange(range, editorEl);

  if (textNodes.length === 0 && blockNodes.length === 0) {
    return DEFAULT_SELECTION_FEATURE_STATES;
  }

  const bold = deriveFeatureState(
    textNodes.map((node) =>
      isBoldWeight(
        window.getComputedStyle(node.parentElement || editorEl).fontWeight,
      ),
    ),
  );

  const italic = deriveFeatureState(
    textNodes.map((node) => {
      const fontStyle = window
        .getComputedStyle(node.parentElement || editorEl)
        .fontStyle.trim()
        .toLowerCase();
      return fontStyle === "italic" || fontStyle === "oblique";
    }),
  );

  const underline = deriveFeatureState(
    textNodes.map((node) =>
      window
        .getComputedStyle(node.parentElement || editorEl)
        .textDecorationLine.includes("underline"),
    ),
  );

  const strikeThrough = deriveFeatureState(
    textNodes.map((node) =>
      window
        .getComputedStyle(node.parentElement || editorEl)
        .textDecorationLine.includes("line-through"),
    ),
  );

  const primaryColor = deriveFeatureState(
    textNodes.map((node) =>
      isPrimaryColorToken(
        window.getComputedStyle(node.parentElement || editorEl).color,
      ),
    ),
  );

  const blockquote =
    blockNodes.length > 0
      ? deriveFeatureState(
          blockNodes.map((node) => !!node.closest("blockquote")),
        )
      : deriveFeatureState(
          textNodes.map((node) => !!node.parentElement?.closest("blockquote")),
        );

  const fontSizeOptions = textNodes.map((node) =>
    resolveNodeFontSizeOption(node),
  );
  const firstFontSize = fontSizeOptions[0] || "3";

  return {
    hasRangeSelection: true,
    hasCaretSelection: false,
    bold,
    italic,
    underline,
    strikeThrough,
    blockquote,
    primaryColor,
    firstFontSize,
  };
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
  placeholder = "متن این مراسم را وارد کنید...",
  minHeightClass = "min-h-[260px]",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fontMenuRef = useRef<HTMLDivElement>(null);
  const helpPopoverRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);
  const lastEmittedHtmlRef = useRef("");
  const savedSelectionRef = useRef<Range | null>(null);
  const selectionFeatureStatesRef = useRef<SelectionFeatureStates>(
    DEFAULT_SELECTION_FEATURE_STATES,
  );
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeFontSize, setActiveFontSize] = useState("3");
  const [activeMarks, setActiveMarks] = useState<MarkState>({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    blockquote: false,
    primaryColor: false,
  });
  const [isComposing, setIsComposing] = useState(false);

  const normalizedValue = useMemo(() => {
    if (!value?.trim()) return "";
    return looksLikeHtml(value) ? value : plainTextToHtml(value);
  }, [value]);

  useEffect(() => {
    const editorEl = editorRef.current;
    if (!editorEl) return;
    if (isFocusedRef.current || document.activeElement === editorEl) return;
    if (editorEl.innerHTML !== normalizedValue) {
      editorEl.innerHTML = normalizedValue;
    }
    lastEmittedHtmlRef.current = normalizedValue;
  }, [normalizedValue]);

  const emitChange = useCallback(() => {
    const nextHtml = editorRef.current?.innerHTML || "";
    if (nextHtml === lastEmittedHtmlRef.current) return;
    lastEmittedHtmlRef.current = nextHtml;
    onChange(nextHtml);
  }, [onChange]);

  const captureSelectionRange = useCallback(() => {
    const editorEl = editorRef.current;
    const selection = window.getSelection();

    if (
      !editorEl ||
      !selection ||
      !isSelectionInsideEditor(selection, editorEl)
    ) {
      return;
    }

    try {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    } catch {
      // Ignore invalid range captures.
    }
  }, []);

  const restoreSelectionRange = useCallback((): boolean => {
    const editorEl = editorRef.current;
    const selection = window.getSelection();
    const savedRange = savedSelectionRef.current;

    if (!editorEl || !selection || !savedRange) {
      return false;
    }

    try {
      selection.removeAllRanges();
      selection.addRange(savedRange);
      return isSelectionInsideEditor(selection, editorEl);
    } catch {
      return false;
    }
  }, []);

  const syncToolbarState = useCallback(() => {
    const editorEl = editorRef.current;
    if (!editorEl) return;

    const nextStates = getSelectionFeatureStates(editorEl);
    selectionFeatureStatesRef.current = nextStates;

    setActiveMarks({
      bold: nextStates.bold === "all",
      italic: nextStates.italic === "all",
      underline: nextStates.underline === "all",
      strikeThrough: nextStates.strikeThrough === "all",
      blockquote: nextStates.blockquote === "all",
      primaryColor: nextStates.primaryColor === "all",
    });

    setActiveFontSize(nextStates.firstFontSize || "3");

    if (nextStates.hasRangeSelection || nextStates.hasCaretSelection) {
      captureSelectionRange();
    }
  }, [captureSelectionRange]);

  useEffect(() => {
    const handleSelectionChange = () => syncToolbarState();
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [syncToolbarState]);

  useEffect(() => {
    if (!isFontMenuOpen && !isHelpOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!fontMenuRef.current?.contains(event.target as Node)) {
        setIsFontMenuOpen(false);
      }

      if (!helpPopoverRef.current?.contains(event.target as Node)) {
        setIsHelpOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isFontMenuOpen, isHelpOpen]);

  const handleBlur = () => {
    isFocusedRef.current = false;
    setIsFontMenuOpen(false);
    setIsHelpOpen(false);
    emitChange();
    window.requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection) return;
      selection.removeAllRanges();
      syncToolbarState();
    });
  };

  const preserveSelectionOnToolbarMouseDown = (
    event: MouseEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    captureSelectionRange();
  };

  const runOnSelection = useCallback(
    (
      executor: (
        editorEl: HTMLDivElement,
        selectionStates: SelectionFeatureStates,
      ) => void,
    ) => {
      if (disabled) return;

      const editorEl = editorRef.current;
      if (!editorEl) return;

      editorEl.focus();

      if (!restoreSelectionRange()) {
        syncToolbarState();
        return;
      }

      const selectionStates = getSelectionFeatureStates(editorEl);
      selectionFeatureStatesRef.current = selectionStates;

      if (
        !selectionStates.hasRangeSelection &&
        !selectionStates.hasCaretSelection
      ) {
        syncToolbarState();
        return;
      }

      executor(editorEl, selectionStates);
      emitChange();
      syncToolbarState();
    },
    [disabled, emitChange, restoreSelectionRange, syncToolbarState],
  );

  const toggleInlineMark = useCallback(
    (command: "bold" | "italic" | "underline" | "strikeThrough") => {
      runOnSelection((editorEl, selectionStates) => {
        if (!selectionStates.hasRangeSelection) {
          document.execCommand(command, false);
          return;
        }

        const shouldEnable = selectionStates[command] !== "all";
        document.execCommand(command, false);

        const afterState = getSelectionFeatureStates(editorEl)[command];
        if (shouldEnable && afterState === "none") {
          document.execCommand(command, false);
        }
        if (!shouldEnable && afterState === "all") {
          document.execCommand(command, false);
        }
      });
    },
    [runOnSelection],
  );

  const toggleBlockquote = useCallback(() => {
    runOnSelection((_editorEl, selectionStates) => {
      const shouldEnable = selectionStates.blockquote !== "all";
      const nextTag = shouldEnable ? "blockquote" : "p";
      const didApply = document.execCommand("formatBlock", false, nextTag);

      if (!didApply) {
        document.execCommand("formatBlock", false, `<${nextTag}>`);
      }
    });
  }, [runOnSelection]);

  const togglePrimaryColor = useCallback(() => {
    runOnSelection((editorEl, selectionStates) => {
      const shouldEnable = selectionStates.primaryColor !== "all";
      document.execCommand("styleWithCSS", false, "true");

      if (shouldEnable) {
        document.execCommand("foreColor", false, PRIMARY_COLOR_HEX);
      } else {
        const defaultColor = window.getComputedStyle(editorEl).color;
        document.execCommand("foreColor", false, defaultColor);
      }
    });
  }, [runOnSelection]);

  const applyFontSize = useCallback(
    (fontSizeValue: string) => {
      runOnSelection(() => {
        document.execCommand("styleWithCSS", false, "false");
        document.execCommand("fontSize", false, fontSizeValue);
      });
      setIsFontMenuOpen(false);
    },
    [runOnSelection],
  );

  const insertSoftLineBreak = useCallback(() => {
    if (disabled) return;

    const editorEl = editorRef.current;
    if (!editorEl) return;

    editorEl.focus();

    if (!restoreSelectionRange()) {
      const selection = window.getSelection();
      if (!selection || !isSelectionInsideEditor(selection, editorEl)) {
        return;
      }
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editorEl.contains(range.commonAncestorContainer)) {
      return;
    }

    range.deleteContents();

    const breakNode = document.createElement("br");
    range.insertNode(breakNode);

    const marker = document.createElement("span");
    marker.textContent = "\u200B";

    if (breakNode.parentNode) {
      breakNode.parentNode.insertBefore(marker, breakNode.nextSibling);
    }

    const nextRange = document.createRange();
    nextRange.setStartAfter(marker);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);

    marker.remove();

    emitChange();
    syncToolbarState();
  }, [disabled, emitChange, restoreSelectionRange, syncToolbarState]);

  const getToolbarButtonClass = (isActive: boolean) =>
    [
      "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
      isActive
        ? "border-primary bg-primary text-white hover:bg-primary/90"
        : "border-card-border bg-card-bg text-foreground hover:bg-background-secondary",
    ].join(" ");

  const activeFontSizeLabel =
    FONT_SIZE_OPTIONS.find((size) => size.value === activeFontSize)?.label ||
    "عادی";

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-background/70">
      <div
        dir="rtl"
        className="flex items-start justify-between gap-2 border-b border-card-border bg-background-secondary/45 px-2 py-2"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onMouseDown={preserveSelectionOnToolbarMouseDown}
            onClick={() => toggleInlineMark("bold")}
            disabled={disabled}
            className={`${getToolbarButtonClass(activeMarks.bold)} font-bold`}
            aria-label="توپر"
            title="توپر"
          >
            B
          </button>

          <button
            type="button"
            onMouseDown={preserveSelectionOnToolbarMouseDown}
            onClick={() => toggleInlineMark("italic")}
            disabled={disabled}
            className={`${getToolbarButtonClass(activeMarks.italic)} italic`}
            aria-label="مورب"
            title="مورب"
          >
            I
          </button>

          <button
            type="button"
            onMouseDown={preserveSelectionOnToolbarMouseDown}
            onClick={() => toggleInlineMark("underline")}
            disabled={disabled}
            className={`${getToolbarButtonClass(activeMarks.underline)} underline`}
            aria-label="زیرخط"
            title="زیرخط"
          >
            U
          </button>

          <button
            type="button"
            onMouseDown={preserveSelectionOnToolbarMouseDown}
            onClick={() => toggleInlineMark("strikeThrough")}
            disabled={disabled}
            className={`${getToolbarButtonClass(activeMarks.strikeThrough)} line-through`}
            aria-label="خط خورده"
            title="خط خورده"
          >
            S
          </button>

          <button
            type="button"
            onMouseDown={preserveSelectionOnToolbarMouseDown}
            onClick={toggleBlockquote}
            disabled={disabled}
            className={`${getToolbarButtonClass(activeMarks.blockquote)} font-bold`}
            aria-label="نقل قول"
            title="نقل قول"
          >
            &ldquo;
          </button>

          <button
            type="button"
            onMouseDown={preserveSelectionOnToolbarMouseDown}
            onClick={togglePrimaryColor}
            disabled={disabled}
            className={`${getToolbarButtonClass(activeMarks.primaryColor)} font-bold text-primary`}
            aria-label="رنگ اصلی"
            title="رنگ اصلی"
          >
            A
          </button>

          <button
            type="button"
            onMouseDown={preserveSelectionOnToolbarMouseDown}
            onClick={insertSoftLineBreak}
            disabled={disabled}
            className={getToolbarButtonClass(false)}
            aria-label="خط بعدی داخل بند"
            title="خط بعدی داخل بند"
          >
            ↵
          </button>

          <div ref={fontMenuRef} className="relative">
            <button
              type="button"
              onMouseDown={preserveSelectionOnToolbarMouseDown}
              onClick={() => setIsFontMenuOpen((previous) => !previous)}
              disabled={disabled}
              className="inline-flex h-8 items-center justify-between gap-2 rounded-md border border-card-border bg-card-bg px-2 text-sm text-foreground outline-none transition-colors hover:bg-background-secondary disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="اندازه متن"
              title="اندازه متن"
            >
              <span>{activeFontSizeLabel}</span>
              <span aria-hidden="true">▾</span>
            </button>

            {isFontMenuOpen ? (
              <div className="absolute right-0 top-9 z-20 min-w-28 overflow-hidden rounded-md border border-card-border bg-card-bg shadow-lg">
                {FONT_SIZE_OPTIONS.map((size) => {
                  const isActive = size.value === activeFontSize;

                  return (
                    <button
                      key={size.value}
                      type="button"
                      onMouseDown={preserveSelectionOnToolbarMouseDown}
                      onClick={() => applyFontSize(size.value)}
                      className={`block w-full px-3 py-1.5 text-right text-sm transition-colors ${
                        isActive
                          ? "bg-primary text-white"
                          : "text-foreground hover:bg-background-secondary"
                      }`}
                    >
                      {size.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div ref={helpPopoverRef} className="relative">
          <button
            type="button"
            onMouseDown={preserveSelectionOnToolbarMouseDown}
            onClick={() => setIsHelpOpen((previous) => !previous)}
            className={getToolbarButtonClass(false)}
            aria-label="راهنما"
            title="راهنما"
          >
            ؟
          </button>

          {isHelpOpen ? (
            <div className="absolute left-0 top-9 z-20 w-64 rounded-md border border-card-border bg-card-bg p-3 text-xs text-foreground shadow-lg">
              <p className="font-semibold text-foreground">راهنمای کوتاه</p>
              <p className="mt-1 text-foreground-secondary">
                ابتدا متن را انتخاب کنید، سپس دکمه ویژگی را بزنید.
              </p>
              <p className="mt-1 text-foreground-secondary">
                Enter بند جدید می‌سازد و فاصله بیشتر دارد.
              </p>
              <p className="mt-1 text-foreground-secondary">
                دکمه ↵ خط بعدی داخل همان بند را می‌سازد.
              </p>
              <p className="mt-1 text-foreground-secondary">
                با قرار دادن نشانگر هم، اندازه و سبک متن همان نقطه اعمال می‌شود.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        dir="rtl"
        data-placeholder={placeholder}
        onFocus={() => {
          isFocusedRef.current = true;
          syncToolbarState();
        }}
        onInput={emitChange}
        onBlur={handleBlur}
        onMouseUp={syncToolbarState}
        onDoubleClick={syncToolbarState}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => {
          setIsComposing(false);
          emitChange();
          syncToolbarState();
        }}
        onKeyDown={(event) => {
          if (
            (event.ctrlKey || event.metaKey) &&
            !event.shiftKey &&
            event.key.toLowerCase() === "b"
          ) {
            event.preventDefault();
            return;
          }

          if (event.key === "Enter" && event.shiftKey) {
            event.preventDefault();
            insertSoftLineBreak();
            return;
          }

          if (event.key === "Escape") {
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
            }
            syncToolbarState();
            return;
          }

          if (isComposing) {
            return;
          }
        }}
        onKeyUp={syncToolbarState}
        className={`rich-text-editor-input ${minHeightClass} w-full bg-background px-3 py-3 text-sm leading-8 text-foreground outline-none [white-space:pre-wrap] empty:before:pointer-events-none empty:before:content-[attr(data-placeholder)] empty:before:text-foreground-secondary/80 ${
          disabled ? "cursor-not-allowed opacity-70" : ""
        }`}
      />
    </div>
  );
}
