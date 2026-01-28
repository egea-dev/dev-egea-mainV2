import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  User,
  Edit,
  Trash2,
  Link2,
  Mail,
  Phone,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { UserDialog } from "./UserDialog";
import type { Profile } from "@/types";
import { StatusBadge } from "@/components/badges";
import { useProfile } from "@/hooks/use-supabase";

type UserListProps = {
  users: Profile[];
  onUsersUpdate: () => void;
};

export const UserList = ({ users, onUsersUpdate }: UserListProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [inviteLoadingId, setInviteLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleOpenDialog = (user: Profile | null = null) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este usuario?")) return;

    const { error } = await supabase.from("profiles").delete().eq("id", userId);

    if (error) {
      toast.error("Error al eliminar el usuario.");
    } else {
      toast.success("Usuario eliminado.");
      onUsersUpdate();
    }
  };

  const handleInviteUser = async (user: Profile) => {
    if (!user.email) {
      toast.error("Este usuario no tiene un email guardado para poder invitarlo.");
      return;
    }
    if (!confirm(`¿Enviar una invitación de acceso al sistema a ${user.email}?`)) return;

    try {
      setInviteLoadingId(user.id);
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: user.email,
          fullName: user.full_name,
          role: user.role,
        },
      });

      if (error) {
        const message = error.message ?? "No se pudo enviar la invitacion.";
        toast.error(message);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Invitacion enviada a ${user.email}.`);
    } catch (err) {
      console.error("invite-user function error", err);
      toast.error(err instanceof Error ? err.message : "Error inesperado al invitar.");
    } finally {
      setInviteLoadingId(null);
    }
  };

  const availabilityChip = (status?: string | null) => {
    const normalized = status?.toLowerCase().trim() ?? "";
    if (normalized === "vacaciones") {
      return { label: "Vacaciones", className: "bg-amber-100 text-amber-700" };
    }
    if (normalized === "baja") {
      return { label: "Baja", className: "bg-rose-100 text-rose-700" };
    }
    return { label: "Disponible", className: "bg-emerald-100 text-emerald-700" };
  };

  // Obtener perfil del usuario actual
  const { data: currentUserProfile } = useProfile();
  const currentUserRole = currentUserProfile?.role || 'operario';

  // Determinar qué usuarios puede ver según su rol
  const visibleUsers = useMemo(() => {
    const roleHierarchy: Record<string, number> = {
      admin: 8,
      manager: 7,
      responsable: 6,
      operario: 5,
      production: 4,
      shipping: 3,
      warehouse: 2,
      comercial: 1
    };

    const currentRank = roleHierarchy[currentUserRole] || 0;

    // Admin ve todos
    if (currentUserRole === 'admin') {
      return users;
    }

    // Manager ve todos excepto otros admins
    if (currentUserRole === 'manager') {
      return users.filter(u => u.role !== 'admin');
    }

    // Responsable ve operarios y roles especializados
    if (currentUserRole === 'responsable') {
      const allowedRoles = ['operario', 'produccion', 'envios', 'almacen', 'comercial'];
      return users.filter(u => allowedRoles.includes(u.role));
    }

    // Otros roles no ven gestión de usuarios
    return [];
  }, [users, currentUserRole]);

  // Determinar permisos de acciones
  const canCreate = ['admin', 'manager'].includes(currentUserRole);
  const canEdit = ['admin', 'manager', 'responsable'].includes(currentUserRole);
  const canDelete = currentUserRole === 'admin';
  const canInvite = ['admin', 'manager'].includes(currentUserRole);

  const filteredUsers = visibleUsers.filter((user) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const haystack = `${user.full_name} ${user.email ?? ""} ${user.phone ?? ""}`.toLowerCase();
    return haystack.includes(term);
  });

  return (
    <>
      {visibleUsers.length === 0 && users.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            Acceso Restringido
          </h3>
          <p className="text-sm text-muted-foreground">
            Tu rol ({currentUserRole}) no tiene permisos para gestionar usuarios.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2 text-primary border border-border">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Gestionar usuarios
                </p>
                <p className="text-lg font-bold text-foreground">Directorio de perfiles</p>
              </div>
            </div>
            {canCreate && (
              <Button
                onClick={() => handleOpenDialog()}
                className="rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                <Plus className="mr-2 h-4 w-4" />
                Añadir usuario
              </Button>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nombre, email o teléfono"
              className="border-border bg-muted/30 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
            />
          </div>

          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const availability = availabilityChip(user.status);
              return (
                <div
                  key={user.id}
                  className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:bg-muted/30 shadow-sm"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-full bg-muted ring-1 ring-border overflow-hidden">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-foreground">{user.full_name}</p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <StatusBadge status={user.status} size="sm" variant="dot" />
                              <span className="rounded-full bg-muted px-2.5 py-0.5 font-bold capitalize text-muted-foreground border border-border">
                                {user.role}
                              </span>
                              {user.active_tasks_count !== undefined && (
                                <span className={`rounded-full px-2.5 py-0.5 font-bold border ${user.active_tasks_count > 3 ? 'bg-destructive/10 text-destructive border-destructive/20' : user.active_tasks_count > 0 ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                                  {user.active_tasks_count} {user.active_tasks_count === 1 ? 'tarea' : 'tareas'}
                                </span>
                              )}
                              {!user.auth_user_id && <span className="text-warning font-bold">Acceso pendiente</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold border ${availability.label === "Disponible" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" :
                              availability.label === "Vacaciones" ? "bg-warning/10 text-warning border-warning/20" :
                                "bg-destructive/10 text-destructive border-destructive/20"
                              }`}>
                              {availability.label}
                            </span>
                            {canInvite && !user.auth_user_id && user.email && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full border border-warning/30 bg-warning/10 text-warning hover:bg-warning/20"
                                title="Invitar o vincular usuario"
                                onClick={() => handleInviteUser(user)}
                                disabled={inviteLoadingId === user.id}
                              >
                                <Link2 className={`h-4 w-4 ${inviteLoadingId === user.id ? "animate-spin" : ""}`} />
                              </Button>
                            )}
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() => handleOpenDialog(user)}
                                title="Ver o editar usuario"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full border border-destructive/30 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                                onClick={() => handleDelete(user.id)}
                                title="Eliminar usuario"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 mt-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                          <div className="flex items-center gap-2 break-words">
                            <Mail className="h-3 w-3 text-muted-foreground/70" />
                            <span className="text-foreground/80 font-medium">{user.email ?? "Sin correo"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground/70" />
                            <span className="text-foreground/80 font-medium">{user.phone ?? "Sin teléfono"}</span>
                          </div>
                          {(user.whatsapp) && (
                            <div className="flex items-center gap-2">
                              <MessageCircle className="h-3 w-3 text-emerald-600/70" />
                              <span className="text-foreground/80 font-medium">{user.whatsapp}</span>
                            </div>
                          )}
                          {user.public_url && (
                            <div className="flex items-center gap-2">
                              <ExternalLink className="h-3 w-3 text-primary/70" />
                              <a
                                href={user.public_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline hover:text-primary/80 font-bold"
                              >
                                Perfil público
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {!filteredUsers.length && (
              <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                No se encontraron usuarios con el filtro aplicado.
              </p>
            )}
          </div>
        </div>
      )}
      <UserDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={onUsersUpdate}
        user={selectedUser}
      />
    </>
  );
};
