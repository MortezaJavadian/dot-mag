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
