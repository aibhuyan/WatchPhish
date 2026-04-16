import { Activity, BookOpen, AlertTriangle, Radar, Crosshair } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useGetCertAlertCount, getGetCertAlertCountQueryKey } from "@workspace/api-client-react";

export function NavBar() {
  useTheme();
  const { data: alertCountData } = useGetCertAlertCount({
    query: { queryKey: getGetCertAlertCountQueryKey(), refetchInterval: 30000 },
  });
  const alertCount = alertCountData?.count || 0;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="sticky top-0 z-40 w-full glass-panel border-b-border/50 border-x-0 border-t-0">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2">
          <Crosshair className="w-7 h-7 text-primary" />
          <span className="text-xl font-bold tracking-tight">
            <span className="text-primary">Watch</span>
            <span className="text-foreground">Phish</span>
          </span>
        </button>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <button onClick={() => scrollTo('dashboard')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Activity className="w-4 h-4" /> Dashboard
          </button>
          <button onClick={() => scrollTo('library')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <BookOpen className="w-4 h-4" /> Attack Library
          </button>
          <button onClick={() => scrollTo('new-techniques')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <AlertTriangle className="w-4 h-4" /> Emerging
          </button>
          <button onClick={() => scrollTo('brand-monitor')} className="relative flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Radar className="w-4 h-4" /> Brand Monitor
            {alertCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-danger text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {alertCount > 99 ? "99+" : alertCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
