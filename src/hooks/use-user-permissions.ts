import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type UserPermission = {
    id: string;
    user_id: string;
    resource: string;
    action: string;
    granted: boolean;
    created_at: string;
    updated_at: string;
};

// Hook para obtener permisos de un usuario específico
export function useUserPermissions(userId?: string) {
    return useQuery({
        queryKey: ['user-permissions', userId],
        queryFn: async () => {
            if (!userId) return [];

            const { data, error } = await (supabase
                .from('user_permissions')
                .select('*')
                .eq('user_id', userId) as any);

            if (error) throw error;
            return data as UserPermission[];
        },
        enabled: !!userId,
    });
}

// Hook para obtener todos los permisos de todos los usuarios
export function useAllUserPermissions() {
    return useQuery({
        queryKey: ['all-user-permissions'],
        queryFn: async () => {
            const { data, error } = await (supabase
                .from('user_permissions')
                .select('*')
                .order('user_id') as any);

            if (error) throw error;
            return data as UserPermission[];
        },
    });
}

// Hook para actualizar o crear un permiso de usuario
export function useUpsertUserPermission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            resource,
            action,
            granted,
        }: {
            userId: string;
            resource: string;
            action: string;
            granted: boolean;
        }) => {
            const { data, error } = await (supabase
                .from('user_permissions') as any)
                .upsert(
                    {
                        user_id: userId,
                        resource,
                        action,
                        granted,
                    },
                    {
                        onConflict: 'user_id,resource,action',
                    }
                )
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
            queryClient.invalidateQueries({ queryKey: ['all-user-permissions'] });
        },
        onError: (error) => {
            console.error('Error updating user permission:', error);
            toast.error('Error al actualizar permiso');
        },
    });
}

// Hook para eliminar un permiso de usuario (volver a usar permisos por rol)
export function useDeleteUserPermission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            resource,
            action,
        }: {
            userId: string;
            resource: string;
            action: string;
        }) => {
            const { error } = await (supabase
                .from('user_permissions') as any)
                .delete()
                .eq('user_id', userId)
                .eq('resource', resource)
                .eq('action', action);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
            queryClient.invalidateQueries({ queryKey: ['all-user-permissions'] });
        },
        onError: (error) => {
            console.error('Error deleting user permission:', error);
            toast.error('Error al eliminar permiso');
        },
    });
}

// Hook para verificar si un usuario tiene permiso para un módulo específico
export function useCheckUserPermission(userId?: string, resource?: string, action: string = 'view') {
    return useQuery({
        queryKey: ['check-user-permission', userId, resource, action],
        queryFn: async () => {
            if (!userId || !resource) return null;

            const { data, error } = await (supabase
                .from('user_permissions') as any)
                .select('granted')
                .eq('user_id', userId)
                .eq('resource', resource)
                .eq('action', action)
                .maybeSingle();

            if (error) throw error;
            return data?.granted ?? null; // null means use role-based permission
        },
        enabled: !!userId && !!resource,
    });
}
