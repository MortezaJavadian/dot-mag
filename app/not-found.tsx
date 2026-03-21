import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <div className="text-center">
        {/* 404 */}
        <h1 className="text-8xl md:text-9xl font-black text-primary mb-4">
          ۴۰۴
        </h1>

        {/* Message */}
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          صفحه مورد نظر یافت نشد
        </h2>
        <p className="text-foreground-secondary mb-8 max-w-md">
          متأسفیم، صفحه‌ای که به دنبال آن هستید وجود ندارد یا منتقل شده است.
        </p>

        {/* Back to Home */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          بازگشت به خانه
        </Link>
      </div>
    </div>
  );
}
