import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Order } from '@/types/commercial';
import { generateQRPayload } from '@/lib/qr-utils';

interface QRCodeGeneratorProps {
    order: Order;
    containerRef?: React.RefObject<HTMLDivElement>;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ order, containerRef }) => {
    // Generar payload con desglose de líneas - CORREGIDO: usar customer_company primero
    const qrPayload = generateQRPayload({
        orderNumber: order.order_number,
        customerName: order.customer_company || order.customer_name || 'Cliente', // CORREGIDO
        region: order.delivery_region || order.region,
        deliveryDate: order.delivery_date,
        lines: order.lines?.map(line => ({
            material: line.material,
            quantity: line.quantity
        })) || [],
        status: order.status,
    });

    return (
        <div className="space-y-4">
            <div ref={containerRef} className="flex justify-center p-4 bg-white rounded-2xl shadow-lg">
                <QRCodeSVG
                    value={qrPayload}
                    size={200}
                    level="H"
                    includeMargin={true}
                />
            </div>

            {/* Información de depuración (solo visible en desarrollo) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-500 font-mono p-2 bg-gray-100 rounded">
                    <div className="font-bold mb-1">QR Payload:</div>
                    <div className="break-all">{qrPayload}</div>
                </div>
            )}
        </div>
    );
};
