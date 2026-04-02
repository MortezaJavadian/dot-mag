import { NextRequest, NextResponse } from "next/server";
import {
  appendFile,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "fs/promises";
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

const IMAGE_MAX_BYTES = 15 * 1024 * 1024; // 15MB to handle high-res covers
const PDF_MAX_BYTES = 50 * 1024 * 1024;
const AUDIO_MAX_BYTES = 120 * 1024 * 1024;

const ALLOWED_TYPES = [
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

function getExtension(fileName: string, mimeType?: string): string {
  const extFromName = fileName.split(".").pop()?.trim().toLowerCase();
  if (extFromName && /^[a-z0-9]{1,10}$/.test(extFromName)) {
    return extFromName;
  }

  return EXT_BY_MIME[mimeType || ""] || "bin";
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

function normalizeOriginalFileName(rawName: string, ext: string): string {
  const cleaned = (rawName || "")
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

function getMaxBytesForType(type: string): number {
  if (type === "application/pdf") {
    return PDF_MAX_BYTES;
  }

  if (type.startsWith("audio/")) {
    return AUDIO_MAX_BYTES;
  }

  return IMAGE_MAX_BYTES;
}

function getFileSizeError(type: string): string {
  if (type === "application/pdf") {
    return "حجم PDF نباید بیشتر از 50MB باشد";
  }

  if (type.startsWith("audio/")) {
    return "حجم فایل صوتی نباید بیشتر از 120MB باشد";
  }

  return "حجم فایل نباید بیشتر از 15MB باشد";
}

function assertAllowedTypeAndSize(type: string, size: number): string | null {
  if (!ALLOWED_TYPES.includes(type)) {
    return "فقط تصاویر، PDF و فایل‌های صوتی (MP3, M4A, AAC, WAV, OGG, WEBM) مجاز هستند";
  }

  const maxBytes = getMaxBytesForType(type);
  if (size > maxBytes) {
    return getFileSizeError(type);
  }

  return null;
}

function toStringValue(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" ? value : null;
}

async function persistUploadedFile(
  originalFileName: string,
  ext: string,
  bytes: Buffer,
): Promise<{ url: string; storedFileName: string; size: number }> {
  const storageBaseName = sanitizeStorageBaseName(originalFileName);
  const uniqueId = randomUUID().replace(/-/g, "");
  const filename = `${storageBaseName}-${uniqueId}.${ext}`;

  const cwd = process.cwd();
  const uploadsDir = join(cwd, "public", "uploads");

  await mkdir(uploadsDir, { recursive: true });

  const filepath = join(uploadsDir, filename);
  const tempPath = `${filepath}.tmp-${randomUUID().replace(/-/g, "")}`;

  await writeFile(tempPath, bytes);
  await rename(tempPath, filepath);

  const encodedOriginalName = encodeURIComponent(originalFileName);
  const url = `/api/uploads/${filename}?name=${encodedOriginalName}`;

  return {
    url,
    storedFileName: filename,
    size: bytes.byteLength,
  };
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
    const fileEntry = formData.get("file");
    const file = fileEntry instanceof File ? fileEntry : null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "هیچ فایلی ارسال نشده" },
        { status: 400 },
      );
    }

    const chunkIndexRaw = toStringValue(formData.get("chunkIndex"));
    const totalChunksRaw = toStringValue(formData.get("totalChunks"));
    const uploadIdRaw = toStringValue(formData.get("uploadId"));
    const totalSizeRaw = toStringValue(formData.get("totalSize"));
    const originalFileNameRaw = toStringValue(formData.get("originalFileName"));
    const fileTypeRaw = toStringValue(formData.get("fileType"));

    const hasChunkMetadata = [
      chunkIndexRaw,
      totalChunksRaw,
      uploadIdRaw,
      totalSizeRaw,
      originalFileNameRaw,
      fileTypeRaw,
    ].some((value) => typeof value === "string");

    if (hasChunkMetadata) {
      if (
        !chunkIndexRaw ||
        !totalChunksRaw ||
        !uploadIdRaw ||
        !totalSizeRaw ||
        !originalFileNameRaw ||
        !fileTypeRaw
      ) {
        return NextResponse.json(
          { success: false, error: "Chunk upload metadata is incomplete" },
          { status: 400 },
        );
      }

      const chunkIndex = Number.parseInt(chunkIndexRaw, 10);
      const totalChunks = Number.parseInt(totalChunksRaw, 10);
      const totalSize = Number.parseInt(totalSizeRaw, 10);
      const declaredType = fileTypeRaw.trim().toLowerCase();
      const safeUploadId = uploadIdRaw.trim();

      if (
        Number.isNaN(chunkIndex) ||
        Number.isNaN(totalChunks) ||
        Number.isNaN(totalSize) ||
        chunkIndex < 0 ||
        totalChunks <= 0 ||
        chunkIndex >= totalChunks ||
        totalSize <= 0
      ) {
        return NextResponse.json(
          { success: false, error: "Chunk upload metadata is invalid" },
          { status: 400 },
        );
      }

      if (!/^[a-zA-Z0-9_-]{8,120}$/.test(safeUploadId)) {
        return NextResponse.json(
          { success: false, error: "Chunk upload id is invalid" },
          { status: 400 },
        );
      }

      const typeError = assertAllowedTypeAndSize(declaredType, totalSize);
      if (typeError) {
        return NextResponse.json(
          { success: false, error: typeError },
          { status: 400 },
        );
      }

      if (file.size <= 0) {
        return NextResponse.json(
          { success: false, error: "فایل ارسالی خالی است" },
          { status: 400 },
        );
      }

      if (file.size > totalSize) {
        return NextResponse.json(
          { success: false, error: "Chunk size is invalid" },
          { status: 400 },
        );
      }

      const ext = getExtension(originalFileNameRaw, declaredType);
      const originalFileName = normalizeOriginalFileName(
        originalFileNameRaw,
        ext,
      );

      const cwd = process.cwd();
      const chunkRootDir = join(cwd, "tmp", "upload-chunks");
      const chunkUploadDir = join(chunkRootDir, safeUploadId);
      await mkdir(chunkUploadDir, { recursive: true });

      const chunkPath = join(
        chunkUploadDir,
        `${chunkIndex.toString().padStart(6, "0")}.part`,
      );

      const chunkBuffer = Buffer.from(await file.arrayBuffer());
      await writeFile(chunkPath, chunkBuffer);

      if (chunkIndex < totalChunks - 1) {
        return NextResponse.json({
          success: true,
          uploadId: safeUploadId,
          chunkIndex,
          totalChunks,
        });
      }

      const extForSave = getExtension(originalFileName, declaredType);
      const storageBaseName = sanitizeStorageBaseName(originalFileName);
      const uniqueId = randomUUID().replace(/-/g, "");
      const storedFileName = `${storageBaseName}-${uniqueId}.${extForSave}`;

      const uploadsDir = join(cwd, "public", "uploads");
      await mkdir(uploadsDir, { recursive: true });

      const finalPath = join(uploadsDir, storedFileName);
      const tempPath = `${finalPath}.tmp-${randomUUID().replace(/-/g, "")}`;

      let assembledSize = 0;

      try {
        for (let index = 0; index < totalChunks; index += 1) {
          const partPath = join(
            chunkUploadDir,
            `${index.toString().padStart(6, "0")}.part`,
          );
          const part = await readFile(partPath);
          if (part.byteLength === 0) {
            throw new Error("Chunk file is empty");
          }

          assembledSize += part.byteLength;
          await appendFile(tempPath, part);
        }

        if (assembledSize !== totalSize) {
          throw new Error("Assembled file size mismatch");
        }

        await rename(tempPath, finalPath);
      } catch (chunkFinalizeError) {
        await rm(tempPath, { force: true });
        throw chunkFinalizeError;
      }

      await rm(chunkUploadDir, { recursive: true, force: true });

      const encodedOriginalName = encodeURIComponent(originalFileName);
      const url = `/api/uploads/${storedFileName}?name=${encodedOriginalName}`;

      return NextResponse.json({
        success: true,
        url,
        originalFileName,
        storedFileName,
        size: assembledSize,
      });
    }

    const typeError = assertAllowedTypeAndSize(file.type, file.size);
    if (typeError) {
      return NextResponse.json(
        { success: false, error: typeError },
        { status: 400 },
      );
    }

    const ext = getExtension(file.name, file.type);
    const originalFileName = normalizeOriginalFileName(file.name, ext);

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength === 0) {
      return NextResponse.json(
        { success: false, error: "فایل ارسالی خالی است" },
        { status: 400 },
      );
    }

    const saveResult = await persistUploadedFile(
      originalFileName,
      ext,
      Buffer.from(bytes),
    );

    return NextResponse.json({
      success: true,
      url: saveResult.url,
      originalFileName,
      storedFileName: saveResult.storedFileName,
      size: saveResult.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "خطا در آپلود فایل" },
      { status: 500 },
    );
  }
}
