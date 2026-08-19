// Composite, explainable risk score for a phishing entry.
//
// Unlike the static per-source `confidenceScore` (a flat 0.7/0.9 constant set
// by the collector), this blends every signal we have enriched — VirusTotal
// detections, urlscan verdict, domain age, detection recency, source trust —
// into a 0-100 score and, crucially, returns the *breakdown* so the UI can
// explain WHY an entry scored the way it did.

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskFactor {
  label: string;
  points: number;
  detail: string;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
}

export interface RiskInput {
  vtDetectionRatio?: string | null;
  urlscanScore?: number | null;
  domainAge?: number | null;
  dateDetected: Date;
  confidenceScore?: number | null;
  isActive?: boolean | null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function levelFor(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

export function computeRiskScore(input: RiskInput): RiskAssessment {
  const factors: RiskFactor[] = [];

  // 1. VirusTotal detection ratio — strongest signal (up to 35)
  if (input.vtDetectionRatio && input.vtDetectionRatio.includes("/")) {
    const [maliciousStr, totalStr] = input.vtDetectionRatio.split("/");
    const malicious = Number(maliciousStr);
    const total = Number(totalStr);
    if (total > 0 && !Number.isNaN(malicious)) {
      const points = Math.round((malicious / total) * 35);
      if (points > 0) {
        factors.push({
          label: "VirusTotal detections",
          points,
          detail: `${malicious}/${total} security vendors flagged this as malicious`,
        });
      }
    }
  }

  // 2. urlscan verdict score (up to 20)
  if (input.urlscanScore != null && input.urlscanScore > 0) {
    const points = Math.round((clamp(input.urlscanScore, 0, 100) / 100) * 20);
    if (points > 0) {
      factors.push({
        label: "urlscan verdict",
        points,
        detail: `urlscan.io scored this page ${input.urlscanScore}/100 for malicious behaviour`,
      });
    }
  }

  // 3. Domain age — freshly registered domains are a classic phishing tell (up to 20)
  //    (domainAge === -1 is our sentinel for "hosting platform, N/A")
  if (input.domainAge != null && input.domainAge >= 0) {
    const age = input.domainAge;
    let points = 0;
    if (age < 1) points = 20;
    else if (age < 7) points = 15;
    else if (age < 30) points = 8;
    else if (age < 90) points = 3;
    if (points > 0) {
      const when = age < 1 ? "today" : `${age} day${age === 1 ? "" : "s"} ago`;
      factors.push({
        label: "Newly registered domain",
        points,
        detail: `Domain was registered ${when}`,
      });
    }
  }

  // 4. Detection recency — active campaigns are riskier than stale ones (up to 10)
  const hoursSince = (Date.now() - input.dateDetected.getTime()) / (1000 * 60 * 60);
  if (hoursSince <= 24) {
    factors.push({
      label: "Detected in last 24h",
      points: 10,
      detail: "First seen within the last day — likely an active campaign",
    });
  } else if (hoursSince <= 24 * 7) {
    factors.push({
      label: "Detected this week",
      points: 5,
      detail: "First seen within the last 7 days",
    });
  }

  // 5. Source confidence (up to 8) — a feed's own trust in the entry
  if (input.confidenceScore != null) {
    const points = Math.round(clamp(input.confidenceScore - 0.5, 0, 0.4) * 20);
    if (points > 0) {
      factors.push({
        label: "Source confidence",
        points,
        detail: `Reporting feed confidence ${(input.confidenceScore * 100).toFixed(0)}%`,
      });
    }
  }

  // 6. Still active (+2)
  if (input.isActive) {
    factors.push({
      label: "Currently active",
      points: 2,
      detail: "Entry is still marked active",
    });
  }

  const raw = factors.reduce((sum, f) => sum + f.points, 0);
  const score = clamp(raw, 0, 100);

  return { score, level: levelFor(score), factors };
}
