import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Package, Upload, Download } from 'lucide-react';
import { useMaterials, useDeleteMaterial, useCreateMaterial } from '@/hooks/use-materials';
import { Material } from '@/types/almacen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MaterialDialog } from './MaterialDialog';
import { toast } from 'sonner';

export const MaterialsSection: React.FC = () => {
    const { data: materials, isLoading } = useMaterials();
    const deleteMaterial = useDeleteMaterial();
    const createMaterial = useCreateMaterial();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const filteredMaterials = materials?.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.reference?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (material: Material) => {
        setSelectedMaterial(material);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este material?')) {
            await deleteMaterial.mutateAsync(id);
        }
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setSelectedMaterial(null);
    };

    const handleImportCSV = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = async (e: any) => {
            const file = e.target?.files?.[0];
            if (!file) return;

            const text = await file.text();
            const lines = text.split('\n').slice(1); // Skip header

            let imported = 0;
            for (const line of lines) {
                const [name, reference, color, stock, unit, notes] = line.split(',');
                if (name?.trim()) {
                    try {
                        await createMaterial.mutateAsync({
                            name: name.trim(),
                            reference: reference?.trim() || '',
                            color: color?.trim() || '',
                            stock: parseInt(stock) || 0,
                            unit: unit?.trim() || 'metros',
                            notes: notes?.trim() || '',
                            is_active: true
                        });
                        imported++;
                    } catch (err) {
                        console.error('Error importing:', name, err);
                    }
                }
            }
            toast.success(`${imported} materiales importados`);
        };
        input.click();
    };

    const handleExportCSV = () => {
        if (!materials || materials.length === 0) {
            toast.error('No hay materiales para exportar');
            return;
        }

        const csv = [
            ['Nombre', 'Referencia', 'Color', 'Stock', 'Unidad', 'Notas'].join(','),
            ...materials.map(m => [
                m.name,
                m.reference || '',
                m.color || '',
                m.stock,
                m.unit,
                m.notes || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `materiales_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold text-foreground">Materiales</h2>
                    <Badge variant="outline" className="ml-2 bg-muted/50 border-border">
                        {materials?.length || 0} materiales
                    </Badge>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleImportCSV}
                        variant="outline"
                        className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Importar CSV
                    </Button>
                    <Button
                        onClick={handleExportCSV}
                        variant="outline"
                        className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar CSV
                    </Button>
                    <Button
                        onClick={() => setIsDialogOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Añadir Material
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nombre o referencia..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-muted/30 border-border text-foreground placeholder:text-muted-foreground"
                />
            </div>

            {/* Materials Table */}
            {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Cargando materiales...</div>
            ) : filteredMaterials && filteredMaterials.length > 0 ? (
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                    <table className="w-full text-[11px]">
                        <thead className="bg-muted/50">
                            <tr className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                <th className="p-2 text-left">Nombre</th>
                                <th className="p-2 text-left">Referencia</th>
                                <th className="p-2 text-left">Color</th>
                                <th className="p-2 text-right">Stock</th>
                                <th className="p-2 text-left">Unidad</th>
                                <th className="p-2 text-left">Notas</th>
                                <th className="p-2 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredMaterials.map((material) => (
                                <tr key={material.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="p-2">
                                        <span className="font-bold text-foreground">{material.name}</span>
                                    </td>
                                    <td className="p-2">
                                        <span className="text-muted-foreground font-mono text-[10px]">
                                            {material.reference || '---'}
                                        </span>
                                    </td>
                                    <td className="p-2">
                                        {material.color ? (
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3.5 h-3.5 rounded border border-border shadow-sm"
                                                    style={{ backgroundColor: material.color.toLowerCase() }}
                                                />
                                                <span className="text-muted-foreground font-medium text-[11px]">{material.color}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">---</span>
                                        )}
                                    </td>
                                    <td className="p-2 text-right">
                                        <span className="text-foreground font-bold">{material.stock}</span>
                                    </td>
                                    <td className="p-2">
                                        <span className="text-muted-foreground text-[11px] font-medium">{material.unit}</span>
                                    </td>
                                    <td className="p-2">
                                        <span className="text-muted-foreground text-[11px] truncate max-w-xs block font-medium">
                                            {material.notes || '---'}
                                        </span>
                                    </td>
                                    <td className="p-2">
                                        <div className="flex gap-1 justify-end">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleEdit(material)}
                                                className="h-7 w-7 p-0 hover:bg-muted hover:text-foreground"
                                            >
                                                <Edit className="w-4 h-4 text-muted-foreground" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDelete(material.id)}
                                                className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 text-[#8B8D90]">
                    {searchTerm ? 'No se encontraron materiales' : 'No hay materiales registrados'}
                </div>
            )}

            {/* Dialog */}
            <MaterialDialog
                material={selectedMaterial}
                open={isDialogOpen}
                onClose={handleCloseDialog}
            />
        </div>
    );
};
