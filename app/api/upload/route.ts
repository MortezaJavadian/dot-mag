import { NextRequest, NextResponse } from "next/server";
import { mkdir, rename, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getAdminUser } from "@/lib/auth";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
};

function getExtension(file: File): string {
  const extFromName = file.name.split(".").pop()?.trim().toLowerCase();
  if (extFromName && /^[a-z0-9]{1,10}$/.test(extFromName)) {
    return extFromName;
  }

  return EXT_BY_MIME[file.type] || "bin";
}

function sanitizeStorageBaseName(name: string): string {
  const withoutExt = name.replace(/\.[^./\\]+$/, "");
  const normalized = withoutExt
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "")
    .trim();

  return normalized.slice(0, 64) || "file";
}

function normalizeOriginalFileName(file: File, ext: string): string {
  const rawName = (file.name || "").trim();
  const cleaned = rawName
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\\/]+/g, "-")
    .trim();

  if (!cleaned) {
    return `file.${ext}`;
  }

  if (/\.[^./\\]+$/.test(cleaned)) {
    return cleaned;
  }

  return `${cleaned}.${ext}`;
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser();
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "هیچ فایلی ارسال نشده" },
        { status: 400 },
      );
    }

    const IMAGE_MAX_BYTES = 15 * 1024 * 1024; // 15MB to handle high-res covers
    const PDF_MAX_BYTES = 50 * 1024 * 1024;
    const AUDIO_MAX_BYTES = 120 * 1024 * 1024;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
      "audio/mpeg",
      "audio/mp3",
      "audio/mp4",
      "audio/aac",
      "audio/wav",
      "audio/ogg",
      "audio/webm",
    ];
    if (!allowedTypes.includes(file.type)) {
      console.error("Invalid file type:", file.type);
      return NextResponse.json(
        {
          success: false,
          error:
            "فقط تصاویر، PDF و فایل‌های صوتی (MP3, M4A, AAC, WAV, OGG, WEBM) مجاز هستند",
        },
        { status: 400 },
      );
    }

    if (file.type === "application/pdf") {
      if (file.size > PDF_MAX_BYTES) {
        console.error("PDF too large:", file.size);
        return NextResponse.json(
          { success: false, error: "حجم PDF نباید بیشتر از 50MB باشد" },
          { status: 400 },
        );
      }
    } else if (file.type.startsWith("audio/")) {
      if (file.size > AUDIO_MAX_BYTES) {
        console.error("Audio too large:", file.size);
        return NextResponse.json(
          { success: false, error: "حجم فایل صوتی نباید بیشتر از 120MB باشد" },
          { status: 400 },
        );
      }
    } else {
      if (file.size > IMAGE_MAX_BYTES) {
        console.error("File too large:", file.size);
        return NextResponse.json(
          { success: false, error: "حجم فایل نباید بیشتر از 15MB باشد" },
          { status: 400 },
        );
      }
    }

    const ext = getExtension(file);
    const originalFileName = normalizeOriginalFileName(file, ext);
    const storageBaseName = sanitizeStorageBaseName(originalFileName);
    const uniqueId = randomUUID().replace(/-/g, "");
    const filename = `${storageBaseName}-${uniqueId}.${ext}`;

    const cwd = process.cwd();
    const uploadsDir = join(cwd, "public", "uploads");
    console.log("Creating directory:", uploadsDir);

    await mkdir(uploadsDir, { recursive: true });

    const filepath = join(uploadsDir, filename);
    const tempPath = `${filepath}.tmp-${randomUUID().replace(/-/g, "")}`;
    console.log("Saving file to:", filepath);

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength === 0) {
      return NextResponse.json(
        { success: false, error: "فایل ارسالی خالی است" },
        { status: 400 },
      );
    }

    await writeFile(tempPath, Buffer.from(bytes));
    await rename(tempPath, filepath);

    console.log("File saved successfully:", filename);

    const encodedOriginalName = encodeURIComponent(originalFileName);
    const url = `/api/uploads/${filename}?name=${encodedOriginalName}`;
    return NextResponse.json({
      success: true,
      url,
      originalFileName,
      storedFileName: filename,
      size: bytes.byteLength,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "خطا در آپلود فایل" },
      { status: 500 },
    );
  }
}
