export type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

export type DbValue = string | number | boolean | Date | JSON | null;
export type Comparator = "eq" | "gte" | "lte" | "gt" | "lt";
export type Operator = "and" | "or";
export type Expression = {
  fieldName: string;
  comparator: Comparator;
  value: DbValue;
};
export type CompoundExpression = {
  operator: Operator;
  expressions: (Expression | CompoundExpression)[];
};
export type LogicalExpression = CompoundExpression | Expression;

export enum DbTable {
  scrims = "scrims",
  scrimAdminRoles = "scrim_admin_roles",
  players = "players",
  scrimPlayerStats = "scrim_player_stats",
  scrimSignups = "scrim_signups",
  prio = "prio",
  scrimBans = "scrim_bans",
  staticKeyValues = "static_key_value",
  lobbyEventTimes = "lobby_event_times",
}

// Recursive type to infer the return structure
export type FieldSelection = string | { [key: string]: FieldSelection[] };

// Recursive type to infer return type from FieldSelection
export type ExtractReturnType<T extends FieldSelection[]> = {
  [K in T[number] as K extends string ? K : keyof K]: K extends string
    ? DbValue
    : K extends Record<string, FieldSelection[]>
      ? ExtractReturnType<K[keyof K]>
      : never;
};

export function isCompoundExpression(
  value: LogicalExpression,
): value is CompoundExpression {
  return (value as CompoundExpression).operator !== undefined;
}

export function isExpression(
  value: CompoundExpression[] | CompoundExpression | Expression,
): value is Expression {
  return (value as Expression).fieldName !== undefined;
}
