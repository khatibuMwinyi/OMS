export default function LettersLoading() {
  return (
    <div className="dashboard-content animate-in fade-in duration-300">
      <section className="page-hero">
        <div className="space-y-2">
          <div className="eyebrow h-4 w-24 bg-slate-100 rounded animate-pulse" />
          <div className="page-title h-10 w-48 bg-slate-100 rounded animate-pulse" />
          <div className="subtle-copy h-4 w-64 bg-slate-100 rounded animate-pulse" />
        </div>
      </section>

      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="relative mb-6">
          <div className="h-12 w-12 rounded-full border-[3px] border-slate-100 border-t-[#B88038] animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-[#1A1F2E] animate-pulse"></div>
          </div>
        </div>
        <p className="text-sm font-medium text-slate-400 tracking-wide uppercase">
          Loading letters...
        </p>
      </div>
    </div>
  );
}
