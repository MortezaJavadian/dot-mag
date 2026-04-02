export function getUploadUrl(input: string | null | undefined): string | null {
  if (!input) return null;

  if (input.startsWith("/api/uploads/")) return input;

  const uploadsIndex = input.indexOf("/uploads/");
  if (uploadsIndex !== -1) {
    const filename = input.slice(uploadsIndex + "/uploads/".length);
    if (filename) return `/api/uploads/${filename}`;
  }

  return input;
}

function normalizeFileName(name: string): string {
  return name
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\\/]+/g, "-")
    .trim();
}

function fallbackFromPathname(pathname: string): string | null {
  const raw = pathname.split("/").pop();
  if (!raw) return null;

  const decoded = decodeURIComponent(raw);
  const normalized = normalizeFileName(decoded);
  return normalized || null;
}

export function getUploadOriginalFileName(
  input: string | null | undefined,
): string | null {
  const normalizedUrl = getUploadUrl(input);
  if (!normalizedUrl) return null;

  try {
    const parsed = new URL(normalizedUrl, "http://localhost");
    const fromQuery = parsed.searchParams.get("name");

    if (fromQuery) {
      const normalized = normalizeFileName(fromQuery);
      if (normalized) return normalized;
    }

    return fallbackFromPathname(parsed.pathname);
  } catch {
    return null;
  }
}
