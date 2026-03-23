const sheetsWebhookUrl = import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL;

export function isLeadWebhookConfigured() {
  return Boolean(sheetsWebhookUrl);
}

export async function sendLeadToSheetsWebhook(payload) {
  if (!sheetsWebhookUrl) {
    throw new Error("Webhook do Google Sheets nao configurado.");
  }

  const response = await fetch(sheetsWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Webhook do Google Sheets retornou erro.");
  }
}
