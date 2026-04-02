export function PostsCardsSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-80 rounded-2xl border border-card-border bg-card-bg/60 animate-pulse"
        />
      ))}
    </div>
  );
}

export function PostsPageSkeleton() {
  return (
    <>
      <section className="pt-12 pb-8 md:pt-16 md:pb-12 bg-background-secondary">
        <div className="container">
          <div className="h-11 w-44 rounded-xl bg-foreground/10 animate-pulse" />
        </div>
      </section>

      <section className="py-6 border-b border-card-border sticky top-16 md:top-20 bg-background/95 backdrop-blur-md z-30">
        <div className="container posts-tabs-container">
          <div className="flex flex-wrap gap-2 md:gap-3 pb-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-10 flex-1 min-w-[8rem] md:flex-none md:w-32 rounded-full bg-foreground/10 animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="section-spacing-sm">
        <div className="container">
          <PostsCardsSkeleton />
        </div>
      </section>
    </>
  );
}
