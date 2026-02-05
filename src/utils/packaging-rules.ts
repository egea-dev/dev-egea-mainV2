export interface PackageConfiguration {
    unitsPerPackage: number[];
    ruleApplied: string;
}

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
    if (!fabric || !totalUnits || totalUnits <= 0) return [];

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
        'fr 22',  // Texturafosc FR 22
        'fr 2'    // Formentera 2 FR (Nota: El usuario dijo Formentera 2 FR es cortina? No, Formentera 2 FR dice "cortina" en la tabla, pero Formentera normal tambien. 
        // REVISAR: "FORMENTERA 2 FR cortina Formentera Gran Resistencia". 
        // La regla dice "en lo corresponedienta a cortinas y visillos caben 6". 
        // Formentera 2 FR es cortina, asi que 6.
    ];

    let capacity = 0;

    // Verificar palabras clave. Prioridad: Si coincide con 6, es 6. Si no, mirar 4? O al reves?
    // El usuario dio una lista explicita.
    // FORMENTERA FR 100 -> cortina -> 6
    // BASICPAC FR 912 -> opacante -> 4
    // SAND FR 0 -> visillo -> 6
    // TEXTURAFOSC FR 22 -> oscurante -> 4
    // BONJOUR FR 1 -> cortina -> 6
    // VAHO FR 0 -> visillo -> 6
    // BASICPAC FR 900 -> opacante -> 4
    // ZETA FR 0 -> visillo -> 6
    // FORMENTERA 2 FR -> cortina -> 6

    // Logica: Buscar coincidencias.
    const isCapacity4 = keywordsCapacity4.some(k => normalizedFabric.includes(k));
    const isCapacity6 = keywordsCapacity6.some(k => normalizedFabric.includes(k));

    // Desambiguación: Algunos nombres pueden contener partes de otros, pero aquí parecen distintos.
    // Sin embargo, "FORMENTERA 2 FR" contiene "FORMENTERA".
    // Si contiene "opacante" u "oscurante" o sus modelos especificos -> 4.
    // Si es "cortina" o "visillo" o sus modelos -> 6.

    // Ajuste fino basado en los ejemplos del usuario:
    if (keywordsCapacity4.some(k => normalizedFabric.includes(k))) {
        capacity = 4;
    } else if (keywordsCapacity6.some(k => normalizedFabric.includes(k))) {
        capacity = 6;
    }

    // Casos específicos del usuario que podrían solapar
    // FORMENTERA 2 FR es cortina (6), pero si pusiera "Opacante" ganaria el 4.
    // Asumimos que los nombres de modelos opacantes son exclusivos.

    if (capacity === 0) return []; // No se aplica regla automática

    const packages: number[] = [];
    let remaining = totalUnits;

    while (remaining > 0) {
        if (remaining >= capacity) {
            packages.push(capacity);
            remaining -= capacity;
        } else {
            packages.push(remaining);
            remaining = 0;
        }
    }

    return packages;
};
