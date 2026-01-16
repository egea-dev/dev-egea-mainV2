
import { createClient } from '@supabase/supabase-client';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("--- DIAGNOSTICO DE PEDIDOS Y CALENDARIO ---");

    // 1. Pedidos comerciales
    const { data: orders, error: orderError } = await supabase
        .from('comercial_orders')
        .select('id, order_number, delivery_date, created_at, status')
        .order('created_at', { ascending: false })
        .limit(5);

    if (orderError) console.error("Error orders:", orderError);
    else {
        console.log("Ultimos 5 pedidos comerciales:");
        orders.forEach(o => {
            console.log(`ID: ${o.id} | Ref: ${o.order_number} | Status: ${o.status} | Entrega: ${o.delivery_date} | Creado: ${o.created_at}`);
        });
    }

    // 2. Eventos de calendario
    const { data: events, error: eventError } = await supabase
        .from('comercial_calendar_events' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (eventError) console.error("Error events:", eventError);
    else {
        console.log("\nUltimos 10 eventos de calendario:");
        events.forEach(e => {
            console.log(`OrderID: ${e.order_id} | Titulo: ${e.title} | Fecha Evento: ${e.event_date} | Creado: ${e.created_at}`);
        });
    }
}

diagnose();
