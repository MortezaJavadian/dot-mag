"use client";

import { MagazineReader } from "@/components/feature/MagazineReader";

interface MagazineReaderClientProps {
  magazine: Parameters<typeof MagazineReader>[0]["magazine"];
}

export function MagazineReaderClient({ magazine }: MagazineReaderClientProps) {
  return <MagazineReader magazine={magazine} />;
}
