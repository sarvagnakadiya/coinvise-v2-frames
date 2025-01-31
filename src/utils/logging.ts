export const serverLog = async (message: string, data?: any) => {
  try {
    await fetch("/api/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, data }),
    });
  } catch (error) {
    // Fallback to client console in case of fetch error
    console.error("Failed to send log to server:", error);
  }
};
