import { useProfile } from '@/hooks/use-supabase';
import { useRolePreview } from '@/context/RolePreviewContext';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Componente para que los administradores puedan previsualizar
 * la interfaz desde la perspectiva de otros roles
 */
export const RolePreviewSelector = () => {
    const { data: profile } = useProfile();
    const { previewRole, setPreviewRole, clearPreview } = useRolePreview();

    // Solo mostrar para admins
    if (profile?.role !== 'admin') return null;

    const currentRole = previewRole || profile.role;
    const isPreviewActive = !!previewRole;

    const roleLabels: Record<string, string> = {
        admin: 'Administrador',
        manager: 'Manager',
        responsable: 'Responsable',
        operario: 'Operario'
    };

    const roleColors: Record<string, string> = {
        admin: 'bg-purple-500',
        manager: 'bg-blue-500',
        responsable: 'bg-green-500',
        operario: 'bg-gray-500'
    };

    return (
        <div className="flex items-center gap-2">
            {isPreviewActive && (
                <Badge variant="outline" className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span className="text-xs">Vista previa activa</span>
                </Badge>
            )}

            <Select
                value={currentRole}
                onValueChange={(value) => {
                    if (value === profile.role) {
                        clearPreview();
                    } else {
                        setPreviewRole(value as any);
                    }
                }}
            >
                <SelectTrigger className="w-[180px]">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${roleColors[currentRole]}`} />
                        <SelectValue placeholder="Vista de rol" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${roleColors.admin}`} />
                            <span>{roleLabels.admin}</span>
                        </div>
                    </SelectItem>
                    <SelectItem value="manager">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${roleColors.manager}`} />
                            <span>{roleLabels.manager}</span>
                        </div>
                    </SelectItem>
                    <SelectItem value="responsable">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${roleColors.responsable}`} />
                            <span>{roleLabels.responsable}</span>
                        </div>
                    </SelectItem>
                    <SelectItem value="operario">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${roleColors.operario}`} />
                            <span>{roleLabels.operario}</span>
                        </div>
                    </SelectItem>
                </SelectContent>
            </Select>

            {isPreviewActive && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearPreview}
                    className="h-8 px-2"
                    title="Salir de vista previa"
                >
                    <EyeOff className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
};
