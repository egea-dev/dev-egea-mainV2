import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SCREEN_GROUPS } from "@/lib/constants";

type Template = { id: string; name: string; };
type Screen = {
  id: string;
  name: string;
  is_active: boolean;
  refresh_interval_sec: number;
  template_id: string | null;
  screen_type: 'data' | 'display';
  next_screen_id?: string | null;
  screen_group?: string | null;
  header_color?: string | null;
};

type ScreenDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  screen?: Screen | null;
  allScreens: Screen[];
};

export const ScreenDialog = ({ open, onOpenChange, onClose, screen, allScreens }: ScreenDialogProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [groupInput, setGroupInput] = useState('');
  const [formData, setFormData] = useState<Partial<Screen>>({
    name: '',
    is_active: true,
    refresh_interval_sec: 30,
    screen_type: 'data',
    template_id: null,
    next_screen_id: null,
    screen_group: '',
    header_color: '#000000',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      console.log('Dialog opened with screen:', screen);
      loadTemplatesAndGroups();
      const initialGroup = screen?.screen_group || '';
      setFormData({
        name: screen?.name || '',
        is_active: screen?.is_active ?? true,
        refresh_interval_sec: screen?.refresh_interval_sec || 30,
        screen_type: (screen?.screen_type as 'data' | 'display') || 'data',
        template_id: screen?.template_id || null,
        next_screen_id: screen?.next_screen_id || null,
        screen_group: initialGroup,
        header_color: screen?.header_color || '#000000',
      });
      setGroupInput(initialGroup);
    }
  }, [open, screen]);

  const loadTemplatesAndGroups = async () => {
    try {
      const [{ data: templatesData, error: templatesError }, { data: groupsData, error: groupsError }] = await Promise.all([
        supabase.from("templates").select("id, name").order("name"),
        supabase.from("screens").select("screen_group").order("screen_group")
      ]);

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      if (groupsError) {
        console.error("Error loading screen groups:", groupsError);
      }

      const groupSet = new Set<string>();
      Object.values(SCREEN_GROUPS).forEach((group) => groupSet.add(group));
      (groupsData || []).forEach((entry) => {
        const groupName = entry?.screen_group as string | null;
        if (groupName) {
          groupSet.add(groupName);
        }
      });

      const sortedGroups = Array.from(groupSet)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      setAvailableGroups(sortedGroups);
    } catch (error) {
      console.error("Error loading templates/groups:", error);
      toast.error("No se pudieron cargar las plantillas o grupos disponibles.");
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof Screen, value: string) => {
    const realValue = value === "null" ? null : value;
    setFormData(prev => ({ ...prev, [name]: realValue }));
  };

  const handleSwitchChange = (name: keyof Screen, checked: boolean) => {
    setFormData(prev => ({...prev, [name]: checked}));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedGroup = groupInput.trim();
      const screenData = {
        name: formData.name,
        template_id: formData.template_id || null,
        refresh_interval_sec: Number(formData.refresh_interval_sec),
        is_active: formData.is_active,
        screen_type: formData.screen_type,
        next_screen_id: formData.next_screen_id || null,
        screen_group: normalizedGroup !== '' ? normalizedGroup : null,
        header_color: formData.header_color || '#000000',
      };

      if (screen?.id) {
        const { error } = await supabase.from("screens").update(screenData).eq("id", screen.id);
        if (error) throw error;
        toast.success("Pantalla actualizada");
      } else {
        const { error } = await supabase.from("screens").insert(screenData);
        if (error) throw error;
        toast.success("Pantalla creada");
      }
      onClose();
    } catch (error) {
      console.error("Error saving screen:", error);
      toast.error("Error al guardar la pantalla.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{screen ? "Editar Pantalla" : "Nueva Pantalla"}</DialogTitle>
          <DialogDescription>
            Configura los detalles y las conexiones de tu pantalla.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="header_color">Color de cabecera</Label>
              <Input id="header_color" name="header_color" type="color" value={formData.header_color || '#000000'} onChange={handleChange} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="screen_group">Grupo de Pantallas</Label>
            <Input
              id="screen_group"
              name="screen_group"
              value={groupInput}
              onChange={(event) => {
                const value = event.target.value;
                setGroupInput(value);
                setFormData((prev) => ({ ...prev, screen_group: value }));
              }}
              list="screen-groups-suggestions"
              placeholder="Ej: Producción, Logística, etc."
            />
            <datalist id="screen-groups-suggestions">
              {availableGroups.map((group) => (
                <option key={group} value={group} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              Escribe un nombre nuevo o selecciona uno existente.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">Plantilla</Label>
            <Select value={formData.template_id || "null"} onValueChange={(val) => handleSelectChange('template_id', val)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar plantilla" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="null">Ninguna</SelectItem>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="screen_type">Tipo de Pantalla</Label>
            <Select value={formData.screen_type || 'data'} onValueChange={(val: string) => handleSelectChange('screen_type', val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="data">Datos</SelectItem>
                <SelectItem value="display">Visualización</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_screen_id">Siguiente Pantalla (al acabar)</Label>
            <Select value={formData.next_screen_id || "null"} onValueChange={(val) => handleSelectChange('next_screen_id', val)}>
              <SelectTrigger><SelectValue placeholder="Ninguna" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="null">Ninguna</SelectItem>
                {allScreens.filter(s => s.id !== screen?.id).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">Intervalo de Refresco (segundos)</Label>
            <Input id="interval" name="refresh_interval_sec" type="number" min="5" value={formData.refresh_interval_sec || 30} onChange={handleChange} required />
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="active" checked={formData.is_active} onCheckedChange={(val) => handleSwitchChange('is_active', val)} />
            <Label htmlFor="active">Pantalla Activa</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
