import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es as esLocale } from "date-fns/locale";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectCombobox } from "@/features/installations/components/MultiSelectCombobox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button, buttonVariants } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, Profile, Vehicle } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { upsertTask } from "@/lib/upsert-task";

const quickEditSchema = z.object({
  state: z.string(),
  startDate: z.date({ required_error: "La fecha es obligatoria." }),
  selectedUsers: z.array(z.object({ id: z.string(), name: z.string() })),
  selectedVehicles: z.array(z.object({ id: z.string(), name: z.string() })),
});

type QuickEditFormData = z.infer<typeof quickEditSchema>;

interface TaskQuickEditPanelProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  users: Profile[];
  vehicles: Vehicle[];
}

export function TaskQuickEditPanel({ task, open, onOpenChange, onSuccess, users, vehicles }: TaskQuickEditPanelProps) {
  const [saving, setSaving] = useState(false);

  const form = useForm<QuickEditFormData>({
    resolver: zodResolver(quickEditSchema),
    defaultValues: {
      state: "pendiente",
      startDate: new Date(),
      selectedUsers: [],
      selectedVehicles: [],
    },
  });

  useEffect(() => {
    if (open && task) {
      form.reset({
        state: task.state || "pendiente",
        startDate: task.start_date ? new Date(task.start_date) : new Date(),
        selectedUsers: task.assigned_users?.map((u) => ({ id: u.id, name: u.full_name })) || [],
        selectedVehicles: task.assigned_vehicles?.map((v) => ({ id: v.id, name: v.name })) || [],
      });
    }
  }, [open, task, form]);

  const onSubmit = async (data: QuickEditFormData) => {
    if (!task) return;
    setSaving(true);
    try {
      // Necesitamos obtener la pantalla de instalaciones igual que el TaskDialog original
      // o usar el task.screen_id que pueda venir. Como Task usa DetailedTask mapeada,
      // no siempre tenemos task.screen_id en TS estricto (no existe en type Task), pero en
      // tiempo de ejecución el ID puede obtenerse o usamos upsertTask.
      // Por suerte the upsertTask in admin is usually an edit, so we can re-query the screenId 
      // if missing or just fetch screen_data.
      
      const { data: screenData, error: screenError } = await supabase
        .from("screen_data")
        .select("screen_id")
        .eq("id", task.id)
        .single();
      
      if (screenError) throw screenError;
      const dbScreenId = screenData?.screen_id;
      if (!dbScreenId) throw new Error("No screen_id found for task");

      const formattedDate = format(data.startDate, "yyyy-MM-dd");
      
      const taskData = {
        taskId: task.id,
        screenId: dbScreenId,
        data: task.data || {},
        state: data.state,
        status: data.state === "terminado" ? "terminado" : task.status || "pendiente",
        startDate: formattedDate,
        endDate: task.end_date || formattedDate,
        location: task.location || null,
        locationMetadata: task.location_metadata as Record<string, unknown> || null,
        workSiteId: task.work_site_id || null,
        responsibleProfileId: task.responsible_profile_id || null,
        assignedTo: null,
        assignedProfiles: data.selectedUsers.map((u) => u.id),
        assignedVehicles: data.selectedVehicles.map((v) => v.id),
      };

      await upsertTask(supabase, taskData);
      toast.success("Tarea actualizada correctamente");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error al guardar edición rápida:", error);
      toast.error("No se pudo guardar la tarea");
    } finally {
      setSaving(false);
    }
  };

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Edición Rápida</SheetTitle>
          <SheetDescription>Modifica estado, fechas o asignaciones rápidamente.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                      <SelectItem value="terminado">Terminado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha Planificada</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP", { locale: esLocale }) : <span>Elige una fecha</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        classNames={{
                          head_cell: "text-muted-foreground rounded-md w-9 font-medium text-[0.8rem]",
                          day: cn(
                            buttonVariants({ variant: "ghost" }),
                            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
                          ),
                          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        }}
                      />
                    </PopoverContent>
                  </Popover>
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
                    options={users.map((u) => ({ id: u.id, name: u.full_name })) as any}
                    selected={field.value as any}
                    onSelectedChange={field.onChange}
                    placeholder="Añadir operarios..."
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
                    options={vehicles.map((v) => ({ id: v.id, name: v.name })) as any}
                    selected={field.value as any}
                    onSelectedChange={field.onChange}
                    placeholder="Añadir vehículos..."
                    searchPlaceholder="Buscar vehículo..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  "Guardando..."
                ) : (
                  <>
                    <Save className="mr-2 w-4 h-4" /> Guardar
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
