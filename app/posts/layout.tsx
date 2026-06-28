import { Metadata } from "next";

export const metadata: Metadata = {
  title: "نوشته‌ها",
  description: "آرشیو آخرین یادداشت‌ها، نوشته‌ها و مقالات علمی، فرهنگی و اجتماعی دانشجویان دانشگاه علم و صنعت ایران",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_API_BASE_URL}/posts`,
  },
};

export default function PostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "خانه",
        "item": process.env.NEXT_PUBLIC_API_BASE_URL
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "نوشته‌ها",
        "item": `${process.env.NEXT_PUBLIC_API_BASE_URL}/posts`
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
