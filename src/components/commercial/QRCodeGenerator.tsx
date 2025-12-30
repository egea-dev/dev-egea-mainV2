import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Order } from '@/types/commercial';

interface QRCodeGeneratorProps {
    order: Order;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ order }) => {
    const qrRef = useRef<HTMLDivElement>(null);

    const qrPayload = `ORDER:${order.order_number}|CUSTOMER:${order.customer_name}|STATUS:${order.status}`;

    return (
        <div className="space-y-4">
            <div ref={qrRef} className="flex justify-center p-4 bg-white rounded-2xl shadow-lg">
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
