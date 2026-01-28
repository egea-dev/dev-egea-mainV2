/**
 * NotificationPanel - Panel lateral de notificaciones
 * 
 * Muestra lista de notificaciones con acciones
 */

import React from 'react';
import { X, Check, CheckCheck, Bell, Package, Truck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    useNotifications,
    useMarkAsRead,
    useMarkAllAsRead,
    NOTIFICATION_CONFIG,
    Notification
} from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    targetRole?: 'comercial' | 'production' | 'shipping' | 'admin';
    onNotificationClick?: (notification: Notification) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
    isOpen,
    onClose,
    targetRole,
    onNotificationClick
}) => {
    const { data: notifications = [], isLoading } = useNotifications(targetRole);
    const markAsRead = useMarkAsRead();
    const markAllAsRead = useMarkAllAsRead();

    const handleNotificationClick = (notification: Notification) => {
        markAsRead.mutate(notification.id);
        onNotificationClick?.(notification);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'shipping_ready':
            case 'order_processed':
                return <Package className="w-4 h-4" />;
            case 'tracking_added':
                return <Truck className="w-4 h-4" />;
            case 'incident_reported':
                return <AlertTriangle className="w-4 h-4" />;
            default:
                return <Bell className="w-4 h-4" />;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full max-w-md bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold text-white">Notificaciones</h2>
                        {notifications.length > 0 && (
                            <Badge variant="secondary" className="bg-primary/20 text-primary">
                                {notifications.length}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {notifications.length > 0 && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markAllAsRead.mutate(targetRole)}
                                disabled={markAllAsRead.isPending}
                                className="text-gray-400 hover:text-white"
                            >
                                <CheckCheck className="w-4 h-4 mr-1" />
                                Marcar todas
                            </Button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-muted/50 text-gray-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <ScrollArea className="h-[calc(100vh-70px)]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-gray-400">Cargando...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Bell className="w-12 h-12 text-gray-600 mb-3" />
                            <p className="text-gray-400 font-medium">No hay notificaciones</p>
                            <p className="text-gray-500 text-sm">
                                Las nuevas notificaciones aparecerán aquí
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {notifications.map((notification) => {
                                const config = NOTIFICATION_CONFIG[notification.type];
                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={cn(
                                            "p-4 cursor-pointer transition-colors",
                                            "hover:bg-muted/50",
                                            !notification.read && "bg-primary/5"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                config.bgColor
                                            )}>
                                                <span className={config.color}>
                                                    {getIcon(notification.type)}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className={cn(
                                                        "font-medium text-sm",
                                                        config.color
                                                    )}>
                                                        {config.title}
                                                    </p>
                                                    {!notification.read && (
                                                        <span className="w-2 h-2 bg-primary rounded-full" />
                                                    )}
                                                </div>
                                                <p className="text-white font-semibold text-sm">
                                                    Pedido {notification.order_number}
                                                </p>
                                                {notification.customer_name && (
                                                    <p className="text-gray-400 text-xs mt-0.5">
                                                        {notification.customer_name}
                                                    </p>
                                                )}
                                                {notification.tracking_number && (
                                                    <p className="text-gray-400 text-xs mt-1">
                                                        Tracking: {notification.tracking_number}
                                                    </p>
                                                )}
                                                <p className="text-gray-500 text-xs mt-2">
                                                    {formatDistanceToNow(new Date(notification.created_at), {
                                                        addSuffix: true,
                                                        locale: es
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
};

export default NotificationPanel;
