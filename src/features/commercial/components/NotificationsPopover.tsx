import React from 'react';
import { Bell, Check, Trash2, ExternalLink, Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, NotificationType } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const NotificationIcon = ({ type }: { type: NotificationType }) => {
    switch (type) {
        case 'info': return <Info className="w-4 h-4 text-blue-400" />;
        case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
        case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
        case 'success': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    }
};

export const NotificationsPopover: React.FC = () => {
    const { notifications, unreadCount, markAsRead, clearAll } = useNotifications('comercial');

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-white/10 transition-colors">
                    <Bell className="w-5 h-5 text-gray-300" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white ring-2 ring-background animate-pulse">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-card border-border/60 shadow-2xl" align="end">
                <div className="flex items-center justify-between p-4 border-b border-border/60">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        Notificaciones
                        {unreadCount > 0 && (
                            <Badge variant="secondary" className="px-1 text-[10px]">
                                {unreadCount} nuevas
                            </Badge>
                        )}
                    </h4>
                    {notifications.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-[10px] text-gray-400 hover:text-white"
                            onClick={() => clearAll()}
                        >
                            Marcar todo como leído
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[350px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                            <Bell className="w-8 h-8 mb-2" />
                            <p className="text-xs">No hay notificaciones</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/40">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={cn(
                                        "p-4 transition-colors cursor-pointer group hover:bg-white/5",
                                        !notif.is_read && "bg-primary/5"
                                    )}
                                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-0.5">
                                            <NotificationIcon type={notif.type} />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <p className={cn(
                                                    "text-xs font-bold",
                                                    notif.is_read ? "text-gray-400" : "text-white"
                                                )}>
                                                    {notif.title}
                                                </p>
                                                <span className="text-[10px] text-gray-500">
                                                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                                {notif.message}
                                            </p>
                                            {notif.order_number && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="outline" className="text-[10px] text-primary/70 border-primary/20">
                                                        #{notif.order_number}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                        {!notif.is_read && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t border-border/60 bg-muted/20">
                    <Button variant="ghost" className="w-full text-[10px] text-gray-500 hover:text-gray-300 h-8">
                        Ver todas las notificaciones
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};
