import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Edit, Trash2, Plus, Eye, Search } from "lucide-react";
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

type Screen = {
  id: string;
  name: string;
  is_active: boolean;
  refresh_interval_sec: number;
  template_id: string | null;
  screen_type: 'pendiente' | 'acabado';
  next_screen_id?: string | null;
  screen_group?: string;
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
  const navigate = useNavigate();

  const loadScreens = async () => {
    try {
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

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingScreen(null);
    loadScreens();
  };

  const groupedScreens = currentScreens.reduce((acc, screen) => {
    const group = screen.screen_group || 'General';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(screen);
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
        <Card key={groupName}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{groupName}</CardTitle>
            {groupName !== 'General' && (
              <Button size="sm" variant="outline" onClick={() => window.open(`/group/${groupName}`, "_blank")}>
                <Eye className="mr-2 h-4 w-4" /> Ver Grupo
              </Button>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {screenList.map((screen) => (
              <Card key={screen.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{screen.name}</CardTitle>
                    <Badge variant={screen.is_active ? "default" : "secondary"}>
                      {screen.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                   <div className="text-xs text-muted-foreground">
                    <p>Tipo: {screen.screen_type}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => window.open(`/display/${screen.id}`, "_blank")} className="flex-1 sm:flex-none">
                      <ExternalLink className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Ver</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(screen)} className="flex-1 sm:flex-none">
                      <Edit className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                     <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => handleDelete(screen.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
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
