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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-900 p-2 text-blue-400 border border-slate-800">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Gestionar vehículos
              </p>
              <p className="text-lg font-semibold text-white">Flota disponible</p>
            </div>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 shadow-lg shadow-blue-900/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            Añadir vehículo
          </Button>
        </div>

        <div className="space-y-3">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="group flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/20 p-4 transition-colors hover:bg-slate-900/40 hover:border-slate-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-slate-800 p-2 ring-1 ring-slate-700 mt-1">
                    <Car className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-200">{vehicle.name}</p>
                      <VehicleStatusBadge
                        status={vehicle.status || "normal"}
                        size="sm"
                        showIcon={true}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <VehicleBadge
                        name={vehicle.name}
                        type={vehicle.type}
                        size="sm"
                        showIcon={false}
                        variant="solid"
                      />
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-950/40 border border-slate-800/50">
                        <Users className="h-3 w-3 text-slate-500" />
                        <span>Cap: {vehicle.capacity ?? "N/D"}</span>
                      </div>
                      {vehicle.km !== undefined && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-950/40 border border-slate-800/50">
                          <span className="font-mono text-blue-400">{vehicle.km.toLocaleString()}</span>
                          <span className="text-slate-600">km</span>
                        </div>
                      )}
                    </div>
                    {vehicle.license_plate && (
                      <div className="inline-block px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-[10px] font-mono text-slate-300">
                        {vehicle.license_plate}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                    onClick={() => handleOpenDialog(vehicle)}
                    title="Editar vehículo"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-red-900/30 text-slate-500 hover:bg-red-950/30 hover:text-red-400 hover:border-red-900/50"
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
