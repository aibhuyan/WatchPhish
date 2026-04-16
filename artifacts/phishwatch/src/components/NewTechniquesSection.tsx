import { useGetNewTechniques } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export function NewTechniquesSection() {
  const { data: newTechs, isLoading } = useGetNewTechniques();

  const displayTechs = newTechs || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">New & Emerging Techniques</h2>
        <p className="text-muted-foreground mt-1">Recently detected attack patterns requiring immediate attention</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="h-48 bg-surface/30 animate-pulse border-border/50" />
        ))}

        {!isLoading && displayTechs.length === 0 && (
          <Card className="col-span-full bg-surface/30 border-border/50">
            <CardContent className="p-8 text-center">
              <ShieldCheck className="w-10 h-10 text-success mx-auto mb-3" />
              <p className="text-lg font-semibold">No New Threats Detected</p>
              <p className="text-sm text-muted-foreground mt-1">No new attack techniques have been identified in the last 30 days.</p>
            </CardContent>
          </Card>
        )}

        {displayTechs.map((tech) => (
          <Card key={tech.id} className="bg-gradient-to-br from-danger/10 to-surface border-danger/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-danger/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-start mb-4">
                <Badge className="bg-danger text-danger-foreground hover:bg-danger">NEW THREAT</Badge>
                <AlertTriangle className="w-5 h-5 text-danger opacity-80" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{tech.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{tech.description}</p>
              
              <div className="flex items-center gap-2 text-xs font-medium text-danger/80 bg-danger/5 p-2 rounded border border-danger/10">
                <ShieldCheck className="w-4 h-4" /> Defense rules updated
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
