import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Car, Edit, Trash2, Users } from "lucide-react";
import { VehicleDialog } from "./VehicleDialog";
import { Vehicle } from "@/types";
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
    if (!confirm('¿Estás seguro de que quieres eliminar este vehículo?')) return;
    
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar el vehículo.');
    } else {
      toast.success('Vehículo eliminado.');
      onVehiclesUpdate();
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Botón de añadir */}
        <Button onClick={() => handleOpenDialog()} className="w-full">
          <Plus className="mr-2 h-4 w-4" />Añadir Vehículo
        </Button>

        {/* Lista de vehículos */}
        <div className="space-y-3">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Car className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{vehicle.name}</p>
                    <VehicleStatusBadge
                      status={vehicle.status || 'normal'}
                      size="sm"
                      showIcon={true}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <VehicleBadge
                      name={vehicle.name}
                      type={vehicle.type}
                      size="sm"
                      showIcon={false}
                      variant="solid"
                    />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>Capacidad: {vehicle.capacity}</span>
                    </div>
                    {vehicle.km !== undefined && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="font-medium">KM: {vehicle.km.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  {vehicle.license_plate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Matrícula: {vehicle.license_plate}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleOpenDialog(vehicle)}
                  title="Editar vehículo"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(vehicle.id)}
                  title="Eliminar vehículo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
