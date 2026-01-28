import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackingToggleProps {
    hasTracking: boolean;
    onToggle: (hasTracking: boolean) => void;
    className?: string;
}

export function TrackingToggle({
    hasTracking,
    onToggle,
    className
}: TrackingToggleProps) {
    return (
        <div className={cn("flex flex-col gap-3", className)}>
            <div className="flex items-center justify-between bg-[#1A1D21] p-3 rounded-lg border border-[#2A2D31]">
                <div className="flex flex-col gap-1">
                    <Label htmlFor="tracking-mode" className="text-white font-medium">
                        ¿Dispones del número de tracking?
                    </Label>
                    <span className="text-xs text-[#8B8D90]">
                        {hasTracking
                            ? "Ingresaré el número ahora"
                            : "Lo añadiré más tarde (quedará pendiente)"}
                    </span>
                </div>
                <Switch
                    id="tracking-mode"
                    checked={!hasTracking}
                    onCheckedChange={(checked) => onToggle(!checked)}
                    className="data-[state=checked]:bg-amber-600"
                />
            </div>

            {!hasTracking && (
                <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-900/20 p-2 rounded border border-amber-500/20 animate-in fade-in slide-in-from-top-1">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                        El pedido se enviará como <strong>"Tracking Pendiente"</strong>.
                        Deberás actualizarlo desde el listado cuando tengas el número.
                    </p>
                </div>
            )}
        </div>
    );
}
