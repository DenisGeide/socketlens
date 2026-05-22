export function createDemoPayload() {
  return JSON.stringify(
    {
      source: "socketlens",
      sentAt: new Date().toISOString(),
      type: "ping",
    },
    null,
    2,
  );
}
