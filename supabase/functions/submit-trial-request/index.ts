import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeEmployeeCount(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return Number(digits);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Metodo nao permitido." }, { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const googleSheetsWebhookUrl = Deno.env.get("GOOGLE_SHEETS_WEBHOOK_URL") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return Response.json({ error: "Configuracao incompleta da funcao." }, { status: 500, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const body = await req.json().catch(() => ({}));

    const payload = {
      name: normalizeText(body?.name),
      phone: normalizeText(body?.phone),
      company_name: normalizeText(body?.companyName),
      employee_count: normalizeEmployeeCount(body?.employeeCount),
      page_url: normalizeText(body?.pageUrl),
      source: "landing_page",
    };

    if (!payload.name || !payload.phone || !payload.company_name || !Number.isFinite(payload.employee_count) || payload.employee_count <= 0) {
      return Response.json({ error: "Dados obrigatorios nao informados corretamente." }, { status: 400, headers: corsHeaders });
    }

    const { data: insertedLead, error: insertError } = await adminClient
      .from("trial_requests")
      .insert(payload)
      .select("id, created_at")
      .single();

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 400, headers: corsHeaders });
    }

    let sheetsSync = "not_configured";

    if (googleSheetsWebhookUrl) {
      const webhookResponse = await fetch(googleSheetsWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: insertedLead.id,
          createdAt: insertedLead.created_at,
          nome: payload.name,
          whatsapp: payload.phone,
          empresa: payload.company_name,
          qtdFuncionarios: payload.employee_count,
          origem: payload.source,
          name: payload.name,
          phone: payload.phone,
          companyName: payload.company_name,
          employeeCount: payload.employee_count,
          source: payload.source,
          pageUrl: payload.page_url,
        }),
      });

      sheetsSync = webhookResponse.ok ? "sent" : "failed";
    }

    return Response.json(
      {
        success: true,
        leadId: insertedLead.id,
        sheetsSync,
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
