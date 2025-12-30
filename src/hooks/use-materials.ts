import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseProductivity } from '@/integrations/supabase/client';
import { Material, CreateMaterialInput, UpdateMaterialInput } from '@/types/almacen';
import { toast } from 'sonner';

// Query key
const MATERIALS_KEY = ['materials'];

// Fetch all materials
export function useMaterials() {
    return useQuery({
        queryKey: MATERIALS_KEY,
        queryFn: async () => {
            const { data, error } = await supabaseProductivity
                .from('almacen_materials')
                .select('*')
                .eq('is_active', true)
                .order('name', { ascending: true });

            if (error) throw error;
            return data as Material[];
        },
    });
}

// Create material
export function useCreateMaterial() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateMaterialInput) => {
            const { data, error } = await supabaseProductivity
                .from('almacen_materials')
                .insert([input])
                .select()
                .single();

            if (error) throw error;
            return data as Material;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MATERIALS_KEY });
            toast.success('Material creado exitosamente');
        },
        onError: (error: any) => {
            toast.error(`Error al crear material: ${error.message}`);
        },
    });
}

// Update material
export function useUpdateMaterial() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateMaterialInput }) => {
            const { data: updated, error } = await supabaseProductivity
                .from('almacen_materials')
                .update({ ...data, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return updated as Material;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MATERIALS_KEY });
            toast.success('Material actualizado exitosamente');
        },
        onError: (error: any) => {
            toast.error(`Error al actualizar material: ${error.message}`);
        },
    });
}

// Delete material (soft delete)
export function useDeleteMaterial() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabaseProductivity
                .from('almacen_materials')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MATERIALS_KEY });
            toast.success('Material eliminado exitosamente');
        },
        onError: (error: any) => {
            toast.error(`Error al eliminar material: ${error.message}`);
        },
    });
}
