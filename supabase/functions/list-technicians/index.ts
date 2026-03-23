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

    const { data: adminProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !adminProfile) {
      return Response.json({ error: "Perfil do administrador nao encontrado." }, { status: 403, headers: corsHeaders });
    }

    if (adminProfile.role !== "admin") {
      return Response.json({ error: "Apenas administradores podem consultar tecnicos." }, { status: 403, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const search = String(body?.search ?? "").trim().toLowerCase();

    const { data: technicians, error: techniciansError } = await adminClient
      .from("profiles")
      .select("id, name, email, phone, role, is_active, created_at")
      .eq("company_id", adminProfile.company_id)
      .eq("role", "tecnico")
      .order("created_at", { ascending: false });

    if (techniciansError) {
      return Response.json({ error: techniciansError.message }, { status: 400, headers: corsHeaders });
    }

    const hydrated = await Promise.all(
      (technicians ?? []).map(async (technician) => {
        const { data: authUserData, error: authUserError } = await adminClient.auth.admin.getUserById(technician.id);
        const authUser = authUserData.user;

        return {
          ...technician,
          email: technician.email || authUser?.email || "",
          must_change_password: authUserError ? false : authUser?.user_metadata?.must_change_password === true,
          access_email_sent: false,
        };
      }),
    );

    const filtered = search
      ? hydrated.filter((technician) => {
          const haystack = [technician.name, technician.email, technician.phone]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(search);
        })
      : hydrated;

    return Response.json({ technicians: filtered }, { status: 200, headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
