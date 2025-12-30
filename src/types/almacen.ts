// Material types for Almacen module
export interface Material {
    id: string;
    name: string;
    reference?: string;
    color?: string;
    stock: number;
    unit: string; // 'metros' | 'unidades' | 'kg' | etc
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by?: string;
}

export type CreateMaterialInput = Omit<Material, 'id' | 'created_at' | 'updated_at' | 'created_by'>;
export type UpdateMaterialInput = Partial<CreateMaterialInput>;
