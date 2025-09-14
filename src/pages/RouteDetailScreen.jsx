import React, { useState, useEffect, useRef, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline, // 1. Import Polyline
} from "react-leaflet";
import "leaflet-ant-path";
import { FiArrowLeft, FiRefreshCw } from "react-icons/fi";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/routedetailscreen.css";
import getEndpoint from "../utils/loadbalancer";
import { UserContext } from "../contexts";

// ... (rest of the initial setup code like L.Icon.Default, addAnimationStyles, AnimatedMarker, and ReloadControl remains unchanged) ...

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const addAnimationStyles = () => {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = `
    @keyframes pulse-once {
      0% {
        transform: scale(2);
        opacity: 1;
      }
      50% {
        transform: scale(1.2);
        opacity: 0.5;
      }
      100% {
        transform: scale(4);
        opacity: 1;
      }
    }
    .animate-pulse {
      animation: pulse-once 1s ease-in-out;
    }
    .map-reload-btn svg {
        transition: transform 0.3s ease-in-out;
    }
        @keyframes blink {
      0%, 100% { opacity: 3; }
      50% { opacity: 0.3; }
    }
         .animate-blink {
      animation: blink 1s step-end infinite;
    }
  `;
  document.head.appendChild(styleSheet);
};

addAnimationStyles();


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

    const duration = 8000;
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

function ReloadControl({ onReload,lastUpdateTimestamp }) {
   
  const [cooldown, setCooldown] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isBlinking, setIsBlinking] = useState(false);
    const [isShrinking, setIsShrinking] = useState(false);

    useEffect(() => {
    const checkBlink = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - lastUpdateTimestamp) / 1000);
      if (elapsedSeconds >= 10) {
        setIsShrinking(true);
      } else {
        setIsShrinking(false);
      }
    }, 1000);
    return () => clearInterval(checkBlink);
  }, [lastUpdateTimestamp]);

  const handleReload = async () => {
    setCooldown(true);
    
    await onReload();
    
      setCooldown(false);
      setIsShrinking(false);
    
  };

    const buttonClasses = `map-reload-btn ${isShrinking ? "animate-blink-shrink-grow" : ""}`;
  return (
    <>
      <style>
        {`
        @keyframes shrink-grow-infinite {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.6);
    }
  }

  .animate-blink-shrink-grow svg {
    animation: shrink-grow-infinite 1s ease-in-out infinite;
  }

  .map-reload-btn svg {
    transition: transform 0.3s ease-in-out;
  }
  @keyframes blink {
    0%, 100% { opacity: 5; }
    50% { opacity: 0.3; }
  }
  .animate-blink {
    animation: blink 1s step-end infinite;
  }
  @keyframes color-pulse {
    0%, 100% {
      background-color: white;
    }
    50% {
      background-color: rgba(133, 210, 31, 0.2);
    }
  }
        `}
      </style>
      
    <button
      onClick={handleReload}
      disabled={cooldown}
      className={buttonClasses}
      style={{
        position: "absolute",
        bottom: "480px",
        right: "15px",
        zIndex: 1000,
        backgroundColor: "white",
        border: "2px solid rgba(0,0,0,0.2)",
        borderRadius: "4px",
        width: "36px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 5px rgba(0,0,0,0.4)",
        cursor: cooldown ? "not-allowed" : "pointer",
        opacity: cooldown ? 0.6 : 1,
        transition: "opacity 0.3s ease",
      }}
      title="Refresh Location"
    >
      <FiRefreshCw size={20} color="#2563EB" />
    
    </button>
    </>
  );
}




export default function RouteDetailScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { clgNo } = state || {};
  const [loc, setLoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = useContext(UserContext);
  const mapRef = useRef(null);
  const [mapView, setMapView] = useState("street");
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(Date.now());
  const [timeSinceLastUpdate, setTimeSinceLastUpdate] = useState("Just now");

  // 2. Add new state to hold the route path
  const [path, setPath] = useState([]);

  useEffect(() => {
    if (mapRef.current && loc?.lat && loc?.long) {
      mapRef.current.panTo([loc.lat, loc.long]);
    }
  }, [loc]);

  // 4. Update main useEffect to call both fetch functions in order
  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    if (!clgNo) {
      alert("No bus number provided.");
      navigate("/search");
      return;
    }
     fetchLocation(); // Then fetch the live location
    fetchPath(); // Fetch the route path first
   

  }, [token, navigate, clgNo]);

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - lastUpdateTimestamp) / 1000);
      if (elapsedSeconds == Date.now() ) {
        setTimeSinceLastUpdate("Just now");
      }else if(elapsedSeconds == 1) {
        setTimeSinceLastUpdate("1s ago");
      }
      else if(elapsedSeconds >= 10) {
        setTimeSinceLastUpdate("10s ago");
        clearInterval(timer); 
      }
       else if (elapsedSeconds < 60) {
        setTimeSinceLastUpdate(`${elapsedSeconds}s ago`);
      } 
      else {
        const elapsedMinutes = Math.floor(elapsedSeconds / 60);
        setTimeSinceLastUpdate(`${elapsedMinutes}m ago`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastUpdateTimestamp]);

  const busDivIcon = (busNo) =>
    L.divIcon({
      html: `
        <div style="
          display: flex; 
          align-items: center; 
          justify-content: flex-start; 
          background-color: rgba(255, 255, 255, 0.8); 
          border-radius: 8px; 
          padding: 4px 8px;
          border: 1px solid #316adeff;
          width: fit-content;
        ">
          <img src="/bus-icon.png" style="width:30px; height:30px; border-radius:6px; margin-right:6px;" />
          <span style="color: black; font-weight: bold; font-size: 20px;">
            ${busNo}
          </span>
        </div>
      `,
      className: "",
      iconSize: [50, 50],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });
    
  // 3. Create the new fetchPath function
  const fetchPath = async () => {
    try {
      // Assuming your new Cloudflare endpoint is /get-path/:clgNo
      const res = await fetch(`${getEndpoint()}/get-path/${clgNo}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        // If path is not found or another error, we don't block the UI.
        // The live location can still be shown.
        console.error(`Could not fetch route path, server returned ${res.status}`);
        return; // Exit quietly
      }
      
      const data = await res.json();
      // Ensure the response has a 'path' array
      if (data && Array.isArray(data.path)) {
        setPath(data.path);
      }
    } catch (e) {
      console.error("Fetch path error", e);
      // Don't show an alert for path errors to avoid interrupting the user.
    }
  };


  const fetchLocation = async () => {
    try {
      const res = await fetch(`${getEndpoint()}/get-location/obu/${clgNo}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        if (res.status === 404) {
          window.location.reload();
          return;
        }
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      setLoc(data);
      setLastUpdateTimestamp(Date.now());
    } catch (e) {
      console.error("Fetch error", e);
      window.alert("Could not fetch live location.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    const elapsedSeconds = Math.floor((Date.now() - lastUpdateTimestamp) / 1000);
    return elapsedSeconds >= 5 ? "red" : "green";
  };

  if (loading)
    return <div style={styles.centered}>Loading live location...</div>;
  if (!loc)
    return (
      <div style={styles.centered}>⚠ Live location not available yet.</div>
    );

  return (
    <div style={styles.container}>
      {/* Back Button */}
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
        <div
          style={{ width: "70%", textAlign: "center", height: "100%", ...styles.title }}
        >
          <span>Bus No: {clgNo}</span>
        </div>
      </div>
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
        }}
      >
        <div>
          
         
          <div
            style={{
              ...styles.statusBar,
              fontSize: "14px",
              padding: "0rem 0.5rem",
              
            }}
          >
            Last location Updated:{" "}
            <strong style={{ color: getStatusColor() }}>
              {timeSinceLastUpdate}
              
            </strong>
            
            
          </div>   
        </div>
      </div>
      
      
      {/* Header */}
      <div style={{ height: "75%" }}>
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
            }}
          >
            Satellite View
          </button>
        </div>
        <MapContainer
          ref={mapRef}
          center={[loc.lat, loc.long]}
          zoom={20}
          style={{ height: "100%", width: "100%" }}
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

             {/* 5. Conditionally render the Polyline if path data exists */}
             {path.length > 0 && (
            <Polyline
           pathOptions={{ color: "blue", weight: 5, opacity: 0.8 }}
           positions={path}
            />
          )}

          <AnimatedMarker
            position={[loc.lat, loc.long]}
            icon={busDivIcon(clgNo)}
          >
            <Popup>
              <strong>Bus No:</strong> {clgNo}
              <br />
              <strong>Last Updated:</strong>{" "}
              {new Intl.DateTimeFormat("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Kolkata",
              }).format(new Date(loc.last))}
            </Popup>
          </AnimatedMarker>
          <ReloadControl onReload={fetchLocation} lastUpdateTimestamp={lastUpdateTimestamp} />
        </MapContainer>
      </div>
    </div>
  );
}


const styles = {
  statusBar: {
    textAlign: "left",
    color: "#444",
  },
  container: {
    fontFamily: "Segoe UI, sans-serif",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    height: "100dvh",
    background: "#f5f7f9ff",
    padding: "0.5rem",
  },
  backButton: {
    alignSelf: "flex-start",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "#e5e7eb",
    border: "none",
    padding: "6px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "10px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "600",
    color: "#1E40AF",
  },
  centered: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    height: "100dvh",
    fontSize: "18px",
    color: "#666",
  },
};