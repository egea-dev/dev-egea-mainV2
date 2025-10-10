import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Vehicle } from "@/types";

type VehicleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  vehicle?: Vehicle | null;
};

export const VehicleDialog = ({ open, onOpenChange, onSuccess, vehicle }: VehicleDialogProps) => {
  const [currentVehicle, setCurrentVehicle] = useState<Partial<Vehicle>>({
    name: '',
    type: '',
    license_plate: '',
    capacity: 1,
    km: 0,
    status: 'normal',
    is_active: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setCurrentVehicle({
        name: vehicle.name,
        type: vehicle.type,
        license_plate: vehicle.license_plate || '',
        capacity: vehicle.capacity || 1,
        km: vehicle.km || 0,
        status: vehicle.status || 'normal',
        is_active: vehicle.is_active !== undefined ? vehicle.is_active : true
      });
    } else {
      setCurrentVehicle({
        name: '',
        type: '',
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
    if (!currentVehicle.name || !currentVehicle.type) {
      toast.error("El nombre y tipo son obligatorios.");
      return;
    }
    setLoading(true);

    const vehicleData = {
      name: currentVehicle.name,
      type: currentVehicle.type,
      license_plate: currentVehicle.license_plate || null,
      capacity: currentVehicle.capacity || 1,
      km: currentVehicle.km || 0,
      status: currentVehicle.status || 'normal',
      is_active: currentVehicle.is_active !== undefined ? currentVehicle.is_active : true
    };

    let error;
    if (currentVehicle.id) {
      ({ error } = await supabase.from('vehicles').update(vehicleData).eq('id', currentVehicle.id));
    } else {
      ({ error } = await supabase.from('vehicles').insert(vehicleData));
    }

    if (error) {
      toast.error("Error al guardar el vehículo.");
    } else {
      toast.success(`Vehículo ${currentVehicle.id ? 'actualizado' : 'creado'}.`);
      onSuccess();
      onOpenChange(false);
    }
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
            <Input id="type" name="type" value={currentVehicle.type} onChange={handleChange} placeholder="Ej: CAMION, JUMPER..." />
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
