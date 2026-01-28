import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseProductivity, supabaseMain } from "@/integrations/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Laptop,
  Smartphone,
  RefreshCw,
  Tv,
  LayoutDashboard,
  Info
} from "lucide-react";
import { toast } from "sonner";
import PageShell from "@/components/layout/PageShell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- Tipos ---
interface KioskScreen {
  id: string;
  name: string;
  location: string | null;
  kiosk_type: 'MONITOR' | 'TABLET' | 'TERMINAL' | null;
  config?: any;
  is_active: boolean | null;
  last_ping: string | null;
  created_at: string | null;
}

interface GeneralScreen {
  id: string;
  name: string;
  screen_type: string;
  refresh_interval_sec: number;
  created_at: string;
}

const KIOSK_TYPES: Record<string, { label: string; color: string; icon: any }> = {
  MONITOR: { label: "Producción", color: "bg-orange-900/40 text-orange-200 border-orange-700/50", icon: Tv },
  TABLET: { label: "Tablet", color: "bg-blue-900/40 text-blue-200 border-blue-700/50", icon: Smartphone },
  TERMINAL: { label: "Almacén", color: "bg-indigo-900/40 text-indigo-200 border-indigo-700/50", icon: Monitor },
};

const KioskPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("production");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // State for Production Screen Creation
  const [newScreen, setNewScreen] = useState({
    name: "",
    location: "",
    kiosk_type: "MONITOR" as "MONITOR" | "TABLET" | "TERMINAL"
  });

  // --- Queries ---

  // 1. Production Screens (Productivity DB)
  const { data: productionScreens, isLoading: isLoadingProduction } = useQuery({
    queryKey: ["kiosk-screens"],
    queryFn: async () => {
      const { data, error } = await supabaseProductivity
        .from("kiosk_screens")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as KioskScreen[];
    },
  });

  // 2. General Screens (Main DB)
  const { data: generalScreens, isLoading: isLoadingGeneral } = useQuery({
    queryKey: ["general-screens"],
    queryFn: async () => {
      const { data, error } = await supabaseMain
        .from("screens")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as GeneralScreen[];
    },
  });

  // --- Mutations (Only for Production Screens for now as per task) ---
  const createMutation = useMutation({
    mutationFn: async (screen: typeof newScreen) => {
      const { data, error } = await supabaseProductivity
        .from("kiosk_screens")
        .insert([{
          name: screen.name,
          location: screen.location,
          kiosk_type: screen.kiosk_type,
          config: { theme: "dark" },
          is_active: true
        }] as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kiosk-screens"] });
      toast.success("Pantalla de producción creada");
      setIsDialogOpen(false);
      setNewScreen({ name: "", location: "", kiosk_type: "MONITOR" });
    },
    onError: (err: any) => toast.error("Error al crear pantalla: " + err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseProductivity
        .from("kiosk_screens")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kiosk-screens"] });
      toast.success("Pantalla eliminada");
    },
    onError: (err: any) => toast.error("Error al eliminar: " + err.message)
  });

  const updateThemeMutation = useMutation({
    mutationFn: async ({ id, theme, config }: { id: string; theme: 'dark' | 'light'; config?: any }) => {
      const baseConfig = (config && typeof config === 'object' && !Array.isArray(config)) ? config : {};
      // @ts-ignore
      const { error } = await supabaseProductivity
        .from("kiosk_screens")
        // @ts-ignore
        .update({ config: { ...baseConfig, theme } })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kiosk-screens"] });
      toast.success("Modo actualizado");
    },
    onError: (err: any) => toast.error("Error al actualizar modo: " + err.message)
  });

  // --- Helpers ---
  const getDaysElapsed = (createdAt: string | null) => {
    if (!createdAt) return 0;
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  };

  const getBorderColor = (kioskType: string | null) => {
    switch (kioskType) {
      case 'MONITOR': return 'border-l-orange-500';
      case 'TERMINAL': return 'border-l-indigo-500';
      case 'TABLET': return 'border-l-blue-500';
      default: return 'border-l-gray-600';
    }
  };

  const getScreenTheme = (screen: KioskScreen) => {
    const config = screen.config;
    if (config && typeof config === 'object' && !Array.isArray(config)) {
      return config.theme === 'light' ? 'light' : 'dark';
    }
    return 'dark';
  };

  const getDestinationLabel = (kioskType: string | null) => {
    switch (kioskType) {
      case 'MONITOR': return 'PlantBoard';
      case 'TERMINAL': return 'ShippingBoard';
      case 'TABLET': return 'Scanner';
      default: return 'Kiosk';
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("URL copiada al portapapeles");
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success("URL copiada al portapapeles");
        } catch (err) {
          console.error('Fallback: Oops, unable to copy', err);
          toast.error("No se pudo copiar la URL automáticamente");
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Async: Could not copy text: ', err);
      toast.error("Error al copiar URL");
    }
  };

  const getProductionUrl = (screen: KioskScreen) => {
    const baseUrl = `${window.location.protocol}//${window.location.host}`;
    if (screen.kiosk_type === 'MONITOR') {
      return `${baseUrl}/kiosk/board?token=${screen.id}`;
    }
    if (screen.kiosk_type === 'TERMINAL') {
      return `${baseUrl}/kiosk/shipping?token=${screen.id}`;
    }
    return `${baseUrl}/kiosk?token=${screen.id}`;
  };

  const getGeneralUrl = (screen: GeneralScreen) => {
    const baseUrl = `${window.location.protocol}//${window.location.host}`;
    return `${baseUrl}/display/${screen.id}`;
  };

  return (
    <PageShell
      title="Gestión de Pantallas"
      description="Administración centralizada de dispositivos de planta y visualización general"
    >
      <Tabs defaultValue="production" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="bg-muted border border-border">
            <TabsTrigger value="production" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LayoutDashboard className="w-4 h-4 mr-2" /> Producción
            </TabsTrigger>
            <TabsTrigger value="general" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Info className="w-4 h-4 mr-2" /> Info General
            </TabsTrigger>
          </TabsList>

          {activeTab === "production" && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  <Plus className="w-4 h-4 mr-2" /> Nueva Pantalla Producción
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground">
                <DialogHeader>
                  <DialogTitle>Nueva Pantalla de Producción</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Dispositivo conectado a la base de datos de Productividad.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nombre del Dispositivo</Label>
                    <Input
                      placeholder="Ej: Pantalla Corte 1"
                      value={newScreen.name}
                      onChange={e => setNewScreen({ ...newScreen, name: e.target.value })}
                      className="bg-muted/30 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ubicación / Zona</Label>
                    <Input
                      placeholder="Ej: Nave Principal - Zona A"
                      value={newScreen.location}
                      onChange={e => setNewScreen({ ...newScreen, location: e.target.value })}
                      className="bg-muted/30 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Función</Label>
                    <Select
                      value={newScreen.kiosk_type || "MONITOR"}
                      onValueChange={(v: any) => setNewScreen({ ...newScreen, kiosk_type: v })}
                    >
                      <SelectTrigger className="bg-muted/30 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="MONITOR">Producción (Monitor Planificación)</SelectItem>
                        <SelectItem value="TERMINAL">Almacén (Terminal)</SelectItem>
                        <SelectItem value="TABLET">Tablet / Móvil (Escáner)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-border hover:bg-muted">Cancelar</Button>
                  <Button onClick={() => createMutation.mutate(newScreen)} disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {createMutation.isPending ? "Creando..." : "Crear Pantalla"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="production" className="space-y-4">
          {/* HEADER */}
          <div className="px-8 py-4 bg-muted/60 rounded-t-lg grid grid-cols-12 gap-4 text-muted-foreground font-bold text-sm uppercase tracking-wider border-b border-border">
            <div className="col-span-3">Nombre / Ubicación</div>
            <div className="col-span-2">Tipo</div>
            <div className="col-span-3">URL</div>
            <div className="col-span-1">Modo</div>
            <div className="col-span-2">Estado</div>
            <div className="col-span-1 text-right">Acciones</div>
          </div>

          {/* BODY */}
          <div className="space-y-3 px-4">
            {isLoadingProduction ? (
              <div className="text-center py-12 text-gray-500">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                <p>Cargando dispositivos...</p>
              </div>
            ) : productionScreens?.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay pantallas configuradas</p>
              </div>
            ) : (
              productionScreens?.map((screen) => {
                const typeConfig = KIOSK_TYPES[screen.kiosk_type || 'MONITOR'] || KIOSK_TYPES.MONITOR;
                const url = getProductionUrl(screen);
                const daysElapsed = getDaysElapsed(screen.created_at);
                const borderColor = getBorderColor(screen.kiosk_type);
                const destination = getDestinationLabel(screen.kiosk_type);

                return (
                  <div
                    key={screen.id}
                    className={`grid grid-cols-12 gap-4 items-center bg-card p-4 rounded-lg border-l-4 ${borderColor} shadow-sm hover:border-border transition-all border border-transparent`}
                  >
                    {/* COL 1: NOMBRE / UBICACIÓN */}
                    <div className="col-span-3">
                      <div className="text-foreground font-bold text-base">{screen.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{screen.location || 'Sin ubicación'}</div>
                    </div>

                    {/* COL 2: TIPO */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-3">
                        <typeConfig.icon className="w-6 h-6 text-primary" />
                        <div>
                          <div className="text-sm font-bold text-foreground">{typeConfig.label}</div>
                          <div className="text-xs text-muted-foreground">{destination}</div>
                        </div>
                      </div>
                    </div>

                    {/* COL 3: URL */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-2 bg-muted/40 p-2 rounded border border-border">
                        <span className="text-xs text-muted-foreground truncate flex-1 font-mono">{url}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-muted hover:text-foreground flex-shrink-0"
                          onClick={() => handleCopyUrl(url)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-primary/20 hover:text-primary flex-shrink-0"
                          onClick={() => window.open(url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* COL 4: MODO */}
                    <div className="col-span-1">
                      <Select
                        value={getScreenTheme(screen)}
                        onValueChange={(value) => {
                          updateThemeMutation.mutate({
                            id: screen.id,
                            theme: value as 'dark' | 'light',
                            config: screen.config
                          });
                        }}
                      >
                        <SelectTrigger className="bg-muted/40 border-border h-8 text-xs text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="dark">Actual</SelectItem>
                          <SelectItem value="light">Claro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* COL 5: ESTADO */}
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <Badge variant="outline" className={screen.is_active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" : "bg-muted text-muted-foreground border-border"}>
                        {screen.is_active ? 'ACTIVA' : 'INACTIVA'}
                      </Badge>
                      <div className="text-center bg-muted/50 border border-border rounded-lg px-2 py-1">
                        <span className="text-lg font-black text-foreground tracking-tighter">{daysElapsed}</span>
                        <span className="text-xs text-muted-foreground uppercase font-bold ml-1">{daysElapsed === 1 ? 'dia' : 'dias'}</span>
                      </div>
                    </div>

                    {/* COL 6: ACCIONES */}
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm('¿Seguro que quieres eliminar esta pantalla?')) {
                            deleteMutation.mutate(screen.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          {/* HEADER */}
          <div className="px-8 py-4 bg-[#111] rounded-t-lg grid grid-cols-12 gap-4 text-gray-500 font-bold text-sm uppercase tracking-wider border-b border-white/5">
            <div className="col-span-3">Nombre</div>
            <div className="col-span-2">Tipo</div>
            <div className="col-span-5">URL</div>
            <div className="col-span-1">Refresh</div>
            <div className="col-span-1">Días</div>
          </div>

          {/* BODY */}
          <div className="space-y-3 px-4">
            {isLoadingGeneral ? (
              <div className="text-center py-12 text-gray-500">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                <p>Cargando pantallas generales...</p>
              </div>
            ) : generalScreens?.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Info className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay pantallas generales</p>
              </div>
            ) : (
              generalScreens?.map((screen) => {
                const url = getGeneralUrl(screen);
                const daysElapsed = getDaysElapsed(screen.created_at);

                return (
                  <div
                    key={screen.id}
                    className="grid grid-cols-12 gap-4 items-center bg-[#1A1D1F] p-4 rounded-lg border-l-4 border-l-slate-500 shadow-lg hover:bg-[#1F2225] transition-colors"
                  >
                    {/* COL 1: NOMBRE */}
                    <div className="col-span-3">
                      <div className="text-white font-bold text-base">{screen.name}</div>
                      <div className="text-xs text-gray-500 mt-1">Info General</div>
                    </div>

                    {/* COL 2: TIPO */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-3">
                        <LayoutDashboard className="w-6 h-6 text-blue-500" />
                        <div>
                          <div className="text-sm font-bold text-white">{screen.screen_type || 'GENERAL'}</div>
                          <div className="text-xs text-gray-500">DisplayPage</div>
                        </div>
                      </div>
                    </div>

                    {/* COL 3: URL */}
                    <div className="col-span-5">
                      <div className="flex items-center gap-2 bg-black/20 p-2 rounded border border-white/5">
                        <span className="text-xs text-gray-500 truncate flex-1 font-mono">{url}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-white/10 hover:text-white flex-shrink-0"
                          onClick={() => handleCopyUrl(url)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-blue-600/20 hover:text-blue-400 flex-shrink-0"
                          onClick={() => window.open(url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* COL 4: REFRESH */}
                    <div className="col-span-1">
                      <div className="flex items-center gap-1 justify-center">
                        <RefreshCw className="w-3 h-3 text-blue-400" />
                        <span className="text-xs text-blue-400 font-mono font-bold">{screen.refresh_interval_sec}s</span>
                      </div>
                    </div>

                    {/* COL 5: DÍAS */}
                    <div className="col-span-1 flex justify-center">
                      <div className="text-center bg-[#0F1113] border border-[#45474A]/60 rounded-lg px-2 py-1">
                        <span className="text-lg font-black text-white tracking-tighter">{daysElapsed}</span>
                        <span className="text-xs text-gray-500 uppercase font-bold ml-1">{daysElapsed === 1 ? 'd' : 'd'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
};

export default KioskPage;
