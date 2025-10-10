import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus, 
  UserMinus, 
  Crown,
  Palette,
  TreePine
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/badges';
import { useAdminData } from '@/hooks/use-admin-data';
import {
  useGroups,
  useGroupsWithMembers,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useAddUserToGroup,
  useRemoveUserFromGroup,
  useUpdateUserRoleInGroup,
  type GroupWithMembers
} from '@/hooks/use-groups';

export default function GroupManagement() {
  const { users } = useAdminData();
  const { data: groups = [], isLoading: loadingGroups } = useGroups();
  const { data: groupsWithMembers = [], refetch: refetchGroupsWithMembers } = useGroupsWithMembers();
  
  const createGroupMutation = useCreateGroup();
  const updateGroupMutation = useUpdateGroup();
  const deleteGroupMutation = useDeleteGroup();
  const addUserToGroupMutation = useAddUserToGroup();
  const removeUserFromGroupMutation = useRemoveUserFromGroup();
  const updateUserRoleMutation = useUpdateUserRoleInGroup();
  
  const [selectedGroup, setSelectedGroup] = useState<GroupWithMembers | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  
  const [newGroup, setNewGroup] = useState({ name: '', color: '#3B82F6', description: '' });
  const [editingGroup, setEditingGroup] = useState<GroupWithMembers | null>(null);
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<string[]>([]);

  const handleCreateGroup = () => {
    if (!newGroup.name.trim()) {
      toast.error('El nombre del grupo es requerido');
      return;
    }
    
    createGroupMutation.mutate(newGroup);
    setNewGroup({ name: '', color: '#3B82F6', description: '' });
    setIsCreateDialogOpen(false);
  };

  const handleUpdateGroup = () => {
    if (!editingGroup || !editingGroup.name.trim()) {
      toast.error('El nombre del grupo es requerido');
      return;
    }
    
    updateGroupMutation.mutate({
      id: editingGroup.id,
      name: editingGroup.name,
      color: editingGroup.color,
      description: editingGroup.description,
    });
    setEditingGroup(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm('¿Estás seguro de eliminar este grupo? Los miembros no serán eliminados.')) {
      deleteGroupMutation.mutate(groupId);
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
    }
  };

  const handleAddUsersToGroup = () => {
    if (!selectedGroup || selectedUsersToAdd.length === 0) return;
    
    selectedUsersToAdd.forEach(userId => {
      addUserToGroupMutation.mutate({
        profileId: userId,
        groupId: selectedGroup.id,
      });
    });
    
    setSelectedUsersToAdd([]);
    setIsAddMemberDialogOpen(false);
  };

  const handleRemoveUserFromGroup = (userId: string) => {
    if (!selectedGroup) return;
    
    if (confirm('¿Estás seguro de eliminar este usuario del grupo?')) {
      removeUserFromGroupMutation.mutate({
        profileId: userId,
        groupId: selectedGroup.id,
      });
    }
  };

  const handleUpdateUserRole = (userId: string, newRole: 'member' | 'leader') => {
    if (!selectedGroup) return;
    
    updateUserRoleMutation.mutate({
      profileId: userId,
      groupId: selectedGroup.id,
      roleInGroup: newRole,
    });
  };

  if (loadingGroups) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando grupos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Gestión de Grupos
          </h2>
          <p className="text-muted-foreground">Organiza a los operarios en grupos para mejor gestión</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Crear Grupo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Grupo</DialogTitle>
              <DialogDescription>
                Crea un nuevo grupo para organizar a los operarios.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">Nombre del Grupo</Label>
                <Input
                  id="groupName"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="Ej: Equipo Alpha"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupColor">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="groupColor"
                    type="color"
                    value={newGroup.color}
                    onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={newGroup.color}
                    onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupDescription">Descripción (opcional)</Label>
                <Textarea
                  id="groupDescription"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="Describe el propósito de este grupo..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateGroup} disabled={createGroupMutation.isPending}>
                  {createGroupMutation.isPending ? 'Creando...' : 'Crear Grupo'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Grupos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Grupos ({groups.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors group",
                      selectedGroup?.id === group.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                    )}
                    onClick={() => setSelectedGroup(groupsWithMembers.find(g => g.id === group.id) || null)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="font-medium">{group.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {groupsWithMembers.find(g => g.id === group.id)?.member_count || 0}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            const groupWithMembers = groupsWithMembers.find(g => g.id === group.id);
                            if (groupWithMembers) {
                              setEditingGroup(groupWithMembers);
                              setIsEditDialogOpen(true);
                            }
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup(group.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Detalles del Grupo Seleccionado */}
        <Card className="lg:col-span-2">
          <CardHeader>
            {selectedGroup ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedGroup.color }}
                  />
                  <CardTitle className="text-lg">{selectedGroup.name}</CardTitle>
                  <Badge variant="secondary">
                    {selectedGroup.member_count || 0} miembros
                  </Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsAddMemberDialogOpen(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Añadir Miembros
                </Button>
              </div>
            ) : (
              <CardTitle className="text-lg text-muted-foreground">
                Selecciona un grupo para ver detalles
              </CardTitle>
            )}
          </CardHeader>
          <CardContent>
            {selectedGroup ? (
              <div className="space-y-4">
                {selectedGroup.description && (
                  <div>
                    <Label>Descripción</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedGroup.description}
                    </p>
                  </div>
                )}
                
                <div>
                  <Label>Miembros del Grupo</Label>
                  <div className="mt-2 space-y-2">
                    {selectedGroup.members.length > 0 ? (
                      selectedGroup.members.map((member) => (
                        <div key={member.profile_id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={member.status} size="sm" />
                            <div>
                              <div className="font-medium">{member.full_name}</div>
                              <div className="text-xs text-muted-foreground">{member.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={member.role_in_group}
                              onValueChange={(value: 'member' | 'leader') => 
                                handleUpdateUserRole(member.profile_id, value)
                              }
                            >
                              <SelectTrigger className="w-24 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Miembro</SelectItem>
                                <SelectItem value="leader">Líder</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => handleRemoveUserFromGroup(member.profile_id)}
                            >
                              <UserMinus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                        Este grupo no tiene miembros todavía.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4" />
                <p>Selecciona un grupo de la lista para ver y gestionar sus miembros.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogos adicionales */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
            <DialogDescription>
              Modifica la información del grupo seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editGroupName">Nombre del Grupo</Label>
              <Input
                id="editGroupName"
                value={editingGroup?.name || ''}
                onChange={(e) => setEditingGroup(editingGroup ? { ...editingGroup, name: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editGroupColor">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="editGroupColor"
                  type="color"
                  value={editingGroup?.color || '#3B82F6'}
                  onChange={(e) => setEditingGroup(editingGroup ? { ...editingGroup, color: e.target.value } : null)}
                  className="w-20 h-10"
                />
                <Input
                  value={editingGroup?.color || '#3B82F6'}
                  onChange={(e) => setEditingGroup(editingGroup ? { ...editingGroup, color: e.target.value } : null)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editGroupDescription">Descripción</Label>
              <Textarea
                id="editGroupDescription"
                value={editingGroup?.description || ''}
                onChange={(e) => setEditingGroup(editingGroup ? { ...editingGroup, description: e.target.value } : null)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateGroup} disabled={updateGroupMutation.isPending}>
                {updateGroupMutation.isPending ? 'Actualizando...' : 'Actualizar Grupo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Miembros al Grupo</DialogTitle>
            <DialogDescription>
              Selecciona los usuarios que quieres añadir al grupo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Seleccionar Usuarios</Label>
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {users
                    .filter(user => !selectedGroup?.members.some(m => m.profile_id === user.id))
                    .map((user) => (
                    <div key={user.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`user-${user.id}`}
                        checked={selectedUsersToAdd.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsersToAdd([...selectedUsersToAdd, user.id]);
                          } else {
                            setSelectedUsersToAdd(selectedUsersToAdd.filter(id => id !== user.id));
                          }
                        }}
                      />
                      <Label htmlFor={`user-${user.id}`} className="flex items-center gap-2 flex-1">
                        <StatusBadge status={user.status} size="sm" />
                        <span>{user.full_name}</span>
                        <span className="text-xs text-muted-foreground">({user.email})</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddUsersToGroup} 
                disabled={selectedUsersToAdd.length === 0 || addUserToGroupMutation.isPending}
              >
                {addUserToGroupMutation.isPending ? 'Añadiendo...' : `Añadir ${selectedUsersToAdd.length} usuarios`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}