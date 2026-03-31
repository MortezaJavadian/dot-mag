"use client";

import { useState, useEffect } from "react";
import { getArticles, deleteArticle } from "@/app/actions/articleActions";
import { getMagazines, deleteMagazine } from "@/app/actions/magazineActions";
import { getTags, createTag, deleteTag } from "@/app/actions/tagActions";
import ArticleEditor from "./ArticleEditor";
import ArticlesTabs from "./ArticlesTabs";
import MagazineEditor from "./MagazineEditor";
import Button from "@/components/ui/Button";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"articles" | "magazines" | "tags">(
    "articles",
  );
  const [articles, setArticles] = useState<any[]>([]);
  const [magazines, setMagazines] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [editingMagazine, setEditingMagazine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [articlesRes, magazinesRes, tagsRes] = await Promise.all([
      getArticles(),
      getMagazines(),
      getTags(),
    ]);

    if (articlesRes.success) setArticles(articlesRes.data || []);
    if (magazinesRes.success) setMagazines(magazinesRes.data || []);
    if (tagsRes.success) setTags(tagsRes.data || []);
    setLoading(false);
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;

    setAddingTag(true);
    try {
      const result = await createTag(newTagName);
      if (result.success) {
        setNewTagName("");
        await loadData();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("خطا در افزودن برچسب");
      console.error(error);
    } finally {
      setAddingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("آیا اطمینان دارید که می‌خواهید این برچسب را حذف کنید؟"))
      return;

    try {
      const result = await deleteTag(tagId);
      if (result.success) {
        await loadData();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("خطا در حذف برچسب");
      console.error(error);
    }
  };

  if (editingArticle) {
    return (
      <ArticleEditor
        article={editingArticle}
        onSave={() => {
          setEditingArticle(null);
          loadData();
        }}
        onCancel={() => setEditingArticle(null)}
      />
    );
  }

  if (editingMagazine) {
    return (
      <MagazineEditor
        magazine={editingMagazine}
        onSave={() => {
          setEditingMagazine(null);
          loadData();
        }}
        onCancel={() => setEditingMagazine(null)}
      />
    );
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("articles")}
          className={`px-4 py-2 font-medium ${
            activeTab === "articles"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          نوشتارها ({articles.length})
        </button>
        <button
          onClick={() => setActiveTab("magazines")}
          className={`px-4 py-2 font-medium ${
            activeTab === "magazines"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          مجلات ({magazines.length})
        </button>
        <button
          onClick={() => setActiveTab("tags")}
          className={`px-4 py-2 font-medium ${
            activeTab === "tags"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          برچسب‌ها ({tags.length})
        </button>
      </div>

      {activeTab === "articles" && (
        <div className="space-y-4">
          <Button onClick={() => setEditingArticle({ id: null })}>
            ایجاد نوشتار
          </Button>

          {loading ? (
            <p>در حال بارگذاری...</p>
          ) : (
            <ArticlesTabs
              articles={articles}
              tags={tags}
              onEdit={(article) => setEditingArticle(article)}
              onDelete={async (article) => {
                if (
                  confirm(
                    "آیا اطمینان دارید که می‌خواهید این نوشتار را حذف کنید؟",
                  )
                ) {
                  try {
                    await deleteArticle(article.id);
                    await loadData();
                  } catch (error) {
                    alert("خطا در حذف نوشتار");
                    console.error(error);
                  }
                }
              }}
            />
          )}
        </div>
      )}

      {activeTab === "magazines" && (
        <div className="space-y-4">
          <Button onClick={() => setEditingMagazine({ id: null })}>
            ایجاد مجله
          </Button>

          {loading ? (
            <p>در حال بارگذاری...</p>
          ) : magazines.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">
              هنوز مجله‌ای وجود ندارد
            </p>
          ) : (
            <div className="space-y-2">
              {magazines.map((magazine: any) => (
                <div
                  key={magazine.id}
                  className="p-4 border rounded-lg dark:border-slate-700 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-medium">{magazine.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {magazine.pageCount} pages • {magazine.publishedAt}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setEditingMagazine(magazine)}
                      className="text-sm"
                    >
                      ویرایش
                    </Button>
                    <Button
                      onClick={async () => {
                        if (
                          confirm(
                            "آیا اطمینان دارید که می‌خواهید این مجله را حذف کنید؟",
                          )
                        ) {
                          try {
                            await deleteMagazine(magazine.id);
                            await loadData();
                          } catch (error) {
                            alert("خطا در حذف مجله");
                            console.error(error);
                          }
                        }
                      }}
                      className="text-sm bg-red-500 hover:bg-red-600"
                    >
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "tags" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleAddTag();
                }
              }}
              placeholder="نام برچسب جدید"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              onClick={handleAddTag}
              disabled={addingTag || !newTagName.trim()}
            >
              {addingTag ? "در حال افزودن..." : "افزودن برچسب"}
            </Button>
          </div>

          {loading ? (
            <p>در حال بارگذاری...</p>
          ) : tags.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">
              هنوز برچسبی وجود ندارد
            </p>
          ) : (
            <div className="space-y-2">
              {tags.map((tag: any) => (
                <div
                  key={tag.id}
                  className="p-4 border rounded-lg dark:border-slate-700 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-medium">{tag.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {tag._count?.articles || 0} نوشتار
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="text-sm bg-red-500 hover:bg-red-600"
                  >
                    حذف
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
