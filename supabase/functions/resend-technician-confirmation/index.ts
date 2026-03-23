import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function buildAccessEmail({ name, email, temporaryPassword }: { name: string; email: string; temporaryPassword: string }) {
  return {
    subject: "Reenvio de acesso provisorio ao sistema",
    text: [
      `Ola, ${name}.`,
      "",
      "Segue o reenvio dos seus dados de acesso.",
      `Email: ${email}`,
      `Senha temporaria: ${temporaryPassword}`,
      "",
      "No primeiro login, voce devera trocar a senha antes de acessar o painel.",
      "",
      "Sistema de Gestao de Extintores",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 16px;">Reenvio de acesso provisorio</h2>
        <p>Ola, ${name}.</p>
        <p>Segue o reenvio dos seus dados de acesso.</p>
        <p><strong>Email:</strong> ${email}<br /><strong>Senha temporaria:</strong> ${temporaryPassword}</p>
        <p>No primeiro login, voce devera trocar a senha antes de acessar o painel.</p>
        <p style="margin-top: 24px;">Sistema de Gestao de Extintores</p>
      </div>
    `,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return Response.json({ error: "Configuracao incompleta da funcao." }, { status: 500, headers: corsHeaders });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "Usuario nao autenticado." }, { status: 401, headers: corsHeaders });
    }

    const { data: adminProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !adminProfile) {
      return Response.json({ error: "Perfil do administrador nao encontrado." }, { status: 403, headers: corsHeaders });
    }

    if (adminProfile.role !== "admin") {
      return Response.json({ error: "Apenas administradores podem reenviar o acesso." }, { status: 403, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const technicianId = String(body?.technicianId ?? "").trim();

    if (!technicianId) {
      return Response.json({ error: "Tecnico nao informado." }, { status: 400, headers: corsHeaders });
    }

    const { data: technicianProfile, error: technicianError } = await adminClient
      .from("profiles")
      .select("id, email, name, role, company_id")
      .eq("id", technicianId)
      .eq("company_id", adminProfile.company_id)
      .single();

    if (technicianError || !technicianProfile) {
      return Response.json({ error: "Tecnico nao encontrado." }, { status: 404, headers: corsHeaders });
    }

    if (technicianProfile.role !== "tecnico") {
      return Response.json({ error: "O usuario informado nao e um tecnico." }, { status: 400, headers: corsHeaders });
    }

    const temporaryPassword = `Tmp@${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

    const { error: updateUserError } = await adminClient.auth.admin.updateUserById(technicianId, {
      password: temporaryPassword,
      user_metadata: {
        name: technicianProfile.name,
        must_change_password: true,
      },
      email_confirm: true,
    });

    if (updateUserError) {
      return Response.json({ error: updateUserError.message }, { status: 400, headers: corsHeaders });
    }

    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", technicianId);

    if (profileUpdateError && !/must_change_password/i.test(profileUpdateError.message)) {
      return Response.json({ error: profileUpdateError.message }, { status: 400, headers: corsHeaders });
    }

    const emailResult = await sendEmail({
      to: technicianProfile.email,
      ...buildAccessEmail({
        name: technicianProfile.name || "Tecnico",
        email: technicianProfile.email,
        temporaryPassword,
      }),
    });

    if (!emailResult.sent) {
      return Response.json(
        {
          success: true,
          emailSent: false,
          temporaryPassword,
          warning: emailResult.reason,
        },
        { status: 200, headers: corsHeaders },
      );
    }

    return Response.json(
      {
        success: true,
        emailSent: true,
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
