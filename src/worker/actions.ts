type ActionParams = {
  type: string;
  config: any;
};

export async function runActions(actions: ActionParams[], initialPayload: any) {
  let currentPayload = { ...initialPayload };

  const rawMessageText = 
    currentPayload?.message?.text || 
    currentPayload?.text || 
    (typeof currentPayload === "string" ? currentPayload : JSON.stringify(currentPayload)) || 
    "";
    
  let lowerText = String(rawMessageText).toLowerCase();
  
  if (lowerText === "[object object]") {
      lowerText = JSON.stringify(currentPayload).toLowerCase();
  }

  for (const action of actions) {
    if (action.type === "RESERVATION") {
      const isReservation = lowerText.includes("book") || lowerText.includes("table") || lowerText.includes("reserve") || lowerText.includes("people");
      
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
          parsedAt: new Date().toISOString()
        };
      }
    }
  }

  if (!currentPayload.category) {
    currentPayload.category = "unclassified";
  }

  return currentPayload;
}
