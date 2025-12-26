import { OAuth2Client } from "googleapis-common";
import { sheets_v4 } from "@googleapis/sheets";
import Schema$UpdateValuesResponse = sheets_v4.Schema$UpdateValuesResponse;
import Params$Resource$Spreadsheets$Values$Append = sheets_v4.Params$Resource$Spreadsheets$Values$Append;

enum SpreadSheetTypes {
  TEST_SHEET = "TEST_SHEET",
  PROD_SHEET = "PROD_SHEET",
}

export const SpreadSheetType: Record<
  SpreadSheetTypes,
  { id: string; range: string }
> = {
  TEST_SHEET: {
    id: "1_e_TdsjAc077eHSzcAOVs8xBHAJSPVd9JXJiLDfVHeo",
    range: "Sheet1!A1",
  },
  PROD_SHEET: {
    id: "1pp8ynvVj9Z1yuuNhy8C2QvyflYhWhAQC3BQD_OJXkn4",
    range: "Discord Submittals!A1",
  },
};

export class SheetHelper {
  static STARTING_CELL_OFFSET = 1;

  static GET_ROW_NUMBER_FROM_UPDATE_RESPONSE(
    updates: Schema$UpdateValuesResponse | undefined,
  ): number | null {
    const parts = updates?.updatedRange?.split("!");
    if (!parts) {
      return null;
    }
    const cellPart = parts.length > 1 ? parts[1] : null;
    if (!cellPart) {
      return null;
    }
    const match = cellPart.match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  static BUILD_REQUEST(
    values: (string | number)[][],
    authClient: OAuth2Client,
    spreadsheetType: { id: string; range: string },
  ): Params$Resource$Spreadsheets$Values$Append {
    return {
      spreadsheetId: spreadsheetType.id,
      range: spreadsheetType.range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: values,
      },
      auth: authClient as OAuth2Client,
    };
  }
}
