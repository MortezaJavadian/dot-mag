import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef } from "react";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $getRoot, $insertNodes } from "lexical";

interface HtmlPluginProps {
  initialHtml: string;
  onChange: (html: string) => void;
}

export function HtmlPlugin({ initialHtml, onChange }: HtmlPluginProps) {
  const [editor] = useLexicalComposerContext();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(initialHtml || "", "text/html");
      const nodes = $generateNodesFromDOM(editor, dom);
      const root = $getRoot();
      root.clear();
      root.select();
      $insertNodes(nodes);
    });
  }, [editor, initialHtml]);

  useEffect(() => {
    return editor.registerUpdateListener(
      ({ editorState, dirtyElements, dirtyLeaves }) => {
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
        
        editorState.read(() => {
          const html = $generateHtmlFromNodes(editor, null);
          onChange(html);
        });
      }
    );
  }, [editor, onChange]);

  return null;
}
