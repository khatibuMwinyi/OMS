export default function ReportsLoading() {
  return (
    <div className="dashboard-content animate-in fade-in duration-300">
      <section style={{ marginTop: 12 }} className="space-y-2">
        <div className="eyebrow h-4 w-24 bg-slate-100 rounded animate-pulse" />
        <div className="page-title h-10 w-32 bg-slate-100 rounded animate-pulse" />
        <div className="subtle-copy h-4 w-72 bg-slate-100 rounded animate-pulse" />
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="section-card p-4 space-y-2 animate-pulse"
          >
            <div className="h-3 w-16 bg-slate-100 rounded" />
            <div className="h-5 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center mt-8">
        <div className="relative mb-6">
          <div className="h-12 w-12 rounded-full border-[3px] border-slate-100 border-t-[#B88038] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-[#1A1F2E] animate-pulse" />
          </div>
        </div>
        <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
          Loading records...
        </p>
      </div>
    </div>
  );
}