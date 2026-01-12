import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface MobileAlertProps {
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    className?: string;
}

const alertConfig = {
    success: {
        icon: CheckCircle,
        color: 'text-green-500',
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        button: 'bg-green-600 hover:bg-green-700'
    },
    error: {
        icon: XCircle,
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        button: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
        icon: AlertTriangle,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        button: 'bg-amber-600 hover:bg-amber-700'
    },
    info: {
        icon: Info,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        button: 'bg-blue-600 hover:bg-blue-700'
    }
};

export function MobileAlert({
    isOpen,
    type,
    title,
    message,
    onConfirm,
    confirmText = 'ENTENDIDO',
    className
}: MobileAlertProps) {
    const config = alertConfig[type];
    const Icon = config.icon;
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShow(true);
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
        } else {
            const timer = setTimeout(() => setShow(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen && !show) return null;

    return (
        <div className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300",
            isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}>
            {/* Backdrop */}
            <div
                className={cn(
                    "absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
            />

            {/* Alert Content */}
            <div
                className={cn(
                    "relative w-full max-w-sm bg-[#1A1D21] border-2 rounded-xl p-6 shadow-2xl overflow-hidden transition-all duration-300 transform",
                    isOpen ? "scale-100 translate-y-0 opacity-100" : "scale-90 translate-y-4 opacity-0",
                    config.border,
                    className
                )}
            >
                {/* Background Glow */}
                <div className={cn("absolute inset-0 opacity-10", config.bg)} />

                <div className="relative flex flex-col items-center text-center gap-6">
                    {/* Icon */}
                    <div className={cn("p-4 rounded-full bg-background/50 border-2", config.border)}>
                        <Icon className={cn("w-16 h-16", config.color)} />
                    </div>

                    {/* Text */}
                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-white tracking-tight">
                            {title}
                        </h3>
                        <p className="text-base text-gray-400 leading-relaxed font-medium">
                            {message}
                        </p>
                    </div>

                    {/* Action */}
                    <Button
                        size="lg"
                        onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(50);
                            onConfirm();
                        }}
                        className={cn(
                            "w-full h-14 text-lg font-bold uppercase tracking-wider shadow-lg transition-all active:scale-95",
                            config.button
                        )}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
