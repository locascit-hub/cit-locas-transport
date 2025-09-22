import { useEffect, useState } from "react";
import getEndpoint from "../utils/loadbalancer";

const useBusLocation = (busNo, token,setLoading) => {
  const [loc, setLoc] = useState(null);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!busNo) return;

    // create SSE connection
    const url = new URL(`${getEndpoint()}/substream`);
    url.searchParams.append("busNo", busNo);
    if (token) url.searchParams.append("auth", token);

    const evtSource = new EventSource(url.toString());

    evtSource.onmessage = (e) => {
      try {
        console.log("SSE message received:", e);
        if (e.data=="undefined") return;
        const data = JSON.parse(e.data);
        setLoc(data);
        setLastUpdateTimestamp(data.ts);
        setLoading(false);
      } catch (err) {
        console.error("Failed to parse SSE data", err);
      }
    };

    evtSource.onerror = (err) => {
      console.error("SSE connection error", err);
      setError("SSE connection failed. Try refreshing.");
      evtSource.close();
    };

    // cleanup on unmount
    return () => {
      evtSource.close();
    };
  }, [busNo, token]);

  return { loc, lastUpdateTimestamp, error };
};

export default useBusLocation;
