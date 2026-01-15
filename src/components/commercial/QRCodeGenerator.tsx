import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Order } from '@/types/commercial';

interface QRCodeGeneratorProps {
    order: Order;
    containerRef?: React.RefObject<HTMLDivElement>;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ order, containerRef }) => {
    const qrPayload = `ORDER:${order.order_number}|CUSTOMER:${order.customer_name}|STATUS:${order.status}`;

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
        </div>
    );
};
