import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseProductivity as supabase } from "@/integrations/supabase";
import { toast } from "sonner";

export type DocumentType = 'PRESUPUESTO' | 'PEDIDO_ACEPTADO';

export interface OrderDocument {
    type: DocumentType;
    url: string;
    storage_path: string;
    name: string;
    uploaded_at: string;
}

export const useUploadOrderDocument = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            orderId,
            file,
            type
        }: {
            orderId: string;
            file: File;
            type: DocumentType
        }) => {
            // Generate unique path
            const timestamp = Date.now();
            const path = `${orderId}/${type}/${timestamp}_${file.name}`;

            // Upload to storage
            const { error: uploadError } = await supabase.storage
                .from('order-documents')
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error("Upload error:", uploadError);
                throw uploadError;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('order-documents')
                .getPublicUrl(path);

            // Get current order documents
            const { data: order, error: fetchError } = await supabase
                .from('comercial_orders')
                .select('documents')
                .eq('id', orderId)
                .single();

            if (fetchError) throw fetchError;

            // Create new document entry
            const newDoc: OrderDocument = {
                type,
                url: publicUrl,
                storage_path: path,
                name: file.name,
                uploaded_at: new Date().toISOString()
            };

            // Update documents array (replace if same type exists)
            const currentDocs = (order?.documents as OrderDocument[]) || [];
            const updatedDocs = [
                ...currentDocs.filter(d => d.type !== type),
                newDoc
            ];

            // Update order
            const { error: updateError } = await supabase
                .from('comercial_orders')
                .update({ documents: updatedDocs })
                .eq('id', orderId);

            if (updateError) throw updateError;

            return newDoc;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success(`${variables.type === 'PRESUPUESTO' ? 'Presupuesto' : 'Pedido'} subido correctamente`);
        },
        onError: (error: any) => {
            toast.error(`Error al subir documento: ${error.message}`);
        }
    });
};

export const useDeleteOrderDocument = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            orderId,
            storagePath,
            type
        }: {
            orderId: string;
            storagePath: string;
            type: DocumentType;
        }) => {
            // Delete from storage
            const { error: deleteError } = await supabase.storage
                .from('order-documents')
                .remove([storagePath]);

            if (deleteError) {
                console.error("Delete error:", deleteError);
                throw deleteError;
            }

            // Get current order documents
            const { data: order, error: fetchError } = await supabase
                .from('comercial_orders')
                .select('documents')
                .eq('id', orderId)
                .single();

            if (fetchError) throw fetchError;

            // Remove document from array
            const currentDocs = (order?.documents as OrderDocument[]) || [];
            const updatedDocs = currentDocs.filter(d => d.type !== type);

            // Update order
            const { error: updateError } = await supabase
                .from('comercial_orders')
                .update({ documents: updatedDocs })
                .eq('id', orderId);

            if (updateError) throw updateError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success('Documento eliminado correctamente');
        },
        onError: (error: any) => {
            toast.error(`Error al eliminar documento: ${error.message}`);
        }
    });
};
