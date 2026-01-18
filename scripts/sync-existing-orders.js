/**
 * Script de Sincronización de Pedidos Existentes
 * 
 * Este script sincroniza el estado de los pedidos en comercial_orders
 * basándose en el estado actual en produccion_work_orders.
 * 
 * Ejecutar desde la consola del navegador en la aplicación.
 */

(async function syncExistingOrders() {
    console.log('🚀 Iniciando sincronización de pedidos existentes...');

    // Obtener el cliente de Supabase
    const supabase = window.__supabaseProductivity || window.supabaseProductivity;
    if (!supabase) {
        console.error('❌ No se encontró el cliente de Supabase');
        return;
    }

    // 1. Obtener todos los pedidos de producción con estado final
    const { data: prodOrders, error: prodError } = await supabase
        .from('produccion_work_orders')
        .select('id, order_number, status, updated_at')
        .in('status', ['LISTO_ENVIO', 'TERMINADO', 'ENVIADO', 'ENTREGADO']);

    if (prodError) {
        console.error('❌ Error obteniendo pedidos de producción:', prodError);
        return;
    }

    console.log(`📦 Encontrados ${prodOrders.length} pedidos de producción con estado final`);

    // 2. Para cada pedido, actualizar el estado en comercial_orders
    let syncedCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;

    for (const order of prodOrders) {
        // Mapear estado de producción a comercial
        let commercialStatus;
        switch (order.status.toUpperCase()) {
            case 'LISTO_ENVIO':
            case 'TERMINADO':
                commercialStatus = 'ENVIADO';
                break;
            case 'ENVIADO':
                commercialStatus = 'ENVIADO';
                break;
            case 'ENTREGADO':
                commercialStatus = 'ENTREGADO';
                break;
            default:
                continue;
        }

        // Actualizar en comercial_orders
        const { data: updateResult, error: updateError } = await supabase
            .from('comercial_orders')
            .update({ status: commercialStatus })
            .eq('order_number', order.order_number)
            .select();

        if (updateError) {
            console.warn(`⚠️ Error actualizando ${order.order_number}:`, updateError.message);
            errorCount++;
        } else if (!updateResult || updateResult.length === 0) {
            console.log(`ℹ️ ${order.order_number}: No existe en comercial_orders (solo producción)`);
            notFoundCount++;
        } else {
            console.log(`✅ ${order.order_number}: ${order.status} → ${commercialStatus}`);
            syncedCount++;
        }
    }

    console.log('');
    console.log('📊 Resumen de sincronización:');
    console.log(`   ✅ Sincronizados: ${syncedCount}`);
    console.log(`   ℹ️ Solo en producción: ${notFoundCount}`);
    console.log(`   ⚠️ Errores: ${errorCount}`);
    console.log('');
    console.log('🏁 Sincronización completada. Recarga la página para ver los cambios.');
})();
