"use client";

import { useState, useEffect } from "react";
import { getArticles, deleteArticle } from "@/app/actions/articleActions";
import { getMagazines, deleteMagazine } from "@/app/actions/magazineActions";
import { getRadios, deleteRadio } from "@/app/actions/radioActions";
import { getHomeHeroContent } from "@/app/actions/homeActions";
import {
  getTags,
  createTag,
  deleteTag,
  reorderTag,
} from "@/app/actions/tagActions";
import ArticleEditor from "./ArticleEditor";
import ArticlesTabs from "./ArticlesTabs";
import HomeEditor from "./HomeEditor";
import MagazineEditor from "./MagazineEditor";
import RadioEditor from "./RadioEditor";
import Button from "@/components/ui/Button";
import type { HomeHeroConfig } from "@/lib/homeHero";

type ArticleItem = {
  id: string;
  slug?: string;
  title: string;
  excerpt?: string;
  content?: string;
  category?: string;
  image?: string;
  publishedAt: string;
  sortDate?: string | Date;
  featured?: boolean;
  tags: { id: string; name: string; slug: string }[];
};

type MagazineItem = {
  id: string;
  title: string;
  pageCount: number;
  publishedAt: string;
  sortDate?: string | Date;
};

type RadioSegmentItem = {
  id: string;
  number: number;
  title: string;
  audioUrl: string;
  durationSec?: number | null;
};

type RadioItem = {
  id: string;
  intro?: string;
  cover?: string | null;
  audioUrl?: string | null;
  durationSec?: number | null;
  title: string;
  publishedAt: string;
  sortDate?: string | Date;
  segments?: RadioSegmentItem[];
};

type TagItem = {
  id: string;
  name: string;
  slug: string;
  sortOrder?: number;
  _count?: { articles?: number };
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<
    "home" | "articles" | "magazines" | "radios" | "tags"
  >("home");
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [magazines, setMagazines] = useState<MagazineItem[]>([]);
  const [radios, setRadios] = useState<RadioItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [homeConfig, setHomeConfig] = useState<HomeHeroConfig | null>(null);
  const [editingArticle, setEditingArticle] = useState<
    ArticleItem | { id: null } | null
  >(null);
  const [editingMagazine, setEditingMagazine] = useState<
    MagazineItem | { id: null } | null
  >(null);
  const [editingRadio, setEditingRadio] = useState<
    RadioItem | { id: null } | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [articlesRes, magazinesRes, radiosRes, tagsRes, homeRes] =
      await Promise.all([
        getArticles(),
        getMagazines(),
        getRadios(),
        getTags(),
        getHomeHeroContent(),
      ]);

    if (articlesRes.success) setArticles(articlesRes.data || []);
    if (magazinesRes.success) setMagazines(magazinesRes.data || []);
    if (radiosRes.success) setRadios(radiosRes.data || []);
    if (tagsRes.success) setTags(tagsRes.data || []);
    if (homeRes.success && homeRes.data) setHomeConfig(homeRes.data);
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

  const handleMoveTag = async (tagId: string, direction: "up" | "down") => {
    try {
      const result = await reorderTag(tagId, direction);
      if (result.success) {
        await loadData();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("خطا در جابه‌جایی ترتیب برچسب");
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

  if (editingRadio) {
    return (
      <RadioEditor
        radio={editingRadio}
        onSave={() => {
          setEditingRadio(null);
          loadData();
        }}
        onCancel={() => setEditingRadio(null)}
      />
    );
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("home")}
          className={`px-4 py-2 font-medium ${
            activeTab === "home"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          خانه
        </button>
        <button
          onClick={() => setActiveTab("articles")}
          className={`px-4 py-2 font-medium ${
            activeTab === "articles"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          نوشته‌ها ({articles.length})
        </button>
        <button
          onClick={() => setActiveTab("radios")}
          className={`px-4 py-2 font-medium ${
            activeTab === "radios"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          رادیودات ({radios.length})
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

      {activeTab === "home" && (
        <div className="space-y-4">
          {loading ? (
            <p>در حال بارگذاری...</p>
          ) : !homeConfig ? (
            <p className="text-slate-600 dark:text-slate-400">
              بارگذاری تنظیمات صفحه خانه انجام نشد.
            </p>
          ) : (
            <HomeEditor
              config={homeConfig}
              articleOptions={articles.map((article) => ({
                id: article.id,
                title: article.title,
              }))}
              radioOptions={radios.map((radio) => ({
                id: radio.id,
                title: radio.title,
              }))}
              magazineOptions={magazines.map((magazine) => ({
                id: magazine.id,
                title: magazine.title,
              }))}
              onSave={loadData}
            />
          )}
        </div>
      )}

      {activeTab === "articles" && (
        <div className="space-y-4">
          <Button onClick={() => setEditingArticle({ id: null })}>
            ایجاد نوشته
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
                    "آیا اطمینان دارید که می‌خواهید این نوشته را حذف کنید؟",
                  )
                ) {
                  try {
                    await deleteArticle(article.id);
                    await loadData();
                  } catch (error) {
                    alert("خطا در حذف نوشته");
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
              {magazines.map((magazine) => (
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

      {activeTab === "radios" && (
        <div className="space-y-4">
          <Button onClick={() => setEditingRadio({ id: null })}>
            ایجاد رادیودات
          </Button>

          {loading ? (
            <p>در حال بارگذاری...</p>
          ) : radios.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">
              هنوز رادیویی وجود ندارد
            </p>
          ) : (
            <div className="space-y-2">
              {radios.map((radio) => (
                <div
                  key={radio.id}
                  className="p-4 border rounded-lg dark:border-slate-700 flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                >
                  <div>
                    <h3 className="font-medium">{radio.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {radio.segments?.length || 0} بخش برگزیده •{" "}
                      {radio.publishedAt}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setEditingRadio(radio)}
                      className="text-sm"
                    >
                      ویرایش
                    </Button>
                    <Button
                      onClick={async () => {
                        if (
                          confirm(
                            "آیا اطمینان دارید که می‌خواهید این رادیو را حذف کنید؟",
                          )
                        ) {
                          try {
                            const result = await deleteRadio(radio.id);
                            if (!result.success) {
                              alert(result.error || "خطا در حذف رادیو");
                              return;
                            }
                            await loadData();
                          } catch (error) {
                            alert("خطا در حذف رادیو");
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
              {tags.map((tag, index) => (
                <div
                  key={tag.id}
                  className="p-4 border rounded-lg dark:border-slate-700 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-medium">{tag.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {tag._count?.articles || 0} نوشته
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleMoveTag(tag.id, "up")}
                      disabled={index === 0}
                      className="text-sm bg-slate-600 hover:bg-slate-700"
                    >
                      بالا
                    </Button>
                    <Button
                      onClick={() => handleMoveTag(tag.id, "down")}
                      disabled={index === tags.length - 1}
                      className="text-sm bg-slate-600 hover:bg-slate-700"
                    >
                      پایین
                    </Button>
                    <Button
                      onClick={() => handleDeleteTag(tag.id)}
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
    </div>
  );
}
