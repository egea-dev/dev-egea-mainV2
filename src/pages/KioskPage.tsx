import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseProductivity, supabaseMain } from "@/integrations/supabase/dual-client";
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

  // --- Helpers ---
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
          <TabsList className="bg-[#1A1D1F] border border-white/10">
            <TabsTrigger value="production" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
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
              <DialogContent className="bg-[#1A1D1F] border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Nueva Pantalla de Producción</DialogTitle>
                  <DialogDescription className="text-gray-400">
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
                      className="bg-black/20 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ubicación / Zona</Label>
                    <Input
                      placeholder="Ej: Nave Principal - Zona A"
                      value={newScreen.location}
                      onChange={e => setNewScreen({ ...newScreen, location: e.target.value })}
                      className="bg-black/20 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Función</Label>
                    <Select
                      value={newScreen.kiosk_type || "MONITOR"}
                      onValueChange={(v: any) => setNewScreen({ ...newScreen, kiosk_type: v })}
                    >
                      <SelectTrigger className="bg-black/20 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1D1F] border-white/10">
                        <SelectItem value="MONITOR">Producción (Monitor Planificación)</SelectItem>
                        <SelectItem value="TERMINAL">Almacén (Terminal)</SelectItem>
                        <SelectItem value="TABLET">Tablet / Móvil (Escáner)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-white/10 hover:bg-white/5 hover:text-white">Cancelar</Button>
                  <Button onClick={() => createMutation.mutate(newScreen)} disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                    {createMutation.isPending ? "Creando..." : "Crear Pantalla"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="production">
          <Card className="bg-[#1A1D1F] border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Monitor className="text-emerald-500 w-5 h-5" />
                <CardTitle className="text-lg font-medium text-white">Dispositivos de Producción</CardTitle>
              </div>
              <CardDescription>Gestión de pantallas conectadas a <b>Productivity DB</b></CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-black/20">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-gray-400 font-medium">Nombre / Ubicación</TableHead>
                    <TableHead className="text-gray-400 font-medium">Tipo</TableHead>
                    <TableHead className="text-gray-400 font-medium">Destino</TableHead>
                    <TableHead className="text-gray-400 font-medium">URL</TableHead>
                    <TableHead className="text-right text-gray-400 font-medium">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingProduction ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">Cargando dispositivos...</TableCell>
                    </TableRow>
                  ) : productionScreens?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">No hay pantallas configuradas</TableCell>
                    </TableRow>
                  ) : (
                    productionScreens?.map((screen) => {
                      const typeConfig = KIOSK_TYPES[screen.kiosk_type || 'MONITOR'] || KIOSK_TYPES.MONITOR;
                      const url = getProductionUrl(screen);

                      return (
                        <TableRow key={screen.id} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-white">{screen.name}</span>
                              <span className="text-xs text-gray-500">{screen.location || 'Sin ubicación'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${typeConfig.color} font-bold tracking-wider uppercase text-[10px]`}>
                              {typeConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-gray-400 font-mono">
                              {screen.kiosk_type === 'MONITOR' ? 'PlantBoard' : 'Scanner'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded border border-white/5 max-w-[250px]">
                              <span className="text-xs text-gray-500 truncate flex-1 font-mono">
                                {url}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-white/10 hover:text-white"
                                onClick={() => handleCopyUrl(url)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-900/20"
                              onClick={() => {
                                if (confirm('¿Seguro que quieres eliminar esta pantalla?')) {
                                  deleteMutation.mutate(screen.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card className="bg-[#1A1D1F] border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Info className="text-blue-500 w-5 h-5" />
                <CardTitle className="text-lg font-medium text-white">Dispositivos Generales</CardTitle>
              </div>
              <CardDescription>Gestión de pantallas de información general (KPIs) conectadas a <b>Main DB</b></CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-black/20">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-gray-400 font-medium">Nombre</TableHead>
                    <TableHead className="text-gray-400 font-medium">Tipo</TableHead>
                    <TableHead className="text-gray-400 font-medium">Refresco</TableHead>
                    <TableHead className="text-gray-400 font-medium">URL</TableHead>
                    {/* General screens management (CRUD) is assumed to be elsewhere or read-only here for now as preserving existing logic */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingGeneral ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">Cargando pantallas generales...</TableCell>
                    </TableRow>
                  ) : generalScreens?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">No hay pantallas generales</TableCell>
                    </TableRow>
                  ) : (
                    generalScreens?.map((screen) => {
                      const url = getGeneralUrl(screen);
                      return (
                        <TableRow key={screen.id} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell>
                            <span className="font-semibold text-white">{screen.name}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 font-bold tracking-wider uppercase text-[10px]">
                              {screen.screen_type || 'GENERAL'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-blue-400 font-mono">{screen.refresh_interval_sec}s</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded border border-white/5 max-w-[250px]">
                              <span className="text-xs text-gray-500 truncate flex-1 font-mono">
                                {url}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-white/10 hover:text-white"
                                onClick={() => handleCopyUrl(url)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
};

export default KioskPage;
