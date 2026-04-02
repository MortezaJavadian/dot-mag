export default function PostsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-foreground-secondary">در حال بارگذاری...</p>
      </div>
    </div>
  );
}
