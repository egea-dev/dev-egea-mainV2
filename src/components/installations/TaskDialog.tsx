import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import { addDays, format, parseISO } from "date-fns";
import { es as esLocale } from "date-fns/locale";

import type { Profile, Vehicle, Task } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import type { Screen } from "@/integrations/supabase/client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { MultiSelectCombobox } from "./MultiSelectCombobox";

import { Calendar as CalendarIcon, MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildMapsSearchUrl, formatLocationLabel } from "@/utils/maps";
import { toast } from "sonner";
import { upsertTask } from "@/lib/upsert-task";

const FIELD_WRAPPER =
  "rounded-2xl border border-border/70 bg-background px-4 py-3 space-y-2 text-foreground sm:px-5 sm:py-4 backdrop-blur-xl";

const taskSchema = z.object({
  site: z.string().min(1, { message: "El sitio de trabajo es obligatorio." }),
  location: z.string().min(1, { message: "La ubicacion es obligatoria." }),
  description: z.string().min(1, { message: "La descripcion es obligatoria." }),
  dueDate: z.date({ required_error: "La fecha es obligatoria." }),
  selectedUsers: z.array(z.object({ id: z.string(), name: z.string() })),
  selectedVehicles: z.array(z.object({ id: z.string(), name: z.string() })),
  locationPreset: z.string().nullable().optional(),
  repeatEnabled: z.boolean().optional(),
  repeatDates: z.array(z.string()).optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

type DraggedItem = { type: "user"; item: Profile } | { type: "vehicle"; item: Vehicle };

type TaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  task?: Task | null;
  selectedDate: Date;
  users: Profile[];
  vehicles: Vehicle[];
  draggedItem?: DraggedItem | null;
};

const QUICK_LOCATION_PRESETS = [
  { id: "almacen", label: "Almacen central", location: "Almacen central" },
  { id: "taller", label: "Taller general", location: "Taller general" },
  { id: "oficina", label: "Oficina tecnica", location: "Oficina tecnica" },
] as const;

const DATE_KEY_FORMAT = "yyyy-MM-dd";
const toDateKey = (value: Date) => format(value, DATE_KEY_FORMAT);
const REPEAT_WINDOW_DAYS = 6;
const EMPTY_SELECT_VALUE = "__none__";

const formatRepeatLabel = (date: Date) => {
  const label = format(date, "EEEE d 'de' MMMM", { locale: esLocale });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const TaskDialog = ({ open, onOpenChange, onSuccess, task, selectedDate, users, vehicles, draggedItem }: TaskDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [installationsScreenId, setInstallationsScreenId] = useState<string | null>(null);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      site: "",
      location: "",
      description: "",
      dueDate: selectedDate,
      selectedUsers: [],
      selectedVehicles: [],
      locationPreset: null,
      repeatEnabled: false,
      repeatDates: [],
    },
  });

  const watchDueDate = form.watch("dueDate");
  const watchRepeatDates = form.watch("repeatDates") ?? [];

  const repeatOptions = useMemo(() => {
    if (!watchDueDate) return [];
    return Array.from({ length: REPEAT_WINDOW_DAYS }).map((_, index) => {
      const d = addDays(watchDueDate, index + 1);
      return { key: toDateKey(d), label: formatRepeatLabel(d) };
    });
  }, [watchDueDate]);

  useEffect(() => {
    const loadScreenId = async () => {
      const { data, error } = await supabase
        .from("screens")
        .select("id, name, screen_group, screen_type, is_active")
        .eq("is_active", true);

      if (error) {
        console.error("Error loading screens", error);
        toast.error("No se pudo cargar la configuracion de pantallas");
        return;
      }

      const normalized = (Array.isArray(data) ? data : []).map((entry) => ({
        id: entry.id,
        group: (entry.screen_group ?? "").trim().toLowerCase(),
        type: (entry.screen_type ?? "").trim().toLowerCase(),
        isActive: entry.is_active ?? true,
      }));

      const match =
        normalized.find((screen) => screen.group === "instalaciones" && screen.isActive) ||
        normalized.find((screen) => screen.type === "data" && screen.isActive) ||
        normalized[0];

      if (!match) {
        toast.error("No existe una pantalla activa para Instalaciones");
        return;
      }

      setInstallationsScreenId(match.id);
    };

    loadScreenId();
  }, []);

  useEffect(() => {
    if (!open) return;

    if (task) {
      form.reset({
        site: task.data?.site || task.location || "",
        location: task.location || "",
        description: task.data?.description || "",
        dueDate: dayjs(task.start_date).toDate(),
        selectedUsers: task.assigned_users?.map((user) => ({ id: user.id, name: user.full_name })) || [],
        selectedVehicles: task.assigned_vehicles?.map((vehicle) => ({ id: vehicle.id, name: vehicle.name })) || [],
        locationPreset: null,
        repeatEnabled: false,
        repeatDates: [],
      });
      return;
    }

    const initialUsers =
      draggedItem?.type === "user" ? [{ id: draggedItem.item.id, name: draggedItem.item.full_name }] : [];
    const initialVehicles =
      draggedItem?.type === "vehicle" ? [{ id: draggedItem.item.id, name: draggedItem.item.name }] : [];

    form.reset({
      site: "",
      location: "",
      description: "",
      dueDate: selectedDate,
      selectedUsers: initialUsers,
      selectedVehicles: initialVehicles,
      locationPreset: null,
      repeatEnabled: false,
      repeatDates: [],
    });
  }, [open, task, selectedDate, draggedItem, form]);

  const toggleRepeatDate = (key: string) => {
    const current = new Set(watchRepeatDates);
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    form.setValue("repeatDates", Array.from(current), { shouldDirty: true });
  };

  const onSubmit = async (data: TaskFormData) => {
    if (!installationsScreenId) {
      toast.error("No se pudo obtener la pantalla de Instalaciones");
      return;
    }

    setSaving(true);
    try {
      const nextState = task?.state ?? "pendiente";
      const nextStatus = task?.status ?? "pendiente";
      const normalizedLocation = formatLocationLabel(data.location);

      const repeatKeys = data.repeatEnabled ? Array.from(new Set(data.repeatDates ?? [])) : [];
      const baseKey = toDateKey(data.dueDate);
      const repeatDates = repeatKeys
        .filter((key) => key !== baseKey)
        .map((key) => parseISO(key))
        .filter((dateValue) => !Number.isNaN(dateValue.getTime()));

      const saveTask = async (targetDate: Date, taskId?: string | null) => {
        const formattedDate = dayjs(targetDate).format("YYYY-MM-DD");
        await upsertTask(supabase, {
          taskId: taskId ?? undefined,
          screenId: installationsScreenId,
          data: { site: data.site, description: data.description },
          state: nextState,
          status: nextStatus,
          startDate: formattedDate,
          endDate: formattedDate,
          location: normalizedLocation,
          locationMetadata: normalizedLocation ? { manual_label: normalizedLocation } : {},
          workSiteId: null,
          responsibleProfileId: null,
          assignedTo: null,
          assignedProfiles: data.selectedUsers.map((user) => user.id),
          assignedVehicles: data.selectedVehicles.map((vehicle) => vehicle.id),
        });
      };

      await saveTask(data.dueDate, task?.id ?? null);
      for (const dateValue of repeatDates) {
        await saveTask(dateValue, null);
      }

      toast.success(
        repeatDates.length > 0
          ? `Tarea guardada y replicada en ${repeatDates.length} dÃ­as`
          : "Tarea guardada correctamente"
      );
      onSuccess();

      const isEditing = Boolean(task?.id);
      if (isEditing) {
        onOpenChange(false);
        return;
      }

      if (repeatDates.length > 0) {
        form.reset({
          ...data,
          selectedUsers: [...data.selectedUsers],
          selectedVehicles: [...data.selectedVehicles],
          repeatEnabled: false,
          repeatDates: [],
        });
        return;
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving task:", error);
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al guardar la tarea: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto hide-scrollbar border border-border/70 bg-background/95 p-0 text-foreground backdrop-blur-2xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-2xl font-semibold text-primary">{task ? "Editar Tarea" : "Nueva Tarea"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">Completa los detalles de la tarea de planificacion.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-5 pb-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="site"
                render={({ field }) => (
                  <FormItem className={FIELD_WRAPPER}>
                    <FormLabel>Sitio de trabajo</FormLabel>
                    <FormDescription className="text-slate-400">Se muestra en la vista de instalaciones.</FormDescription>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ej. Obra Patio Central"
                       
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="locationPreset"
                render={({ field }) => (
                  <FormItem className={FIELD_WRAPPER}>
                    <FormLabel>Ubicaciones frecuentes</FormLabel>
                    <FormDescription className="text-slate-400">Aplica una plantilla rapida para sitio y direccion.</FormDescription>
                    <Select
                      value={field.value ?? EMPTY_SELECT_VALUE}
                      onValueChange={(value) => {
                        const presetId = value === EMPTY_SELECT_VALUE ? null : value;
                        field.onChange(presetId);
                        if (!presetId) return;
                        const preset = QUICK_LOCATION_PRESETS.find((entry) => entry.id === presetId);
                        if (preset) {
                          form.setValue("site", preset.location, { shouldDirty: true });
                          form.setValue("location", preset.location, { shouldDirty: true });
                        }
                      }}
                    >
                      <SelectTrigger className="border-border/70 bg-background/80 text-foreground">
                        <SelectValue placeholder="Sin plantilla" />
                      </SelectTrigger>
                      <SelectContent className="border-border/70 bg-popover/95 text-popover-foreground backdrop-blur-xl">
                        <SelectItem value={EMPTY_SELECT_VALUE}>Sin plantilla</SelectItem>
                        {QUICK_LOCATION_PRESETS.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => {
                  const value = field.value ?? "";
                  return (
                    <FormItem className={FIELD_WRAPPER}>
                      <FormLabel>Ubicacion</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <div className="relative flex-1">
                            <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              {...field}
                              value={value}
                              placeholder="Direccion, coordenadas o referencia"
                              className="pl-11"
                            />
                          </div>
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!value.trim()}
                          onClick={() => {
                            if (!value.trim()) return;
                            window.open(buildMapsSearchUrl(value), "_blank", "noopener");
                          }}
                          className="shrink-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className={FIELD_WRAPPER}>
                    <FormLabel>Fecha</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Elige una fecha</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                    <PopoverContent className="w-auto border border-border/70 bg-popover/95 p-0 text-popover-foreground backdrop-blur-xl">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        classNames={{
                          caption_label: "text-slate-200",
                          head_cell: "text-slate-500 rounded-md w-9 font-medium text-[0.8rem]",
                          day: cn(
                            buttonVariants({ variant: "ghost", size: "icon" }),
                            "h-9 w-9 p-0 font-normal text-slate-300 hover:bg-slate-800/70 aria-selected:bg-emerald-500/90 aria-selected:text-emerald-50"
                          ),
                          day_today: "bg-slate-800/80 text-slate-200",
                          nav_button: cn(
                            buttonVariants({ variant: "outline", size: "icon" }),
                            "h-7 w-7 border border-slate-700/60 bg-transparent text-slate-300 hover:bg-slate-800/70"
                          ),
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className={FIELD_WRAPPER}>
                  <FormLabel>Descripcion</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="repeatEnabled"
              render={({ field }) => (
                <FormItem className="rounded-2xl border border-dashed border-border/60 bg-background px-4 py-3 space-y-3 text-foreground sm:px-5 sm:py-4 backdrop-blur-xl">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div>
                      <FormLabel>Repetir en dÃ­as siguientes</FormLabel>
                      <FormDescription className="text-muted-foreground">
                        Duplica la tarea en fechas prÃ³ximas sin cerrar el diÃ¡logo. Usa el conmutador y marca los dÃ­as para generar copias.
                      </FormDescription>
                    </div>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (!checked) {
                          form.setValue("repeatDates", [], { shouldDirty: true });
                        }
                      }}
                    />
                  </div>
                  {field.value && (
                    repeatOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Selecciona la fecha principal primero.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {repeatOptions.map((option) => {
                          const isActive = watchRepeatDates.includes(option.key);
                          return (
                            <Button
                              key={option.key}
                              type="button"
                              variant={isActive ? "default" : "outline"}
                              size="sm"
                              className={cn(
                                isActive
                                  ? "bg-primary text-primary-foreground"
                                  : "border-border/70 text-foreground hover:bg-secondary/30"
                              )}
                              onClick={() => toggleRepeatDate(option.key)}
                            >
                              {option.label}
                            </Button>
                          );
                        })}
                      </div>
                    )
                  )}
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="selectedUsers"
                render={({ field }) => (
                  <FormItem className={FIELD_WRAPPER}>
                    <FormLabel>Operarios asignados</FormLabel>
                    <MultiSelectCombobox
                      options={users.map((user) => ({ id: user.id, name: user.full_name }))}
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
                  <FormItem className={FIELD_WRAPPER}>
                    <FormLabel>Vehiculos asignados</FormLabel>
                    <MultiSelectCombobox
                      options={vehicles.map((vehicle) => ({ id: vehicle.id, name: vehicle.name }))}
                      selected={field.value}
                      onSelectedChange={field.onChange}
                      placeholder="Seleccionar vehiculos..."
                      searchPlaceholder="Buscar vehiculo..."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border/70 hover:bg-secondary/40"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};




