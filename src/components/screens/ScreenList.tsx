import { useState, useEffect, type DragEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Plus, Eye, Search, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ScreenDialog } from "./ScreenDialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

type Screen = {
  id: string;
  name: string;
  is_active: boolean;
  refresh_interval_sec: number;
  template_id: string | null;
  screen_type: 'data' | 'display';
  next_screen_id?: string | null;
  screen_group?: string | null;
  color?: string | null;
};

export const ScreenList = () => {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [filteredScreens, setFilteredScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [draggingScreen, setDraggingScreen] = useState<string | null>(null);
  const [activeDropGroup, setActiveDropGroup] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadScreens = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("screens")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setScreens((data || []) as Screen[]);
      setFilteredScreens((data || []) as Screen[]);
    } catch (error) {
      toast.error("Error al cargar pantallas");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar pantallas según búsqueda y grupo
  useEffect(() => {
    let filtered = screens;

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(screen =>
        screen.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (screen.screen_group && screen.screen_group.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtrar por grupo
    if (groupFilter !== "all") {
      filtered = filtered.filter(screen =>
        screen.screen_group === groupFilter ||
        (groupFilter === "ungrouped" && !screen.screen_group)
      );
    }

    setFilteredScreens(filtered);
    setCurrentPage(1); // Resetear a la primera página al filtrar
  }, [screens, searchTerm, groupFilter]);

  // Calcular pantallas para la página actual
  const indexOfLastScreen = currentPage * itemsPerPage;
  const indexOfFirstScreen = indexOfLastScreen - itemsPerPage;
  const currentScreens = filteredScreens.slice(indexOfFirstScreen, indexOfLastScreen);
  const totalPages = Math.ceil(filteredScreens.length / itemsPerPage);

  // Obtener grupos únicos para el filtro
  const uniqueGroups = Array.from(new Set(screens.map(screen => screen.screen_group).filter(Boolean)));

  useEffect(() => {
    loadScreens();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta pantalla?")) return;

    try {
      const { error } = await supabase.from("screens").delete().eq("id", id);
      if (error) throw error;
      toast.success("Pantalla eliminada");
      loadScreens();
    } catch (error) {
      toast.error("Error al eliminar pantalla");
    }
  };

  const handleEdit = (screen: Screen) => {
    console.log('Opening edit dialog for screen:', screen);
    setEditingScreen(screen);
    setDialogOpen(true);
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, screenId: string) => {
    event.dataTransfer.setData("text/plain", screenId);
    event.dataTransfer.effectAllowed = "move";
    setDraggingScreen(screenId);
  };

  const handleDragEnd = () => {
    setDraggingScreen(null);
    setActiveDropGroup(null);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (groupName: string) => {
    setActiveDropGroup(groupName);
  };

  const handleDragLeave = (groupName: string) => {
    if (activeDropGroup === groupName) {
      setActiveDropGroup(null);
    }
  };

  const handleDropOnGroup = async (
    event: DragEvent<HTMLDivElement>,
    targetGroup: string
  ) => {
    event.preventDefault();
    const screenId = event.dataTransfer.getData("text/plain");
    if (!screenId) return;

    setActiveDropGroup(null);
    setDraggingScreen(null);

    const normalizedTarget = targetGroup === "General" ? null : targetGroup;
    const currentScreen = screens.find((screen) => screen.id === screenId);
    const currentGroupLabel = currentScreen?.screen_group || "General";

    if (!currentScreen || currentGroupLabel === targetGroup) {
      return;
    }

    setScreens((prev) =>
      prev.map((screen) =>
        screen.id === screenId ? { ...screen, screen_group: normalizedTarget } : screen
      )
    );

    try {
      const { error } = await supabase
        .from("screens")
        .update({ screen_group: normalizedTarget })
        .eq("id", screenId);

      if (error) throw error;

      toast.success(
        normalizedTarget
          ? `Pantalla movida al grupo "${targetGroup}".`
          : "Pantalla movida al grupo General."
      );
      loadScreens();
    } catch (error) {
      console.error("Error moving screen:", error);
      toast.error("No se pudo mover la pantalla. Inténtalo de nuevo.");
      loadScreens();
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingScreen(null);
    loadScreens();
  };

  const groupNames = new Set<string>(["General"]);
  filteredScreens.forEach((screen) => {
    groupNames.add(screen.screen_group || "General");
  });

  const groupedScreens = Array.from(groupNames).reduce((acc, group) => {
    acc[group] = currentScreens.filter(
      (screen) => (screen.screen_group || "General") === group
    );
    if (!acc[group]) {
      acc[group] = [];
    }
    return acc;
  }, {} as Record<string, Screen[]>);

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-semibold">Pantallas</h2>
        <Button onClick={() => { setEditingScreen(null); setDialogOpen(true); }} size="sm" className="sm:size-default w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Pantalla
        </Button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o grupo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="w-full md:w-48">
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los grupos</SelectItem>
              <SelectItem value="ungrouped">Sin grupo</SelectItem>
              {uniqueGroups.map(group => (
                <SelectItem key={group} value={group as string}>{group}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contador de resultados */}
      <div className="text-sm text-muted-foreground">
        Mostrando {currentScreens.length} de {filteredScreens.length} pantallas
      </div>

      {Object.entries(groupedScreens).map(([groupName, screenList]) => (
        <div
          key={groupName}
          onDragOver={handleDragOver}
          onDragEnter={() => handleDragEnter(groupName)}
          onDragLeave={() => handleDragLeave(groupName)}
          onDrop={(event) => handleDropOnGroup(event, groupName)}
          className="rounded-lg"
        >
          <Card
            className={cn(
              "transition-colors",
              activeDropGroup === groupName ? "border-primary/60 ring-2 ring-primary/40" : ""
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{groupName}</CardTitle>
              {groupName !== "General" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/group/${groupName}`, "_blank")}
                >
                  <Eye className="mr-2 h-4 w-4" /> Ver Grupo
                </Button>
              )}
            </CardHeader>
            <CardContent className="grid min-h-[120px] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {screenList.length === 0 && (
                <div className="col-span-full flex items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-muted/20 py-6 text-sm text-muted-foreground">
                  No hay pantallas en esta página para este grupo. Arrastra aquí para mover.
                </div>
              )}
              {screenList.map((screen) => (
                <Card
                  key={screen.id}
                  className={cn(
                    "relative transition-colors",
                    draggingScreen === screen.id ? "border-primary/40" : ""
                  )}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{screen.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={screen.is_active ? "default" : "secondary"}>
                          {screen.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                        <div
                          className={cn(
                            "cursor-grab text-muted-foreground hover:text-foreground",
                            draggingScreen === screen.id ? "cursor-grabbing opacity-70" : ""
                          )}
                          draggable
                          onDragStart={(event) => handleDragStart(event, screen.id)}
                          onDragEnd={handleDragEnd}
                          title="Arrastra para mover esta pantalla a otro grupo"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      <p>Tipo: {screen.screen_type}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const targetUrl =
                            screen.screen_type === "data"
                              ? `/screen/${screen.id}`
                              : `/display/${screen.id}`;
                          window.open(targetUrl, "_blank");
                        }}
                        className="flex-1 sm:flex-none"
                      >
                        <Eye className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Ver</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(screen)}
                        className="flex-1 sm:flex-none"
                      >
                        <Edit className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive/70 hover:text-destructive"
                        onClick={() => handleDelete(screen.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>
      ))}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {filteredScreens.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          {searchTerm || groupFilter !== "all"
            ? "No se encontraron pantallas con los filtros seleccionados."
            : "No hay pantallas. Crea una nueva para comenzar."
          }
        </div>
      )}

      <ScreenDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onClose={handleCloseDialog}
        screen={editingScreen}
        allScreens={screens}
      />
    </div>
  );
};
