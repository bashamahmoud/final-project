type ActionParams = {
  type: string;
  config: unknown;
};

export async function runActions(
  actions: ActionParams[],
  initialPayload: Record<string, unknown>,
) {
  let currentPayload = { ...initialPayload };

  const typedPayload = currentPayload as {
    message?: { text?: string };
    text?: string;
  };
  const rawMessageText =
    typedPayload?.message?.text ||
    typedPayload?.text ||
    (typeof currentPayload === "string"
      ? currentPayload
      : JSON.stringify(currentPayload)) ||
    "";

  let lowerText = String(rawMessageText).toLowerCase();

  if (lowerText === "[object object]") {
    lowerText = JSON.stringify(currentPayload).toLowerCase();
  }

  for (const action of actions) {
    if (action.type === "RESERVATION") {
      const isReservation =
        lowerText.includes("book") ||
        lowerText.includes("table") ||
        lowerText.includes("reserve") ||
        lowerText.includes("people");

      if (isReservation) {
        const partyMatch = lowerText.match(/(\d+)\s*people/);
        const dateMatch = lowerText.match(/on\s+(\w+)/);
        const timeMatch = lowerText.match(/at\s+(\d+)/);

        currentPayload = {
          ...currentPayload,
          category: "reservation",
          partySize: partyMatch ? parseInt(partyMatch[1], 10) : null,
          requestedDate: dateMatch ? dateMatch[1] : null,
          requestedTime: timeMatch ? timeMatch[1] : null,
          parsedAt: new Date().toISOString(),
        };
      }
    }
  }

  if (!currentPayload.category) {
    currentPayload.category = "unclassified";
  }

  return currentPayload;
}
