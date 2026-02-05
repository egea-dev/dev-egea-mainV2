/**
 * Hook para gestión de bultos de envío (Shipment Packages)
 * 
 * Proporciona operaciones CRUD para los bultos asociados a un pedido
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseProductivity } from '@/integrations/supabase';
import { toast } from 'sonner';

// Tipos
export interface ShipmentPackage {
    id: string;
    order_id: string;
    logistics_id?: string | null;
    package_number: number;
    units_count: number;
    weight_kg?: number | null;
    height_cm?: number | null;
    width_cm?: number | null;
    length_cm?: number | null;
    created_at: string;
    updated_at: string;
}

export interface CreatePackageInput {
    order_id: string;
    logistics_id?: string;
    package_number: number;
    units_count: number;
    weight_kg?: number;
    height_cm?: number;
    width_cm?: number;
    length_cm?: number;
}

export interface UpdatePackageInput {
    id: string;
    units_count?: number;
    weight_kg?: number;
    height_cm?: number;
    width_cm?: number;
    length_cm?: number;
}

// Lista de empresas de transporte predefinidas
export const CARRIER_COMPANIES = [
    { value: 'CORREOS', label: 'Correos / Correos Express' },
    { value: 'MRW', label: 'MRW' },
    { value: 'SEUR', label: 'SEUR' },
    { value: 'GLS', label: 'GLS' },
    { value: 'UPS', label: 'UPS' },
    { value: 'DHL', label: 'DHL' },
    { value: 'FEDEX', label: 'FedEx' },
    { value: 'ENVIALIA', label: 'Envialia' },
    { value: 'NACEX', label: 'Nacex' },
    { value: 'OTRO', label: 'Otra empresa' }
] as const;

/**
 * Hook para obtener los bultos de un pedido
 */
export const useShipmentPackages = (orderId: string | undefined) => {
    return useQuery({
        queryKey: ['shipment-packages', orderId],
        queryFn: async () => {
            if (!orderId) return [];

            const { data, error } = await supabaseProductivity
                .from('shipment_packages')
                .select('*')
                .eq('order_id', orderId)
                .order('package_number', { ascending: true });

            if (error) {
                console.error('Error fetching shipment packages:', error);
                throw error;
            }

            return data as ShipmentPackage[];
        },
        enabled: !!orderId,
    });
};

/**
 * Hook para crear un nuevo bulto
 */
export const useCreatePackage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreatePackageInput) => {
            const { data, error } = await supabaseProductivity
                .from('shipment_packages')
                .insert(input)
                .select()
                .single();

            if (error) {
                console.error('Error creating package:', error);
                throw error;
            }

            return data as ShipmentPackage;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['shipment-packages', data.order_id] });
            toast.success(`Bulto ${data.package_number} añadido`);
        },
        onError: (error: any) => {
            toast.error(`Error al crear bulto: ${error.message}`);
        },
    });
};

/**
 * Hook para crear múltiples bultos a la vez (Batch)
 */
export const useCreatePackages = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (inputs: CreatePackageInput[]) => {
            const { data, error } = await supabaseProductivity
                .from('shipment_packages')
                .insert(inputs)
                .select();

            if (error) {
                console.error('Error creating packages batch:', error);
                throw error;
            }

            return data as ShipmentPackage[];
        },
        onSuccess: (data) => {
            if (data.length > 0) {
                queryClient.invalidateQueries({ queryKey: ['shipment-packages', data[0].order_id] });
                // Evitamos mostrar spam de toasts si son muchos bultos, uno general está bien
                if (data.length > 1) {
                    toast.success(`${data.length} bultos generados automáticamente`);
                } else {
                    toast.success(`Bulto añadido`);
                }
            }
        },
        onError: (error: any) => {
            toast.error(`Error al crear bultos: ${error.message}`);
        },
    });
};

/**
 * Hook para actualizar un bulto existente
 */
export const useUpdatePackage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: UpdatePackageInput) => {
            const { data, error } = await supabaseProductivity
                .from('shipment_packages')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error updating package:', error);
                throw error;
            }

            return data as ShipmentPackage;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['shipment-packages', data.order_id] });
        },
        onError: (error: any) => {
            toast.error(`Error al actualizar bulto: ${error.message}`);
        },
    });
};

/**
 * Hook para eliminar un bulto
 */
export const useDeletePackage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, orderId }: { id: string; orderId: string }) => {
            const { error } = await supabaseProductivity
                .from('shipment_packages')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting package:', error);
                throw error;
            }

            return { id, orderId };
        },
        onSuccess: ({ orderId }) => {
            queryClient.invalidateQueries({ queryKey: ['shipment-packages', orderId] });
            toast.success('Bulto eliminado');
        },
        onError: (error: any) => {
            toast.error(`Error al eliminar bulto: ${error.message}`);
        },
    });
};

/**
 * Hook para obtener el siguiente número de bulto disponible
 */
export const useNextPackageNumber = (orderId: string | undefined) => {
    return useQuery({
        queryKey: ['next-package-number', orderId],
        queryFn: async () => {
            if (!orderId) return 1;

            const { data, error } = await supabaseProductivity
                .from('shipment_packages')
                .select('package_number')
                .eq('order_id', orderId)
                .order('package_number', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Error getting next package number:', error);
                return 1;
            }

            return (data[0]?.package_number || 0) + 1;
        },
        enabled: !!orderId,
    });
};

/**
 * Calcula el total de unidades en todos los bultos
 */
export const calculateTotalUnits = (packages: ShipmentPackage[]): number => {
    return packages.reduce((sum, pkg) => sum + (pkg.units_count || 0), 0);
};

/**
 * Calcula el peso total de todos los bultos
 */
export const calculateTotalWeight = (packages: ShipmentPackage[]): number => {
    return packages.reduce((sum, pkg) => sum + (pkg.weight_kg || 0), 0);
};

/**
 * Valida los bultos antes de procesar el envío
 */
export interface PackageValidationResult {
    isValid: boolean;
    errors: string[];
}

export const validatePackagesForShipping = (
    packages: ShipmentPackage[],
    expectedTotalUnits: number,
    carrierCompany: string | null,
    trackingNumber: string | null,
    options?: {
        requireTracking?: boolean;
    }
): PackageValidationResult => {
    const errors: string[] = [];
    const requireTracking = options?.requireTracking ?? true;

    // Al menos 1 bulto registrado
    if (packages.length === 0) {
        errors.push('Debe registrar al menos 1 bulto');
    }

    // Total unidades = cantidad del pedido
    const totalUnits = calculateTotalUnits(packages);
    if (totalUnits !== expectedTotalUnits) {
        errors.push(`Total unidades en bultos (${totalUnits}) no coincide con cantidad del pedido (${expectedTotalUnits})`);
    }

    // Todos los pesos introducidos
    const missingWeights = packages.filter(pkg => !pkg.weight_kg || pkg.weight_kg <= 0);
    if (missingWeights.length > 0) {
        errors.push(`Falta el peso en ${missingWeights.length} bulto(s)`);
    }

    // Empresa de envíos seleccionada
    if (!carrierCompany) {
        errors.push('Debe seleccionar una empresa de envíos');
    }

    // Número de envío rellenado
    if (requireTracking && (!trackingNumber || trackingNumber.trim() === '')) {
        errors.push('Debe introducir el número de envío/tracking');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

