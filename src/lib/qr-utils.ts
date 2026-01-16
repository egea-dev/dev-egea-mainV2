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
 * Genera un payload de QR con el formato completo incluyendo datos técnicos
 * Formato: ORDER:{number}|CUSTOMER:{name}|FABRIC:{fabric}|COLOR:{color}|QTY:{quantity}|STATUS:{status}
 */
export function generateQRPayload(data: {
    orderNumber: string;
    customerName: string;
    fabric?: string;
    color?: string;
    quantity?: number;
    status: string;
}): string {
    const parts: string[] = [
        `ORDER:${data.orderNumber}`,
        `CUSTOMER:${data.customerName}`,
    ];

    // Agregar datos técnicos si están disponibles
    if (data.fabric) {
        parts.push(`FABRIC:${data.fabric}`);
    }

    if (data.color) {
        parts.push(`COLOR:${data.color}`);
    }

    if (data.quantity !== undefined && data.quantity !== null) {
        parts.push(`QTY:${data.quantity}`);
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
