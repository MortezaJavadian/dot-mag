"use client";

import { useState } from "react";
import {
  createMagazine,
  updateMagazine,
  deleteMagazine,
  addMagazinePage,
  deleteMagazinePage,
} from "@/app/actions/magazineActions";
import Button from "@/components/ui/Button";
import { getUploadUrl } from "@/lib/uploads";

interface MagazineEditorProps {
  magazine: any;
  onSave: () => void;
  onCancel: () => void;
}

export default function MagazineEditor({
  magazine,
  onSave,
  onCancel,
}: MagazineEditorProps) {
  const [formData, setFormData] = useState({
    title: magazine?.title || "",
    subtitle: magazine?.subtitle || "",
    description: magazine?.description || "",
    cover: getUploadUrl(magazine?.cover) || "",
    pdfUrl: getUploadUrl(magazine?.pdfUrl) || "",
    publishedAt:
      magazine?.publishedAt || new Date().toISOString().split("T")[0],
    pageCount: magazine?.pageCount || 1,
  });

  const [pages, setPages] = useState(magazine?.pages || []);
  const [newPage, setNewPage] = useState({
    type: "article",
    image: "",
    title: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(
    getUploadUrl(magazine?.cover) || null,
  );
  const [uploading, setUploading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pageImageLoading, setPageImageLoading] = useState(false);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
        credentials: "include",
      });

      const result = await response.json();

      if (result.success) {
        setFormData((prev) => ({ ...prev, cover: result.url }));
        setCoverPreview(result.url);
      } else {
        setError(result.error || "خطا در آپلود عکس");
      }
    } catch (err) {
      setError("خطا در آپلود عکس");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handlePageImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPageImageLoading(true);
    setError("");

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
        credentials: "include",
      });

      const result = await response.json();

      if (result.success) {
        setNewPage((prev) => ({ ...prev, image: result.url }));
      } else {
        setError(result.error || "خطا در آپلود عکس صفحه");
      }
    } catch (err) {
      setError("خطا در آپلود عکس صفحه");
      console.error(err);
    } finally {
      setPageImageLoading(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfUploading(true);
    setError("");

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
        credentials: "include",
      });

      const result = await response.json();

      if (result.success) {
        setFormData((prev) => ({ ...prev, pdfUrl: result.url }));
      } else {
        setError(result.error || "خطا در آپلود PDF");
      }
    } catch (err) {
      setError("خطا در آپلود PDF");
      console.error(err);
    } finally {
      setPdfUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = {
        ...formData,
        pageCount: parseInt(String(formData.pageCount)),
      };

      const result = magazine?.id
        ? await updateMagazine(magazine.id, data)
        : await createMagazine(data);

      if (result.success) {
        onSave();
      } else {
        setError(result.error || "خطا در ذخیره‌سازی مجله");
      }
    } catch (err) {
      setError("خطایی رخ داد");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addPage = async () => {
    if (!newPage.title) {
      setError("عنوان صفحه الزامی است");
      return;
    }
    if (!newPage.image) {
      setError("عکس صفحه الزامی است");
      return;
    }

    if (!magazine?.id) {
      setError("ابتدا مجله را ذخیره کنید");
      return;
    }

    const pageNumber = Math.max(0, ...pages.map((p: any) => p.number)) + 1;

    const result = await addMagazinePage(magazine.id, {
      number: pageNumber,
      ...newPage,
    });

    if (result.success) {
      setPages([...pages, result.data]);
      setNewPage({ type: "article", image: "", title: "" });
    } else {
      setError("خطا در اضافه کردن صفحه");
    }
  };

  const deletePage = async (pageId: string) => {
    if (!magazine?.id) return;

    const result = await deleteMagazinePage(pageId);
    if (result.success) {
      setPages(pages.filter((p: any) => p.id !== pageId));
    } else {
      setError("خطا در حذف صفحه");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">
        {magazine?.id ? "ویرایش مجله" : "ایجاد مجله"}
      </h2>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">عنوان</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">زیرعنوان</label>
          <input
            type="text"
            value={formData.subtitle}
            onChange={(e) =>
              setFormData({ ...formData, subtitle: e.target.value })
            }
            className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">توضیح</label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={4}
            className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              عکس جلد (اختیاری)
            </label>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleCoverUpload}
                disabled={uploading}
                className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {uploading && (
                <p className="text-sm text-blue-600">در حال آپلود...</p>
              )}
              {coverPreview && (
                <div className="mt-2">
                  <img
                    src={coverPreview}
                    alt="Cover Preview"
                    className="h-32 w-full object-cover rounded-md"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              تاریخ انتشار
            </label>
            <input
              type="date"
              value={formData.publishedAt}
              onChange={(e) =>
                setFormData({ ...formData, publishedAt: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">تعداد صفحات</label>
          <input
            type="number"
            value={formData.pageCount}
            onChange={(e) =>
              setFormData({ ...formData, pageCount: e.target.value })
            }
            min="1"
            className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            فایل PDF (اختیاری)
          </label>
          <div className="space-y-2">
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePdfUpload}
              disabled={pdfUploading}
              className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {pdfUploading && (
              <p className="text-sm text-blue-600">در حال آپلود PDF...</p>
            )}
            {formData.pdfUrl && (
              <div className="mt-2 p-2 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 rounded text-sm">
                ✓ PDF آپلود شده: {formData.pdfUrl.split("/").pop()}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading
              ? "در حال ذخیره..."
              : magazine?.id
                ? "بروزرسانی مجله"
                : "ایجاد مجله"}
          </Button>
          <Button
            type="button"
            onClick={onCancel}
            className="bg-slate-500 hover:bg-slate-600"
          >
            انصراف
          </Button>
          {magazine?.id && (
            <Button
              type="button"
              onClick={async () => {
                if (
                  confirm(
                    "آیا اطمینان دارید که می‌خواهید این مجله را حذف کنید؟",
                  )
                ) {
                  await deleteMagazine(magazine.id);
                  onSave();
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              حذف
            </Button>
          )}
        </div>
      </form>

      {magazine?.id && (
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-semibold">صفحات ({pages.length})</h3>

          {pages.length > 0 && (
            <div className="space-y-2">
              {pages.map((page: any) => (
                <div
                  key={page.id}
                  className="p-3 border rounded-md dark:border-slate-700 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">
                      صفحه {page.number}: {page.title}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      نوع: {page.type}
                    </p>
                  </div>
                  <Button
                    onClick={() => deletePage(page.id)}
                    className="text-sm bg-red-500 hover:bg-red-600"
                  >
                    حذف
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-md">
            <h4 className="font-medium">اضافه کردن صفحه جدید</h4>

            <select
              value={newPage.type}
              onChange={(e) => setNewPage({ ...newPage, type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="cover">جلد</option>
              <option value="toc">فهرست محتویات</option>
              <option value="editorial">سرمقاله</option>
              <option value="article">نوشتار</option>
            </select>

            <input
              type="text"
              placeholder="عنوان صفحه"
              value={newPage.title}
              onChange={(e) =>
                setNewPage({ ...newPage, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <div>
              <label className="block text-sm font-medium mb-1">عکس صفحه</label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePageImageUpload}
                  disabled={pageImageLoading}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {pageImageLoading && (
                  <p className="text-sm text-blue-600">در حال آپلود...</p>
                )}
                {newPage.image && (
                  <div className="mt-2 p-2 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 rounded text-sm">
                    ✓ عکس انتخاب شد
                  </div>
                )}
              </div>
            </div>

            <Button type="button" onClick={addPage}>
              اضافه کردن صفحه
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
