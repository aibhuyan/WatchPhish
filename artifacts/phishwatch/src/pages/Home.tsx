import { useState } from "react";
import { NavBar } from "@/components/NavBar";
import { DashboardSection } from "@/components/DashboardSection";
import { LibrarySection } from "@/components/LibrarySection";
import { NewTechniquesSection } from "@/components/NewTechniquesSection";
import { BrandMonitorSection } from "@/components/BrandMonitorSection";
import { SimulationModal } from "@/components/SimulationModal";
import { AnimatePresence } from "framer-motion";

export default function Home() {
  const [simulationType, setSimulationType] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground relative font-sans">
      <div className="relative z-10">
        <NavBar />
        
        <main className="container mx-auto px-4 py-12 space-y-24 pb-32">
          <section id="dashboard" className="scroll-mt-24">
            <DashboardSection />
          </section>
          
          <section id="library" className="scroll-mt-24">
            <LibrarySection onSimulate={setSimulationType} />
          </section>
          
          <section id="new-techniques" className="scroll-mt-24">
            <NewTechniquesSection />
          </section>
          
          <section id="brand-monitor" className="scroll-mt-24">
            <BrandMonitorSection />
          </section>
          
        </main>
      </div>

      <AnimatePresence>
        {simulationType && (
          <SimulationModal 
            attackType={simulationType} 
            onClose={() => setSimulationType(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
