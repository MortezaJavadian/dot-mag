import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  // Static routes
  const staticRoutes = [
    "",
    "/about",
    "/posts",
    "/archive",
    "/radio",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  try {
    const [articles, magazines, radios] = await Promise.all([
      prisma.article.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.magazine.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.radio.findMany({ select: { slug: true, updatedAt: true } }),
    ]);

    const articleRoutes = articles.map((article) => ({
      url: `${baseUrl}/posts/${encodeURIComponent(article.slug)}`,
      lastModified: new Date(article.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    const magazineRoutes = magazines.flatMap((magazine) => [
      {
        url: `${baseUrl}/archive/${encodeURIComponent(magazine.slug)}`,
        lastModified: new Date(magazine.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
      {
        url: `${baseUrl}/archive/${encodeURIComponent(magazine.slug)}/read`,
        lastModified: new Date(magazine.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      },
    ]);

    const radioRoutes = radios.map((radio) => ({
      url: `${baseUrl}/radio/${encodeURIComponent(radio.slug)}`,
      lastModified: new Date(radio.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    return [...staticRoutes, ...articleRoutes, ...magazineRoutes, ...radioRoutes];
  } catch (error) {
    console.error("Failed to generate sitemap:", error);
    return staticRoutes;
  }
}
