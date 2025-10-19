import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteUserPayload {
  email: string;
  fullName?: string;
  role?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: InviteUserPayload = await req.json();
    const email = payload?.email?.trim().toLowerCase();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email requerido para enviar la invitación." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase credentials for invite-user edge function.");
      return new Response(
        JSON.stringify({ error: "Servicio de invitaciones no configurado correctamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const metadata = {
      full_name: payload.fullName ?? null,
      role: payload.role ?? null,
    };

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, { data: metadata });

    if (error) {
      console.error("Failed to invite user:", error);
      return new Response(
        JSON.stringify({ error: error.message ?? "No se pudo enviar la invitación." }),
        { status: error.status ?? 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitación enviada correctamente.",
        user: data,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unhandled invite-user error:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Error interno del servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
