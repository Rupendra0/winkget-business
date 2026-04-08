export default function ListingProfileLoading() {
  return (
    <main className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="animate-pulse overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-52 w-full bg-slate-200" />
          <div className="space-y-4 p-6">
            <div className="h-8 w-2/3 rounded bg-slate-200" />
            <div className="h-4 w-1/2 rounded bg-slate-100" />
            <div className="h-4 w-1/3 rounded bg-slate-100" />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="h-4 w-full rounded bg-slate-100" />
            <div className="h-4 w-11/12 rounded bg-slate-100" />
            <div className="h-4 w-4/5 rounded bg-slate-100" />
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-5 w-36 rounded bg-slate-200" />
            <div className="h-10 w-full rounded-xl bg-slate-100" />
            <div className="h-10 w-full rounded-xl bg-slate-100" />
            <div className="h-10 w-full rounded-xl bg-slate-100" />
          </div>
        </section>
      </div>
    </main>
  );
}
