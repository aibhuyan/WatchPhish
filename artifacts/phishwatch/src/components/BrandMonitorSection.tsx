import { useState } from "react";
import {
  useGetBrands,
  useAddBrand,
  useDeleteBrand,
  useGetCertAlerts,
  useDismissCertAlert,
  getGetBrandsQueryKey,
  getGetCertAlertsQueryKey,
  getGetCertAlertCountQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Radar, Plus, X, Eye, EyeOff, AlertTriangle, Search, Trash2, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const MATCH_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  homoglyph: { label: "Homoglyph", color: "bg-danger/10 text-danger border-danger/30" },
  typosquat: { label: "Typosquat", color: "bg-warning/10 text-warning border-warning/30" },
  keyword: { label: "Keyword", color: "bg-primary/10 text-primary border-primary/30" },
};

export function BrandMonitorSection() {
  const queryClient = useQueryClient();
  const [brandInput, setBrandInput] = useState("");
  const [showDismissed, setShowDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const { data: brands, isLoading: brandsLoading } = useGetBrands();
  const alertParams = { limit: 50, offset: 0, dismissed: showDismissed ? "true" : "false" };
  const { data: alertsData, isLoading: alertsLoading } = useGetCertAlerts(alertParams, {
    query: {
      queryKey: getGetCertAlertsQueryKey(alertParams),
      refetchInterval: 30000,
    },
  });

  const { mutate: addBrand, isPending: addingBrand } = useAddBrand();
  const { mutate: deleteBrand } = useDeleteBrand();
  const { mutate: dismissAlert } = useDismissCertAlert();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetBrandsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCertAlertsQueryKey(alertParams) });
    queryClient.invalidateQueries({ queryKey: getGetCertAlertCountQueryKey() });
  };

  const handleAddBrand = () => {
    const name = brandInput.trim();
    if (!name) return;
    setError(null);

    addBrand(
      { data: { brandName: name } },
      {
        onSuccess: () => {
          setBrandInput("");
          invalidateAll();
        },
        onError: (err: unknown) => {
          let msg = "Failed to add brand";
          if (err && typeof err === "object") {
            const errObj = err as Record<string, unknown>;
            if (errObj.data && typeof errObj.data === "object") {
              const data = errObj.data as Record<string, unknown>;
              if (typeof data.error === "string") msg = data.error;
            } else if (typeof errObj.message === "string") {
              msg = errObj.message;
            }
          }
          setError(msg);
        },
      },
    );
  };

  const handleDeleteBrand = (id: number) => {
    deleteBrand(
      { id },
      {
        onSuccess: () => invalidateAll(),
      },
    );
  };

  const handleDismiss = (id: number) => {
    dismissAlert(
      { id },
      {
        onSuccess: () => invalidateAll(),
      },
    );
  };

  const handleCtScan = async () => {
    setScanning(true);
    try {
      await fetch(`${import.meta.env.BASE_URL}api/ct-scan`, { method: "POST" });
      setTimeout(() => {
        invalidateAll();
        setScanning(false);
      }, 5000);
    } catch {
      setScanning(false);
    }
  };

  const alerts = alertsData?.alerts || [];
  const undismissedCount = alertsData?.undismissedCount || 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Radar className="w-8 h-8 text-primary" />
          Brand Monitor
        </h2>
        <p className="text-muted-foreground mt-1">
          Real-time Certificate Transparency monitoring for brand impersonation detection
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-surface/50 border-border/50 lg:col-span-1">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Watchlist</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add up to 10 brand names to monitor for lookalike domains in newly issued SSL certificates.
            </p>

            <div className="flex gap-2 mb-4">
              <Input
                value={brandInput}
                onChange={(e) => {
                  setBrandInput(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAddBrand()}
                placeholder="e.g. paypal, microsoft"
                className="bg-background border-border"
                maxLength={50}
              />
              <Button
                onClick={handleAddBrand}
                disabled={addingBrand || !brandInput.trim() || (brands?.length || 0) >= 10}
                size="sm"
                className="shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-danger text-sm mb-3"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              {brandsLoading && (
                <p className="text-sm text-muted-foreground">Loading...</p>
              )}
              {brands?.map((brand) => (
                <motion.div
                  key={brand.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/50"
                >
                  <div>
                    <span className="font-medium">{brand.brandName}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      added {format(parseISO(brand.addedAt), "MMM d")}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteBrand(brand.id)}
                    className="text-muted-foreground hover:text-danger transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
              {!brandsLoading && brands?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No brands monitored yet.</p>
                  <p className="text-xs mt-1">Add a brand name to start monitoring.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                {brands?.length || 0}/10 brands
              </p>
              {(brands?.length || 0) > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCtScan}
                  disabled={scanning}
                  className="text-xs"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", scanning && "animate-spin")} />
                  {scanning ? "Scanning..." : "Scan CT Logs"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface/50 border-border/50 lg:col-span-2">
          <div className="p-6 border-b border-border/50 flex justify-between items-center bg-surface/30">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Certificate Alerts
              {undismissedCount > 0 && (
                <Badge className="bg-danger text-white ml-2">{undismissedCount}</Badge>
              )}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDismissed(!showDismissed)}
              className="text-xs"
            >
              {showDismissed ? <EyeOff className="w-3.5 h-3.5 mr-1.5" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
              {showDismissed ? "Hide Dismissed" : "Show Dismissed"}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface/80 border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 font-medium">Detected</th>
                  <th className="p-4 font-medium">Suspicious Domain</th>
                  <th className="p-4 font-medium">Target Brand</th>
                  <th className="p-4 font-medium">Method</th>
                  <th className="p-4 font-medium">Cert Issued</th>
                  <th className="p-4 font-medium">Issuer</th>
                  <th className="p-4 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-border/30">
                {alerts.map((alert) => {
                  const matchInfo = MATCH_TYPE_LABELS[alert.matchType] || {
                    label: alert.matchType,
                    color: "bg-surface text-muted-foreground border-border",
                  };
                  return (
                    <tr
                      key={alert.id}
                      className={cn(
                        "hover:bg-surface/80 transition-colors",
                        alert.dismissed && "opacity-50",
                      )}
                    >
                      <td className="p-4 text-muted-foreground whitespace-nowrap text-xs">
                        {format(parseISO(alert.detectedAt), "MM/dd HH:mm")}
                      </td>
                      <td className="p-4 font-mono text-foreground truncate max-w-[250px]" title={alert.domain}>
                        {alert.domain}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="bg-background/50 text-xs">
                          {alert.matchedBrand}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className={cn("inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold", matchInfo.color)}>
                          {matchInfo.label}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground whitespace-nowrap text-xs">
                        {alert.certIssuedAt ? format(parseISO(alert.certIssuedAt), "MM/dd HH:mm") : "-"}
                      </td>
                      <td className="p-4 text-muted-foreground text-xs truncate max-w-[150px]" title={alert.certIssuer || ""}>
                        {alert.certIssuer || "-"}
                      </td>
                      <td className="p-4">
                        {!alert.dismissed && (
                          <button
                            onClick={() => handleDismiss(alert.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                            title="Dismiss alert"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!alertsLoading && alerts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      <Radar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No alerts yet.</p>
                      <p className="text-xs mt-1">
                        {(brands?.length || 0) === 0
                          ? "Add brands to your watchlist to start monitoring."
                          : "Click \"Scan CT Logs\" to search Certificate Transparency logs, or wait for the automatic scan."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {alertsData && alertsData.total > 50 && (
            <div className="p-4 border-t border-border/50 text-center text-sm text-muted-foreground">
              Showing {alerts.length} of {alertsData.total} alerts
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
