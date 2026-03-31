"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface Article {
  id: string;
  title: string;
  author: string;
  publishedAt: string;
  tags: Tag[];
}

interface ArticlesTabsProps {
  articles: Article[];
  tags: Tag[];
  onEdit: (article: Article) => void;
  onDelete: (article: Article) => void;
}

export default function ArticlesTabs({
  articles,
  tags,
  onEdit,
  onDelete,
}: ArticlesTabsProps) {
  const [activeTab, setActiveTab] = useState<"all" | string>("all");

  const filteredArticles =
    activeTab === "all"
      ? articles
      : articles.filter((article) =>
          article.tags.some((tag) => tag.id === activeTab),
        );

  return (
    <div className="space-y-4 text-slate-900 dark:text-slate-100">
      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === "all"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          همه نوشتارها ({articles.length})
        </button>

        {tags.map((tag) => {
          const tagArticleCount = articles.filter((article) =>
            article.tags.some((t) => t.id === tag.id),
          ).length;

          return (
            <button
              key={tag.id}
              onClick={() => setActiveTab(tag.id)}
              className={`px-4 py-2 font-medium whitespace-nowrap ${
                activeTab === tag.id
                  ? "border-b-2 border-primary text-primary"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {tag.name} ({tagArticleCount})
            </button>
          );
        })}

        {tags.length === 0 && (
          <span className="px-4 py-2 text-slate-500 text-sm">
            هنوز برچسبی نیست
          </span>
        )}
      </div>

      {/* Articles List */}
      {filteredArticles.length === 0 ? (
        <p className="text-slate-600 dark:text-slate-400 py-4">
          {activeTab === "all"
            ? "هنوز نوشتاری وجود ندارد"
            : "هنوز نوشتاری برای این برچسب وجود ندارد"}
        </p>
      ) : (
        <div className="space-y-2">
          {filteredArticles.map((article) => (
            <div
              key={article.id}
              className="p-4 border rounded-lg dark:border-slate-700 flex justify-between items-center"
            >
              <div>
                <h3 className="font-medium">{article.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {article.author} • {article.publishedAt}
                  {article.tags.length > 0 && (
                    <span> • {article.tags.map((t) => t.name).join(", ")}</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => onEdit(article)} className="text-sm">
                  ویرایش
                </Button>
                <Button
                  onClick={() => onDelete(article)}
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
  );
}
