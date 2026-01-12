import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IncidentReportButtonProps {
    onClick: () => void;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'outline' | 'ghost' | 'solid';
}

export function IncidentReportButton({
    onClick,
    className,
    size = 'md',
    variant = 'outline'
}: IncidentReportButtonProps) {

    const sizeClasses = {
        sm: 'p-2 text-xs',
        md: 'p-3 text-sm',
        lg: 'p-4 text-base'
    };

    const variantClasses = {
        outline: 'border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50',
        ghost: 'text-red-400 hover:bg-red-500/10',
        solid: 'bg-red-900/20 text-red-400 border border-red-500/20 hover:bg-red-900/40'
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "rounded-lg flex items-center justify-center gap-2 transition-all duration-200 group font-medium",
                sizeClasses[size],
                variantClasses[variant],
                className
            )}
            title="Reportar Incidencia"
        >
            <AlertTriangle className={cn(
                "shrink-0",
                size === 'sm' ? "w-4 h-4" : "w-5 h-5",
                "group-hover:animate-pulse"
            )} />
            <span>Reportar Incidencia</span>
        </button>
    );
}
