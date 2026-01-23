/**
 * Hook para sistema de notificaciones internas
 * 
 * Gestiona alertas y notificaciones entre departamentos:
 * - Envíos → Comercial: Pedido listo con tracking
 * - Producción → Envíos: Pedido terminado
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseProductivity } from '@/integrations/supabase';
import { toast } from 'sonner';
import { useEffect } from 'react';

// Tipos
export type NotificationType =
    | 'shipping_ready'      // Pedido listo para envío (Producción → Envíos)
    | 'tracking_added'      // Tracking añadido (Envíos → Comercial)
    | 'order_processed'     // Pedido procesado (Envíos → Comercial)
    | 'order_delivered'     // Pedido entregado
    | 'incident_reported';  // Incidencia reportada

export interface Notification {
    id: string;
    type: NotificationType;
    order_id: string;
    order_number: string;
    customer_name?: string;
    tracking_number?: string;
    carrier_company?: string;
    message?: string;
    created_at: string;
    read: boolean;
    read_at?: string;
    target_role: 'comercial' | 'production' | 'shipping' | 'admin';
    created_by?: string;
}

export interface CreateNotificationInput {
    type: NotificationType;
    order_id: string;
    order_number: string;
    customer_name?: string;
    tracking_number?: string;
    carrier_company?: string;
    message?: string;
    target_role: 'comercial' | 'production' | 'shipping' | 'admin';
}

// Iconos y colores por tipo de notificación
export const NOTIFICATION_CONFIG: Record<NotificationType, {
    title: string;
    color: string;
    bgColor: string;
    icon: string;
}> = {
    shipping_ready: {
        title: 'Pedido Listo para Envío',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        icon: '📦'
    },
    tracking_added: {
        title: 'Tracking Añadido',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20',
        icon: '🚚'
    },
    order_processed: {
        title: 'Envío Procesado',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        icon: '✅'
    },
    order_delivered: {
        title: 'Pedido Entregado',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        icon: '🎉'
    },
    incident_reported: {
        title: 'Incidencia Reportada',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        icon: '⚠️'
    }
};

/**
 * Hook para obtener notificaciones no leídas
 */
export const useNotifications = (targetRole?: string) => {
    return useQuery({
        queryKey: ['notifications', targetRole],
        queryFn: async () => {
            // Nota: Esta tabla necesita ser creada en la BD
            // Por ahora, simulamos con localStorage
            const stored = localStorage.getItem('egea_notifications');
            const all = stored ? JSON.parse(stored) as Notification[] : [];

            if (targetRole) {
                return all.filter(n => n.target_role === targetRole && !n.read);
            }
            return all.filter(n => !n.read);
        },
        refetchInterval: 30000, // Refrescar cada 30 segundos
    });
};

/**
 * Hook para obtener conteo de notificaciones no leídas
 */
export const useUnreadNotificationCount = (targetRole?: string) => {
    const { data: notifications = [] } = useNotifications(targetRole);
    return notifications.length;
};

/**
 * Hook para crear una notificación
 */
export const useCreateNotification = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateNotificationInput): Promise<Notification> => {
            const notification: Notification = {
                id: crypto.randomUUID(),
                ...input,
                created_at: new Date().toISOString(),
                read: false
            };

            // Guardar en localStorage (simular BD)
            const stored = localStorage.getItem('egea_notifications');
            const all = stored ? JSON.parse(stored) as Notification[] : [];
            all.unshift(notification);
            localStorage.setItem('egea_notifications', JSON.stringify(all));

            return notification;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });

            // Mostrar toast según el tipo
            const config = NOTIFICATION_CONFIG[data.type];
            toast.info(`${config.icon} ${config.title}: Pedido ${data.order_number}`);
        },
        onError: (error: any) => {
            toast.error(`Error al crear notificación: ${error.message}`);
        },
    });
};

/**
 * Hook para marcar notificación como leída
 */
export const useMarkAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const stored = localStorage.getItem('egea_notifications');
            const all = stored ? JSON.parse(stored) as Notification[] : [];

            const updated = all.map(n =>
                n.id === notificationId
                    ? { ...n, read: true, read_at: new Date().toISOString() }
                    : n
            );

            localStorage.setItem('egea_notifications', JSON.stringify(updated));
            return notificationId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};

/**
 * Hook para marcar todas las notificaciones como leídas
 */
export const useMarkAllAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (targetRole?: string) => {
            const stored = localStorage.getItem('egea_notifications');
            const all = stored ? JSON.parse(stored) as Notification[] : [];

            const updated = all.map(n => {
                if (targetRole && n.target_role !== targetRole) return n;
                return { ...n, read: true, read_at: new Date().toISOString() };
            });

            localStorage.setItem('egea_notifications', JSON.stringify(updated));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Todas las notificaciones marcadas como leídas');
        },
    });
};

/**
 * Función helper para crear notificación de tracking
 */
export const createTrackingNotification = async (
    createNotification: ReturnType<typeof useCreateNotification>['mutateAsync'],
    orderId: string,
    orderNumber: string,
    customerName: string,
    trackingNumber: string,
    carrierCompany: string
) => {
    await createNotification({
        type: 'order_processed',
        order_id: orderId,
        order_number: orderNumber,
        customer_name: customerName,
        tracking_number: trackingNumber,
        carrier_company: carrierCompany,
        message: `Pedido ${orderNumber} procesado con tracking ${trackingNumber} (${carrierCompany})`,
        target_role: 'comercial'
    });
};

/**
 * Hook para escuchar notificaciones en tiempo real
 * (Placeholder para futuro Supabase Realtime)
 */
export const useNotificationListener = (onNewNotification?: (notification: Notification) => void) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        // Futuro: Integrar con Supabase Realtime
        // Por ahora, polling cada 30 segundos
        const interval = setInterval(() => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }, 30000);

        return () => clearInterval(interval);
    }, [queryClient, onNewNotification]);
};
