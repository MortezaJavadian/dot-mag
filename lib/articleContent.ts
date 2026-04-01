import sanitizeHtml from "sanitize-html";

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
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["style"],
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
    },
    allowedStyles: {
      "*": {
        "font-size": [/^\d+(px|em|rem|%)$/],
        "font-style": [/^italic$/],
        "font-weight": [/^(bold|[1-9]00)$/],
        "text-decoration": [
          /^(underline|line-through|underline line-through)$/,
        ],
      },
    },
  });
}
