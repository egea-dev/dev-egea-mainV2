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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-2 text-orange-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Gestionar operarios
              </p>
              <p className="text-lg font-semibold text-slate-900">Directorio de usuarios</p>
            </div>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="rounded-full bg-[#ff6b4a] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#ff5f3a]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Anadir operario
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por nombre, email o telefono"
            className="border-slate-200"
          />
        </div>

        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const availability = availabilityChip(user.status);
            return (
            <div
              key={user.id}
              className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-full bg-slate-100 ring-1 ring-slate-200">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="m-3 h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">{user.full_name}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <StatusBadge status={user.status} size="sm" variant="dot" />
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium capitalize text-slate-600">
                            {user.role}
                          </span>
                          {!user.auth_user_id && <span className="text-orange-500">Acceso pendiente</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${availability.className}`}>
                          {availability.label}
                        </span>
                        {!user.auth_user_id && user.email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100"
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
                          className="h-8 w-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
                          onClick={() => handleOpenDialog(user)}
                          title="Ver o editar operario"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50"
                          onClick={() => handleDelete(user.id)}
                          title="Eliminar operario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <div className="flex items-center gap-1 break-words">
                        <Mail className="h-3 w-3" />
                        <span>{user.email ?? "Sin correo"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{user.phone ?? "Sin telefono"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        <span>{user.whatsapp ?? "Sin whatsapp"}</span>
                      </div>
                      {user.public_url && (
                        <div className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          <a
                            href={user.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Perfil publico
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
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-muted-foreground">
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
