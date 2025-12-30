import React from 'react';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { calculateSLAStatus } from '@/hooks/use-sla';
import { cn } from '@/lib/utils';

interface SLAIndicatorProps {
    deliveryDate: Date | string | null;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export const SLAIndicator: React.FC<SLAIndicatorProps> = ({
    deliveryDate,
    size = 'md',
    showLabel = true
}) => {
    const slaStatus = calculateSLAStatus(deliveryDate);

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-2'
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    if (slaStatus.status === 'OVERDUE') {
        return (
            <Badge
                variant="outline"
                className={cn(
                    "bg-red-500/10 text-red-500 border-red-500/20 font-bold",
                    sizeClasses[size]
                )}
            >
                <AlertTriangle className={cn(iconSizes[size], "mr-1")} />
                {showLabel && `RETRASADO (${Math.abs(slaStatus.daysRemaining)}d)`}
            </Badge>
        );
    }

    if (slaStatus.status === 'WARNING') {
        return (
            <Badge
                variant="outline"
                className={cn(
                    "bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold",
                    sizeClasses[size]
                )}
            >
                <Clock className={cn(iconSizes[size], "mr-1")} />
                {showLabel && `URGENTE (${slaStatus.daysRemaining}d)`}
            </Badge>
        );
    }

    return (
        <Badge
            variant="outline"
            className={cn(
                "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                sizeClasses[size]
            )}
        >
            <CheckCircle className={cn(iconSizes[size], "mr-1")} />
            {showLabel && `OK (${slaStatus.daysRemaining}d)`}
        </Badge>
    );
};
