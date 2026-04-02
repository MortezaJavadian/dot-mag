export default function ArchiveLoading() {
  return (
    <>
      <section className="pt-12 pb-8 md:pt-16 md:pb-12 bg-background-secondary">
        <div className="container">
          <div className="h-11 w-44 rounded-xl bg-foreground/10 animate-pulse" />
        </div>
      </section>

      <section className="section-spacing-sm bg-background">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[24rem] rounded-2xl border border-card-border bg-card-bg/60 animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
