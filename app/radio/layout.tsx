import { Metadata } from "next";

export const metadata: Metadata = {
  title: "رادیودات",
  description: "پادکست‌ها و بخش‌های برگزیده رادیودات",
};

export default function RadioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
