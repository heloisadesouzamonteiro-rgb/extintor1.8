function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("pt-BR");
}

function formatBoolean(value) {
  return value ? "Sim" : "Nao";
}

function escapeHtml(value) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function field(label, value) {
  return `
    <div class="field">
      <span class="label">${escapeHtml(label)}</span>
      <strong class="value">${escapeHtml(value)}</strong>
    </div>
  `;
}

export function generateRTMPdf(report) {
  const printWindow = window.open("", "_blank", "width=1024,height=768");

  if (!printWindow) {
    window.alert("Nao foi possivel abrir a janela de impressao do RTM.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>RTM ${escapeHtml(report.service_order_number || report.extinguisher_code_snapshot || "")}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 32px;
            font-family: Arial, sans-serif;
            color: #0f172a;
            background: #f8fafc;
          }
          .sheet {
            max-width: 980px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            padding: 28px;
          }
          .topbar {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 18px;
            margin-bottom: 22px;
          }
          .brand {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .brand h1 {
            margin: 0;
            font-size: 26px;
          }
          .brand p {
            margin: 0;
            color: #475569;
            font-size: 14px;
          }
          .badge {
            min-width: 180px;
            border: 1px solid #cbd5e1;
            padding: 14px 16px;
            text-align: right;
          }
          .badge span {
            display: block;
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .badge strong {
            display: block;
            margin-top: 6px;
            font-size: 26px;
          }
          .section {
            margin-top: 24px;
          }
          .section h2 {
            margin: 0 0 12px 0;
            font-size: 16px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #16a34a;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }
          .grid-3 {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }
          .field {
            border: 1px solid #e2e8f0;
            padding: 10px 12px;
            min-height: 68px;
          }
          .label {
            display: block;
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 8px;
          }
          .value {
            display: block;
            font-size: 14px;
            line-height: 1.45;
          }
          .notes {
            border: 1px solid #e2e8f0;
            padding: 14px;
            min-height: 92px;
            white-space: pre-wrap;
            line-height: 1.5;
          }
          .footer {
            margin-top: 28px;
            padding-top: 18px;
            border-top: 1px solid #cbd5e1;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 28px;
          }
          .signature {
            padding-top: 32px;
            border-bottom: 1px solid #0f172a;
            min-height: 68px;
          }
          .signature-label {
            margin-top: 8px;
            font-size: 12px;
            color: #475569;
          }
          @media print {
            body {
              background: #ffffff;
              padding: 0;
            }
            .sheet {
              border: none;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="topbar">
            <div class="brand">
              <h1>RTM</h1>
              <p>Relatorio Tecnico de Manutencao do extintor</p>
              <p>Documento para cliente e controle interno da operacao</p>
            </div>
            <div class="badge">
              <span>Numero da O.S.</span>
              <strong>${escapeHtml(report.service_order_number || "-")}</strong>
            </div>
          </div>

          <section class="section">
            <h2>Identificacao</h2>
            <div class="grid">
              ${field("Cliente", report.clients?.name || "-")}
              ${field("Data do RTM", formatDateTime(report.maintenance_date))}
              ${field("Status do RTM", report.report_status || "-")}
              ${field("Tipo de manutencao", report.maintenance_type || "-")}
              ${field("NF", report.invoice_number || "-")}
              ${field("Executor da manutencao", report.executor_name || "-")}
            </div>
          </section>

          <section class="section">
            <h2>Dados do Extintor</h2>
            <div class="grid-3">
              ${field("Codigo do extintor", report.extinguisher_code_snapshot || report.extinguishers?.internal_code || "-")}
              ${field("Numero de serie", report.serial_number_snapshot || "-")}
              ${field("Tipo", report.extinguisher_type_snapshot || report.extinguishers?.extinguisher_type || "-")}
              ${field("Capacidade", report.capacity_snapshot || "-")}
              ${field("Agente", report.agent_snapshot || "-")}
              ${field("Fabricante", report.manufacturer_snapshot || "-")}
              ${field("Norma", report.standard_code_snapshot || "-")}
              ${field("Localizacao", report.location_snapshot || report.extinguishers?.location_description || "-")}
              ${field("Setor", report.sector_snapshot || "-")}
              ${field("Ano de fabricacao", report.manufacture_year_snapshot || "-")}
              ${field("Nivel de manutencao", report.maintenance_level || "-")}
              ${field("Ultimo ensaio", report.last_inspection_year || "-")}
            </div>
          </section>

          <section class="section">
            <h2>Dados Tecnicos</h2>
            <div class="grid-3">
              ${field("Selo", report.seal_number || "-")}
              ${field("Peso bruto", report.gross_weight || "-")}
              ${field("Peso tara", report.tare_weight || "-")}
              ${field("Peso total", report.total_weight || "-")}
              ${field("Perda percentual", report.loss_percentage || "-")}
              ${field("Pressao", report.pressure_value || "-")}
              ${field("Volume", report.cylinder_volume || "-")}
              ${field("Capacidade de carga", report.charge_capacity || "-")}
              ${field("Ensaio hidrostatico", report.hydrostatic_test_reference || "-")}
            </div>
          </section>

          <section class="section">
            <h2>Reprovacoes</h2>
            <div class="grid-3">
              ${field("Pinos", formatBoolean(report.rejection_pin))}
              ${field("Rosca", formatBoolean(report.rejection_thread))}
              ${field("Valvula", formatBoolean(report.rejection_valve))}
              ${field("Indicador de pressao", formatBoolean(report.rejection_pressure_gauge))}
              ${field("Mangueira", formatBoolean(report.rejection_hose))}
              ${field("Motivo da reprovacao", report.rejection_reason || "-")}
            </div>
          </section>

          <section class="section">
            <h2>Observacoes</h2>
            <div class="notes">${escapeHtml(report.notes || "-")}</div>
          </section>

          <div class="footer">
            <div>
              <div class="signature"></div>
              <div class="signature-label">Assinatura do executante da manutencao</div>
            </div>
            <div>
              <div class="signature"></div>
              <div class="signature-label">Assinatura / recebimento do cliente</div>
            </div>
          </div>
        </div>
        <script>
          window.onload = function () {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
