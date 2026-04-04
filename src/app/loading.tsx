import { getCurrentSession } from "@/lib/session-server";
import { AppHeader } from "@/components/app-header";

export default async function PageLoading() {
  const session = await getCurrentSession();

  return (
    <div className="dashboard-shell animate-in fade-in duration-500">
      {session && <AppHeader session={session} activeHref="" />}
      
      <div className="dashboard-content flex flex-col items-center justify-center min-h-[60vh] text-center">
        {/* Professional Minimalist Loader */}
        <div className="relative mb-8">
           {/* Outer Ring */}
          <div className="h-16 w-16 rounded-full border-[3px] border-slate-100 border-t-[#B88038] animate-spin"></div>
          {/* Inner Pulsing Core */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-[#1A1F2E] animate-pulse"></div>
          </div>
        </div>

        <div className="space-y-2">
           <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            Preparing your workspace
          </h2>
          <p className="text-sm text-slate-500 max-w-[280px] mx-auto leading-relaxed">
            Please wait while we sync your records and update your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
