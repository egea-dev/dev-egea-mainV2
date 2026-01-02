import React, { useState } from "react";
import { Package, Warehouse } from "lucide-react";
import { MaterialsSection } from "@/components/almacen/MaterialsSection";
import { cn } from "@/lib/utils";
import PageShell from "@/components/layout/PageShell";

type TabType = "inventory" | "materials";

export default function WarehousePage() {
  const [activeTab, setActiveTab] = useState<TabType>("materials");

  return (
    <PageShell
      title="Almacen"
      description="Control de almacen e inventario."
    >
      <div className="space-y-6">
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab("materials")}
            className={cn(
              "relative px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "materials"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Materiales
            </div>
            {activeTab === "materials" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={cn(
              "relative px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "inventory"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4" />
              Almacen
            </div>
            {activeTab === "inventory" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        <div className="mt-6">
          {activeTab === "materials" && <MaterialsSection />}
          {activeTab === "inventory" && (
            <div className="bg-background/40 p-8 rounded-2xl border border-border/60 text-center">
              <Warehouse className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Almacen</h3>
              <p className="text-muted-foreground">
                Seccion de almacen en desarrollo.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
