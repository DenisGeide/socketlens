export type EntityId = string;

export function createEntityId(): EntityId {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}
