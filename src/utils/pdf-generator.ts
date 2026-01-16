import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface OrderPDFData {
    order_number: string;
    customer_company?: string;
    customer_name?: string;
    delivery_region?: string;
    delivery_date?: string;
    delivery_address?: string;
    lines?: Array<{
        material?: string;
        color?: string;
        quantity?: number;
        width?: number;
        height?: number;
    }>;
    quantity_total?: number;
    status?: string;
    qr_payload?: string;
}

/**
 * Genera un PDF de orden de trabajo con QR y desglose de líneas
 * Abre ventana de impresión automáticamente
 */
export async function generateOrderPDF(order: OrderPDFData): Promise<void> {
    const doc = new jsPDF();

    // Configuración
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Generar QR primero
    let qrDataUrl: string | null = null;
    if (order.qr_payload) {
        try {
            qrDataUrl = await QRCode.toDataURL(order.qr_payload, {
                width: 200,
                margin: 1,
            });
        } catch (error) {
            console.error('Error generando QR:', error);
        }
    }

    // Encabezado a la izquierda
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ORDEN DE TRABAJO', margin, yPos);
    yPos += 10;

    // Número de orden más grande
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Nº: ${order.order_number}`, margin, yPos);

    // QR Code 3x3cm en esquina superior derecha (más arriba)
    if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 30, 10, 30, 30);
    }

    yPos += 10;

    // Información del cliente
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', margin, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Razón Social: ${order.customer_company || order.customer_name || 'N/A'}`, margin, yPos);
    yPos += 6;
    doc.text(`Región: ${order.delivery_region || 'N/A'}`, margin, yPos);
    yPos += 6;
    doc.text(`Fecha Entrega: ${order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('es-ES') : 'N/A'}`, margin, yPos);
    yPos += 6;
    if (order.delivery_address) {
        doc.text(`Dirección: ${order.delivery_address}`, margin, yPos);
        yPos += 6;
    }
    yPos += 5;

    // Desglose de líneas
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DESGLOSE DE ARTÍCULOS', margin, yPos);
    yPos += 7;

    // Tabla de líneas
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    // Encabezados de tabla
    const colX = [margin, margin + 60, margin + 100, margin + 130, margin + 155];
    doc.text('Material', colX[0], yPos);
    doc.text('Color', colX[1], yPos);
    doc.text('Ancho', colX[2], yPos);
    doc.text('Alto', colX[3], yPos);
    doc.text('Cant.', colX[4], yPos);
    yPos += 5;

    // Línea debajo de encabezados
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // Datos de líneas
    doc.setFont('helvetica', 'normal');
    if (order.lines && order.lines.length > 0) {
        order.lines.forEach((line) => {
            if (yPos > 270) { // Nueva página si es necesario
                doc.addPage();
                yPos = 20;
            }

            doc.text(line.material || 'N/A', colX[0], yPos);
            doc.text(line.color || 'N/A', colX[1], yPos);
            doc.text(line.width ? `${line.width}cm` : 'N/A', colX[2], yPos);
            doc.text(line.height ? `${line.height}cm` : 'N/A', colX[3], yPos);
            doc.text(String(line.quantity || 0), colX[4], yPos);
            yPos += 6;
        });
    } else {
        doc.text('Sin líneas de detalle', margin, yPos);
        yPos += 6;
    }

    yPos += 5;

    // Total
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL UNIDADES: ${order.quantity_total || 0}`, margin, yPos);
    yPos += 10;

    // Estado
    doc.text(`ESTADO: ${order.status || 'N/A'}`, margin, yPos);

    // Pie de página
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
        `Generado: ${new Date().toLocaleString('es-ES')}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
    );

    // Abrir ventana de impresión
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
}
