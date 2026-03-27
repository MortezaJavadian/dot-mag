"use client";

import { useState, useEffect } from "react";
import { getArticles } from "@/app/actions/articleActions";
import { getMagazines } from "@/app/actions/magazineActions";
import ArticleEditor from "./ArticleEditor";
import MagazineEditor from "./MagazineEditor";
import Button from "@/components/ui/Button";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"articles" | "magazines">(
    "articles",
  );
  const [articles, setArticles] = useState<any[]>([]);
  const [magazines, setMagazines] = useState<any[]>([]);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [editingMagazine, setEditingMagazine] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [articlesRes, magazinesRes] = await Promise.all([
      getArticles(),
      getMagazines(),
    ]);

    if (articlesRes.success) setArticles(articlesRes.data);
    if (magazinesRes.success) setMagazines(magazinesRes.data);
    setLoading(false);
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
    <div className="space-y-6">
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("articles")}
          className={`px-4 py-2 font-medium ${
            activeTab === "articles"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          Articles ({articles.length})
        </button>
        <button
          onClick={() => setActiveTab("magazines")}
          className={`px-4 py-2 font-medium ${
            activeTab === "magazines"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          Magazines ({magazines.length})
        </button>
      </div>

      {activeTab === "articles" && (
        <div className="space-y-4">
          <Button onClick={() => setEditingArticle({ id: null })}>
            Create Article
          </Button>

          {loading ? (
            <p>Loading...</p>
          ) : articles.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">
              No articles yet
            </p>
          ) : (
            <div className="space-y-2">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="p-4 border rounded-lg dark:border-slate-700 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-medium">{article.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {article.author} • {article.publishedAt}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setEditingArticle(article)}
                      className="text-sm"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={async () => {
                        if (
                          confirm(
                            "Are you sure you want to delete this article?",
                          )
                        ) {
                          // Delete article
                          await loadData();
                        }
                      }}
                      className="text-sm bg-red-500 hover:bg-red-600"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "magazines" && (
        <div className="space-y-4">
          <Button onClick={() => setEditingMagazine({ id: null })}>
            Create Magazine
          </Button>

          {loading ? (
            <p>Loading...</p>
          ) : magazines.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">
              No magazines yet
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
                      Edit
                    </Button>
                    <Button
                      onClick={async () => {
                        if (
                          confirm(
                            "Are you sure you want to delete this magazine?",
                          )
                        ) {
                          // Delete magazine
                          await loadData();
                        }
                      }}
                      className="text-sm bg-red-500 hover:bg-red-600"
                    >
                      Delete
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
