import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Vehicle } from "@/types";

const VEHICLE_TYPE_OPTIONS = [
  { value: "jumper", label: "Jumper" },
  { value: "camion", label: "Camión" },
  { value: "furgoneta", label: "Furgoneta" },
  { value: "otro", label: "Otro" }
];

type VehicleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  vehicle?: Vehicle | null;
};

export const VehicleDialog = ({ open, onOpenChange, onSuccess, vehicle }: VehicleDialogProps) => {
  const [currentVehicle, setCurrentVehicle] = useState<Partial<Vehicle>>({
    id: undefined,
    name: '',
    type: 'otro',
    license_plate: '',
    capacity: 1,
    km: 0,
    status: 'normal',
    is_active: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicle) {
      const normalizedType = vehicle.type ? vehicle.type.toLowerCase() : '';
      const allowedType = VEHICLE_TYPE_OPTIONS.some(option => option.value === normalizedType)
        ? normalizedType
        : 'otro';

      setCurrentVehicle({
        id: vehicle.id,
        name: vehicle.name,
        type: allowedType,
        license_plate: vehicle.license_plate || '',
        capacity: vehicle.capacity || 1,
        km: vehicle.km || 0,
        status: vehicle.status || 'normal',
        is_active: vehicle.is_active !== undefined ? vehicle.is_active : true
      });
    } else {
      setCurrentVehicle({
        id: undefined,
        name: '',
        type: 'otro',
        license_plate: '',
        capacity: 1,
        km: 0,
        status: 'normal',
        is_active: true
      });
    }
  }, [vehicle, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setCurrentVehicle(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseInt(value) : 0) : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setCurrentVehicle(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const name = currentVehicle.name?.trim();
    const type = currentVehicle.type?.toString().trim().toLowerCase();

    if (!name || !type) {
      toast.error("El nombre y tipo son obligatorios.");
      return;
    }

    const isValidType = VEHICLE_TYPE_OPTIONS.some(option => option.value === type);
    if (!isValidType) {
      toast.error("Selecciona un tipo de vehículo válido.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.rpc('upsert_vehicle', {
      p_vehicle_id: currentVehicle.id ?? null,
      p_name: name,
      p_type: type,
      p_license_plate: currentVehicle.license_plate?.trim() || null,
      p_capacity: currentVehicle.capacity ?? 1,
      p_is_active: currentVehicle.is_active !== undefined ? currentVehicle.is_active : true,
      p_km: currentVehicle.km ?? 0,
      p_status: currentVehicle.status ?? 'normal'
    });

    if (error) {
      console.error('Error al guardar vehículo vía RPC:', error);
      const message = error.message ?? "Error al guardar el vehículo.";
      toast.error(message);
      setLoading(false);
      return;
    }

    const action = Array.isArray(data) ? data[0]?.result_action : undefined;
    toast.success(action === 'updated' ? 'Vehículo actualizado.' : 'Vehículo creado.');
    onSuccess();
    onOpenChange(false);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vehicle ? "Editar Vehículo" : "Nuevo Vehículo"}</DialogTitle>
          <DialogDescription>
            Añade o modifica los detalles del vehículo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" value={currentVehicle.name} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_plate">Matrícula</Label>
              <Input id="license_plate" name="license_plate" value={currentVehicle.license_plate || ''} onChange={handleChange} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={currentVehicle.type ?? 'otro'}
              onValueChange={(value) => handleSelectChange('type', value)}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Seleccionar tipo de vehículo" />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidad</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                value={currentVehicle.capacity || 1}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="km">Kilometraje</Label>
              <Input
                id="km"
                name="km"
                type="number"
                min="0"
                value={currentVehicle.km || 0}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={currentVehicle.status || 'normal'} onValueChange={(value) => handleSelectChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="accidentado">Accidentado</SelectItem>
                  <SelectItem value="revision">Revisión</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
