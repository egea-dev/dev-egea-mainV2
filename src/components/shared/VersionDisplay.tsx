import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface VersionDisplayProps {
    variant?: "badge" | "text" | "full";
    showChangelog?: boolean;
}

export const VersionDisplay = ({
    variant = "badge",
    showChangelog = false
}: VersionDisplayProps) => {
    const version = import.meta.env.VITE_APP_VERSION || "2.0.0-beta";
    const buildDate = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const changelog = [
        {
            version: "2.0.0-beta",
            date: "2 Ene 2024",
            changes: [
                "Sistema de roles expandido (8 roles)",
                "Permisos granulares por rol",
                "UI móvil optimizada",
                "Comunicaciones en desarrollo",
                "Calendario global responsive"
            ]
        },
        {
            version: "1.0.0-alpha",
            date: "Dic 2023",
            changes: [
                "Versión inicial",
                "Sistema básico de usuarios",
                "Gestión de instalaciones",
                "Gestión de vehículos"
            ]
        }
    ];

    if (variant === "text") {
        return <span className="text-xs text-muted-foreground">v{version}</span>;
    }

    if (variant === "badge") {
        if (!showChangelog) {
            return (
                <Badge variant="outline" className="text-xs font-mono">
                    v{version}
                </Badge>
            );
        }

        return (
            <Popover>
                <PopoverTrigger asChild>
                    <button className="inline-flex">
                        <Badge
                            variant="outline"
                            className="text-xs font-mono cursor-pointer hover:bg-accent transition-colors"
                        >
                            <Info className="w-3 h-3 mr-1" />
                            v{version}
                        </Badge>
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-sm mb-1">Versión Actual</h4>
                            <p className="text-xs text-muted-foreground">
                                v{version} • Build: {buildDate}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-sm">Historial de Cambios</h4>
                            {changelog.map((entry) => (
                                <div key={entry.version} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono font-semibold">
                                            v{entry.version}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {entry.date}
                                        </span>
                                    </div>
                                    <ul className="space-y-0.5 ml-2">
                                        {entry.changes.map((change, idx) => (
                                            <li key={idx} className="text-xs text-muted-foreground">
                                                {change}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    // variant === "full"
    return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono font-semibold">v{version}</span>
            <span>•</span>
            <span>{buildDate}</span>
        </div>
    );
};
