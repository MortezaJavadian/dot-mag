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
    cover: magazine?.cover || "",
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
        setError(result.error || "Failed to save magazine");
      }
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addPage = async () => {
    if (!newPage.title || !newPage.image) {
      setError("Page title and image are required");
      return;
    }

    if (!magazine?.id) {
      setError("Save magazine first before adding pages");
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
      setError("Failed to add page");
    }
  };

  const deletePage = async (pageId: string) => {
    if (!magazine?.id) return;

    const result = await deleteMagazinePage(pageId);
    if (result.success) {
      setPages(pages.filter((p: any) => p.id !== pageId));
    } else {
      setError("Failed to delete page");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">
        {magazine?.id ? "Edit Magazine" : "Create Magazine"}
      </h2>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
          <label className="block text-sm font-medium mb-1">Subtitle</label>
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
          <label className="block text-sm font-medium mb-1">Description</label>
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
            <label className="block text-sm font-medium mb-1">Cover URL</label>
            <input
              type="text"
              value={formData.cover}
              onChange={(e) =>
                setFormData({ ...formData, cover: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

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
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Page Count</label>
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

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading
              ? "Saving..."
              : magazine?.id
                ? "Update Magazine"
                : "Create Magazine"}
          </Button>
          <Button
            type="button"
            onClick={onCancel}
            className="bg-slate-500 hover:bg-slate-600"
          >
            Cancel
          </Button>
          {magazine?.id && (
            <Button
              type="button"
              onClick={async () => {
                if (confirm("Delete this magazine?")) {
                  await deleteMagazine(magazine.id);
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

      {magazine?.id && (
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-semibold">Pages ({pages.length})</h3>

          {pages.length > 0 && (
            <div className="space-y-2">
              {pages.map((page: any) => (
                <div
                  key={page.id}
                  className="p-3 border rounded-md dark:border-slate-700 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">
                      Page {page.number}: {page.title}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Type: {page.type}
                    </p>
                  </div>
                  <Button
                    onClick={() => deletePage(page.id)}
                    className="text-sm bg-red-500 hover:bg-red-600"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-md">
            <h4 className="font-medium">Add New Page</h4>

            <select
              value={newPage.type}
              onChange={(e) => setNewPage({ ...newPage, type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="cover">Cover</option>
              <option value="toc">Table of Contents</option>
              <option value="editorial">Editorial</option>
              <option value="article">Article</option>
            </select>

            <input
              type="text"
              placeholder="Page Title"
              value={newPage.title}
              onChange={(e) =>
                setNewPage({ ...newPage, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <input
              type="text"
              placeholder="Image URL"
              value={newPage.image}
              onChange={(e) =>
                setNewPage({ ...newPage, image: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <Button type="button" onClick={addPage}>
              Add Page
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
