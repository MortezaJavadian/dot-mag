"use client";

import { useMemo, useState } from "react";
import {
  addMagazinePage,
  createMagazine,
  deleteMagazine,
  deleteMagazinePage,
  reorderMagazinePages,
  updateMagazine,
  updateMagazinePage,
} from "@/app/actions/magazineActions";
import Button from "@/components/ui/Button";
import { getUploadUrl } from "@/lib/uploads";

interface MagazineEditorProps {
  magazine: EditableMagazine | null;
  onSave: () => void;
  onCancel: () => void;
}

type SourcePage = {
  id: string;
  number: number;
  image: string;
};

type EditableMagazine = {
  id?: string | null;
  title?: string;
  subtitle?: string;
  description?: string;
  cover?: string | null;
  pdfUrl?: string | null;
  publishedAt?: string;
  sortDate?: string | Date;
  pageCount?: number;
  pages?: SourcePage[];
};

type ManagedPage = {
  id: string;
  number: number;
  image: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function toDateInputValue(value?: string | Date | null): string {
  if (!value) return new Date().toISOString().split("T")[0];

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().split("T")[0];
  }

  return parsed.toISOString().split("T")[0];
}

function normalizePages(pages: SourcePage[] = []): ManagedPage[] {
  return [...pages]
    .sort((a, b) => a.number - b.number)
    .map((page) => ({
      id: page.id,
      number: page.number,
      image: page.image,
    }));
}

async function uploadAsset(file: File): Promise<string> {
  const uploadFormData = new FormData();
  uploadFormData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: uploadFormData,
    credentials: "include",
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Upload failed");
  }

  return result.url;
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
    publishedAt: magazine?.publishedAt || toDateInputValue(magazine?.sortDate),
    sortDate: toDateInputValue(magazine?.sortDate),
    pageCount: Number(magazine?.pageCount || 0),
  });

  const [pages, setPages] = useState<ManagedPage[]>(
    normalizePages(magazine?.pages),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pageUploading, setPageUploading] = useState(false);
  const [activePageActionId, setActivePageActionId] = useState<string | null>(
    null,
  );

  const isExistingMagazine = Boolean(magazine?.id);
  const magazineId = typeof magazine?.id === "string" ? magazine.id : null;
  const sortedPages = useMemo(
    () => [...pages].sort((a, b) => a.number - b.number),
    [pages],
  );

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverUploading(true);
    setError("");
    try {
      const uploadedUrl = await uploadAsset(file);
      setFormData((prev) => ({ ...prev, cover: uploadedUrl }));
    } catch (uploadError: unknown) {
      setError(getErrorMessage(uploadError, "خطا در آپلود عکس جلد"));
    } finally {
      setCoverUploading(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfUploading(true);
    setError("");
    try {
      const uploadedUrl = await uploadAsset(file);
      setFormData((prev) => ({ ...prev, pdfUrl: uploadedUrl }));
    } catch (uploadError: unknown) {
      setError(getErrorMessage(uploadError, "خطا در آپلود PDF"));
    } finally {
      setPdfUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...formData,
        pageCount: sortedPages.length,
      };

      const result = isExistingMagazine
        ? magazineId
          ? await updateMagazine(magazineId, payload)
          : { success: false, error: "شناسه مجله نامعتبر است" }
        : await createMagazine(payload);

      if (!result.success) {
        setError(result.error || "خطا در ذخیره مجله");
        setLoading(false);
        return;
      }

      onSave();
    } catch (saveError) {
      console.error(saveError);
      setError("خطا در ذخیره مجله");
    } finally {
      setLoading(false);
    }
  };

  const syncOrder = async (nextPages: ManagedPage[]) => {
    if (!isExistingMagazine || !magazineId) return;

    const order = nextPages
      .sort((a, b) => a.number - b.number)
      .map((page) => page.id);

    const reorderResult = await reorderMagazinePages(magazineId, order);
    if (!reorderResult.success) {
      throw new Error(reorderResult.error || "خطا در مرتب‌سازی صفحات");
    }

    setPages(normalizePages(reorderResult.data || []));
  };

  const handleAddPage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isExistingMagazine || !magazineId) {
      setError("ابتدا مجله را ذخیره کنید");
      return;
    }

    setPageUploading(true);
    setError("");
    try {
      const uploadedUrl = await uploadAsset(file);
      const nextNumber = sortedPages.length + 1;
      const addResult = await addMagazinePage(magazineId, {
        number: nextNumber,
        image: uploadedUrl,
      });

      if (!addResult.success || !addResult.data) {
        throw new Error(addResult.error || "خطا در افزودن صفحه");
      }

      setPages((prev) => normalizePages([...prev, addResult.data]));
    } catch (addError: unknown) {
      setError(getErrorMessage(addError, "خطا در افزودن صفحه"));
    } finally {
      setPageUploading(false);
      e.target.value = "";
    }
  };

  const handleReplaceImage = async (
    pageId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActivePageActionId(pageId);
    setError("");
    try {
      const uploadedUrl = await uploadAsset(file);
      const updateResult = await updateMagazinePage(pageId, {
        image: uploadedUrl,
      });

      if (!updateResult.success) {
        throw new Error(updateResult.error || "خطا در ویرایش صفحه");
      }

      setPages((prev) =>
        normalizePages(
          prev.map((page) =>
            page.id === pageId ? { ...page, image: uploadedUrl } : page,
          ),
        ),
      );
    } catch (replaceError: unknown) {
      setError(getErrorMessage(replaceError, "خطا در جایگزینی تصویر"));
    } finally {
      setActivePageActionId(null);
      e.target.value = "";
    }
  };

  const handleDeletePage = async (pageId: string) => {
    setActivePageActionId(pageId);
    setError("");
    try {
      const deleteResult = await deleteMagazinePage(pageId);
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || "خطا در حذف صفحه");
      }

      const compacted = pages
        .filter((page) => page.id !== pageId)
        .sort((a, b) => a.number - b.number)
        .map((page, index) => ({ ...page, number: index + 1 }));

      setPages(compacted);
      await syncOrder(compacted);
    } catch (deleteError: unknown) {
      setError(getErrorMessage(deleteError, "خطا در حذف صفحه"));
    } finally {
      setActivePageActionId(null);
    }
  };

  const movePage = async (pageId: string, direction: "up" | "down") => {
    const currentIndex = sortedPages.findIndex((page) => page.id === pageId);
    if (currentIndex === -1) return;

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedPages.length) return;

    const reordered = [...sortedPages];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const normalizedOrder = reordered.map((page, index) => ({
      ...page,
      number: index + 1,
    }));

    setPages(normalizedOrder);
    setActivePageActionId(pageId);
    setError("");
    try {
      await syncOrder(normalizedOrder);
    } catch (orderError: unknown) {
      setError(getErrorMessage(orderError, "خطا در جابجایی صفحه"));
      setPages(sortedPages);
    } finally {
      setActivePageActionId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl text-slate-900 dark:text-slate-100">
      <h2 className="text-2xl font-bold">
        {isExistingMagazine ? "ویرایش مجله" : "ایجاد مجله"}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              عکس جلد (اختیاری)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleCoverUpload}
              disabled={coverUploading}
              className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
            {coverUploading && (
              <p className="text-sm text-blue-600 mt-2">در حال آپلود...</p>
            )}
            {formData.cover && (
              <img
                src={getUploadUrl(formData.cover) || ""}
                alt="Cover Preview"
                className="mt-2 h-32 w-full object-cover rounded-md"
              />
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                تاریخ نمایشی
              </label>
              <input
                type="text"
                value={formData.publishedAt}
                placeholder="Any date text"
                onChange={(e) =>
                  setFormData({ ...formData, publishedAt: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                تاریخ مرتب‌سازی
              </label>
              <input
                type="date"
                value={formData.sortDate}
                onChange={(e) =>
                  setFormData({ ...formData, sortDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                فایل PDF (اختیاری)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                disabled={pdfUploading}
                className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              />
              {pdfUploading && (
                <p className="text-sm text-blue-600 mt-2">
                  در حال آپلود PDF...
                </p>
              )}
              {formData.pdfUrl && (
                <p className="text-xs text-green-700 dark:text-green-400 mt-2 break-all">
                  {getUploadUrl(formData.pdfUrl)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading
              ? "در حال ذخیره..."
              : isExistingMagazine
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
          {isExistingMagazine && (
            <Button
              type="button"
              onClick={async () => {
                if (confirm("آیا از حذف کامل این مجله مطمئن هستید؟")) {
                  if (!magazineId) {
                    setError("شناسه مجله نامعتبر است");
                    return;
                  }

                  await deleteMagazine(magazineId);
                  onSave();
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              حذف مجله
            </Button>
          )}
        </div>
      </form>

      {isExistingMagazine && (
        <div className="space-y-4 pt-6 border-t">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold">
              صفحات ({sortedPages.length})
            </h3>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-white text-sm cursor-pointer hover:opacity-90 transition-opacity">
              افزودن صفحه جدید
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAddPage}
                disabled={pageUploading}
                className="hidden"
              />
            </label>
          </div>

          {pageUploading && (
            <p className="text-sm text-blue-600">در حال آپلود صفحه جدید...</p>
          )}

          {sortedPages.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              هنوز صفحه‌ای ثبت نشده است.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedPages.map((page, index) => {
                const imageSrc = getUploadUrl(page.image) || "";
                const pageBusy = activePageActionId === page.id;

                return (
                  <div
                    key={page.id}
                    className="p-3 border rounded-lg dark:border-slate-700 flex flex-col md:flex-row gap-3 md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={imageSrc}
                        alt={`Page ${page.number}`}
                        className="w-20 h-28 object-cover rounded border border-slate-200 dark:border-slate-700"
                      />
                      <div>
                        <p className="font-medium">صفحه {page.number}</p>
                        <p className="text-xs text-slate-500 truncate max-w-80">
                          {imageSrc}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => movePage(page.id, "up")}
                        disabled={index === 0 || pageBusy}
                        className="text-xs"
                      >
                        بالا
                      </Button>
                      <Button
                        type="button"
                        onClick={() => movePage(page.id, "down")}
                        disabled={index === sortedPages.length - 1 || pageBusy}
                        className="text-xs"
                      >
                        پایین
                      </Button>

                      <label className="inline-flex items-center px-3 py-2 rounded-md bg-slate-700 text-white text-xs cursor-pointer hover:bg-slate-800 transition-colors">
                        تعویض عکس
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(e) => handleReplaceImage(page.id, e)}
                          disabled={pageBusy}
                          className="hidden"
                        />
                      </label>

                      <Button
                        type="button"
                        onClick={() => handleDeletePage(page.id)}
                        disabled={pageBusy}
                        className="text-xs bg-red-500 hover:bg-red-600"
                      >
                        حذف
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
