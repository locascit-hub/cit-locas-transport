import React, { useState, useEffect } from "react";
import { FiMapPin, FiArrowRight, FiClock } from "react-icons/fi";

export default function DriverLocation() {
  const [clgNo, setBusNo] = useState("");
  const [status, setStatus] = useState("Idle");
  const [watchId, setWatchId] = useState(null);
  const [intervalId, setIntervalId] = useState(null); // ✅ new for throttling
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
   const [count,setCount]=useState(0);


   
  // Notification permission handling
  useEffect(() => {
      if (Notification.permission !== 'granted') {
        Notification.requestPermission()
          .then((permission) => {
            console.log(`Notification permission: ${permission}`);
          })
          .catch((err) => {
            console.warn('Notification request failed:', err);
          });
      }
  }, []);

  // Start location sharing (for driver)
  const startLocationSharing = () => {
    if (!clgNo.trim()) return alert("Please enter bus number");
    if (!("geolocation" in navigator)) return alert("Geolocation not supported");

    setStatus("Starting location sharing...");

    // Start watching position
    const id = navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        setStatus(`Tracking: 📍 ${lat.toFixed(5)}, ${lon.toFixed(5)}`);

        // ✅ Send location every 5s, not on every GPS change
        if (!intervalId) {
          const newIntervalId = setInterval(async () => {
            try {
              setCount((prevCount)=>prevCount+1);
              await fetch(`${process.env.REACT_APP_BACKEND_ENDPOINT1}/update-location`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clgNo: clgNo, lat, lon }),
              });
              setLocations((prev) => [
                ...prev,
                { busNumber: clgNo, lat, lng: lon, updatedAt: new Date().toISOString() }
              ]);
            } catch (err) {
              console.error(err);
              setStatus("⚠️ Error sending location");
            }
          }, 5000); // every 5s
          setIntervalId(newIntervalId);
        }
      },
      (err) => {
        console.error(err);
        setStatus("❌ Error getting location");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    setWatchId(id);
  };

  // Stop sharing
  const stopLocationSharing = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setStatus("🛑 Stopped location sharing");
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Driver Locations {count}</h2>
      </div>

      {/* Driver Controls */}
      <div style={styles.controls}>
        <input
          style={styles.input}
          placeholder="Enter Bus Number"
          value={clgNo}
          onChange={(e) => setBusNo(e.target.value)}
        />
        <button style={styles.button} onClick={startLocationSharing}>Start Sharing</button>
        <button style={{ ...styles.button, backgroundColor: '#EF4444' }} onClick={stopLocationSharing}>Stop</button>
        <p style={styles.status}>{status}</p>
      </div>

      {/* Locations List */}
      <div style={styles.list}>
        {loading && <p style={styles.loading}>Loading...</p>}
        {locations.map((loc, idx) => (
          <div key={idx} style={styles.card}>
            <div style={styles.cardHeader}>
              <FiMapPin size={20} color="#2563EB" style={{ marginRight: 8 }} />
              <p style={styles.cardTitle}>Driver</p>
            </div>
            <p style={styles.cardText}>Bus: {loc.busNumber} <FiArrowRight size={16} color="#2563EB" /></p>
            <p style={styles.cardText}>Location: {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</p>
            <p style={styles.cardFooter}>
              <FiClock size={16} color="#6B7280" style={{ marginRight: 4 }} />
              Last updated: {new Date(loc.updatedAt).toLocaleTimeString()}
            </p>
          </div>
        ))}
        {!loading && locations.length === 0 && (
          <div style={styles.emptyState}>
            <FiMapPin size={48} color="#9CA3AF" />
            <h4 style={styles.emptyTitle}>No Driver Locations</h4>
            <p style={styles.emptyMessage}>Driver locations will appear here in real-time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
// Add your styles object here (same as your previous NotificationScreen style)
const styles = {
  container: { fontFamily:'Inter,sans-serif', minHeight:'100vh', backgroundColor:'#F9FAFB', paddingBottom:60 },
  header: { backgroundColor:'#FFFFFF', padding:20, borderBottom:'1px solid #E5E7EB', textAlign:'center' },
  title: { fontSize:24, fontWeight:700, color:'#1F2937', margin:0 },
  controls: { display:'flex', gap:10, padding:20, alignItems:'center', flexWrap:'wrap' },
  input: { padding:10, borderRadius:8, border:'1px solid #E5E7EB', flex:1, minWidth:150 },
  button: { padding:'10px 16px', borderRadius:8, backgroundColor:'#2563EB', color:'#fff', border:'none', cursor:'pointer' },
  status: { marginTop:8, color:'#6B7280' },
  loading: { textAlign:'center', marginTop:20, fontSize:16, color:'#6B7280' },
  list: { padding:20 },
  card: { backgroundColor:'#FFFFFF', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,0.08)', padding:16, marginBottom:12, position:'relative' },
  cardHeader: { display:'flex', alignItems:'center', marginBottom:8 },
  cardTitle: { fontSize:16, fontWeight:600, color:'#1F2937', margin:0 },
  cardText: { fontSize:14, color:'#4B5563', margin:'4px 0', display:'flex', alignItems:'center' },
  cardFooter: { fontSize:12, color:'#9CA3AF', marginTop:8, display:'flex', alignItems:'center' },
  emptyState: { display:'flex', flexDirection:'column', alignItems:'center', padding:40, textAlign:'center' },
  emptyTitle: { fontSize:18, fontWeight:600, color:'#1F2937', marginTop:12 },
  emptyMessage: { fontSize:14, color:'#6B7280', marginTop:6 },
};
