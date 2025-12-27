import { useEffect, useState } from "react";
import getSocketEndpoint from "../utils/socketBalancer";

const useBusLocation = (busNo, token) => {
  const [loc, setLoc] = useState(null);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!busNo) return;

    // Build WebSocket URL
    const url = new URL(`wss://${getSocketEndpoint(busNo)}/substream`);
    url.searchParams.append("busNo", busNo);
    if (token) url.searchParams.append("auth", token);

    const ws = new WebSocket(url.toString());

ws.onopen = () => {
  console.log("WebSocket connection established");
  
};


    ws.onmessage = (e) => {
  if (!e.data) return;

  let data;
  try {
    data = JSON.parse(e.data);
  } catch {
    console.warn("Non-JSON WS message ignored:", e.data);
    return;
  }

  // 🔴 VERY IMPORTANT: validate coordinates
  if (
    typeof data.lat !== "number" ||
    typeof data.long !== "number"
  ) {
    console.warn("Invalid location payload ignored:", data);
    return;
  }

  console.log("📍 Valid location received:", data);

  setLoc(data);
  setLastUpdateTimestamp(data.ts || Date.now());
};

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
      setError("WebSocket connection failed. Try refreshing.");
      ws.close();
    };

    ws.onclose = (e) => {
      console.log("WebSocket closed", e);
    };

    // cleanup on unmount
    return () => {
      ws.close();
    };
  }, [busNo, token]);

  return { loc, lastUpdateTimestamp, error };
};

export default useBusLocation;
