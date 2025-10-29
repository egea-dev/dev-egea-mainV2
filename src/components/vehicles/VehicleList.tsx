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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-2 text-orange-600">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Gestionar vehiculos
              </p>
              <p className="text-lg font-semibold text-slate-900">Flota disponible</p>
            </div>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="rounded-full bg-[#ff6b4a] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#ff5f3a]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Anadir vehiculo
          </Button>
        </div>

        <div className="space-y-3">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-slate-100 p-2 ring-1 ring-slate-200">
                    <Car className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{vehicle.name}</p>
                      <VehicleStatusBadge
                        status={vehicle.status || "normal"}
                        size="sm"
                        showIcon={true}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <VehicleBadge
                        name={vehicle.name}
                        type={vehicle.type}
                        size="sm"
                        showIcon={false}
                        variant="solid"
                      />
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>Capacidad: {vehicle.capacity ?? "N/D"}</span>
                      </div>
                      {vehicle.km !== undefined && (
                        <div className="flex items-center gap-1">
                          <span>KM: {vehicle.km.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    {vehicle.license_plate && (
                      <p className="text-xs text-muted-foreground">
                        Matricula: {vehicle.license_plate}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
                    onClick={() => handleOpenDialog(vehicle)}
                    title="Editar vehiculo"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50"
                    onClick={() => handleDelete(vehicle.id)}
                    title="Eliminar vehiculo"
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
