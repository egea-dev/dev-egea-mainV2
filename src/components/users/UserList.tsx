import { useState } from "react";
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
    if (!confirm("Estas seguro de que quieres eliminar este operario?")) return;

    const { error } = await supabase.from("profiles").delete().eq("id", userId);

    if (error) {
      toast.error("Error al eliminar el operario.");
    } else {
      toast.success("Operario eliminado.");
      onUsersUpdate();
    }
  };

  const handleInviteUser = async (user: Profile) => {
    if (!user.email) {
      toast.error("Este operario no tiene un email guardado para poder invitarlo.");
      return;
    }
    if (!confirm(`Enviar una invitacion de acceso al sistema a ${user.email}?`)) return;

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

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const haystack = `${user.full_name} ${user.email ?? ""} ${user.phone ?? ""}`.toLowerCase();
    return haystack.includes(term);
  });

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-900 p-2 text-blue-400 border border-slate-800">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Gestionar operarios
              </p>
              <p className="text-lg font-semibold text-white">Directorio de usuarios</p>
            </div>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 shadow-lg shadow-blue-900/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            Añadir operario
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 px-4 py-3">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por nombre, email o teléfono"
            className="border-slate-800 bg-slate-900/50 text-slate-200 placeholder:text-slate-500 focus-visible:ring-blue-500/50"
          />
        </div>

        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const availability = availabilityChip(user.status);
            return (
              <div
                key={user.id}
                className="group flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/20 p-4 transition-colors hover:bg-slate-900/40 hover:border-slate-700"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-full bg-slate-800 ring-1 ring-slate-700 overflow-hidden">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <User className="h-5 w-5 text-slate-500" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-200">{user.full_name}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            <StatusBadge status={user.status} size="sm" variant="dot" />
                            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 font-medium capitalize text-slate-400 border border-slate-700">
                              {user.role}
                            </span>
                            {!user.auth_user_id && <span className="text-amber-500 font-medium">Acceso pendiente</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold border ${availability.label === "Disponible" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            availability.label === "Vacaciones" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}>
                            {availability.label}
                          </span>
                          {!user.auth_user_id && user.email && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                              title="Invitar o vincular usuario"
                              onClick={() => handleInviteUser(user)}
                              disabled={inviteLoadingId === user.id}
                            >
                              <Link2 className={`h-4 w-4 ${inviteLoadingId === user.id ? "animate-spin" : ""}`} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                            onClick={() => handleOpenDialog(user)}
                            title="Ver o editar operario"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full border border-red-900/30 text-slate-500 hover:bg-red-950/30 hover:text-red-400 hover:border-red-900/50"
                            onClick={() => handleDelete(user.id)}
                            title="Eliminar operario"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2 mt-3 p-3 rounded-lg bg-slate-950/20 border border-slate-800/50">
                        <div className="flex items-center gap-2 break-words">
                          <Mail className="h-3 w-3 text-slate-600" />
                          <span className="text-slate-400">{user.email ?? "Sin correo"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-slate-600" />
                          <span className="text-slate-400">{user.phone ?? "Sin teléfono"}</span>
                        </div>
                        {(user.whatsapp) && (
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-3 w-3 text-emerald-600/70" />
                            <span className="text-slate-400">{user.whatsapp}</span>
                          </div>
                        )}
                        {user.public_url && (
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-3 w-3 text-blue-500/70" />
                            <a
                              href={user.public_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline hover:text-blue-300"
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
            <p className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 px-4 py-8 text-center text-sm text-slate-500">
              No se encontraron usuarios con el filtro aplicado.
            </p>
          )}
        </div>
      </div>
      <UserDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={onUsersUpdate}
        user={selectedUser}
      />
    </>
  );
};
