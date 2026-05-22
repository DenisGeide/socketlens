import type { EntityId } from "./ids";
import type { Packet, PacketDirection, PacketPayloadKind } from "./packet";

export type PacketDirectionFilter = "all" | PacketDirection;
export type PacketPayloadKindFilter = "all" | PacketPayloadKind;
export type PacketSearchMode = "text" | "regex";

export type FilterState = {
  direction: PacketDirectionFilter;
  errorsOnly: boolean;
  eventQuery: string;
  hideHeartbeat: boolean;
  hidePingPong: boolean;
  maxSizeBytes: number | null;
  minSizeBytes: number | null;
  payloadKind: PacketPayloadKindFilter;
  searchQuery: string;
  searchMode: PacketSearchMode;
  sessionId: EntityId | null;
  smartQuery: string;
};

export const defaultFilterState: FilterState = {
  direction: "all",
  errorsOnly: false,
  eventQuery: "",
  hideHeartbeat: false,
  hidePingPong: false,
  maxSizeBytes: null,
  minSizeBytes: null,
  payloadKind: "all",
  searchQuery: "",
  searchMode: "text",
  sessionId: null,
  smartQuery: "",
};

export type FilterValidationIssue = {
  field: "searchQuery" | "smartQuery";
  message: string;
  value: string;
};

export type SmartFilterOperator = "==" | "!=";

export type SmartFilterCondition = {
  expectedValue: string;
  operator: SmartFilterOperator;
  path: string[];
  source: string;
};

export type CompiledFilterState = {
  eventQuery: string;
  issues: FilterValidationIssue[];
  searchRegex: RegExp | null;
  smartConditions: SmartFilterCondition[];
};

export function normalizeFilterState(filterState: Partial<FilterState> | undefined): FilterState {
  return {
    direction: normalizeDirection(filterState?.direction),
    errorsOnly: typeof filterState?.errorsOnly === "boolean" ? filterState.errorsOnly : defaultFilterState.errorsOnly,
    eventQuery: typeof filterState?.eventQuery === "string" ? filterState.eventQuery : defaultFilterState.eventQuery,
    hideHeartbeat:
      typeof filterState?.hideHeartbeat === "boolean" ? filterState.hideHeartbeat : defaultFilterState.hideHeartbeat,
    hidePingPong:
      typeof filterState?.hidePingPong === "boolean" ? filterState.hidePingPong : defaultFilterState.hidePingPong,
    maxSizeBytes: normalizeNullableSize(filterState?.maxSizeBytes),
    minSizeBytes: normalizeNullableSize(filterState?.minSizeBytes),
    payloadKind: normalizePayloadKind(filterState?.payloadKind),
    searchMode: filterState?.searchMode === "regex" ? "regex" : defaultFilterState.searchMode,
    searchQuery: typeof filterState?.searchQuery === "string" ? filterState.searchQuery : defaultFilterState.searchQuery,
    sessionId: typeof filterState?.sessionId === "string" ? filterState.sessionId : defaultFilterState.sessionId,
    smartQuery: typeof filterState?.smartQuery === "string" ? filterState.smartQuery : defaultFilterState.smartQuery,
  };
}

export function compileFilterState(filterState: FilterState): CompiledFilterState {
  const issues: FilterValidationIssue[] = [];
  const trimmedSearchQuery = filterState.searchQuery.trim();
  const searchRegex = compileSearchRegex(trimmedSearchQuery, filterState.searchMode, issues);
  const smartConditions = compileSmartConditions(filterState.smartQuery, issues);

  return {
    eventQuery: filterState.eventQuery.trim().toLowerCase(),
    issues,
    searchRegex,
    smartConditions,
  };
}

export function getFilterValidationIssues(filterState: FilterState) {
  return compileFilterState(filterState).issues;
}

function compileSearchRegex(
  query: string,
  searchMode: PacketSearchMode,
  issues: FilterValidationIssue[],
) {
  if (!query || searchMode !== "regex") {
    return null;
  }

  try {
    return new RegExp(query, "i");
  } catch {
    issues.push({
      field: "searchQuery",
      message: "Invalid regular expression.",
      value: query,
    });
    return null;
  }
}

function compileSmartConditions(query: string, issues: FilterValidationIssue[]) {
  const expressions = query
    .split(/\n|&&/g)
    .map((expression) => expression.trim())
    .filter(Boolean);
  const conditions: SmartFilterCondition[] = [];

  for (const expression of expressions) {
    const condition = parseSmartCondition(expression);

    if (condition) {
      conditions.push(condition);
      continue;
    }

    issues.push({
      field: "smartQuery",
      message: "Use payload.path == \"value\" or payload.path != \"value\".",
      value: expression,
    });
  }

  return conditions;
}

function parseSmartCondition(expression: string): SmartFilterCondition | null {
  const match = expression.match(/^payload((?:\.[A-Za-z_$][\w$-]*)+)\s*(==|!=)\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))$/);

  if (!match) {
    return null;
  }

  const path = (match[1] ?? "")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const operator = match[2] as SmartFilterOperator | undefined;
  const expectedValue = match[3] ?? match[4] ?? match[5] ?? "";

  if (!operator || path.length === 0) {
    return null;
  }

  return {
    expectedValue,
    operator,
    path,
    source: expression,
  };
}

function normalizeDirection(value: unknown): PacketDirectionFilter {
  return value === "inbound" || value === "outbound" || value === "all" ? value : defaultFilterState.direction;
}

function normalizePayloadKind(value: unknown): PacketPayloadKindFilter {
  return value === "json" || value === "text" || value === "binary" || value === "all"
    ? value
    : defaultFilterState.payloadKind;
}

function normalizeNullableSize(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
