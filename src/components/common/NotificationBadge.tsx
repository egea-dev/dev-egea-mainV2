/**
 * NotificationBadge - Badge con contador de notificaciones no leídas
 * 
 * Para usar en el sidebar o header para mostrar notificaciones pendientes
 */

import React from 'react';
import { Bell } from 'lucide-react';
import { useUnreadNotificationCount } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
    targetRole?: 'comercial' | 'production' | 'shipping' | 'admin';
    onClick?: () => void;
    className?: string;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
    targetRole,
    onClick,
    className
}) => {
    const count = useUnreadNotificationCount(targetRole);

    return (
        <button
            onClick={onClick}
            className={cn(
                "relative p-2 rounded-lg hover:bg-muted/50 transition-colors",
                className
            )}
        >
            <Bell className="w-5 h-5 text-gray-400" />
            {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </button>
    );
};

export default NotificationBadge;
