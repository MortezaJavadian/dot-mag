"use client";

import { useState } from "react";
import {
  createArticle,
  updateArticle,
  deleteArticle,
} from "@/app/actions/articleActions";
import Button from "@/components/ui/Button";

interface ArticleEditorProps {
  article: any;
  onSave: () => void;
  onCancel: () => void;
}

export default function ArticleEditor({
  article,
  onSave,
  onCancel,
}: ArticleEditorProps) {
  const [formData, setFormData] = useState({
    title: article?.title || "",
    excerpt: article?.excerpt || "",
    content: article?.content || "",
    author: article?.author || "",
    category: article?.category || "",
    tags: article?.tags?.join(", ") || "",
    image: article?.image || "",
    readingTime: article?.readingTime || 5,
    publishedAt: article?.publishedAt || new Date().toISOString().split("T")[0],
    featured: article?.featured || false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(
    article?.image || null
  );
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setFormData((prev) => ({ ...prev, image: result.url }));
        setImagePreview(result.url);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = {
        ...formData,
        tags: formData.tags
          .split(",")
          .map((tag: string) => tag.trim())
          .filter(Boolean),
        readingTime: parseInt(String(formData.readingTime)),
      };

      const result = article?.id
        ? await updateArticle(article.id, data)
        : await createArticle(data);

      if (result.success) {
        onSave();
      } else {
        setError(result.error || "خطا در ذخیره‌سازی نوشتار");
      }
    } catch (err) {
      setError("خطایی رخ داد");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">
        {article?.id ? "ویرایش نوشتار" : "ایجاد نوشتار"}
      </h2>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-4">
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
          <label className="block text-sm font-medium mb-1">خلاصه</label>
          <textarea
            value={formData.excerpt}
            onChange={(e) =>
              setFormData({ ...formData, excerpt: e.target.value })
            }
            rows={2}
            className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">متن</label>
          <textarea
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            rows={8}
            className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">نویسنده</label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) =>
                setFormData({ ...formData, author: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">دسته‌بندی</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">انتخاب دسته‌بندی</option>
              <option value="تکنولوژی">تکنولوژی</option>
              <option value="طراحی">طراحی</option>
              <option value="مد و لباس">مد و لباس</option>
              <option value="معماری">معماری</option>
              <option value="عکاسی">عکاسی</option>
              <option value="سبک زندگی">سبک زندگی</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">عکس</label>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                disabled={uploading}
                className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {uploading && <p className="text-sm text-blue-600">در حال آپلود...</p>}
              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-32 w-full object-cover rounded-md"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              زمان مطالعه (دقیقه)
            </label>
            <input
              type="number"
              value={formData.readingTime}
              onChange={(e) =>
                setFormData({ ...formData, readingTime: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) =>
                  setFormData({ ...formData, featured: e.target.checked })
                }
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">برجسته</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            برچسب‌ها (جداشده با کاما)
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading
            ? "در حال ذخیره..."
            : article?.id
              ? "بروزرسانی نوشتار"
              : "ایجاد نوشتار"}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          className="bg-slate-500 hover:bg-slate-600"
        >
          انصراف
        </Button>
        {article?.id && (
          <Button
            type="button"
            onClick={async () => {
              if (confirm("آیا اطمینان دارید که می‌خواهید این نوشتار را حذف کنید؟")) {
                await deleteArticle(article.id);
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
  );
}
