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
    entry?: Array<{ messaging?: Array<{ message?: { text?: string } }> }>;
  };

  const fbMessage = typedPayload?.entry?.[0]?.messaging?.[0]?.message?.text;

  const rawMessageText =
    fbMessage ||
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
    } else if (action.type === "COMPLAINT_SUPPORT") {
      const isSupport =
        lowerText.includes("complaint") ||
        lowerText.includes("bad") ||
        lowerText.includes("cold") ||
        lowerText.includes("manager") ||
        lowerText.includes("refund") ||
        lowerText.includes("waiting") ||
        lowerText.includes("issue") ||
        lowerText.includes("support") ||
        lowerText.includes("help") ||
        lowerText.includes("terrible");

      if (isSupport) {
        currentPayload = {
          ...currentPayload,
          category: "support",
          priority: "high",
          parsedAt: new Date().toISOString(),
        };
      }
    } else if (action.type === "FEEDBACK_COLLECTION") {
      const isFeedback =
        lowerText.includes("experience") ||
        lowerText.includes("loved") ||
        lowerText.includes("amazing") ||
        lowerText.includes("delicious") ||
        lowerText.includes("recommend") ||
        lowerText.includes("disappointed");

      if (isFeedback) {
        const sentiment =
          lowerText.includes("loved") ||
          lowerText.includes("amazing") ||
          lowerText.includes("delicious") ||
          lowerText.includes("recommend")
            ? "positive"
            : "negative";

        currentPayload = {
          ...currentPayload,
          category: "feedback",
          sentiment,
          parsedAt: new Date().toISOString(),
        };
      }
    }
  }

  if (!currentPayload.category) {
    currentPayload.category = "unclassified";
  }

  const safeCategory = String(currentPayload.category).toUpperCase();
  currentPayload.content = `🔔 **NEW ${safeCategory}**\n\n**Payload Info:**\n> Party Size: ${currentPayload.partySize || "N/A"}\n> Message: "${rawMessageText}"`;

  return currentPayload;
}
