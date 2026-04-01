import sanitizeHtml from "sanitize-html";

const LEGACY_FONT_SIZE_MAP: Record<string, string> = {
  "1": "10px",
  "2": "13px",
  "3": "16px",
  "4": "18px",
  "5": "24px",
  "6": "32px",
  "7": "48px",
};

function mapLegacyFontSize(size?: string): string | null {
  if (!size) return null;
  return LEGACY_FONT_SIZE_MAP[size.trim()] || null;
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

export function toSafeArticleHtml(content: string): string {
  const source = looksLikeHtml(content) ? content : plainTextToHtml(content);

  return sanitizeHtml(source, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "span",
      "ul",
      "ol",
      "li",
      "blockquote",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "a",
      "font",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["style"],
      font: ["size", "style"],
      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      h4: ["style"],
      h5: ["style"],
      h6: ["style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
      font: (_tagName, attribs) => {
        const mappedSize = mapLegacyFontSize(attribs.size);
        const styleParts = [
          attribs.style?.trim(),
          mappedSize ? `font-size: ${mappedSize}` : "",
        ]
          .filter(Boolean)
          .join("; ");
        const nextAttribs: Record<string, string> = {};

        if (styleParts) {
          nextAttribs.style = styleParts;
        }

        return {
          tagName: "span",
          attribs: nextAttribs,
        };
      },
    },
    allowedStyles: {
      "*": {
        "font-size": [
          /^\d+(\.\d+)?(px|em|rem|%|pt)$/,
          /^[1-7]$/,
          /^(xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|smaller|larger)$/i,
          /^-webkit-(xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large)$/i,
        ],
        "font-style": [/^italic$/],
        "font-weight": [/^(bold|[1-9]00)$/],
        "text-decoration": [
          /^(underline|line-through|underline line-through)$/,
        ],
      },
    },
  });
}
