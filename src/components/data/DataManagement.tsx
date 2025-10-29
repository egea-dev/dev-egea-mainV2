import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, FileDown, ArrowLeft, Database, PlusCircle, MoreHorizontal, UploadCloud, Eye, Pencil } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useScreens, useScreenData, useUpdateScreenData, useDeleteScreenData, useCreateScreenData } from "@/hooks/use-supabase";
import { Task } from "@/types"; // Tarea 4.2
import { DoubleConfirmDialog } from "@/components/ui/double-confirm-dialog";
import { supabase } from "@/integrations/supabase/client";
import { TaskStateBadge, StatusBadge } from "@/components/badges";
import { DataImportDialog } from "@/components/data/DataImportDialog";

type TemplateField = {
  name: string;
  label: string;
  type: string;
};

export const DataManagement = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialScreenParam = searchParams.get("screen");
  const [selectedScreenId, setSelectedScreenIdState] = useState<string | null>(initialScreenParam);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string | number>("");
  const [newRowData, setNewRowData] = useState<Record<string, string | number | null> | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [createScreenDialogOpen, setCreateScreenDialogOpen] = useState(false);
  const [newScreenData, setNewScreenData] = useState({
    name: "",
    screen_type: "data",
    screen_group: "Instalaciones",
    template_id: "",
    next_screen_id: ""
  });
  const [availableTemplates, setAvailableTemplates] = useState<Array<{id: string; name: string}>>([]);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [deleteScreenDialogOpen, setDeleteScreenDialogOpen] = useState(false);
  const [screenToDelete, setScreenToDelete] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [renameScreenDialogOpen, setRenameScreenDialogOpen] = useState(false);
  const [screenToRename, setScreenToRename] = useState<{ id: string; name: string } | null>(null);
  const [renameScreenName, setRenameScreenName] = useState("");
  const dashboardOptions = [
    { value: "none", label: "No mostrar en dashboard" },
    { value: "confeccion", label: "Tarjeta Confeccion" },
    { value: "tapiceria", label: "Tarjeta Tapiceria" },
    { value: "pendientes", label: "Lista de pendientes" },
    { value: "data_shortcuts", label: "Accesos rápidos a tablas" },
  ];
  
  const { data: screens = [], isLoading: screensLoading, refetch: refetchScreens } = useScreens();
  const { data: screenInfo, isLoading: dataLoading, refetch: refetchScreenInfo } = useScreenData(selectedScreenId);
  const updateMutation = useUpdateScreenData(selectedScreenId);
  const deleteMutation = useDeleteScreenData(selectedScreenId);
  const createMutation = useCreateScreenData(selectedScreenId);

  const navigate = useNavigate();

  const selectScreen = useCallback(
    (screenId: string | null, options?: { preserveFrom?: boolean }) => {
      setSelectedScreenIdState(screenId);
      const next = new URLSearchParams(searchParams);
      const preserveFrom = options?.preserveFrom ?? false;

      if (screenId) {
        next.set("screen", screenId);
        if (!preserveFrom) {
          next.delete("from");
        }
      } else {
        next.delete("screen");
        if (!preserveFrom) {
          next.delete("from");
        }
      }

      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Cargar plantillas disponibles
  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .order("name");

      if (error) throw error;
      setAvailableTemplates(data || []);
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  // Cargar grupos disponibles
  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("screens")
        .select("screen_group")
        .not("screen_group", "is", null);

      if (error) throw error;

      // Obtener grupos únicos
      const uniqueGroups = [...new Set(data?.map(s => s.screen_group).filter(Boolean) as string[])];
      setAvailableGroups(uniqueGroups.sort());
    } catch (error) {
      console.error("Error loading groups:", error);
    }
  };

  // Cargar grupos al iniciar
  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    const paramId = searchParams.get("screen");

    if (paramId) {
      if (paramId !== selectedScreenId && screens.some((screen) => screen.id === paramId)) {
        setSelectedScreenIdState(paramId);
      }
    } else if (!paramId && selectedScreenId) {
      setSelectedScreenIdState(null);
    }
  }, [searchParams, screens, selectedScreenId]);

  // Crear nueva pantalla
  const handleCreateScreen = async () => {
    if (!newScreenData.name.trim()) {
      toast.error("El nombre de la pantalla es requerido");
      return;
    }

    try {
      const { error } = await supabase
        .from("screens")
        .insert({
          name: newScreenData.name.trim(),
          screen_type: newScreenData.screen_type,
          screen_group: newScreenData.screen_group,
          template_id: newScreenData.template_id || null,
          next_screen_id: newScreenData.next_screen_id || null,
          is_active: true
        });

      if (error) throw error;

      toast.success("Pantalla creada correctamente");
      setCreateScreenDialogOpen(false);
      setNewScreenData({
        name: "",
        screen_type: "data",
        screen_group: "Instalaciones",
        template_id: "",
        next_screen_id: ""
      });
      refetchScreens();
      loadGroups(); // Recargar grupos
    } catch (error) {
      toast.error("Error al crear la pantalla");
      console.error(error);
    }
  };

  // Cargar plantillas al abrir el diálogo
  const handleOpenCreateDialog = () => {
    loadTemplates();
    loadGroups();
    setCreateScreenDialogOpen(true);
  };

  // Añadir nuevo grupo
  const handleAddNewGroup = () => {
    if (newGroupName.trim() && !availableGroups.includes(newGroupName.trim())) {
      const updatedGroups = [...availableGroups, newGroupName.trim()].sort();
      setAvailableGroups(updatedGroups);
      setNewScreenData(prev => ({ ...prev, screen_group: newGroupName.trim() }));
      setNewGroupName("");
      toast.success(`Grupo "${newGroupName.trim()}" agregado`);
    } else if (availableGroups.includes(newGroupName.trim())) {
      toast.error("Este grupo ya existe");
    }
  };

  const { dataList = [], templateFields = [] } = screenInfo || {};

  const openImportDialog = () => {
    if (!selectedScreenId) {
      toast.error("Selecciona primero una pantalla")
      return
    }

    if (!templateFields.length) {
      toast.error("La pantalla seleccionada no tiene una plantilla asociada")
      return
    }

    setImportDialogOpen(true)
  }

  const updateScreenDashboardSettings = async (updates: Partial<{ dashboard_section: string | null; dashboard_order: number }>) => {
    if (!selectedScreenId) return;
    try {
      const { error } = await supabase
        .from("screens")
        .update(updates)
        .eq("id", selectedScreenId);

      if (error) throw error;

      toast.success("Configuracion del dashboard actualizada");
      await Promise.all([refetchScreens(), refetchScreenInfo()]);
      queryClient.invalidateQueries({ queryKey: ['screens'] });
      queryClient.invalidateQueries({ queryKey: ['screen_data', selectedScreenId] });
    } catch (error) {
      console.error("Error updating dashboard settings:", error);
      toast.error("No se pudo actualizar la configuracion del dashboard");
    }
  };

  const handleCellEdit = (itemId: string, field: string) => {
    setEditingCell(`${itemId}-${field}`);
    const item = dataList.find(d => d.id === itemId);
    const value = (field === 'status' || field === 'state') ? item?.[field as keyof Task] : item?.data?.[field];
    setEditValue(value || "");
  };

  const handleCellSave = async (itemId: string, field: string, newValueOverride?: string | number) => {
    const item = dataList.find(d => d.id === itemId);
    if (!item) return;

    const targetScreen = (screenInfo?.screen ?? screens.find((s) => s.id === selectedScreenId)) ?? null;
    const newValue = newValueOverride ?? editValue;
    
    // Lógica especial para cuando se marca como "terminado"
    if (field === 'state' && newValue === 'terminado') {
      await handleCompleteTask(itemId, targetScreen?.next_screen_id);
      return;
    }
    
    updateMutation.mutate({
      itemId,
      updateData: { [field]: newValue } as Partial<Task>,
    });
    
    setEditingCell(null);
  };

  const handleCompleteTask = async (taskId: string, nextScreenId?: string) => {
    const item = dataList.find(d => d.id === taskId);
    if (!item) return;

    try {
      // 1. Archivar la tarea en archived_tasks
      const { error: archiveError } = await supabase.from('archived_tasks').insert({
        id: item.id,
        data: item.data,
        status: item.status,
        state: 'terminado',
        start_date: item.start_date,
        end_date: item.end_date,
        location: item.location,
        responsible_profile_id: item.responsible_profile_id,
        assigned_users: item.assigned_users || [],
        assigned_vehicles: item.assigned_vehicles || [],
        archived_at: new Date().toISOString(),
      });

      if (archiveError) {
        console.error('Error archiving task:', archiveError);
        toast.error('Error al archivar la tarea');
        return;
      }

      // 2. Si hay next_screen_id, copiar tarea a la siguiente pantalla
      if (nextScreenId) {
        const { error: copyError } = await supabase.from('screen_data').insert({
          screen_id: nextScreenId,
          data: item.data,
          state: 'pendiente',
          status: 'pendiente',
          start_date: item.start_date,
          end_date: item.end_date,
          location: item.location,
          responsible_profile_id: item.responsible_profile_id,
        });

        if (copyError) {
          console.error('Error copying to next screen:', copyError);
          toast.error('Error al copiar a la siguiente pantalla');
        } else {
          toast.success('Tarea movida a la siguiente pantalla');
        }
      }

      // 3. Eliminar la tarea original
      const { error: deleteError } = await supabase.from('screen_data').delete().eq('id', taskId);
      if (deleteError) {
        console.error('Error deleting original task:', deleteError);
        toast.error('Error al eliminar la tarea original');
      }

      toast.success('Tarea completada y archivada');
      setEditingCell(null);
      
      // Forzar recarga de los datos
      window.location.reload();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Error al completar la tarea');
    }
  };
  
  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete);
      setItemToDelete(null);
    }
  };

  const handleDeleteScreen = (id: string) => {
    setScreenToDelete(id);
    setDeleteScreenDialogOpen(true);
  };

  const handleOpenRenameDialog = (screen: { id: string; name: string }) => {
    setScreenToRename({ id: screen.id, name: screen.name ?? "" });
    setRenameScreenName(screen.name ?? "");
    setRenameScreenDialogOpen(true);
  };

  const confirmDeleteScreen = async () => {
    if (screenToDelete) {
      try {
        const { error } = await supabase.from('screens').delete().eq('id', screenToDelete);
        if (error) throw error;
        toast.success("Tabla de datos eliminada correctamente");
        refetchScreens();
      } catch (error) {
        toast.error("Error al eliminar la tabla de datos");
        console.error(error);
      } finally {
        setScreenToDelete(null);
        setDeleteScreenDialogOpen(false);
      }
    }
  };

  const handleRenameScreen = async () => {
    if (!screenToRename) return;
    const newName = renameScreenName.trim();
    if (!newName) {
      toast.error("El nombre de la tabla es obligatorio");
      return;
    }

    try {
      const { error } = await supabase
        .from('screens')
        .update({ name: newName })
        .eq('id', screenToRename.id);

      if (error) throw error;

      toast.success("Nombre de la tabla actualizado");
      setRenameScreenDialogOpen(false);
      setScreenToRename(null);
      setRenameScreenName("");
      await refetchScreens();
    } catch (error) {
      console.error("Error renombrando tabla:", error);
      toast.error("No se pudo actualizar el nombre");
    }
  };

  const handleAddNewRow = () => {
    const initialData: Record<string, string | number | null> = {};
    templateFields.forEach((field: TemplateField) => {
      initialData[field.name] = '';
    });
    setNewRowData(initialData);
  };

  const handleSaveNewRow = async () => {
    if (!newRowData) return;
    createMutation.mutate(newRowData, {
      onSuccess: () => {
        setNewRowData(null);
      }
    });
  };

  if (screensLoading) return <div className="text-center py-8">Cargando...</div>;

  if (!selectedScreenId) {
    return (
       <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Gestión de Tablas de Datos</h2>
          <Dialog open={createScreenDialogOpen} onOpenChange={setCreateScreenDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreateDialog}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Tabla de Datos
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Tabla de Datos</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="screen-name">Nombre de la Tabla</Label>
                  <Input
                    id="screen-name"
                    value={newScreenData.name}
                    onChange={(e) => setNewScreenData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Clientes, Proyectos, Inventario"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="screen-group">Grupo</Label>
                  <Select value={newScreenData.screen_group} onValueChange={(value) => setNewScreenData(prev => ({ ...prev, screen_group: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGroups.map(group => (
                        <SelectItem key={group} value={group}>{group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Nombre del nuevo grupo"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNewGroup()}
                    />
                    <Button type="button" variant="outline" onClick={handleAddNewGroup} size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Añadir
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template">Plantilla (Opcional)</Label>
                  <Select value={newScreenData.template_id || "none"} onValueChange={(value) => setNewScreenData(prev => ({ ...prev, template_id: value === "none" ? "" : value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una plantilla" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin plantilla</SelectItem>
                      {availableTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateScreenDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateScreen}>
                    Crear Tabla
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {screens.map((screen) => (
            <Card key={screen.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{screen.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={screen.is_active ? "default" : "secondary"}>
                      {screen.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenRenameDialog(screen)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Renombrar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteScreen(screen.id)}>
                          <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                          <span className="text-destructive">Eliminar</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                    <p>Grupo: {screen.screen_group || 'N/A'}</p>
                    <p>Tipo: {screen.screen_type}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button className="w-full" onClick={() => selectScreen(screen.id)}>
                      <Database className="mr-2 h-4 w-4" />
                      Gestionar Datos
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(`/screen/${screen.id}`, "_blank")}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Pantalla
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      <DoubleConfirmDialog
          open={deleteScreenDialogOpen}
          onOpenChange={setDeleteScreenDialogOpen}
          onConfirm={confirmDeleteScreen}
          title="Eliminar Tabla de Datos"
          description="Esta acción eliminará permanentemente la tabla de datos y todo su contenido. Esta acción no se puede deshacer."
          confirmText="ELIMINAR"
          requiredWord="ELIMINAR"
      />
      <Dialog
        open={renameScreenDialogOpen}
        onOpenChange={(open) => {
          setRenameScreenDialogOpen(open);
          if (!open) {
            setScreenToRename(null);
            setRenameScreenName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar tabla de datos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-screen-name">Nuevo nombre</Label>
              <Input
                id="rename-screen-name"
                value={renameScreenName}
                onChange={(e) => setRenameScreenName(e.target.value)}
                placeholder="Introduce el nuevo nombre de la tarjeta"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRenameScreenDialogOpen(false);
                  setScreenToRename(null);
                  setRenameScreenName("");
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleRenameScreen} disabled={!renameScreenName.trim()}>
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      </div>
    );
  }

  const screenMeta = (screenInfo?.screen ?? screens.find((s) => s.id === selectedScreenId)) ?? null;
  const currentScreen = screenMeta;
  const returnToDashboard = searchParams.get("from") === "dashboard";

  return (
    <div className="p-4 sm:p-8 space-y-6">
    <Card>
      <CardHeader className="space-y-6">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (returnToDashboard) {
                      navigate("/admin");
                    } else {
                      selectScreen(null);
                    }
                  }}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <CardTitle>Gestionando: {currentScreen?.name}</CardTitle>
                    <CardDescription>Haz clic en una celda para editarla directamente.</CardDescription>
                </div>
            </div>
            <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => currentScreen?.id && window.open(`/screen/${currentScreen.id}`, "_blank")}
                  disabled={!currentScreen?.id}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Pantalla
                </Button>
                <Button variant="outline" onClick={openImportDialog}><UploadCloud className="mr-2 h-4 w-4" />Importar</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline"><FileDown className="mr-2 h-4 w-4" />Exportar</Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                    <DropdownMenuItem>Excel (.xlsx)</DropdownMenuItem>
                    <DropdownMenuItem>CSV (.csv)</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={handleAddNewRow} disabled={!!newRowData}><Plus className="mr-2 h-4 w-4" />Añadir Fila</Button>
            </div>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(180px,0.5fr)_minmax(180px,0.5fr)]">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Seccion en dashboard</Label>
            <Select
              value={(currentScreen?.dashboard_section as string | undefined) ?? "none"}
              onValueChange={(value) => updateScreenDashboardSettings({ dashboard_section: value === "none" ? null : value })}
              disabled={!currentScreen?.id}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona seccion" />
              </SelectTrigger>
              <SelectContent>
                {dashboardOptions.map((option) => (
                  <SelectItem key={option.value || "none"} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium">Orden dentro de la seccion</Label>
            <Input
              key={`order-${currentScreen?.id ?? "none"}`}
              type="number"
              min={0}
              defaultValue={currentScreen?.dashboard_order ?? 0}
              disabled={!currentScreen?.id}
              onBlur={(event) => {
                const raw = Number(event.target.value || 0);
                if (currentScreen && raw !== (currentScreen.dashboard_order ?? 0)) {
                  updateScreenDashboardSettings({ dashboard_order: raw });
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium">Grupo actual</Label>
            <Input value={currentScreen?.screen_group ?? "Sin grupo"} disabled className="bg-muted" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
      {dataLoading ? <div className="text-center py-8">Cargando datos...</div> : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
                <TableRow className="bg-muted/50">
                    {templateFields.map((field: TemplateField) => <TableHead key={field.name}>{field.label || field.name}</TableHead>)}
                    <TableHead>Estado</TableHead><TableHead>Tipo</TableHead><TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {dataList.map((item: Task, index: number) => (
                <TableRow key={item.id} className={index % 2 === 0 ? 'bg-muted/25' : ''}>
                  {templateFields.map((field: TemplateField) => (
                    <TableCell key={field.name} onClick={() => handleCellEdit(item.id, field.name)} className="cursor-pointer">
                      {editingCell === `${item.id}-${field.name}` ? (
                        <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleCellSave(item.id, field.name)} autoFocus />
                      ) : ( item.data?.[field.name] || <span className="text-muted-foreground">Vacío</span> )}
                    </TableCell>
                  ))}
                  <TableCell onClick={() => handleCellEdit(item.id, 'state')} className="cursor-pointer">
                    {editingCell === `${item.id}-state` ? (
                       <Select value={String(editValue)} onValueChange={(v) => { setEditValue(v); handleCellSave(item.id, 'state', v); }}>
                         <SelectTrigger><SelectValue/></SelectTrigger>
                         <SelectContent>
                           <SelectItem value="pendiente">Pendiente</SelectItem>
                           <SelectItem value="normal">Normal</SelectItem>
                           <SelectItem value="incidente">Incidente</SelectItem>
                           <SelectItem value="arreglo">Arreglo</SelectItem>
                           <SelectItem value="urgente">Urgente</SelectItem>
                           <SelectItem value="en fabricacion">En Fabricación</SelectItem>
                           <SelectItem value="a la espera">A la Espera</SelectItem>
                           <SelectItem value="terminado">Terminado</SelectItem>
                         </SelectContent>
                       </Select>
                    ) : <TaskStateBadge state={item.state} size="sm" />}
                  </TableCell>
                 <TableCell onClick={() => handleCellEdit(item.id, 'status')} className="cursor-pointer">
                     {editingCell === `${item.id}-status` ? (
                       <Select value={String(editValue)} onValueChange={(v) => { setEditValue(v); handleCellSave(item.id, 'status', v); }}>
                         <SelectTrigger><SelectValue/></SelectTrigger>
                         <SelectContent>
                           <SelectItem value="pendiente">Pendiente</SelectItem>
                           <SelectItem value="acabado">Acabado</SelectItem>
                           <SelectItem value="en progreso">En Progreso</SelectItem>
                         </SelectContent>
                       </Select>
                     ) : <StatusBadge status={(item as Record<string, unknown>).status as string} size="sm" />}
                  </TableCell>
                  <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {newRowData && (
                <TableRow>
                  {templateFields.map((field: TemplateField) => (
                    <TableCell key={field.name}>
                      <Input
                        placeholder={field.label}
                        value={newRowData[field.name]}
                        onChange={(e) => setNewRowData(prev => prev ? {...prev, [field.name]: e.target.value} : null)}
                      />
                    </TableCell>
                  ))}
                  <TableCell colSpan={3}>
                    <Badge variant="secondary">Nuevo Registro</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={handleSaveNewRow} disabled={createMutation.isPending}>Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setNewRowData(null)}>Cancelar</Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      </CardContent>

      <DoubleConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Eliminar Registro"
        description="Esta acción eliminará permanentemente este registro de la base de datos."
        confirmText="ELIMINAR"
        requiredWord="ELIMINAR"
      />
    </Card>

    <DataImportDialog
      open={importDialogOpen}
      onOpenChange={setImportDialogOpen}
      screenId={selectedScreenId}
      templateFields={templateFields}
      onImported={() => {
        setImportDialogOpen(false)
        if (selectedScreenId) {
          queryClient.invalidateQueries({ queryKey: ['screen_data', selectedScreenId] })
        }
      }}
    />
    </div>
  );
};
