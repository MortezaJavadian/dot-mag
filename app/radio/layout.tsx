import { Metadata } from "next";

export const metadata: Metadata = {
  title: "رادیو دات",
  description: "پادکست‌ها و بخش‌های برگزیده رادیو دات",
};

export default function RadioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
