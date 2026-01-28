import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Car, Edit, Trash2, Users } from "lucide-react";
import { VehicleDialog } from "./VehicleDialog";
import type { Vehicle } from "@/types";
import { VehicleBadge, VehicleStatusBadge } from "@/components/badges";

type VehicleListProps = {
  vehicles: Vehicle[];
  onVehiclesUpdate: () => void;
};

export const VehicleList = ({ vehicles, onVehiclesUpdate }: VehicleListProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const handleOpenDialog = (vehicle: Vehicle | null = null) => {
    setSelectedVehicle(vehicle);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Estas seguro de que quieres eliminar este vehiculo?")) return;

    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar el vehiculo.");
    } else {
      toast.success("Vehiculo eliminado.");
      onVehiclesUpdate();
    }
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2 text-primary border border-border">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Gestionar vehículos
              </p>
              <p className="text-lg font-bold text-foreground">Flota disponible</p>
            </div>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            Añadir vehículo
          </Button>
        </div>

        <div className="space-y-3">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:bg-muted/30 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-muted p-2 ring-1 ring-border mt-1">
                    <Car className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{vehicle.name}</p>
                      <VehicleStatusBadge
                        status={vehicle.status || "normal"}
                        size="sm"
                        showIcon={true}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <VehicleBadge
                        name={vehicle.name}
                        type={vehicle.type}
                        size="sm"
                        showIcon={false}
                        variant="solid"
                      />
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40 border border-border/50">
                        <Users className="h-3 w-3 text-muted-foreground/70" />
                        <span className="font-medium text-foreground/80">Cap: {vehicle.capacity ?? "N/D"}</span>
                      </div>
                      {vehicle.km !== undefined && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40 border border-border/50">
                          <span className="font-mono text-primary font-bold">{vehicle.km.toLocaleString()}</span>
                          <span className="text-muted-foreground/60">km</span>
                        </div>
                      )}
                    </div>
                    {vehicle.license_plate && (
                      <div className="inline-block px-2 py-0.5 rounded border border-border bg-muted text-[10px] font-mono text-foreground font-bold">
                        {vehicle.license_plate}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => handleOpenDialog(vehicle)}
                    title="Editar vehículo"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-destructive/30 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                    onClick={() => handleDelete(vehicle.id)}
                    title="Eliminar vehículo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <VehicleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={onVehiclesUpdate}
        vehicle={selectedVehicle}
      />
    </>
  );
};
