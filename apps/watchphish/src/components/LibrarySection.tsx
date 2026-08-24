import { useGetAttacks, useGetStats, getGetStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Play, Activity, KeyRound, Fingerprint, Receipt, QrCode, Smartphone, Bot, AppWindow, Wifi, UserCheck, AlertTriangle, ShieldAlert, Filter } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useUrlSector } from "@/hooks/useUrlSector";
import { useMemo } from "react";

const ATTACK_ICONS: Record<string, LucideIcon> = {
  "Credential Harvest": KeyRound,
  "Brand Impersonation": Fingerprint,
  "Invoice Fraud": Receipt,
  "QR Phishing": QrCode,
  "Smishing": Smartphone,
  "AI-Generated Spear Phishing": Bot,
  "Browser-in-the-Browser": AppWindow,
  "Adversary-in-the-Middle": Wifi,
  "CEO Fraud / BEC": UserCheck,
};

export function LibrarySection({ onSimulate }: { onSimulate: (type: string) => void }) {
  const [selectedSector] = useUrlSector();
  const sectorParam = selectedSector ? { sector: selectedSector } : {};
  const { data: attacks, isLoading } = useGetAttacks();
  const { data: stats } = useGetStats(sectorParam, {
    query: { queryKey: getGetStatsQueryKey(sectorParam) },
  });

  const SECTOR_LABELS: Record<string, string> = {
    banking: "Banking",
    tech: "Technology",
    healthcare: "Healthcare",
    retail: "Retail / E-commerce",
    government: "Government",
    crypto: "Cryptocurrency",
  };

  const filteredAttacks = useMemo(() => {
    if (!attacks) return [];
    if (!selectedSector) return attacks;
    const activeTypes = new Set(stats?.attackTypeBreakdown?.map(b => b.type) || []);
    return attacks.filter(a => activeTypes.has(a.name));
  }, [attacks, stats, selectedSector]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Attack Library & Simulations</h2>
        <p className="text-muted-foreground mt-1">Explore phishing techniques and practice spotting them in interactive simulations</p>
        {selectedSector && (
          <Badge className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 mt-2 inline-flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Showing attacks in: {SECTOR_LABELS[selectedSector] || selectedSector}
          </Badge>
        )}
      </div>

      <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-warning">Educational Purpose Only</p>
          <p className="text-sm text-muted-foreground">
            Simulations are completely safe and sandboxed. No real data is collected and no actual phishing occurs.
            Click "Simulate" on any card to practice identifying red flags interactively.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading && Array.from({ length: 9 }).map((_, i) => (
          <Card key={i} className="h-64 bg-surface/30 animate-pulse border-border/50" />
        ))}
        
        {filteredAttacks.map((attack) => {
          const Icon = ATTACK_ICONS[attack.name] ?? Shield;
          return (
          <Card key={attack.id} className="bg-surface/50 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 flex flex-col group">
            <CardContent className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-background text-[10px]">
                    {attack.sampleCount} samples
                  </Badge>
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{attack.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{attack.description}</p>
              {attack.avgVtRatio != null && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Activity className="w-3 h-3"/> VT Avg: {attack.avgVtRatio.toFixed(1)}%</span>
                </div>
              )}
            </CardContent>
            
            <div className="px-6 py-4 border-t border-border/30 bg-surface/30">
              <Button 
                onClick={() => onSimulate(attack.name)} 
                className="w-full gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 transition-all duration-300"
              >
                <Play className="w-4 h-4" /> Simulate Attack
              </Button>
            </div>
          </Card>
          );
        })}
      </div>

      <div className="bg-surface/30 border border-border/30 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-primary" /> What You'll Learn
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "URL Analysis", desc: "Spot lookalike domains and suspicious redirects" },
            { title: "Social Engineering", desc: "Recognize urgency tactics and emotional manipulation" },
            { title: "Visual Indicators", desc: "Identify branding inconsistencies and layout flaws" },
            { title: "Link Inspection", desc: "Safely evaluate links before clicking" },
          ].map((item) => (
            <div key={item.title} className="p-3 rounded-lg bg-surface/50">
              <p className="text-sm font-semibold mb-1">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
