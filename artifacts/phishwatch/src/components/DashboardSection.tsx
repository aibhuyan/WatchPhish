import { useGetStats, useGetFeed, getGetFeedQueryKey, useTriggerRefresh, getGetStatsQueryKey } from "@workspace/api-client-react";
import { keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Activity, ShieldAlert, Globe, Zap, RefreshCw, Filter, Fish, Bug, ShieldCheck, Skull, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, parseISO } from "date-fns";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { ThreatDetailPanel } from "./ThreatDetailPanel";
import { useUrlSector } from "@/hooks/useUrlSector";

const COLORS = [
  '#2E86C1', '#27AE60', '#E67E22', '#DF2020', '#8E44AD',
  '#2C3E50', '#D4AC0D', '#1ABC9C', '#C0392B', '#2980B9',
  '#E74C3C', '#16A085',
];

const SOURCE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  openphish: { icon: Fish, color: "text-blue-400" },
  urlhaus: { icon: Bug, color: "text-red-400" },
  phishtank: { icon: ShieldCheck, color: "text-amber-400" },
  threatfox: { icon: Skull, color: "text-purple-400" },
};

const SECTOR_MAP: Record<string, string> = {
  banking: "Banking",
  tech: "Technology",
  healthcare: "Healthcare",
  retail: "Retail / E-commerce",
  government: "Government",
  crypto: "Cryptocurrency",
};

const SECTORS = [
  { value: "", label: "All Sectors" },
  ...Object.entries(SECTOR_MAP).map(([value, label]) => ({ value, label })),
];

function useChartColors() {
  const isDark = document.documentElement.classList.contains("dark");
  return {
    bg: isDark ? "#151E2B" : "#FFFFFF",
    border: isDark ? "#1A2D45" : "#E1F0FA",
    text: isDark ? "#E8EAED" : "#333333",
    grid: isDark ? "#1A2D45" : "#E1F0FA",
    axis: isDark ? "#8A8D93" : "#808080",
    primary: isDark ? "#5BA3D9" : "#2E86C1",
    primaryHover: isDark ? "#7DBDE8" : "#1B6CA8",
  };
}

export function DashboardSection() {
  const [selectedSector, setSector] = useUrlSector();
  const sectorParam = selectedSector ? { sector: selectedSector } : {};
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetStats(sectorParam, {
    query: { queryKey: getGetStatsQueryKey(sectorParam) },
  });
  const feedParams = { limit: pageSize, offset: (currentPage - 1) * pageSize, ...sectorParam };
  const { data: feedData, isLoading: feedLoading, refetch: refetchFeed } = useGetFeed(feedParams, {
    query: { queryKey: getGetFeedQueryKey(feedParams), refetchInterval: 60000, placeholderData: keepPreviousData },
  });
  const feed = feedData?.entries;
  const totalEntries = feedData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const { mutate: refresh, isPending } = useTriggerRefresh();
  const [selectedThreatId, setSelectedThreatId] = useState<number | null>(null);
  const chart = useChartColors();

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSector]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleRefresh = () => {
    refresh(undefined, {
      onSuccess: () => {
        refetchStats();
        refetchFeed();
      }
    });
  };

  const getVtColorInfo = (ratio?: string | null) => {
    if (!ratio) return { bg: "bg-surface text-muted-foreground border-border", indicator: "bg-muted-foreground" };
    const [malicious, total] = ratio.split('/').map(Number);
    if (!total) return { bg: "bg-surface text-muted-foreground border-border", indicator: "bg-muted-foreground" };
    const pct = (malicious / total) * 100;
    if (pct > 30) return { bg: "bg-danger/10 text-danger border-danger/30", indicator: "bg-danger" };
    if (pct > 10) return { bg: "bg-warning/10 text-warning border-warning/30", indicator: "bg-warning" };
    return { bg: "bg-success/10 text-success border-success/30", indicator: "bg-success" };
  };

  const getDomainAgeBadge = (age?: number | null) => {
    if (age === null || age === undefined || age < 0) return null;
    if (age < 7) {
      const label = age === 0 ? "Registered today" : `${age}d old`;
      return (
        <div className="inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold bg-danger/10 text-danger border-danger/30">
          <Clock className="w-3 h-3 mr-1" />
          {label}
        </div>
      );
    }
    if (age < 30) {
      return (
        <div className="inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold bg-warning/10 text-warning border-warning/30">
          <Clock className="w-3 h-3 mr-1" />
          {age}d old
        </div>
      );
    }
    return (
      <span className="text-muted-foreground text-xs">{age}d</span>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Live Dashboard</h2>
          <p className="text-muted-foreground mt-1">Real-time phishing intelligence and threat metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              value={selectedSector || ""}
              onChange={(e) => setSector(e.target.value)}
              className="pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-foreground appearance-none cursor-pointer hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {SECTORS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleRefresh} disabled={isPending || statsLoading} variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
            <RefreshCw className={cn("w-4 h-4 mr-2", (isPending || statsLoading) && "animate-spin")} />
            Refresh Data
          </Button>
        </div>
      </div>

      {selectedSector && (
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary border border-primary/20 px-3 py-1">
            <Filter className="w-3 h-3 mr-1.5" />
            Filtered: {SECTOR_MAP[selectedSector] || selectedSector}
          </Badge>
          <button onClick={() => setSector("")} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline">
            Clear filter
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-surface/50 border-border/50">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Threats</p>
                <p className="text-4xl font-bold text-foreground">{stats?.totalEntries.toLocaleString() || "0"}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg text-primary"><Activity className="w-5 h-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-surface/50 border-border/50">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">New Today</p>
                <p className="text-4xl font-bold text-secondary">{stats?.newToday.toLocaleString() || "0"}</p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-lg text-secondary"><Zap className="w-5 h-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-surface/50 border-border/50">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Attack Types</p>
                <p className="text-4xl font-bold text-warning">{stats?.attackTypesCount || "0"}</p>
              </div>
              <div className="p-3 bg-warning/10 rounded-lg text-warning"><ShieldAlert className="w-5 h-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-surface/50 border-border/50">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Countries</p>
                <p className="text-4xl font-bold text-success">{stats?.countriesCount || "0"}</p>
              </div>
              <div className="p-3 bg-success/10 rounded-lg text-success"><Globe className="w-5 h-5" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-gradient-to-r from-surface to-surface/50 border border-border/50 rounded-xl p-6">
        <h4 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-wider">
          <Zap className="w-4 h-4 text-primary" /> Enrichment Intelligence
        </h4>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-16">
          <div className="flex-1 w-full max-w-md">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Avg VirusTotal Detection</span>
              <span className="font-mono font-bold text-secondary">{((stats?.enrichment.avgVtDetectionRatio || 0) * 100).toFixed(1)}%</span>
            </div>
            <Progress 
              value={(stats?.enrichment.avgVtDetectionRatio || 0) * 100} 
              indicatorClassName="bg-primary" 
              className="h-2.5 bg-surface border-border/50" 
            />
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Recently Registered</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-danger">{stats?.enrichment.recentlyRegisteredCount ?? 0}</span>
              <span className="text-xs text-muted-foreground">domains &lt; 7 days old</span>
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-surface/50 border-border/50 col-span-1">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-6">Threat Distribution</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.attackTypeBreakdown || []}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    minAngle={8}
                  >
                    {(stats?.attackTypeBreakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: chart.bg, borderColor: chart.border, color: chart.text }}
                    itemStyle={{ color: chart.text }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-surface/50 border-border/50 col-span-1 lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-6">Threat Volume (Last 7 Days)</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.dailyCounts || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke={chart.axis} 
                    tickFormatter={(val) => format(parseISO(val), 'MMM d')}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke={chart.axis} 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: chart.bg, borderColor: chart.border, color: chart.text }}
                    labelFormatter={(val) => format(parseISO(val as string), 'MMM d, yyyy')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke={chart.primary} 
                    strokeWidth={3}
                    dot={{ fill: chart.primary, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: chart.primaryHover }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-surface/50 border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/50 flex justify-between items-center bg-surface/30">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Live Threat Feed
          </h3>
          <Badge variant="outline" className="bg-background font-mono text-xs">Auto-updates 60s</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface/80 border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Source</th>
                <th className="p-4 font-medium">Sanitized URL</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Sector</th>
                <th className="p-4 font-medium">Domain Age</th>
                <th className="p-4 font-medium">VT Ratio</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm divide-y divide-border/30">
              {feed?.map((entry) => {
                const vtColor = getVtColorInfo(entry.vtDetectionRatio);
                const sourceInfo = SOURCE_ICONS[entry.source];
                const SourceIcon = sourceInfo?.icon || Activity;
                return (
                  <tr
                    key={entry.id}
                    className="hover:bg-surface/80 transition-colors cursor-pointer"
                    onClick={() => setSelectedThreatId(entry.id)}
                  >
                    <td className="p-4 text-muted-foreground whitespace-nowrap">{format(parseISO(entry.dateDetected), 'MM/dd HH:mm')}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5" title={entry.source}>
                        <SourceIcon className={cn("w-4 h-4", sourceInfo?.color || "text-muted-foreground")} />
                        <span className="text-xs text-muted-foreground hidden sm:inline">{entry.source}</span>
                      </div>
                    </td>
                    <td className="p-4 text-foreground truncate max-w-xs" title={entry.sanitizedUrl}>{entry.sanitizedUrl}</td>
                    <td className="p-4">
                      <Badge variant="outline" className="bg-background/50 text-xs">{entry.attackType}</Badge>
                    </td>
                    <td className="p-4 text-muted-foreground">{(entry.sector && SECTOR_MAP[entry.sector]) || entry.sector || '-'}</td>
                    <td className="p-4">
                      {getDomainAgeBadge(entry.domainAge) || <span className="text-muted-foreground/50">-</span>}
                    </td>
                    <td className="p-4">
                      {entry.vtDetectionRatio ? (
                         <div className={cn("inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold", vtColor.bg)}>
                           {entry.vtDetectionRatio}
                         </div>
                      ) : <span className="text-muted-foreground/50">-</span>}
                    </td>
                  </tr>
                );
              })}
              {!feed?.length && !feedLoading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground font-sans">
                    No recent threats detected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-surface/30">
            <span className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalEntries)} of {totalEntries} threats
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="h-8 px-2 text-xs"
              >
                First
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {(() => {
                const pages: number[] = [];
                let start = Math.max(1, currentPage - 2);
                let end = Math.min(totalPages, currentPage + 2);
                if (end - start < 4) {
                  if (start === 1) end = Math.min(totalPages, start + 4);
                  else start = Math.max(1, end - 4);
                }
                for (let i = start; i <= end; i++) pages.push(i);
                return pages.map(p => (
                  <Button
                    key={p}
                    variant={p === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(p)}
                    className={cn("h-8 w-8 px-0 text-xs", p === currentPage && "bg-primary text-primary-foreground")}
                  >
                    {p}
                  </Button>
                ));
              })()}
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="h-8 px-2 text-xs"
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AnimatePresence>
        {selectedThreatId && (
          <ThreatDetailPanel
            threatId={selectedThreatId}
            onClose={() => setSelectedThreatId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
