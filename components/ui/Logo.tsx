import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  variant?: "default" | "white";
  className?: string;
}

export function Logo({ variant = "default", className = "" }: LogoProps) {
  const textColor = variant === "white" ? "text-white" : "text-foreground";
  const imageClass =
    variant === "white" ? "brightness-0 invert" : "logo-auto-invert";

  return (
    <Link href="/" className={`block ${className}`}>
      <div className="flex items-center gap-2">
        {/* Logo Icon */}
        <Image
          src="/assets/images/logo-512x512.png"
          alt="Dot Mag"
          width={36}
          height={36}
          className={`w-8 h-8 md:w-9 md:h-9 ${imageClass}`}
        />
        {/* Text */}
        <span className={`text-lg md:text-xl font-bold ${textColor}`}>دات</span>
      </div>
    </Link>
  );
}
