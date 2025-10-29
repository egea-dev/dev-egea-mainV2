import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Car, AlertTriangle, Wrench } from 'lucide-react';

type VehicleStatusBadgeProps = {
  status: 'normal' | 'accidentado' | 'revision';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
};

export const VehicleStatusBadge = ({
  status,
  size = 'sm',
  showIcon = true,
  className = ''
}: VehicleStatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'normal':
        return {
          label: 'Normal',
          variant: 'default' as const,
          icon: Car,
          className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
        };
      case 'accidentado':
        return {
          label: 'Accidentado',
          variant: 'destructive' as const,
          icon: AlertTriangle,
          className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
        };
      case 'revision':
        return {
          label: 'Revisión',
          variant: 'secondary' as const,
          icon: Wrench,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'
        };
      default:
        return {
          label: status,
          variant: 'outline' as const,
          icon: Car,
          className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'font-medium flex items-center gap-1 border',
        sizeClasses[size],
        config.className,
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
};
