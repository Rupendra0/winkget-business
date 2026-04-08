export default function AppLoading() {
  return (
    <main className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8 py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="animate-pulse overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-48 w-full bg-slate-200 sm:h-56" />
          <div className="space-y-4 p-6">
            <div className="h-8 w-2/3 rounded bg-slate-200" />
            <div className="h-4 w-1/2 rounded bg-slate-100" />
            <div className="h-4 w-1/3 rounded bg-slate-100" />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`page-loader-card-${index}`}
              className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 h-28 w-full rounded-xl bg-slate-200" />
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-3 w-full rounded bg-slate-100" />
                <div className="h-3 w-4/5 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
