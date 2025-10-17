import { useEffect, useState } from "react";
import getSocketEndpoint from "../utils/socketBalancer";

const useBusLocation = (busNo, token, setLoading) => {
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
  ws.send(1); // immediate first ping

  let counter = 0;

  function scheduleNextPing() {
    const now = Date.now();
    const next10s = Math.ceil(now / 10000) * 10000; // next multiple of 10s
    const delay = next10s - now;

    console.log(`Scheduling next ping in ${delay} ms`);

    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(1);
        counter++;
      }

      if (counter > 100) { // after 100*10s = ~16.7 minutes
        ws.close();
        setError("Reload the page to continue live location updates.");
        setLoc(null);
        return;
      }

      scheduleNextPing(); // recursively schedule next aligned ping
    }, delay);
  }

  scheduleNextPing(); // start aligned ping loop
};


    ws.onmessage = (e) => {
      try {

        if(e.data === "{}"){
          setLoc(null);
          setError("Live Sharing Stopped");
          setLoading(false);
          ws.close();
          return;
        }

        console.log("WebSocket message received:", e.data);
        

        if (e.data === "undefined") return;

        const data = JSON.parse(e.data);
        setLoc(data);
        setLastUpdateTimestamp(data.ts);
        setLoading(false);
      } catch (err) {
        console.error("Failed to parse WebSocket data", err);
      }
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
