import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface Group {
  id: string;
  name: string;
  color: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileGroup {
  id: string;
  profile_id: string;
  group_id: string;
  role_in_group: 'member' | 'leader';
  created_at: string;
}

export interface GroupWithMembers extends Group {
  members: Array<{
    profile_id: string;
    full_name: string;
    email: string;
    status: string;
    role_in_group: string;
  }>;
  member_count: number;
}

// Hooks para grupos
export const useGroups = () => {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Group[];
    },
  });
};

export const useGroupsWithMembers = () => {
  return useQuery({
    queryKey: ['groups', 'with-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          profile_groups(
            profile_id,
            profiles(
              id,
              full_name,
              email,
              status
            ),
            role_in_group
          )
        `)
        .order('name');

      if (error) throw error;

      // Transformar datos para incluir miembros y conteo
      return data.map((group: any) => ({
        ...group,
        members: (group.profile_groups || []).map((pg: any) => ({
            profile_id: pg.profile_id,
            full_name: pg.profiles?.full_name || 'Usuario',
            email: pg.profiles?.email || '',
            status: pg.profiles?.status || 'activo',
            role_in_group: pg.role_in_group || 'miembro',
        })),
        member_count: (group.profile_groups || []).length,
      })) as GroupWithMembers[];
    },
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupData: Omit<Group, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('groups')
        .insert(groupData)
        .select()
        .single();

      if (error) throw error;
      return data as Group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'with-members'] });
      toast.success('Grupo creado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al crear grupo: ' + error.message);
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Group> & { id: string }) => {
      const { data, error } = await supabase
        .from('groups')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'with-members'] });
      toast.success('Grupo actualizado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al actualizar grupo: ' + error.message);
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      return groupId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'with-members'] });
      toast.success('Grupo eliminado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al eliminar grupo: ' + error.message);
    },
  });
};

// Hooks para asignaciones de usuarios a grupos
export const useAddUserToGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      profileId, 
      groupId, 
      roleInGroup = 'member' 
    }: { 
      profileId: string; 
      groupId: string; 
      roleInGroup?: 'member' | 'leader';
    }) => {
      const { data, error } = await supabase
        .from('profile_groups')
        .insert({
          profile_id: profileId,
          group_id: groupId,
          role_in_group: roleInGroup,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ProfileGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'with-members'] });
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      toast.success('Usuario añadido al grupo exitosamente');
    },
    onError: (error) => {
      toast.error('Error al añadir usuario al grupo: ' + error.message);
    },
  });
};

export const useRemoveUserFromGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId, groupId }: { profileId: string; groupId: string }) => {
      const { error } = await supabase
        .from('profile_groups')
        .delete()
        .eq('profile_id', profileId)
        .eq('group_id', groupId);

      if (error) throw error;
      return { profileId, groupId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'with-members'] });
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      toast.success('Usuario eliminado del grupo exitosamente');
    },
    onError: (error) => {
      toast.error('Error al eliminar usuario del grupo: ' + error.message);
    },
  });
};

export const useUpdateUserRoleInGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      profileId, 
      groupId, 
      roleInGroup 
    }: { 
      profileId: string; 
      groupId: string; 
      roleInGroup: 'member' | 'leader';
    }) => {
      const { data, error } = await supabase
        .from('profile_groups')
        .update({ role_in_group: roleInGroup })
        .eq('profile_id', profileId)
        .eq('group_id', groupId)
        .select()
        .single();

      if (error) throw error;
      return data as ProfileGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'with-members'] });
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      toast.success('Rol actualizado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al actualizar rol: ' + error.message);
    },
  });
};

// Hook para obtener grupos de un usuario específico
export const useUserGroups = (profileId?: string) => {
  return useQuery({
    queryKey: ['user-groups', profileId],
    queryFn: async () => {
      if (!profileId) return [];

      const { data, error } = await supabase
        .rpc('get_user_groups', { user_profile_id: profileId });

      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
};

// Hook para obtener miembros de un grupo específico
export const useGroupMembers = (groupId?: string) => {
  return useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .rpc('get_group_members', { group_id: groupId });

      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });
};