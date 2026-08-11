import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useCallback, useEffect, useState } from "react";
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
} from "lexical";
import { $isLinkNode } from "@lexical/link";
import { $isHeadingNode } from "@lexical/rich-text";
import { $isListNode, ListNode } from "@lexical/list";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import { $patchStyleText } from "@lexical/selection";
import { $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $createParagraphNode } from "lexical";

const FONT_SIZE_OPTIONS = [
  { label: "کوچک", value: "13px" },
  { label: "عادی", value: "16px" },
  { label: "متوسط", value: "20px" },
  { label: "بزرگ", value: "24px" },
  { label: "خیلی بزرگ", value: "48px" },
];

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [blockType, setBlockType] = useState("paragraph");
  const [fontSize, setFontSize] = useState("16px");

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));

      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === "root"
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType(anchorNode, ListNode);
          const type = parentList ? parentList.getTag() : element.getTag();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          setBlockType(type);
        }
      }
    }
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      )
    );
  }, [editor, updateToolbar]);

  const applyFontSize = useCallback(
    (size: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, {
            "font-size": size,
          });
        }
      });
    },
    [editor]
  );

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (blockType !== "quote") {
          $setBlocksType(selection, () => $createQuoteNode());
        } else {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      }
    });
  };

  const getToolbarButtonClass = (isActive: boolean) =>
    [
      "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm transition-colors",
      isActive
        ? "border-primary bg-primary text-white hover:bg-primary/90"
        : "border-card-border bg-card-bg text-foreground hover:bg-background-secondary",
    ].join(" ");

  return (
    <div
      dir="rtl"
      className="flex flex-wrap items-center gap-1.5 border-b border-card-border bg-background-secondary/45 px-2 py-2"
    >
      <button
        type="button"
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
        }}
        className={getToolbarButtonClass(isBold) + " font-bold"}
        title="توپر"
        aria-label="توپر"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
        }}
        className={getToolbarButtonClass(isItalic) + " italic"}
        title="مورب"
        aria-label="مورب"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
        }}
        className={getToolbarButtonClass(isUnderline) + " underline"}
        title="زیرخط"
        aria-label="زیرخط"
      >
        U
      </button>
      <button
        type="button"
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
        }}
        className={getToolbarButtonClass(isStrikethrough) + " line-through"}
        title="خط خورده"
        aria-label="خط خورده"
      >
        S
      </button>

      <div className="mx-1 h-5 w-px bg-card-border" />

      <button
        type="button"
        onClick={formatQuote}
        className={getToolbarButtonClass(blockType === "quote") + " font-bold"}
        title="نقل قول"
        aria-label="نقل قول"
      >
        &ldquo;
      </button>

      <div className="mx-1 h-5 w-px bg-card-border" />

      <button
        type="button"
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left");
        }}
        className={getToolbarButtonClass(false)}
        title="چپ‌چین"
        aria-label="چپ‌چین"
      >
        Left
      </button>
      <button
        type="button"
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center");
        }}
        className={getToolbarButtonClass(false)}
        title="وسط‌چین"
        aria-label="وسط‌چین"
      >
        Center
      </button>
      <button
        type="button"
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right");
        }}
        className={getToolbarButtonClass(false)}
        title="راست‌چین"
        aria-label="راست‌چین"
      >
        Right
      </button>

      <div className="mx-1 h-5 w-px bg-card-border" />

      <select
        value={fontSize}
        onChange={(e) => {
          setFontSize(e.target.value);
          applyFontSize(e.target.value);
        }}
        className="h-8 rounded-md border border-card-border bg-card-bg px-2 text-sm text-foreground focus:border-primary focus:outline-none"
      >
        {FONT_SIZE_OPTIONS.map((size) => (
          <option key={size.value} value={size.value}>
            {size.label}
          </option>
        ))}
      </select>
    </div>
  );
}
