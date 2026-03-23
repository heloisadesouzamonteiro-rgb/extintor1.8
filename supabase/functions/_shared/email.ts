export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(payload: EmailPayload) {
  const apiKey = Deno.env.get("MAILERSEND_API_KEY") ?? Deno.env.get("RESEND_API_KEY") ?? "";
  const fromEmailSecret = Deno.env.get("ALERT_FROM_EMAIL") ?? "";
  const fromDomain = Deno.env.get("ALERT_FROM_DOMAIN") ?? "";
  const fromName = Deno.env.get("ALERT_FROM_NAME") ?? "Sistema de Gestao de Extintores";
  const replyTo = Deno.env.get("ALERT_REPLY_TO") ?? "";
  const fromEmail = fromEmailSecret || (fromDomain ? `alertas@${fromDomain}` : "");

  if (!apiKey || !fromEmail) {
    return {
      sent: false,
      reason: "Servico de email nao configurado. Defina MAILERSEND_API_KEY e ALERT_FROM_EMAIL ou ALERT_FROM_DOMAIN.",
    };
  }

  const response = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({
      from: {
        email: fromEmail,
        name: fromName,
      },
      to: (Array.isArray(payload.to) ? payload.to : [payload.to]).map((email) => ({
        email,
      })),
      ...(replyTo
        ? {
            reply_to: {
              email: replyTo,
            },
          }
        : {}),
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      sent: false,
      reason: errorText || "Falha ao enviar email.",
    };
  }

  return {
    sent: true,
    reason: "",
  };
}
