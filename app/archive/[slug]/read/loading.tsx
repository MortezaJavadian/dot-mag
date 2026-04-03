export default function MagazineReadLoading() {
  return (
    <div className="fixed inset-0 z-[70] overflow-hidden bg-deep-black">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="bg-gradient-to-b from-deep-black/95 via-deep-black/75 to-transparent">
          <div className="container py-3 md:py-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <div className="h-9 w-24 rounded-full bg-white/15 animate-pulse" />

            <div className="flex flex-col items-center gap-2">
              <div className="h-3.5 w-40 rounded-full bg-white/20 animate-pulse" />
              <div className="h-2.5 w-28 rounded-full bg-white/15 animate-pulse" />
            </div>

            <div className="justify-self-end h-9 w-28 rounded-full bg-white/15 animate-pulse" />
          </div>
        </div>
      </header>

      <main className="relative h-full w-full flex items-center justify-center px-2 md:px-4 pt-14 md:pt-16 pb-14 md:pb-16">
        <div className="w-full h-full flex items-center justify-center">
          <div className="reader-page-skeleton rounded-xl md:rounded-2xl aspect-[3/4] w-[min(92vw,28rem)] md:w-[min(78vw,34rem)] lg:hidden">
            <div className="absolute left-4 right-4 top-4 h-2 rounded-full bg-white/22" />
            <div className="absolute left-6 right-6 bottom-5 h-1.5 rounded-full bg-white/16" />
          </div>

          <div
            className="hidden lg:grid grid-cols-2 gap-[0.45rem] md:gap-[0.6rem] w-full max-w-6xl h-full max-h-full"
            style={{ direction: "ltr" }}
          >
            <div className="h-full min-h-0 flex items-center justify-end">
              <div className="reader-page-skeleton rounded-xl md:rounded-2xl aspect-[3/4] w-full max-w-[30rem] md:max-w-[32rem]">
                <div className="absolute left-4 right-4 top-4 h-2 rounded-full bg-white/22" />
                <div className="absolute left-6 right-6 bottom-5 h-1.5 rounded-full bg-white/16" />
              </div>
            </div>
            <div className="h-full min-h-0 flex items-center justify-start">
              <div className="reader-page-skeleton rounded-xl md:rounded-2xl aspect-[3/4] w-full max-w-[30rem] md:max-w-[32rem]">
                <div className="absolute left-4 right-4 top-4 h-2 rounded-full bg-white/22" />
                <div className="absolute left-6 right-6 bottom-5 h-1.5 rounded-full bg-white/16" />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="absolute inset-x-0 bottom-0 z-20">
        <div className="bg-gradient-to-t from-deep-black/95 via-deep-black/75 to-transparent">
          <div className="container py-3 md:py-4">
            <div className="h-1 rounded-full bg-white/20 animate-pulse" />
            <div className="mt-3 mx-auto h-2.5 w-28 rounded-full bg-white/18 animate-pulse" />
          </div>
        </div>
      </footer>
    </div>
  );
}
