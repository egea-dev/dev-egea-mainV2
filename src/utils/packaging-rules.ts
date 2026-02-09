export interface PackageConfiguration {
    unitsPerPackage: number[];
    ruleApplied: string;
}

export type PackageCapacity = 4 | 6;

/**
 * Determina la configuración de bultos recomendada basada en el tipo de tejido y la cantidad total.
 * 
 * Reglas:
 * - Cortinas/Visillos (Formentera, Sand, Bonjour, Vaho, Zeta, etc.): 6 unidades por bulto.
 * - Opacantes/Oscurantes (Basicpac, Texturafosc, etc.): 4 unidades por bulto.
 * 
 * @param fabric Nombre del tejido o material
 * @param totalUnits Cantidad total de unidades en el pedido
 * @returns Array con la cantidad de unidades para cada bulto (ej: [6, 6, 2] para 14 unidades de cortina)
 */
export const getPackagesConfiguration = (fabric: string | undefined | null, totalUnits: number): number[] => {
    const capacity = getPackageCapacity(fabric);
    if (!capacity || !totalUnits || totalUnits <= 0) return [];

    // Solo números exactos, sin mezclar capacidades ni bultos parciales.
    if (totalUnits % capacity !== 0) return [];

    const count = totalUnits / capacity;
    return Array.from({ length: count }, () => capacity);
};

export const getPackageCapacity = (fabric: string | undefined | null): PackageCapacity | null => {
    if (!fabric) return null;

    const normalizedFabric = fabric.toLowerCase();

    // Palabras clave para capacidad de 6 unidades (Cortinas, Visillos)
    const keywordsCapacity6 = [
        'cortina',
        'visillo',
        'formentera',
        'sand',
        'bonjour',
        'vaho',
        'zeta',
        'fr 100', // Formentera FR 100
        'fr 0',   // Sand FR 0, Vaho FR 0, Zeta FR 0
        'fr 1'    // Bonjour FR 1
    ];

    // Palabras clave para capacidad de 4 unidades (Opacantes, Oscurantes)
    const keywordsCapacity4 = [
        'opacante',
        'oscurante',
        'basicpac',
        'texturafosc',
        'fr 912', // BasicPac FR 912
        'fr 900', // BasicPac FR 900
        'fr 22'   // Texturafosc FR 22
    ];

    const isCapacity4 = keywordsCapacity4.some(k => normalizedFabric.includes(k));
    const isCapacity6 = keywordsCapacity6.some(k => normalizedFabric.includes(k));

    if (isCapacity4) return 4;
    if (isCapacity6) return 6;
    return null;
};

export const getRecommendedPackagesCount = (fabric: string | undefined | null, totalUnits: number): number | null => {
    const capacity = getPackageCapacity(fabric);
    if (!capacity || !totalUnits || totalUnits <= 0) return null;

    // Solo números exactos, sin bultos parciales.
    if (totalUnits % capacity !== 0) return null;

    return totalUnits / capacity;
};
