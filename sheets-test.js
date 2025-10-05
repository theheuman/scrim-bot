const { google } = require("googleapis");
const sheets = google.sheets("v4");

const spreadsheetId = "1_e_TdsjAc077eHSzcAOVs8xBHAJSPVd9JXJiLDfVHeo";

function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: "service-account-key.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return auth.getClient();
}

async function accessSpreadsheet() {
  const client = await getAuthClient();

  const request = {
    spreadsheetId,
    range: "Sheet1!A1:C10",
    auth: client,
  };

  const response = await sheets.spreadsheets.values.get(request);
  console.log(response.data.values);
}

async function postSpreadSheetValue() {
  const client = await getAuthClient();

  const range = "Sheet1!A1";
  const values = [["Value for Col A", "Value for Col B", "Value for Col C"]];

  const request = {
    spreadsheetId,
    range,
    // Add valueInputOption to tell the API how to interpret the data (e.g., as raw text, or with formula parsing)
    valueInputOption: "USER_ENTERED", // 'USER_ENTERED' is generally a safe choice
    requestBody: {
      values: values,
    },
    auth: client,
  };

  const response = await sheets.spreadsheets.values.append(request);
  console.log(response.data);
}

// accessSpreadsheet();
postSpreadSheetValue();
