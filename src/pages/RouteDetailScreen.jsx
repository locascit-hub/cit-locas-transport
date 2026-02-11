import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline,
} from "react-leaflet";
import "leaflet-ant-path";
import { FiArrowLeft, FiRefreshCw } from "react-icons/fi";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/routedetailscreen.css";
import getEndpoint from "../utils/loadbalancer";
import { UserContext } from "../contexts";
import useBusLocation from "../components/LocationSSE";

// --- Leaflet Icon Fixes ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// --- CSS & Animation Injection ---
const addAnimationStyles = () => {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = `
    /* Marker Pulse */
    @keyframes pulse-once {
      0% { transform: scale(2); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.5; }
      100% { transform: scale(4); opacity: 1; }
    }
    .animate-pulse {
      animation: pulse-once 1s ease-in-out;
    }

    /* Loading Spinner */
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .loading-spinner {
      border: 4px solid #e5e7eb; /* Light grey */
      border-top: 4px solid #3b82f6; /* Blue */
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin-bottom: 15px;
    }

    /* Status Card Animation */
    @keyframes slideUpFade {
      0% { transform: translateY(20px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes gentle-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }

    .status-card {
      background: white;
      padding: 2rem;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 90%;
      width: 350px;
      animation: slideUpFade 0.6s ease-out;
      border: 1px solid #f3f4f6;
    }

    .status-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      animation: gentle-bounce 2s infinite ease-in-out;
    }

    .retry-button {
      margin-top: 20px;
      padding: 10px 20px;
      background-color: #2563EB;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background-color 0.2s;
    }
    .retry-button:hover {
      background-color: #1d4ed8;
    }
  `;
  document.head.appendChild(styleSheet);
};

addAnimationStyles();

// --- Animated Marker Component ---
function AnimatedMarker({ position, icon, children }) {
  const markerRef = useRef(null);
  const animationRef = useRef(null);
  const [initialPosition] = useState(position);

  useEffect(() => {
    if (!markerRef.current) return;

    const marker = markerRef.current;
    const from = marker.getLatLng();
    const to = L.latLng(position);

    if (!from || !to || from.equals(to)) {
      return;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const duration = 3000;
    let start = null;

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);

      const lat = from.lat + (to.lat - from.lat) * progress;
      const lng = from.lng + (to.lng - from.lng) * progress;
      marker.setLatLng([lat, lng]);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [position]);

  return (
    <Marker ref={markerRef} position={initialPosition} icon={icon}>
      {children}
    </Marker>
  );
}

// --- Main Component ---
export default function RouteDetailScreen() {
  const navigate = useNavigate();
  const { clgNo } = useParams();

  const { token } = useContext(UserContext);
  const mapRef = useRef(null);
  const [mapView, setMapView] = useState("street");
  const { loc, lastUpdateTimestamp, error } = useBusLocation(clgNo, token);

  const [path, setPath] = useState([]);
  const [locationTimeout, setLocationTimeout] = useState(false);

  useEffect(() => {
    console.log("📍 RouteDetailScreen received loc:", loc);
  }, [loc]);

  // Initial Check
  useEffect(() => {
    if (!clgNo) {
      alert("No bus number provided.");
      navigate("/search");
      return;
    }
  }, [token, navigate, clgNo]);

  // Timeout Logic
  useEffect(() => {
    setLocationTimeout(false);
    const timer = setTimeout(() => {
      if (!loc) {
        setLocationTimeout(true);
      }
    }, 10000); // 10 seconds timeout
    return () => clearTimeout(timer);
  }, [clgNo, loc]); // Added loc to dependency to clear properly

  // Icon Definition
  const busDivIcon = (busNo) =>
    L.divIcon({
      html: `
        <div style="
          display: flex; 
          align-items: center; 
          justify-content: flex-start; 
          background-color: rgba(255, 255, 255, 0.9); 
          border-radius: 8px; 
          padding: 4px 8px;
          border: 2px solid #2563EB;
          width: fit-content;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        ">
          <img src="/bus-icon.png" style="width:24px; height:24px; margin-right:6px;" onerror="this.style.display='none'" />
          <span style="color: #1e3a8a; font-weight: 800; font-size: 16px;">
            ${busNo}
          </span>
        </div>
      `,
      className: "",
      iconSize: [50, 50],
      iconAnchor: [25, 50],
      popupAnchor: [0, -50],
    });

  // --- RENDER STATES ---

  // 1. Loading State (Spinner)
  if (!loc && !locationTimeout) {
    return (
      <div style={styles.centered}>
        <div className="loading-spinner"></div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: "18px", fontWeight: "600", color: "#374151" }}>
            Connecting to Bus...
          </span>
          <span style={{ fontSize: "14px", color: "#9CA3AF", marginTop: "5px" }}>
            Fetching live coordinates
          </span>
        </div>
      </div>
    );
  }

  // 2. Timeout State (No Location Card)
  if (!loc && locationTimeout) {
    return (
      <div style={{ ...styles.centered, background: "#f9fafb" }}>
        <div className="status-card">
          <div className="status-icon">🚍</div>
          <h3 style={{ margin: "0 0 10px 0", color: "#1f2937", fontSize: "1.25rem", fontWeight: "700" }}>
            Waiting for Driver
          </h3>
          <p style={{ color: "#ef4444", fontWeight: "600", textAlign: "center", margin: "0 0 10px 0" }}>
            🚫 Location updates not started
          </p>
          <p style={{ color: "#6b7280", fontSize: "0.875rem", textAlign: "center", lineHeight: "1.5" }}>
            The bus driver has not turned on the GPS tracker yet. Please check back shortly.
          </p>
          <button onClick={() => window.location.reload()} className="retry-button">
            <FiRefreshCw /> Retry
          </button>
        </div>
      </div>
    );
  }

  // 3. Error State
  if (error) return <div style={styles.centered}>⚠ {error}</div>;

  // 4. Map State (Main Content)
  return (
    <div style={styles.container}>
      {/* Back Button & Title */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-start",
          alignItems: "center",
          width: "100%",
          marginBottom: "2px",
        }}
      >
        <button style={styles.backButton} onClick={() => navigate("/search")}>
          <FiArrowLeft size={20} />
        </button>
        <div style={{ width: "70%", textAlign: "center", height: "100%", ...styles.title }}>
          <span>Bus No: {clgNo}</span>
        </div>
      </div>

      {/* Status Bar */}
      <div
        style={{
          height: "fit-content",
          marginBottom: "10px",
          zIndex: 1000,
          width: "100%",
          backgroundColor: "#fff9db",
          padding: "0.5rem",
          display: "flex",
          flexDirection: "row",
          borderRadius: "8px",
          border: "1px solid #fcd34d",
        }}
      >
        <div style={{ ...styles.statusBar, fontSize: "14px", padding: "0rem 0.5rem" }}>
          Last Updated:{" "}
          <strong>
            {new Intl.DateTimeFormat("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Kolkata",
            })
              .format(new Date(loc.ts))}
          </strong>
        </div>
      </div>

      {/* Map Section */}
      <div style={{ height: "75%", flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <button
            onClick={() => setMapView("street")}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              background: mapView === "street" ? "#2563EB" : "#f3f4f6",
              color: mapView === "street" ? "white" : "#333",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Street View
          </button>
          <button
            onClick={() => setMapView("satellite")}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              background: mapView === "satellite" ? "#2563EB" : "#f3f4f6",
              color: mapView === "satellite" ? "white" : "#333",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Satellite View
          </button>
        </div>

        <MapContainer
          ref={mapRef}
          center={[loc.lat, loc.long]}
          zoom={16}
          style={{ height: "100%", width: "100%", borderRadius: "12px", overflow: "hidden" }}
        >
          {mapView === "street" ? (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
          ) : (
            <>
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles © Esri"
              />
              <TileLayer
                url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                attribution="© OpenStreetMap contributors"
              />
            </>
          )}

          {path.length > 0 && (
            <Polyline
              pathOptions={{ color: "blue", weight: 5, opacity: 0.8 }}
              positions={path}
            />
          )}

          <AnimatedMarker position={[loc.lat, loc.long]} icon={busDivIcon(clgNo)} />
        </MapContainer>
      </div>
    </div>
  );
}

const styles = {
  statusBar: {
    textAlign: "left",
    color: "#854d0e", // Darker yellow/brown text for better contrast on yellow bg
  },
  container: {
    fontFamily: "Segoe UI, sans-serif",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    height: "100dvh",
    background: "#f5f7f9",
    padding: "1rem",
  },
  backButton: {
    alignSelf: "flex-start",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    padding: "8px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    transition: "transform 0.1s",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "700",
    color: "#1E40AF",
  },
  centered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    height: "100dvh",
    background: "#fff",
  },
};