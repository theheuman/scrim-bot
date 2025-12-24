import { sheets_v4 } from "@googleapis/sheets";
import Schema$UpdateValuesResponse = sheets_v4.Schema$UpdateValuesResponse;

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
}
