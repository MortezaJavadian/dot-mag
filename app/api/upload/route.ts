import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { getAdminUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "هیچ فایلی ارسال نشده" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      console.error("Invalid file type:", file.type);
      return NextResponse.json(
        { error: "فقط تصاویر (JPG, PNG, WebP, GIF) مجاز هستند" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      console.error("File too large:", file.size);
      return NextResponse.json(
        { error: "حجم فایل نباید بیشتر از 5MB باشد" },
        { status: 400 }
      );
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

    const url = `/uploads/${filename}`;
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "خطا در آپلود فایل" },
      { status: 500 }
    );
  }
}
