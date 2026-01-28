import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseProductivity } from '@/integrations/supabase';
import { toast } from 'sonner';

export type InventoryStatus = 'EN_ALMACEN' | 'EMBALADO' | 'EN_REPARTO' | 'ENTREGADO' | 'DEVUELTO';
export type ShipmentStatus = 'PENDIENTE' | 'TRANSITO' | 'ENTREGADO' | 'INCIDENCIA';

export interface InventoryItem {
    id: string;
    work_order_id: string | null;
    order_number: string;
    rack: string | null;
    shelf: string | null;
    status: InventoryStatus;
    packaging_type: string | null;
    weight_kg: number | null;
    dimensions_cm: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface Shipment {
    id: string;
    tracking_number: string | null;
    carrier_name: string | null;
    shipment_date: string | null;
    estimated_arrival: string | null;
    status: ShipmentStatus;
    recipient_name: string | null;
    delivery_address: string | null;
    delivery_city: string | null;
    delivery_phone: string | null;
    scanned_packages?: number;
    packages_count?: number;
    created_at: string;
    updated_at: string;
}

// HOOKS PARA INVENTARIO
export const useInventory = () => {
    return useQuery({
        queryKey: ['inventory'],
        queryFn: async () => {
            const { data, error } = await supabaseProductivity
                .schema('almacen')
                .from('inventory')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as InventoryItem[];
        },
    });
};

export const useUpdateInventoryStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status, rack, shelf }: { id: string, status: InventoryStatus, rack?: string, shelf?: string }) => {
            const updates: any = {
                status,
                updated_at: new Date().toISOString()
            };
            if (rack) updates.rack = rack;
            if (shelf) updates.shelf = shelf;

            const { data, error } = await supabaseProductivity
                .schema('almacen')
                .from('inventory')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            toast.success('Estado de inventario actualizado');
        },
    });
};

// HOOKS PARA EXPEDICIONES
export const useShipments = () => {
    return useQuery({
        queryKey: ['shipments'],
        queryFn: async () => {
            const { data, error } = await supabaseProductivity
                .schema('almacen')
                .from('shipments')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Shipment[];
        },
    });
};

export const useCreateShipment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (shipmentData: {
            carrier_name: string,
            recipient_name: string,
            delivery_address: string,
            delivery_city: string
        }) => {
            const { data, error } = await supabaseProductivity
                .schema('almacen')
                .from('shipments')
                .insert({
                    ...shipmentData,
                    status: 'PENDIENTE'
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shipments'] });
            toast.success('Expedición creada');
        },
    });
};

export const useShipmentItems = (shipmentId: string) => {
    return useQuery({
        queryKey: ['shipment-items', shipmentId],
        queryFn: async () => {
            const { data, error } = await supabaseProductivity
                .schema('almacen')
                .from('shipment_items')
                .select(`
                    id,
                    inventory:inventory_id (*)
                `)
                .eq('shipment_id', shipmentId);

            if (error) throw error;
            // Mapeamos para devolver solo los datos de inventario
            // Nota: inventory_id es una foreign key a la tabla inventory, Supabase devuelve el objeto anidado
            return (data as any[]).map(item => item.inventory) as InventoryItem[];
        },
        enabled: !!shipmentId
    });
};

export const useAddShipmentItems = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ shipmentId, inventoryIds }: { shipmentId: string, inventoryIds: string[] }) => {
            // 1. Crear relaciones
            const items = inventoryIds.map(id => ({
                shipment_id: shipmentId,
                inventory_id: id
            }));

            const { error: linkError } = await supabaseProductivity
                .schema('almacen')
                .from('shipment_items')
                .insert(items);

            if (linkError) throw linkError;

            // 2. Actualizar estado de items a EMBALADO
            const { error: updateError } = await supabaseProductivity
                .schema('almacen')
                .from('inventory')
                .update({ status: 'EMBALADO' })
                .in('id', inventoryIds);

            if (updateError) throw updateError;

            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shipment-items'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            toast.success('Bultos añadidos a la expedición');
        }
    });
};


export const useUpdateShipmentStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status, tracking_number }: { id: string, status: ShipmentStatus, tracking_number?: string }) => {
            const { data, error } = await supabaseProductivity
                .schema('almacen')
                .from('shipments')
                .update({
                    status,
                    tracking_number,
                    shipment_date: status === 'TRANSITO' ? new Date().toISOString() : undefined,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shipments'] });
            toast.success('Estado del envío actualizado');
        },
    });
};
