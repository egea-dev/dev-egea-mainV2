import { supabase } from '@/integrations/supabase/client'

export async function createShareLink(planId: string) {
  const { data, error } = await supabase.rpc('issue_shared_plan', { p_plan_id: planId })
  if (error) throw error
  return `${window.location.origin}/shared/plan/${data.access_token}`
}

// HTML al vuelo para meter en correo (simple y liviano)
export async function buildShareHtml(publicUrl: string) {
  // Opcionalmente precarga datos via RPC get_shared_plan_data para embebido
  return `
  <html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="font-family:system-ui;margin:0;padding:16px;">
    <h2 style="margin:0 0 12px;">Plan de Instalaciones</h2>
    <p>Consulta el calendario del mes aquí: <a href="${publicUrl}">${publicUrl}</a></p>
  </body></html>`
}

// Función para compartir por WhatsApp
export async function shareViaWhatsApp(planId: string, message?: string) {
  try {
    const url = await createShareLink(planId)
    const text = message || `Consulta el plan de instalaciones: ${url}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank')
  } catch (error) {
    console.error('Error sharing via WhatsApp:', error)
    throw error
  }
}

// Función para copiar al portapapeles
export async function copyShareLink(planId: string) {
  try {
    const url = await createShareLink(planId)
    await navigator.clipboard.writeText(url)
    return url
  } catch (error) {
    console.error('Error copying link:', error)
    throw error
  }
}