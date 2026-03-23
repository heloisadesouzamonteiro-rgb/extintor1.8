import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const TIMEZONE_OFFSET = "-03:00";

function getTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getRangeIso(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  const start = `${year}-${month}-${day}T00:00:00${TIMEZONE_OFFSET}`;
  const nextDate = new Date(`${year}-${month}-${day}T12:00:00${TIMEZONE_OFFSET}`);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(nextDate);
  const [nextYear, nextMonth, nextDay] = nextKey.split("-");
  const end = `${nextYear}-${nextMonth}-${nextDay}T00:00:00${TIMEZONE_OFFSET}`;
  return { start, end };
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-");
  const nextDate = new Date(`${year}-${month}-${day}T12:00:00${TIMEZONE_OFFSET}`);
  nextDate.setDate(nextDate.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(nextDate);
}

function getSoonestDueDate(extinguisher: Record<string, string | null>) {
  const candidates = [extinguisher.next_inspection_due, extinguisher.load_expiration_date]
    .filter(Boolean)
    .sort();

  return candidates[0] ?? null;
}

function buildAgendaEmail(companyItems: Array<Record<string, string>>) {
  const lines = companyItems.length > 0
    ? companyItems.map((item) => `${item.time} - ${item.technician} - ${item.client}${item.unit ? ` (${item.unit})` : ""}`)
    : ["Nenhuma visita registrada para hoje."];

  return {
    subject: "Agenda de visitas do dia",
    text: ["Bom dia,", "", "Segue agenda de inspecoes de hoje:", "", ...lines, "", "Sistema de Gestao de Extintores"].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2>Agenda de visitas do dia</h2>
        <p>Bom dia,</p>
        <p>Segue agenda de inspecoes de hoje:</p>
        <ul>${lines.map((line) => `<li>${line}</li>`).join("")}</ul>
        <p>Sistema de Gestao de Extintores</p>
      </div>
    `,
  };
}

function buildClientExpirationEmail(clientName: string, unitName: string, counts: { expired: number; upcoming: number }) {
  return {
    subject: "Extintores proximos do vencimento",
    text: [
      "Ola,",
      "",
      "Identificamos extintores que precisam de atencao.",
      `Cliente: ${clientName}`,
      `Unidade: ${unitName || "Nao informada"}`,
      `Extintores vencidos: ${counts.expired}`,
      `Extintores vencendo em ate 30 dias: ${counts.upcoming}`,
      "",
      "Recomendamos agendar uma inspecao ou manutencao.",
      "",
      "Sistema de Gestao de Extintores",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2>Extintores proximos do vencimento</h2>
        <p>Ola,</p>
        <p>Identificamos extintores que precisam de atencao.</p>
        <p><strong>Cliente:</strong> ${clientName}<br /><strong>Unidade:</strong> ${unitName || "Nao informada"}</p>
        <p><strong>Extintores vencidos:</strong> ${counts.expired}<br /><strong>Extintores vencendo em ate 30 dias:</strong> ${counts.upcoming}</p>
        <p>Recomendamos agendar uma inspecao ou manutencao.</p>
        <p>Sistema de Gestao de Extintores</p>
      </div>
    `,
  };
}

function buildAdminExpirationEmail(items: Array<{ client: string; unit: string; expired: number; upcoming: number }>) {
  return {
    subject: "Extintores proximos do vencimento",
    text: [
      "Ola,",
      "",
      "Identificamos clientes com extintores vencidos ou vencendo em ate 30 dias.",
      "",
      ...items.map((item) => `${item.client} - ${item.unit || "Sem unidade"} | Vencidos: ${item.expired} | Vencendo em breve: ${item.upcoming}`),
      "",
      "Recomendamos agendar as manutencoes necessarias.",
      "",
      "Sistema de Gestao de Extintores",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2>Extintores proximos do vencimento</h2>
        <p>Identificamos clientes com extintores vencidos ou vencendo em ate 30 dias.</p>
        <ul>
          ${items.map((item) => `<li>${item.client} - ${item.unit || "Sem unidade"} | Vencidos: ${item.expired} | Vencendo em breve: ${item.upcoming}</li>`).join("")}
        </ul>
        <p>Recomendamos agendar as manutencoes necessarias.</p>
        <p>Sistema de Gestao de Extintores</p>
      </div>
    `,
  };
}

async function alreadySent(adminClient: ReturnType<typeof createClient>, notificationType: string, notificationKey: string, recipientEmail: string) {
  const { data, error } = await adminClient
    .from("notification_dispatch_log")
    .select("id")
    .eq("notification_type", notificationType)
    .eq("notification_key", notificationKey)
    .eq("recipient_email", recipientEmail)
    .maybeSingle();

  if (error && !/notification_dispatch_log/i.test(error.message)) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

async function recordDispatch(
  adminClient: ReturnType<typeof createClient>,
  payload: { company_id: string; notification_type: string; notification_key: string; recipient_email: string; payload: Record<string, unknown> },
) {
  const { error } = await adminClient.from("notification_dispatch_log").insert(payload);

  if (error && !/duplicate key/i.test(error.message)) {
    throw new Error(error.message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const requestSecret = req.headers.get("x-cron-secret") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return Response.json({ error: "Configuracao incompleta da funcao." }, { status: 500, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    if (requestSecret !== cronSecret) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
        error: authError,
      } = await userClient.auth.getUser();

      if (authError || !user) {
        return Response.json({ error: "Usuario nao autenticado." }, { status: 401, headers: corsHeaders });
      }

      const { data: adminProfile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (adminProfile?.role !== "admin") {
        return Response.json({ error: "Acesso negado." }, { status: 403, headers: corsHeaders });
      }
    }

    const todayKey = getTodayKey();
    const warningLimitKey = addDays(todayKey, 30);
    const { start, end } = getRangeIso(todayKey);

    const [adminsRes, clientsRes, unitsRes, techsRes, inspectionsRes, extinguishersRes] = await Promise.all([
      adminClient.from("profiles").select("id, company_id, name, email, role, is_active").eq("role", "admin").eq("is_active", true),
      adminClient.from("clients").select("id, company_id, name, email"),
      adminClient.from("units").select("id, company_id, client_id, name"),
      adminClient.from("profiles").select("id, company_id, name").eq("role", "tecnico"),
      adminClient
        .from("inspections")
        .select("id, company_id, client_id, unit_id, technician_id, inspected_at, result")
        .gte("inspected_at", new Date(start).toISOString())
        .lt("inspected_at", new Date(end).toISOString()),
      adminClient
        .from("extinguishers")
        .select("id, company_id, client_id, unit_id, internal_code, next_inspection_due, load_expiration_date, status")
        .or("next_inspection_due.not.is.null,load_expiration_date.not.is.null"),
    ]);

    const responses = [adminsRes, clientsRes, unitsRes, techsRes, inspectionsRes, extinguishersRes];
    const firstError = responses.find((item) => item.error)?.error;

    if (firstError) {
      return Response.json({ error: firstError.message }, { status: 400, headers: corsHeaders });
    }

    const admins = adminsRes.data || [];
    const clients = clientsRes.data || [];
    const units = unitsRes.data || [];
    const technicians = techsRes.data || [];
    const inspections = inspectionsRes.data || [];
    const extinguishers = (extinguishersRes.data || []).filter((item) => {
      const dueDate = getSoonestDueDate(item);
      return dueDate && dueDate <= warningLimitKey;
    });

    const clientsById = new Map(clients.map((item) => [item.id, item]));
    const unitsById = new Map(units.map((item) => [item.id, item]));
    const techsById = new Map(technicians.map((item) => [item.id, item]));
    const adminsByCompany = admins.reduce<Record<string, typeof admins>>((acc, item) => {
      acc[item.company_id] = [...(acc[item.company_id] || []), item];
      return acc;
    }, {});

    const agendaByCompany = inspections.reduce<Record<string, Array<Record<string, string>>>>((acc, item) => {
      const client = clientsById.get(item.client_id);
      const unit = item.unit_id ? unitsById.get(item.unit_id) : null;
      const technician = item.technician_id ? techsById.get(item.technician_id) : null;
      const time = new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(item.inspected_at));

      acc[item.company_id] = [
        ...(acc[item.company_id] || []),
        {
          time,
          client: client?.name || "Cliente nao identificado",
          unit: unit?.name || "",
          technician: technician?.name || "Tecnico nao identificado",
        },
      ];

      return acc;
    }, {});

    const expirationGroups = extinguishers.reduce<Record<string, Array<typeof extinguishers[number]>>>((acc, item) => {
      const key = `${item.company_id}:${item.client_id}:${item.unit_id || "sem-unidade"}`;
      acc[key] = [...(acc[key] || []), item];
      return acc;
    }, {});

    let agendaEmailsSent = 0;
    let expirationEmailsSent = 0;
    const warnings: string[] = [];

    for (const [companyId, companyAdmins] of Object.entries(adminsByCompany)) {
      for (const admin of companyAdmins) {
        if (!admin.email) continue;

        const notificationType = "daily_agenda";
        const notificationKey = `agenda:${companyId}:${todayKey}`;

        if (await alreadySent(adminClient, notificationType, notificationKey, admin.email)) {
          continue;
        }

        const agendaEmail = buildAgendaEmail(agendaByCompany[companyId] || []);
        const sendResult = await sendEmail({
          to: admin.email,
          ...agendaEmail,
        });

        if (!sendResult.sent) {
          warnings.push(sendResult.reason);
          continue;
        }

        await recordDispatch(adminClient, {
          company_id: companyId,
          notification_type: notificationType,
          notification_key: notificationKey,
          recipient_email: admin.email,
          payload: { items: agendaByCompany[companyId]?.length || 0 },
        });

        agendaEmailsSent += 1;
      }
    }

    const adminExpirationItems = new Map<string, Array<{ client: string; unit: string; expired: number; upcoming: number }>>();

    for (const [groupKey, items] of Object.entries(expirationGroups)) {
      const [companyId, clientId, unitId] = groupKey.split(":");
      const client = clientsById.get(clientId);
      const unit = unitId === "sem-unidade" ? null : unitsById.get(unitId);
      const counts = items.reduce(
        (acc, item) => {
          const dueDate = getSoonestDueDate(item);
          if (!dueDate) return acc;
          if (dueDate < todayKey) {
            acc.expired += 1;
          } else {
            acc.upcoming += 1;
          }
          return acc;
        },
        { expired: 0, upcoming: 0 },
      );

      if ((counts.expired + counts.upcoming) === 0) continue;

      adminExpirationItems.set(companyId, [
        ...(adminExpirationItems.get(companyId) || []),
        {
          client: client?.name || "Cliente nao identificado",
          unit: unit?.name || "",
          expired: counts.expired,
          upcoming: counts.upcoming,
        },
      ]);

      if (client?.email) {
        const notificationType = "client_expiration_alert";
        const notificationKey = `expiration:${companyId}:${clientId}:${unitId}:${todayKey}`;

        if (!(await alreadySent(adminClient, notificationType, notificationKey, client.email))) {
          const sendResult = await sendEmail({
            to: client.email,
            ...buildClientExpirationEmail(client?.name || "Cliente", unit?.name || "", counts),
          });

          if (sendResult.sent) {
            await recordDispatch(adminClient, {
              company_id: companyId,
              notification_type: notificationType,
              notification_key: notificationKey,
              recipient_email: client.email,
              payload: counts,
            });
            expirationEmailsSent += 1;
          } else {
            warnings.push(sendResult.reason);
          }
        }
      }
    }

    for (const [companyId, items] of adminExpirationItems.entries()) {
      const companyAdmins = adminsByCompany[companyId] || [];

      for (const admin of companyAdmins) {
        if (!admin.email) continue;

        const notificationType = "admin_expiration_alert";
        const notificationKey = `expiration:${companyId}:${todayKey}`;

        if (await alreadySent(adminClient, notificationType, notificationKey, admin.email)) {
          continue;
        }

        const sendResult = await sendEmail({
          to: admin.email,
          ...buildAdminExpirationEmail(items),
        });

        if (!sendResult.sent) {
          warnings.push(sendResult.reason);
          continue;
        }

        await recordDispatch(adminClient, {
          company_id: companyId,
          notification_type: notificationType,
          notification_key: notificationKey,
          recipient_email: admin.email,
          payload: { items: items.length },
        });

        expirationEmailsSent += 1;
      }
    }

    return Response.json(
      {
        success: true,
        today: todayKey,
        agendaEmailsSent,
        expirationEmailsSent,
        warnings,
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
