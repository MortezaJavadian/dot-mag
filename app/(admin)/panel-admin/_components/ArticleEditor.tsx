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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = {
        ...formData,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        readingTime: parseInt(String(formData.readingTime)),
      };

      const result = article?.id
        ? await updateArticle(article.id, data)
        : await createArticle(data);

      if (result.success) {
        onSave();
      } else {
        setError(result.error || "Failed to save article");
      }
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">
        {article?.id ? "Edit Article" : "Create Article"}
      </h2>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
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
          <label className="block text-sm font-medium mb-1">Excerpt</label>
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
          <label className="block text-sm font-medium mb-1">Content</label>
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
            <label className="block text-sm font-medium mb-1">Author</label>
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
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select category</option>
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
            <label className="block text-sm font-medium mb-1">Image URL</label>
            <input
              type="text"
              value={formData.image}
              onChange={(e) =>
                setFormData({ ...formData, image: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Reading Time (minutes)
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
              Published Date
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
              <span className="text-sm font-medium">Featured</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Tags (comma-separated)
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
            ? "Saving..."
            : article?.id
              ? "Update Article"
              : "Create Article"}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          className="bg-slate-500 hover:bg-slate-600"
        >
          Cancel
        </Button>
        {article?.id && (
          <Button
            type="button"
            onClick={async () => {
              if (confirm("Delete this article?")) {
                await deleteArticle(article.id);
                onSave();
              }
            }}
            className="bg-red-500 hover:bg-red-600"
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
