import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Task, Profile, Vehicle } from '@/types';
import dayjs from 'dayjs';
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MultiSelectCombobox } from "./MultiSelectCombobox"; // Asumo que este componente ya existe y es reutilizable

// Tarea 3.3: Esquema de validación con Zod
const taskSchema = z.object({
  site: z.string().min(1, { message: "El sitio de trabajo es obligatorio." }),
  description: z.string().min(1, { message: "La descripción es obligatoria." }),
  dueDate: z.date({ required_error: "La fecha es obligatoria." }),
  selectedUsers: z.array(z.object({ id: z.string(), name: z.string() })),
  selectedVehicles: z.array(z.object({ id: z.string(), name: z.string() })),
});

type TaskFormData = z.infer<typeof taskSchema>;

type TaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  task?: Task | null;
  selectedDate: Date;
  users: Profile[];
  vehicles: Vehicle[];
  draggedItem?: { type: string; item: Profile | Vehicle } | null;
};

export const TaskDialog = ({ open, onOpenChange, onSuccess, task, selectedDate, users, vehicles, draggedItem }: TaskDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [installationsScreenId, setInstallationsScreenId] = useState<string | null>(null);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      site: '',
      description: '',
      dueDate: selectedDate,
      selectedUsers: [],
      selectedVehicles: [],
    }
  });

  // Cargar el screen_id de Instalaciones
  useEffect(() => {
    const loadInstallationsScreen = async () => {
      const { data, error } = await supabase
        .from('screens')
        .select('id, name, screen_group, screen_type, is_active')
        .eq('is_active', true);

      if (error) {
        console.error('Error loading Instalaciones screen:', error);
        toast.error('No se pudo cargar la pantalla de Instalaciones.');
        return;
      }

      const allScreens = Array.isArray(data) ? data : data ? [data] : [];
      if (allScreens.length === 0) {
        toast.error('No hay pantallas configuradas.');
        console.warn('No screens returned from Supabase.');
        return;
      }

      const normalized = allScreens.map((screen) => ({
        id: (screen as { id: string }).id,
        name: ((screen as { name?: string }).name || '').trim().toLowerCase(),
        group: ((screen as { screen_group?: string }).screen_group || '').trim().toLowerCase(),
        type: ((screen as { screen_type?: string }).screen_type || '').trim().toLowerCase(),
        isActive: (screen as { is_active?: boolean }).is_active ?? true,
      }));

      const matchExact = normalized.find((screen) => screen.group === 'instalaciones' && screen.isActive);
      const matchByName = normalized.find((screen) => screen.name.includes('instal') && screen.isActive);
      const matchByType = normalized.find((screen) => screen.type === 'data' && screen.isActive);
      const fallback = normalized[0];

      const selected = matchExact || matchByName || matchByType || fallback;

      if (!selected) {
        toast.error('No existe una pantalla de Instalaciones activa.');
        console.warn('No suitable screen found among results.', normalized);
        return;
      }

      setInstallationsScreenId(selected.id);
    };
    loadInstallationsScreen();
  }, []);

  useEffect(() => {
    if (open) {
      if (task) {
        form.reset({
          site: task.data?.site || '',
          description: task.data?.description || '',
          dueDate: dayjs(task.start_date).toDate(),
          selectedUsers: task.assigned_users?.map(u => ({ id: u.id, name: u.full_name })) || [],
          selectedVehicles: task.assigned_vehicles?.map(v => ({ id: v.id, name: v.name })) || [],
        });
      } else {
        form.reset({
          site: '',
          description: '',
          dueDate: selectedDate,
          selectedUsers: draggedItem?.type === 'user' ? [{ id: (draggedItem.item as Profile).id, name: (draggedItem.item as Profile).full_name }] : [],
          selectedVehicles: draggedItem?.type === 'vehicle' ? [{ id: (draggedItem.item as Vehicle).id, name: (draggedItem.item as Vehicle).name }] : [],
        });
      }
    }
  }, [task, open, selectedDate, draggedItem, form]);

  const onSubmit = async (data: TaskFormData) => {
    if (!installationsScreenId) {
      toast.error('Error: No se pudo encontrar la pantalla de Instalaciones');
      return;
    }

    setSaving(true);
    try {
      const formattedDate = dayjs(data.dueDate).format('YYYY-MM-DD');

      const { data: result, error } = await supabase.rpc('upsert_task', {
        p_task_id: task?.id || undefined,
        p_screen_id: installationsScreenId,
        p_data: {
          site: data.site,
          description: data.description,
        },
        p_state: 'pendiente',
        p_status: 'pendiente',
        p_start_date: formattedDate,
        p_end_date: formattedDate,
        p_location: 'en la isla',
        p_responsible_profile_id: null,
        p_assigned_to: null,
        p_assigned_profiles: data.selectedUsers.map(u => u.id),
        p_assigned_vehicles: data.selectedVehicles.map(v => v.id),
      });

      if (error) {
        console.error('Error saving task:', error);
        toast.error('Error al guardar la tarea: ' + error.message);
        return;
      }

      toast.success(task ? 'Tarea actualizada correctamente' : 'Tarea creada correctamente');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast.error('Error al guardar la tarea: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? "Editar Tarea" : "Nueva Tarea"}</DialogTitle>
          <DialogDescription>Completa los detalles de la tarea de planificación.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="site"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sitio de Trabajo</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : <span>Elige una fecha</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="selectedUsers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operarios Asignados</FormLabel>
                  <MultiSelectCombobox
                    options={users.map(u => ({ id: u.id, name: u.full_name }))}
                    selected={field.value}
                    onSelectedChange={field.onChange}
                    placeholder="Seleccionar operarios..."
                    searchPlaceholder="Buscar operario..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="selectedVehicles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehículos Asignados</FormLabel>
                  <MultiSelectCombobox
                    options={vehicles.map(v => ({ id: v.id, name: v.name }))}
                    selected={field.value}
                    onSelectedChange={field.onChange}
                    placeholder="Seleccionar vehículos..."
                    searchPlaceholder="Buscar vehículo..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
