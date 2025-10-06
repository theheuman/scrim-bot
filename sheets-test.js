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

async function postSpreadSheetValue(
  teamName,
  teamNoDays,
  teampCompKnowledge,
  player1,
  player2,
  player3,
) {
  const client = await getAuthClient();

  const range = "Sheet1!A1";
  const values = [
    [
      teamName,
      teamNoDays,
      teampCompKnowledge,
      ...Object.values(player1),
      ...Object.values(player2),
      ...Object.values(player3),
    ],
  ];

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

const player1 = {
  name: "TheHeuman",
  discordId: "valid discord id heuman",
  elo: 1500,
  rank: "plat 1",
  previous_season_vesa_division: "div 3",
  platform: "Xbox",
};

const player2 = {
  name: "Toasty",
  discordId: "valid discord id toasty",
  elo: 1200,
  rank: "gold 1",
  previous_season_vesa_division: "div 4",
  platform: "PS5",
};

const player3 = {
  name: "pgk",
  discordId: "valid discord id pgk",
  elo: 2000,
  rank: "diamond 1",
  previous_season_vesa_division: "div 1",
  platform: "PC",
};

// accessSpreadsheet();
postSpreadSheetValue("HTP", "Monday, Wednesday", 4, player1, player2, player3);
