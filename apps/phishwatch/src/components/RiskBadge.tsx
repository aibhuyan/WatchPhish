import { cn } from "@/lib/utils";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export function riskLevel(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

const BADGE_STYLES: Record<RiskLevel, string> = {
  critical: "bg-danger/15 text-danger border-danger/40",
  high: "bg-orange-500/15 text-orange-500 border-orange-500/40",
  medium: "bg-warning/15 text-warning border-warning/40",
  low: "bg-success/15 text-success border-success/40",
};

// Solid colors for progress bars / meters (theme-independent).
export const RISK_BAR_COLOR: Record<RiskLevel, string> = {
  critical: "#DF2020",
  high: "#E67E22",
  medium: "#D4AC0D",
  low: "#27AE60",
};

const LABELS: Record<RiskLevel, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function RiskBadge({
  score,
  showLabel = true,
  className,
}: {
  score?: number | null;
  showLabel?: boolean;
  className?: string;
}) {
  if (score === null || score === undefined) {
    return <span className="text-muted-foreground/50">—</span>;
  }
  const level = riskLevel(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold",
        BADGE_STYLES[level],
        className,
      )}
      title={`Risk score ${score}/100 (${LABELS[level]})`}
    >
      <span className="font-mono">{score}</span>
      {showLabel && <span>{LABELS[level]}</span>}
    </span>
  );
}
