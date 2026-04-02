"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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
import UploadStatus from "@/components/ui/UploadStatus";
import {
  createIdleUploadTaskState,
  uploadAssetWithProgress,
  type UploadTaskState,
} from "@/lib/clientUpload";
import { getUploadUrl } from "@/lib/uploads";
import RichTextEditor from "./RichTextEditor";

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

const DRAFT_PAGE_ID_PREFIX = "draft-page-";
const UPLOAD_RETRIES = 4;

const IDLE_UPLOAD_STATUS: UploadTaskState = {
  phase: "idle",
  progress: 0,
  error: "",
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
  return normalizeManagedPages(
    [...pages].map((page) => ({
      id: page.id,
      number: page.number,
      image: page.image,
    })),
  );
}

function normalizeManagedPages(pages: ManagedPage[] = []): ManagedPage[] {
  return [...pages]
    .sort((a, b) => a.number - b.number)
    .map((page, index) => ({
      ...page,
      number: index + 1,
    }));
}

function createDraftPageId(): string {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${DRAFT_PAGE_ID_PREFIX}${randomPart}`;
}

function isDraftPageId(pageId: string): boolean {
  return pageId.startsWith(DRAFT_PAGE_ID_PREFIX);
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
  const [coverUploadStatus, setCoverUploadStatus] = useState(
    createIdleUploadTaskState,
  );
  const [pdfUploadStatus, setPdfUploadStatus] = useState(
    createIdleUploadTaskState,
  );
  const [pageUploadStatus, setPageUploadStatus] = useState(
    createIdleUploadTaskState,
  );
  const [pageReplaceUploadStatuses, setPageReplaceUploadStatuses] = useState<
    Record<string, UploadTaskState>
  >({});
  const [activePageActionId, setActivePageActionId] = useState<string | null>(
    null,
  );

  const isExistingMagazine = Boolean(magazine?.id);
  const magazineId = typeof magazine?.id === "string" ? magazine.id : null;
  const sortedPages = useMemo(
    () => [...pages].sort((a, b) => a.number - b.number),
    [pages],
  );

  const setPageReplaceUploadStatus = (
    pageId: string,
    status: UploadTaskState,
  ) => {
    setPageReplaceUploadStatuses((prev) => ({
      ...prev,
      [pageId]: status,
    }));
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverUploadStatus({ phase: "uploading", progress: 0, error: "" });
    setError("");
    try {
      const result = await uploadAssetWithProgress(file, {
        retries: UPLOAD_RETRIES,
        onProgress: (percent) =>
          setCoverUploadStatus({
            phase: "uploading",
            progress: percent,
            error: "",
          }),
      });

      const uploadedUrl = result.url;
      setFormData((prev) => ({ ...prev, cover: uploadedUrl }));
      setCoverUploadStatus({ phase: "success", progress: 100, error: "" });
    } catch (uploadError: unknown) {
      const message = getErrorMessage(uploadError, "خطا در آپلود عکس جلد");
      setError(message);
      setCoverUploadStatus({ phase: "error", progress: 0, error: message });
    } finally {
      e.target.value = "";
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfUploadStatus({ phase: "uploading", progress: 0, error: "" });
    setError("");
    try {
      const result = await uploadAssetWithProgress(file, {
        retries: UPLOAD_RETRIES,
        onProgress: (percent) =>
          setPdfUploadStatus({
            phase: "uploading",
            progress: percent,
            error: "",
          }),
      });

      const uploadedUrl = result.url;
      setFormData((prev) => ({ ...prev, pdfUrl: uploadedUrl }));
      setPdfUploadStatus({ phase: "success", progress: 100, error: "" });
    } catch (uploadError: unknown) {
      const message = getErrorMessage(uploadError, "خطا در آپلود PDF");
      setError(message);
      setPdfUploadStatus({ phase: "error", progress: 0, error: message });
    } finally {
      e.target.value = "";
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
        : await createMagazine({
            ...payload,
            pages: sortedPages.map((page) => ({
              number: page.number,
              image: page.image,
            })),
          });

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

    setPageUploadStatus({ phase: "uploading", progress: 0, error: "" });
    setError("");
    try {
      const result = await uploadAssetWithProgress(file, {
        retries: UPLOAD_RETRIES,
        onProgress: (percent) =>
          setPageUploadStatus({
            phase: "uploading",
            progress: percent,
            error: "",
          }),
      });

      const uploadedUrl = result.url;

      if (isExistingMagazine && magazineId) {
        const nextNumber = sortedPages.length + 1;
        const addResult = await addMagazinePage(magazineId, {
          number: nextNumber,
          image: uploadedUrl,
        });

        if (!addResult.success || !addResult.data) {
          throw new Error(addResult.error || "خطا در افزودن صفحه");
        }

        setPages((prev) =>
          normalizeManagedPages([
            ...prev,
            {
              id: addResult.data.id,
              number: addResult.data.number,
              image: addResult.data.image,
            },
          ]),
        );
      } else {
        const nextNumber = sortedPages.length + 1;
        setPages((prev) =>
          normalizeManagedPages([
            ...prev,
            {
              id: createDraftPageId(),
              number: nextNumber,
              image: uploadedUrl,
            },
          ]),
        );
      }

      setPageUploadStatus({ phase: "success", progress: 100, error: "" });
    } catch (addError: unknown) {
      const message = getErrorMessage(addError, "خطا در افزودن صفحه");
      setError(message);
      setPageUploadStatus({ phase: "error", progress: 0, error: message });
    } finally {
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
    setPageReplaceUploadStatus(pageId, {
      phase: "uploading",
      progress: 0,
      error: "",
    });
    setError("");
    try {
      const result = await uploadAssetWithProgress(file, {
        retries: UPLOAD_RETRIES,
        onProgress: (percent) =>
          setPageReplaceUploadStatus(pageId, {
            phase: "uploading",
            progress: percent,
            error: "",
          }),
      });

      const uploadedUrl = result.url;

      if (!isExistingMagazine || !magazineId || isDraftPageId(pageId)) {
        setPages((prev) =>
          normalizeManagedPages(
            prev.map((page) =>
              page.id === pageId ? { ...page, image: uploadedUrl } : page,
            ),
          ),
        );
      } else {
        const updateResult = await updateMagazinePage(pageId, {
          image: uploadedUrl,
        });

        if (!updateResult.success) {
          throw new Error(updateResult.error || "خطا در ویرایش صفحه");
        }

        setPages((prev) =>
          normalizeManagedPages(
            prev.map((page) =>
              page.id === pageId ? { ...page, image: uploadedUrl } : page,
            ),
          ),
        );
      }

      setPageReplaceUploadStatus(pageId, {
        phase: "success",
        progress: 100,
        error: "",
      });
    } catch (replaceError: unknown) {
      const message = getErrorMessage(replaceError, "خطا در جایگزینی تصویر");
      setError(message);
      setPageReplaceUploadStatus(pageId, {
        phase: "error",
        progress: 0,
        error: message,
      });
    } finally {
      setActivePageActionId(null);
      e.target.value = "";
    }
  };

  const handleDeletePage = async (pageId: string) => {
    setActivePageActionId(pageId);
    setError("");
    try {
      const compacted = pages
        .filter((page) => page.id !== pageId)
        .sort((a, b) => a.number - b.number)
        .map((page, index) => ({ ...page, number: index + 1 }));

      if (!isExistingMagazine || !magazineId || isDraftPageId(pageId)) {
        setPages(compacted);
        return;
      }

      const deleteResult = await deleteMagazinePage(pageId);
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || "خطا در حذف صفحه");
      }

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

    if (!isExistingMagazine || !magazineId) {
      setPages(normalizedOrder);
      return;
    }

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
          <RichTextEditor
            value={formData.description}
            onChange={(value) =>
              setFormData({ ...formData, description: value })
            }
            disabled={loading}
            placeholder="توضیح مجله را بنویسید..."
            minHeightClass="min-h-[180px]"
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
              disabled={coverUploadStatus.phase === "uploading"}
              className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
            <UploadStatus
              status={coverUploadStatus}
              uploadingLabel="در حال آپلود عکس جلد..."
              successLabel="عکس جلد با موفقیت آپلود شد"
              errorLabel="آپلود عکس جلد انجام نشد"
            />
            {formData.cover && getUploadUrl(formData.cover) && (
              <div className="relative mt-2 h-32 w-full overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                <Image
                  src={getUploadUrl(formData.cover) || formData.cover}
                  alt="Cover Preview"
                  fill
                  sizes="(min-width: 768px) 18rem, 100vw"
                  quality={55}
                  className="object-cover"
                />
              </div>
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
                disabled={pdfUploadStatus.phase === "uploading"}
                className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              />
              <UploadStatus
                status={pdfUploadStatus}
                uploadingLabel="در حال آپلود PDF..."
                successLabel="PDF با موفقیت آپلود شد"
                errorLabel="آپلود PDF انجام نشد"
              />
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
              disabled={pageUploadStatus.phase === "uploading"}
              className="hidden"
            />
          </label>
        </div>

        <UploadStatus
          status={pageUploadStatus}
          uploadingLabel="در حال آپلود صفحه جدید..."
          successLabel="صفحه جدید با موفقیت آپلود شد"
          errorLabel="آپلود صفحه جدید انجام نشد"
        />

        {sortedPages.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            هنوز صفحه‌ای ثبت نشده است.
          </p>
        ) : (
          <div className="space-y-3">
            {sortedPages.map((page, index) => {
              const imageSrc = getUploadUrl(page.image) || "";
              const pageReplaceStatus =
                pageReplaceUploadStatuses[page.id] || IDLE_UPLOAD_STATUS;
              const pageBusy = activePageActionId === page.id;

              return (
                <div
                  key={page.id}
                  className="p-3 border rounded-lg dark:border-slate-700 flex flex-col md:flex-row gap-3 md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-20 h-28 shrink-0 overflow-hidden rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={`Page ${page.number}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                    </div>
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

                    <UploadStatus
                      status={pageReplaceStatus}
                      uploadingLabel="در حال آپلود تصویر صفحه..."
                      successLabel="تصویر صفحه با موفقیت آپلود شد"
                      errorLabel="آپلود تصویر صفحه انجام نشد"
                    />

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
    </div>
  );
}
