import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Profile } from "@/types";
import { getUserRoleLabel } from "@/lib/constants";
import { useProfile } from "@/hooks/use-supabase";

type UserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  user?: Profile | null;
};

export const UserDialog = ({ open, onOpenChange, onSuccess, user }: UserDialogProps) => {
  const [profile, setProfile] = useState<Partial<Profile>>({
    full_name: '',
    email: '',
    phone: '',
    status: 'activo',
    role: 'operario'
  });
  const [loading, setLoading] = useState(false);
  const { data: currentUserProfile } = useProfile();

  const actorRole = currentUserProfile?.role;

  const roleOptions: Profile["role"][] = ["operario", "responsable", "manager", "admin", "produccion", "envios", "almacen", "comercial"];

  const disableRoleSelect =
    actorRole !== undefined &&
    actorRole !== "admin" &&
    user?.role === "admin";

  useEffect(() => {
    if (user) {
      setProfile(user);
    } else {
      setProfile({
        full_name: '',
        email: '',
        phone: '',
        status: 'activo',
        role: 'operario'
      });
    }
  }, [user, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof Profile, value: any) => {
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!profile.full_name) {
      toast.error("El nombre completo es obligatorio.");
      return;
    }
    setLoading(true);

    const { error } = await (supabase.rpc as any)('admin_upsert_profile', {
      p_full_name: profile.full_name,
      p_profile_id: profile.id ?? null,
      p_email: profile.email || null,
      p_phone: profile.phone || null,
      p_status: profile.status || 'activo',
      p_role: profile.role || 'operario',
      p_has_driving_license: profile.has_driving_license || false,
      p_has_residence_certificate: profile.has_residence_certificate || false
    });

    if (error) {
      console.error('Supabase profiles error:', error);
      const normalizedMessage = error.message || "Error al guardar el perfil.";
      if (normalizedMessage.includes('No existe un perfil asociado')) {
        toast.error("Tu usuario no tiene un perfil vinculado. Revisa tu ficha en Configuración > Mi Perfil antes de crear operarios.");
      } else {
        toast.error(normalizedMessage);
      }
      setLoading(false);
      return;
    }

    toast.success(`Perfil ${profile.id ? 'actualizado' : 'creado'} correctamente.`);
    onSuccess();
    onOpenChange(false);
    setLoading(false);
  };

  const handleCheckboxChange = (name: keyof Profile, checked: boolean) => {
    setProfile(prev => ({ ...prev, [name]: checked }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
          <DialogDescription>
            {user ? "Modifica los detalles del usuario." : "Crea un nuevo usuario. Podrás vincularle una cuenta de acceso más tarde."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo</Label>
            <Input id="full_name" name="full_name" value={profile.full_name || ''} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (Opcional)</Label>
              <Input id="email" name="email" type="email" value={profile.email || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" value={profile.phone || ''} onChange={handleChange} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 border p-3 rounded-lg bg-muted/20">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="has_driving_license" 
                checked={profile.has_driving_license || false} 
                onChange={(e) => handleCheckboxChange('has_driving_license', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="has_driving_license" className="text-xs cursor-pointer">Carnet Conducir</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="has_residence_certificate" 
                checked={profile.has_residence_certificate || false} 
                onChange={(e) => handleCheckboxChange('has_residence_certificate', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="has_residence_certificate" className="text-xs cursor-pointer">Certif. Residencia</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select
              value={profile.role}
              onValueChange={(value) => handleSelectChange('role', value as Profile['role'])}
            >
              <SelectTrigger disabled={disableRoleSelect}>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((roleOption) => (
                  <SelectItem
                    key={roleOption}
                    value={roleOption}
                  >
                    {getUserRoleLabel(roleOption)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select value={profile.status} onValueChange={(value) => handleSelectChange('status', value as 'activo' | 'baja' | 'vacaciones')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
                <SelectItem value="vacaciones">Vacaciones</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="default" onClick={handleSubmit} disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
