import { useGetThreatDetail, useGetThreatRelated } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { X, Shield, Globe, Calendar, Activity, Link2, Server, FileText, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { motion } from "framer-motion";

const SOURCE_COLORS: Record<string, string> = {
  openphish: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  urlhaus: "bg-red-500/20 text-red-400 border-red-500/30",
  phishtank: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  threatfox: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

function DetailRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/30 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
        <div className="text-sm text-foreground break-all">{value}</div>
      </div>
    </div>
  );
}

export function ThreatDetailPanel({ threatId, onClose }: { threatId: number; onClose: () => void }) {
  const [activeThreatId, setActiveThreatId] = useState(threatId);
  const [activeTab, setActiveTab] = useState<"details" | "infrastructure">("details");
  const { data: threat, isLoading } = useGetThreatDetail(activeThreatId);
  const { data: related, isLoading: relatedLoading } = useGetThreatRelated(activeThreatId);

  const getVtColor = (ratio?: string | null) => {
    if (!ratio) return "bg-muted text-muted-foreground";
    const [malicious, total] = ratio.split('/').map(Number);
    if (!total) return "bg-muted text-muted-foreground";
    const pct = (malicious / total) * 100;
    if (pct > 30) return "bg-danger/20 text-danger border-danger/30";
    if (pct > 10) return "bg-warning/20 text-warning border-warning/30";
    return "bg-success/20 text-success border-success/30";
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-background border-l border-border z-50 flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface/50">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Threat Detail</h2>
            {threat && (
              <Badge variant="outline" className="text-xs font-mono">#{threat.id}</Badge>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("details")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "details" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("infrastructure")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors relative",
              activeTab === "infrastructure" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Infrastructure
            {related && related.length > 0 && (
              <span className="absolute top-2 right-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {related.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 bg-surface/50 rounded animate-pulse" />
              ))}
            </div>
          )}

          {threat && activeTab === "details" && (
            <div className="space-y-1">
              <DetailRow label="URL" value={threat.url} icon={Link2} />
              <DetailRow
                label="Source"
                value={
                  <Badge className={cn("text-xs border", SOURCE_COLORS[threat.source] || "bg-surface text-muted-foreground border-border")}>
                    {threat.source}
                  </Badge>
                }
                icon={FileText}
              />
              <DetailRow label="Attack Type" value={<Badge variant="outline" className="text-xs">{threat.attackType}</Badge>} icon={Shield} />
              <DetailRow label="Sector" value={threat.sector || "Unknown"} icon={Activity} />
              <DetailRow label="Country" value={threat.country || "Unknown"} icon={Globe} />
              <DetailRow label="Detected" value={format(parseISO(threat.dateDetected), 'MMM d, yyyy HH:mm')} icon={Calendar} />
              <DetailRow
                label="Confidence Score"
                value={
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden max-w-[120px]">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${threat.confidenceScore * 100}%` }} />
                    </div>
                    <span className="font-mono text-xs">{(threat.confidenceScore * 100).toFixed(0)}%</span>
                  </div>
                }
              />
              <DetailRow
                label="Status"
                value={
                  <Badge className={cn("text-xs", threat.isActive ? "bg-danger/20 text-danger" : "bg-muted text-muted-foreground")}>
                    {threat.isActive ? "Active" : "Inactive"}
                  </Badge>
                }
              />

              {(threat.vtDetectionRatio || threat.vtMaliciousVotes || threat.vtCountry || threat.vtRegistrar || threat.vtCategories) && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">VirusTotal Intelligence</h4>
                  <DetailRow
                    label="Detection Ratio"
                    value={
                      threat.vtDetectionRatio ? (
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold", getVtColor(threat.vtDetectionRatio))}>
                          {threat.vtDetectionRatio}
                        </span>
                      ) : null
                    }
                  />
                  <DetailRow label="Malicious Votes" value={threat.vtMaliciousVotes} />
                  <DetailRow label="Harmless Votes" value={threat.vtHarmlessVotes} />
                  <DetailRow label="Hosting Country" value={threat.vtCountry} icon={Globe} />
                  <DetailRow label="Registrar" value={threat.vtRegistrar} icon={Server} />
                  <DetailRow label="Categories" value={threat.vtCategories} />
                </div>
              )}

              {threat.enrichedAt && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Enrichment</h4>
                  <DetailRow label="Enriched At" value={format(parseISO(threat.enrichedAt), 'MMM d, yyyy HH:mm')} icon={Calendar} />
                  <DetailRow label="Source" value={threat.enrichmentSource} />
                </div>
              )}
            </div>
          )}

          {activeTab === "infrastructure" && (
            <div>
              {relatedLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 bg-surface/50 rounded animate-pulse" />
                  ))}
                </div>
              )}

              {related && related.length === 0 && !relatedLoading && (
                <div className="text-center py-12 text-muted-foreground">
                  <Server className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No related infrastructure found</p>
                  <p className="text-sm mt-1">No other threats share the same registrar, hosting country, or origin.</p>
                </div>
              )}

              {related && related.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    {related.length} threat{related.length !== 1 ? "s" : ""} sharing infrastructure with this entry
                  </p>
                  {related.map(r => (
                    <div
                      key={r.id}
                      className="p-3 bg-surface/50 border border-border/50 rounded-lg hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => { setActiveThreatId(r.id); setActiveTab("details"); }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono text-foreground truncate">{r.url}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">{r.attackType}</Badge>
                            <Badge className={cn("text-[10px] border", SOURCE_COLORS[r.source] || "bg-surface text-muted-foreground border-border")}>
                              {r.source}
                            </Badge>
                            <Badge className="text-[10px] bg-primary/10 text-primary border border-primary/20">
                              {r.matchReason === "registrar" ? `Registrar: ${r.vtRegistrar}` :
                               r.matchReason === "hosting_country" ? `Host: ${r.vtCountry}` :
                               `Country: ${r.country || r.vtCountry}`}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{format(parseISO(r.dateDetected), 'MM/dd HH:mm')}</span>
                        {r.vtDetectionRatio && (
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold border", getVtColor(r.vtDetectionRatio))}>
                            VT: {r.vtDetectionRatio}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
