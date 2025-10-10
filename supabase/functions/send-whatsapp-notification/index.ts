import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppMessage {
  to: string
  message: string
  tasks: Array<{
    site: string
    address: string
    time: string
    vehicle?: string
  }>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, message, tasks }: WhatsAppMessage = await req.json()

    if (!to || !message || !tasks) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, message, tasks' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener configuración de Twilio desde variables de entorno
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const whatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER')

    if (!accountSid || !authToken || !whatsappNumber) {
      console.error('Missing Twilio configuration')
      return new Response(
        JSON.stringify({ error: 'WhatsApp service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Formatear el mensaje para WhatsApp
    let formattedMessage = `📋 *PLAN DE TRABAJO - ${new Date().toLocaleDateString('es-ES')}*\n\n`
    formattedMessage += `${message}\n\n`
    formattedMessage += `📍 *TAREAS ASIGNADAS:*\n\n`

    tasks.forEach((task, index) => {
      formattedMessage += `${index + 1}. *${task.site}*\n`
      formattedMessage += `   📍 ${task.address}\n`
      formattedMessage += `   ⏰ ${task.time}\n`
      if (task.vehicle) {
        formattedMessage += `   🚐 ${task.vehicle}\n`
      }
      formattedMessage += `\n`
    })

    formattedMessage += `\n💡 *Importante:* Revisa tu estado en cada tarea y avisa si hay algún incidente.\n`
    formattedMessage += `📱 Accede a tu plan: ${Deno.env.get('PUBLIC_SITE_URL') || 'https://tu-app.com'}/mis-tareas/TOKEN_AQUI`

    // Enviar mensaje via Twilio WhatsApp API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    
    const formData = new FormData()
    formData.append('To', `whatsapp:${to}`)
    formData.append('From', `whatsapp:${whatsappNumber}`)
    formData.append('Body', formattedMessage)

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Twilio API error:', errorData)
      throw new Error(`Failed to send WhatsApp message: ${errorData}`)
    }

    const result = await response.json()
    console.log('WhatsApp message sent successfully:', result)

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.sid,
        message: 'WhatsApp notification sent successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-whatsapp-notification:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})