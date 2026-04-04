import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function sanitizeDownloadFileName(
  raw: string | null,
  fallback: string,
): string {
  const normalized = (raw || "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\\/]+/g, "-")
    .replace(/[\r\n]+/g, " ")
    .trim();

  if (!normalized) {
    return fallback;
  }

  return normalized;
}

function toAsciiFallback(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]+/g, "")
      .replace(/["\\]/g, "")
      .trim() || "download"
  );
}

function encodeForHeader(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function buildContentDisposition(
  fileName: string,
  dispositionType: "inline" | "attachment",
): string {
  const asciiFallback = toAsciiFallback(fileName);
  const encoded = encodeForHeader(fileName);
  return `${dispositionType}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    const { filename } = await params;

    // Security: Only allow alphanumeric, dash, underscore, dot
    if (!/^[\w\-\.]+$/.test(filename)) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const filepath = join(process.cwd(), "public", "uploads", filename);

    if (!existsSync(filepath)) {
      console.log("File not found:", filepath);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const file = readFileSync(filepath);
    const fileSize = file.byteLength;

    // Determine content type
    const ext = filename.split(".").pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
      mp3: "audio/mpeg",
      mpeg: "audio/mpeg",
      mp4: "audio/mp4",
      m4a: "audio/mp4",
      aac: "audio/aac",
      wav: "audio/wav",
      ogg: "audio/ogg",
      webm: "audio/webm",
    };
    const contentType =
      (ext && contentTypeMap[ext]) || "application/octet-stream";
    const requestedName = request.nextUrl.searchParams.get("name");
    const forceDownload = request.nextUrl.searchParams.get("download") === "1";
    const fileNameForDownload = sanitizeDownloadFileName(
      requestedName,
      filename,
    );
    const contentDisposition = buildContentDisposition(
      fileNameForDownload,
      forceDownload ? "attachment" : "inline",
    );

    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);

      if (!match) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const start = match[1] ? Number.parseInt(match[1], 10) : 0;
      const parsedEnd = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1;
      const end = Math.min(parsedEnd, fileSize - 1);

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start < 0 ||
        start > end ||
        start >= fileSize
      ) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunk = file.subarray(start, end + 1);

      return new NextResponse(chunk, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(chunk.byteLength),
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Disposition": contentDisposition,
        },
      });
    }

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileSize),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (error) {
    console.error("Image serve error:", error);
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 },
    );
  }
}
