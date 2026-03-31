import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { getAdminUser } from "@/lib/auth";

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

    const timestamp = Date.now();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;

    const cwd = process.cwd();
    const uploadsDir = join(cwd, "public", "uploads");
    console.log("Creating directory:", uploadsDir);

    mkdirSync(uploadsDir, { recursive: true });

    const filepath = join(uploadsDir, filename);
    console.log("Saving file to:", filepath);

    const bytes = await file.arrayBuffer();
    writeFileSync(filepath, Buffer.from(bytes));

    console.log("File saved successfully:", filename);

    const url = `/api/uploads/${filename}`;
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "خطا در آپلود فایل" },
      { status: 500 },
    );
  }
}
