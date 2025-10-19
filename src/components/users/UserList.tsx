import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, User, Edit, Trash2, Link2, Mail, Phone, MessageCircle, ExternalLink } from "lucide-react";
import { UserDialog } from "./UserDialog";
import { Profile } from "@/types";
import { StatusBadge } from "@/components/badges";

type UserListProps = {
  users: Profile[];
  onUsersUpdate: () => void;
};

export const UserList = ({ users, onUsersUpdate }: UserListProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [inviteLoadingId, setInviteLoadingId] = useState<string | null>(null);

  const handleOpenDialog = (user: Profile | null = null) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este operario?')) return;

    const { error } = await supabase.from('profiles').delete().eq('id', userId);

    if (error) {
      toast.error('Error al eliminar el operario.');
    } else {
      toast.success('Operario eliminado.');
      onUsersUpdate();
    }
  };

  const handleInviteUser = async (user: Profile) => {
    if (!user.email) {
      toast.error("Este operario no tiene un email guardado para poder invitarlo.");
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
        toast.error(error.message ?? "No se pudo enviar la invitación.");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Invitación enviada a ${user.email}.`);
    } catch (err) {
      console.error("invite-user function error", err);
      toast.error(err instanceof Error ? err.message : "Error inesperado al invitar.");
    } finally {
      setInviteLoadingId(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Botón de añadir */}
        <Button onClick={() => handleOpenDialog()} className="w-full">
          <Plus className="mr-2 h-4 w-4" />Añadir Operario
        </Button>

        {/* Lista de usuarios */}
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <User className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{user.full_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={user.status} size="sm" variant="dot" />
                    <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                  </div>
                  {user.email && (
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {user.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    {user.whatsapp && (
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        <span>{user.whatsapp}</span>
                      </div>
                    )}
                  </div>
                  {user.public_url && (
                    <div className="flex items-center gap-1 mt-1">
                      <ExternalLink className="h-3 w-3" />
                      <a
                        href={user.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Perfil Público
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-1 flex-shrink-0">
                {!user.auth_user_id && user.email && (
                   <Button
                     variant="outline"
                     size="icon"
                     className="h-8 w-8"
                     title="Vincular cuenta de usuario"
                     onClick={() => handleInviteUser(user)}
                     disabled={inviteLoadingId === user.id}
                   >
                      <Link2 className={`h-4 w-4 ${inviteLoadingId === user.id ? "animate-spin" : ""}`} />
                   </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleOpenDialog(user)}
                  title="Editar operario"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                 <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(user.id)}
                  title="Eliminar operario"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <UserDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSuccess={onUsersUpdate} user={selectedUser} />
    </>
  );
};
