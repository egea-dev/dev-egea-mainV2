import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Profile } from "@/types";

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

  const handleSelectChange = (name: keyof Profile, value: 'activo' | 'baja' | 'vacaciones' | 'admin' | 'manager' | 'responsable' | 'operario') => {
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!profile.full_name) {
      toast.error("El nombre completo es obligatorio.");
      return;
    }
    setLoading(true);

    const { error } = await supabase.rpc('admin_upsert_profile', {
      p_profile_id: profile.id ?? null,
      p_full_name: profile.full_name,
      p_email: profile.email || null,
      p_phone: profile.phone || null,
      p_status: profile.status || 'activo',
      p_role: profile.role || 'operario'
    });

    if (error) {
      console.error('Supabase profiles error:', error);
      toast.error(error.message || "Error al guardar el perfil.");
      setLoading(false);
      return;
    }

    toast.success(`Perfil ${profile.id ? 'actualizado' : 'creado'} correctamente.`);
    onSuccess();
    onOpenChange(false);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "Editar Operario" : "Nuevo Operario"}</DialogTitle>
          <DialogDescription>
            {user ? "Modifica los detalles del operario." : "Crea un nuevo operario. Podrás vincularle una cuenta de usuario más tarde."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo</Label>
            <Input id="full_name" name="full_name" value={profile.full_name || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (Opcional)</Label>
            <Input id="email" name="email" type="email" value={profile.email || ''} onChange={handleChange} placeholder="Email para futura invitación" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" value={profile.phone || ''} onChange={handleChange} placeholder="+34 600 000 000" />
          </div>
          {profile.public_url && (
            <div className="space-y-2">
              <Label>URL Pública</Label>
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <span className="text-sm text-muted-foreground flex-1 truncate">{profile.public_url}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(profile.public_url, '_blank')}
                >
                  Ver
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select value={profile.role} onValueChange={(value) => handleSelectChange('role', value as 'admin' | 'responsable' | 'operario')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="operario">Operario</SelectItem>
                <SelectItem value="responsable">Responsable</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
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
