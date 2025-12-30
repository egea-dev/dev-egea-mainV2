import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Material, CreateMaterialInput } from '@/types/almacen';
import { useCreateMaterial, useUpdateMaterial } from '@/hooks/use-materials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface MaterialDialogProps {
    material: Material | null;
    open: boolean;
    onClose: () => void;
}

export const MaterialDialog: React.FC<MaterialDialogProps> = ({ material, open, onClose }) => {
    const createMaterial = useCreateMaterial();
    const updateMaterial = useUpdateMaterial();
    const isEdit = !!material;

    const [formData, setFormData] = useState<CreateMaterialInput>({
        name: '',
        reference: '',
        color: '',
        stock: 0,
        unit: 'metros',
        notes: '',
        is_active: true,
    });

    useEffect(() => {
        if (material) {
            setFormData({
                name: material.name,
                reference: material.reference || '',
                color: material.color || '',
                stock: material.stock,
                unit: material.unit,
                notes: material.notes || '',
                is_active: material.is_active,
            });
        } else {
            setFormData({
                name: '',
                reference: '',
                color: '',
                stock: 0,
                unit: 'metros',
                notes: '',
                is_active: true,
            });
        }
    }, [material, open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === 'stock' ? parseInt(value) || 0 : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            alert('El nombre es obligatorio');
            return;
        }

        try {
            if (isEdit && material) {
                await updateMaterial.mutateAsync({ id: material.id, data: formData });
            } else {
                await createMaterial.mutateAsync(formData);
            }
            onClose();
        } catch (error) {
            console.error('Error saving material:', error);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1A1D1F] rounded-xl border border-[#45474A] w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#45474A]">
                    <h2 className="text-xl font-bold text-white">
                        {isEdit ? 'Editar Material' : 'Nuevo Material'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-[#8B8D90] hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Name */}
                    <div>
                        <Label className="text-white">Nombre *</Label>
                        <Input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ej: Lino Natural"
                            required
                            className="bg-[#323438] border-[#45474A] text-white"
                        />
                    </div>

                    {/* Reference */}
                    <div>
                        <Label className="text-white">Referencia</Label>
                        <Input
                            name="reference"
                            value={formData.reference}
                            onChange={handleChange}
                            placeholder="Ej: LIN-001"
                            className="bg-[#323438] border-[#45474A] text-white"
                        />
                    </div>

                    {/* Color */}
                    <div>
                        <Label className="text-white">Color</Label>
                        <Input
                            name="color"
                            value={formData.color}
                            onChange={handleChange}
                            placeholder="Ej: Beige"
                            className="bg-[#323438] border-[#45474A] text-white"
                        />
                    </div>

                    {/* Stock and Unit */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-white">Stock</Label>
                            <Input
                                type="number"
                                name="stock"
                                value={formData.stock}
                                onChange={handleChange}
                                min="0"
                                className="bg-[#323438] border-[#45474A] text-white"
                            />
                        </div>
                        <div>
                            <Label className="text-white">Unidad</Label>
                            <Input
                                name="unit"
                                value={formData.unit}
                                onChange={handleChange}
                                placeholder="metros"
                                className="bg-[#323438] border-[#45474A] text-white"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <Label className="text-white">Notas</Label>
                        <Textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            placeholder="Información adicional..."
                            rows={3}
                            className="bg-[#323438] border-[#45474A] text-white resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 border-[#45474A] text-[#8B8D90] hover:bg-[#323438]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-[#14CC7F] hover:bg-[#11A366] text-white"
                            disabled={createMaterial.isPending || updateMaterial.isPending}
                        >
                            {isEdit ? 'Actualizar' : 'Crear'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
