import { useEffect, useState } from "react";
import getSocketEndpoint from "../utils/socketBalancer";

const useBusLocation = (busNo, token) => {
  const [loc, setLoc] = useState(null);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(null);
  const [error, setError] = useState(null);

  const CACHE_DURATION = 10 * 60 * 60 * 1000;

  useEffect(() => {
    if (!busNo) return;

    const CACHE_KEY = `bus_loc_${busNo}`;

    //load cache immediately
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsedData = JSON.parse(cached);
        const now = Date.now();
        const isExpired = now - parsedData.timestamp > CACHE_DURATION;

        if (!isExpired && parsedData.location) {
          console.log("♻️ Restoring location from cache:", parsedData.location);
          setLoc(parsedData.location);
          setLastUpdateTimestamp(parsedData.timestamp);
        } else {
          console.log(" Cache expired or invalid, clearing...");
          localStorage.removeItem(CACHE_KEY);
          setLoc(null); // Clear old data if expired
        }
      } catch (e) {
        console.warn("Error parsing cached location", e);
        localStorage.removeItem(CACHE_KEY);
      }
    } else {
      
      setLoc(null); 
    }

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

  //  SAVE TO CACHE ON NEW UPDATE
      const cacheData = {
        location: data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
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
