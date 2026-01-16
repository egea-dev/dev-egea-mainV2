/**
 * Utilidad centralizada para generación y parseo de códigos QR
 * Soporta tanto el formato nuevo (con datos técnicos) como el formato antiguo (compatibilidad)
 */

export interface QRData {
    orderNumber: string;
    customerName: string;
    status: string;
    fabric?: string;
    color?: string;
    quantity?: number;
    isLegacyFormat?: boolean; // Indica si el QR es del formato antiguo
}

export interface QRValidationResult {
    isValid: boolean;
    hasDiscrepancies: boolean;
    discrepancies: string[];
    data: QRData;
}

/**
 * Resultado de validación extendido que incluye validación del desglose de líneas
 */
export interface QRValidationResultWithLines extends QRValidationResult {
    linesDiscrepancies?: string[];  // Discrepancias específicas en el desglose
    expectedLines?: number;          // Número de líneas esperadas en BD
    actualLines?: number;            // Número de líneas en el QR (si aplica)
    linesValid?: boolean;            // Si el desglose es válido
}

/**
 * Genera un payload de QR con el formato completo incluyendo desglose de líneas
 * Formato: ORDER:{number}|CUSTOMER:{name}|REGION:{region}|DATE:{date}|LINES:{desglose}|STATUS:{status}
 * Ejemplo: EG49168840|Cliente Importado|BALEARES|16/1/2026|Formentera 100|PAGADO
 */
export function generateQRPayload(data: {
    orderNumber: string;
    customerName: string;
    region?: string;
    deliveryDate?: string;
    lines?: Array<{
        material?: string;
        quantity: number;
    }>;
    status: string;
}): string {
    const parts: string[] = [
        `ORDER:${data.orderNumber}`,
        `CUSTOMER:${data.customerName}`,
    ];

    // Agregar región si está disponible
    if (data.region) {
        parts.push(`REGION:${data.region}`);
    }

    // Agregar fecha de entrega si está disponible
    if (data.deliveryDate) {
        parts.push(`DATE:${data.deliveryDate}`);
    }

    // Agregar desglose de líneas si está disponible
    if (data.lines && data.lines.length > 0) {
        const linesBreakdown = data.lines
            .map(line => `${line.material || 'N/D'} ${line.quantity}`)
            .join(', ');
        parts.push(`LINES:${linesBreakdown}`);
    }

    parts.push(`STATUS:${data.status}`);

    return parts.join('|');
}

/**
 * Parsea un código QR y extrae los datos
 * Soporta tanto formato nuevo como antiguo
 */
export function parseQRCode(qrCode: string): QRData {
    const parts = qrCode.split('|');
    const data: QRData = {
        orderNumber: '',
        customerName: '',
        status: '',
        isLegacyFormat: false,
    };

    // Si el QR no tiene el formato esperado, intentar extraer solo el número de orden
    if (parts.length === 0) {
        data.orderNumber = qrCode;
        data.isLegacyFormat = true;
        return data;
    }

    // Parsear cada parte del QR
    for (const part of parts) {
        const [key, ...valueParts] = part.split(':');
        const value = valueParts.join(':'); // Rejoin en caso de que el valor contenga ':'

        switch (key) {
            case 'ORDER':
                data.orderNumber = value;
                break;
            case 'CUSTOMER':
                data.customerName = value;
                break;
            case 'FABRIC':
                data.fabric = value;
                break;
            case 'COLOR':
                data.color = value;
                break;
            case 'QTY':
                data.quantity = parseInt(value, 10);
                break;
            case 'STATUS':
                data.status = value;
                break;
        }
    }

    // Detectar si es formato antiguo (no tiene fabric, color ni quantity)
    if (!data.fabric && !data.color && data.quantity === undefined) {
        data.isLegacyFormat = true;
    }

    return data;
}

/**
 * Valida los datos del QR contra los datos de una orden de la base de datos
 * Retorna información sobre discrepancias encontradas
 */
export function validateQRAgainstOrder(
    qrData: QRData,
    orderData: {
        order_number: string;
        customer_name?: string;
        fabric?: string;
        color?: string;
        quantity_total?: number;
        status?: string;
    }
): QRValidationResult {
    const discrepancies: string[] = [];

    // Validar número de orden (siempre debe coincidir)
    if (qrData.orderNumber !== orderData.order_number) {
        return {
            isValid: false,
            hasDiscrepancies: true,
            discrepancies: ['El número de orden no coincide'],
            data: qrData,
        };
    }

    // Si es formato antiguo, no validar datos técnicos
    if (qrData.isLegacyFormat) {
        return {
            isValid: true,
            hasDiscrepancies: false,
            discrepancies: ['QR en formato antiguo - datos técnicos cargados desde BD'],
            data: qrData,
        };
    }

    // Validar datos técnicos si están presentes en el QR
    if (qrData.fabric && orderData.fabric) {
        const qrFabric = qrData.fabric.trim().toLowerCase();
        const orderFabric = orderData.fabric.trim().toLowerCase();
        if (qrFabric !== orderFabric) {
            discrepancies.push(
                `Material no coincide: QR="${qrData.fabric}" vs BD="${orderData.fabric}"`
            );
        }
    }

    if (qrData.color && orderData.color) {
        const qrColor = qrData.color.trim().toLowerCase();
        const orderColor = orderData.color.trim().toLowerCase();
        if (qrColor !== orderColor) {
            discrepancies.push(
                `Color no coincide: QR="${qrData.color}" vs BD="${orderData.color}"`
            );
        }
    }

    if (qrData.quantity !== undefined && orderData.quantity_total !== undefined) {
        if (qrData.quantity !== orderData.quantity_total) {
            discrepancies.push(
                `Cantidad no coincide: QR="${qrData.quantity}" vs BD="${orderData.quantity_total}"`
            );
        }
    }

    return {
        isValid: true,
        hasDiscrepancies: discrepancies.length > 0,
        discrepancies,
        data: qrData,
    };
}

/**
 * Extrae solo el número de orden de un código QR (compatibilidad con código antiguo)
 */
export function extractOrderNumber(qrCode: string): string {
    // Si contiene el formato estructurado, parsearlo
    if (qrCode.includes('|') && qrCode.includes('ORDER:')) {
        const parsed = parseQRCode(qrCode);
        return parsed.orderNumber;
    }

    // Si contiene "ORDER:" pero no tiene pipes, extraer el valor
    if (qrCode.includes('ORDER:')) {
        const match = qrCode.match(/ORDER:([^|]+)/);
        return match ? match[1] : qrCode;
    }

    // Si no tiene formato, asumir que todo el código es el número de orden
    return qrCode;
}

/**
 * Valida los datos del QR contra los datos de una orden de la base de datos
 * INCLUYENDO validación del desglose de líneas/artículos
 * 
 * Esta función extiende validateQRAgainstOrder para también validar que el desglose
 * de líneas en la BD coincida con las expectativas del pedido
 */
export function validateQRWithLines(
    qrData: QRData,
    orderData: {
        order_number: string;
        customer_name?: string;
        fabric?: string;
        color?: string;
        quantity_total?: number;
        status?: string;
        lines?: Array<{
            quantity: number;
            width: number | string;
            height: number | string;
            material?: string;
            color?: string;
        }>;
    }
): QRValidationResultWithLines {
    // Primero hacer la validación básica
    const basicValidation = validateQRAgainstOrder(qrData, orderData);

    // Inicializar resultado extendido
    const result: QRValidationResultWithLines = {
        ...basicValidation,
        linesDiscrepancies: [],
        linesValid: true,
    };

    // Si no hay líneas en la BD, no podemos validar el desglose
    if (!orderData.lines || orderData.lines.length === 0) {
        result.linesDiscrepancies = ['No hay desglose de líneas en la base de datos'];
        result.linesValid = false;
        result.expectedLines = 0;
        result.actualLines = 0;
        return result;
    }

    // Validar que la cantidad total coincida con la suma de líneas
    const totalFromLines = orderData.lines.reduce((sum, line) => sum + line.quantity, 0);
    result.expectedLines = orderData.lines.length;
    result.actualLines = orderData.lines.length;

    if (qrData.quantity && totalFromLines !== qrData.quantity) {
        result.linesDiscrepancies!.push(
            `Cantidad total no coincide: QR="${qrData.quantity}" vs Suma de líneas="${totalFromLines}"`
        );
        result.linesValid = false;
    }

    // Validar que todas las líneas tengan datos válidos
    orderData.lines.forEach((line, index) => {
        const lineNum = index + 1;

        // Validar cantidad
        if (!line.quantity || line.quantity <= 0) {
            result.linesDiscrepancies!.push(
                `Línea ${lineNum}: Cantidad inválida (${line.quantity})`
            );
            result.linesValid = false;
        }

        // Validar medidas
        const width = typeof line.width === 'string' ? parseFloat(line.width) : line.width;
        const height = typeof line.height === 'string' ? parseFloat(line.height) : line.height;

        if (!width || width <= 0) {
            result.linesDiscrepancies!.push(
                `Línea ${lineNum}: Ancho inválido (${line.width})`
            );
            result.linesValid = false;
        }

        if (!height || height <= 0) {
            result.linesDiscrepancies!.push(
                `Línea ${lineNum}: Alto inválido (${line.height})`
            );
            result.linesValid = false;
        }

        // Validar material si está en el QR
        if (qrData.fabric && line.material) {
            const qrFabric = qrData.fabric.trim().toLowerCase();
            const lineFabric = line.material.trim().toLowerCase();
            if (qrFabric !== lineFabric) {
                result.linesDiscrepancies!.push(
                    `Línea ${lineNum}: Material no coincide - QR="${qrData.fabric}" vs Línea="${line.material}"`
                );
                result.linesValid = false;
            }
        }
    });

    // Actualizar hasDiscrepancies si hay problemas en las líneas
    if (result.linesDiscrepancies!.length > 0) {
        result.hasDiscrepancies = true;
        result.discrepancies = [
            ...result.discrepancies,
            ...result.linesDiscrepancies!
        ];
    }

    return result;
}

