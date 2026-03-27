import { Metadata } from "next";

export const metadata: Metadata = {
  title: "نوشتار",
  description: "آخرین نوشتارهای مجله دات در حوزه طراحی، تکنولوژی و سبک زندگی",
};

export default function PostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
