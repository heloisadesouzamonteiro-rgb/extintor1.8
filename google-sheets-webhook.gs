function doOptions() {
  return ContentService
    .createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Página1") || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var body = JSON.parse(e.postData.contents || "{}");

    var nome = String(body.nome || "").trim();
    var whatsapp = String(body.whatsapp || "").trim();
    var empresa = String(body.empresa || "").trim();
    var qtdFuncionarios = String(body.qtdFuncionarios || "").trim();

    if (!nome || !whatsapp || !empresa || !qtdFuncionarios) {
      return jsonResponse({ success: false, error: "Dados obrigatorios ausentes." }, 400);
    }

    sheet.appendRow([nome, whatsapp, empresa, qtdFuncionarios]);

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    return jsonResponse({ success: false, error: String(error) }, 500);
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
