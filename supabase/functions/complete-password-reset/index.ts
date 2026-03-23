import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

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

    const body = await req.json().catch(() => ({}));
    const nextPassword = String(body?.password ?? "");

    if (!nextPassword || nextPassword.length < 8) {
      return Response.json({ error: "Informe uma senha com pelo menos 8 caracteres." }, { status: 400, headers: corsHeaders });
    }

    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: nextPassword,
      user_metadata: {
        ...(user.user_metadata ?? {}),
        must_change_password: false,
      },
    });

    if (updateAuthError) {
      return Response.json({ error: updateAuthError.message }, { status: 400, headers: corsHeaders });
    }

    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id);

    if (profileUpdateError && !/must_change_password/i.test(profileUpdateError.message)) {
      return Response.json({ error: profileUpdateError.message }, { status: 400, headers: corsHeaders });
    }

    return Response.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
