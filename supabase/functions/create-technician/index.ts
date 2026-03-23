import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function generateTemporaryPassword() {
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return `Tmp@${random}`;
}

function isAuthAdminJwtError(message: string) {
  return /invalid jwt|bad jwt|not admin|unauthorized/i.test(message);
}

function buildAccessEmail({ name, email, temporaryPassword }: { name: string; email: string; temporaryPassword: string }) {
  return {
    subject: "Acesso provisorio ao sistema de gestao de extintores",
    text: [
      `Ola, ${name}.`,
      "",
      "Seu acesso ao sistema foi criado com sucesso.",
      `Email: ${email}`,
      `Senha temporaria: ${temporaryPassword}`,
      "",
      "No primeiro login, voce devera trocar a senha antes de acessar o painel.",
      "",
      "Sistema de Gestao de Extintores",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 16px;">Acesso provisorio criado</h2>
        <p>Ola, ${name}.</p>
        <p>Seu acesso ao sistema foi criado com sucesso.</p>
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
      return Response.json({ error: "Apenas administradores podem cadastrar tecnicos." }, { status: 403, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const phone = String(body?.phone ?? "").trim() || null;
    const isActive = body?.is_active !== false;
    const sendAccessEmail = body?.send_access_email === true;

    if (!name || !email) {
      return Response.json({ error: "Nome e email sao obrigatorios." }, { status: 400, headers: corsHeaders });
    }

    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfileError) {
      return Response.json({ error: existingProfileError.message }, { status: 400, headers: corsHeaders });
    }

    if (existingProfile?.id) {
      return Response.json({ error: "Ja existe um usuario cadastrado com esse email." }, { status: 400, headers: corsHeaders });
    }

    const temporaryPassword = generateTemporaryPassword();

    let createdUser = null;
    let createUserError = null;
    let usedSignupFallback = false;

    const createUserResponse = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        name,
        must_change_password: true,
      },
      app_metadata: {
        role: "tecnico",
      },
    });

    createdUser = createUserResponse.data;
    createUserError = createUserResponse.error;

    if (createUserError && /email rate limit exceeded/i.test(createUserError.message)) {
      const generatedLinkResponse = await adminClient.auth.admin.generateLink({
        type: "signup",
        email,
        password: temporaryPassword,
        options: {
          data: {
            name,
            must_change_password: true,
          },
        },
      });

      createdUser = generatedLinkResponse.data;
      createUserError = generatedLinkResponse.error;
    }

    if (createUserError && isAuthAdminJwtError(createUserError.message)) {
      const signupResponse = await userClient.auth.signUp({
        email,
        password: temporaryPassword,
        options: {
          data: {
            name,
            must_change_password: true,
          },
        },
      });

      createdUser = signupResponse.data;
      createUserError = signupResponse.error;
      usedSignupFallback = !signupResponse.error && Boolean(signupResponse.data?.user);
    }

    if (createUserError || !createdUser?.user) {
      return Response.json({ error: createUserError?.message || "Nao foi possivel criar o usuario no Auth." }, { status: 400, headers: corsHeaders });
    }

    if (!usedSignupFallback) {
      const { error: normalizeUserError } = await adminClient.auth.admin.updateUserById(createdUser.user.id, {
        email_confirm: true,
        password: temporaryPassword,
        user_metadata: {
          ...(createdUser.user.user_metadata ?? {}),
          name,
          must_change_password: true,
        },
        app_metadata: {
          ...(createdUser.user.app_metadata ?? {}),
          role: "tecnico",
        },
      });

      if (normalizeUserError) {
        await adminClient.auth.admin.deleteUser(createdUser.user.id);
        return Response.json({ error: normalizeUserError.message }, { status: 400, headers: corsHeaders });
      }
    }

    const profilePayload = {
      id: createdUser.user.id,
      company_id: adminProfile.company_id,
      name,
      email,
      role: "tecnico",
      phone,
      is_active: isActive,
      must_change_password: true,
    };

    let { error: profileInsertError } = await adminClient.from("profiles").insert(profilePayload);

    if (profileInsertError && /must_change_password/i.test(profileInsertError.message)) {
      const retryInsert = await adminClient.from("profiles").insert({
        id: createdUser.user.id,
        company_id: adminProfile.company_id,
        name,
        email,
        role: "tecnico",
        phone,
        is_active: isActive,
      });
      profileInsertError = retryInsert.error;
    }

    if (profileInsertError) {
      if (!usedSignupFallback) {
        await adminClient.auth.admin.deleteUser(createdUser.user.id);
      }
      return Response.json({ error: profileInsertError.message }, { status: 400, headers: corsHeaders });
    }

    let emailSent = false;
    let warning = "";

    if (sendAccessEmail) {
      const emailResult = await sendEmail({
        to: email,
        ...buildAccessEmail({ name, email, temporaryPassword }),
      });

      emailSent = emailResult.sent;
      warning = emailResult.sent ? "" : emailResult.reason;
    }

    return Response.json(
      {
        userId: createdUser.user.id,
        temporaryPassword,
        emailSent,
        sendAccessEmail,
        warning,
        usedSignupFallback,
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
