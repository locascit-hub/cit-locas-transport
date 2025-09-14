import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  LayerGroup,
} from "react-leaflet";
import { FiArrowLeft } from "react-icons/fi";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/routedetailscreen.css";
import getEndpoint from "../utils/loadbalancer";
import { UserContext } from "../contexts";

// Fix default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Animated marker (smooth bus move)
function AnimatedMarker({ position, icon, children }) {
  const markerRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!markerRef.current) return;

    const marker = markerRef.current;
    const from = marker.getLatLng();
    const to = L.latLng(position);

    if (!from || !to || from.equals(to)) return;

    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const duration = 3000;
    let start = null;

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);

      const lat = from.lat + (to.lat - from.lat) * progress;
      const lon = from.lon + (to.lon - from.lon) * progress;
      marker.setLatLng([lat, lon]);

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
    <Marker ref={markerRef} position={position} icon={icon}>
      {children}
    </Marker>
  );
}

export default function RouteDetailScreen() {
  const navigate = useNavigate();
  const {clgNo } = useParams();
  const [loc, setLoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = useContext(UserContext);
  const mapRef = useRef(null);

  // Center map when location updates
  useEffect(() => {
    if (mapRef.current && loc?.lat && loc?.lon) {
      mapRef.current.panTo([loc.lat, loc.lon]);
    }
  }, [loc]);

  useEffect(() => {
    if (!token) navigate("/");

    const fetchLatest = async () => {
      try {
        const res = await fetch(`${getEndpoint()}/get-location/obu/${clgNo}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          setLoc(data);
        }
      } catch (err) {
        console.error("Initial fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatest();
  }, [token, navigate, clgNo]);


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

  if (loading) return <div style={styles.centered}>Loading live location...</div>;
  if (!loc) return <div style={styles.centered}>⚠ Live location not available yet.</div>;

  return (
    <div style={styles.container}>
      {/* Back Button */}
      <div style={{ display: "flex", flexDirection: "row", marginBottom: "2px" }}>
        <button style={styles.backButton} onClick={() => navigate("/search")}>
          <FiArrowLeft size={20} />
        </button>
        <div style={{ width: "70%", textAlign: "center", ...styles.title }}>
          <span>Bus No: {clgNo}</span>
        </div>
      </div>

      {/* Map */}
      <div style={{ height: "85%" }}>
        <MapContainer
          ref={mapRef}
          center={[loc.lat, loc.lon]}
          zoom={17}
          style={{ height: "100%", width: "100%" }}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Street View">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="Satellite View">
              <LayerGroup>
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Tiles &copy; Esri"
                />
                <TileLayer
                  url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  attribution="© OpenStreetMap contributors"
                />
              </LayerGroup>
            </LayersControl.BaseLayer>
          </LayersControl>

          <AnimatedMarker position={[loc.lat, loc.lon]} icon={busDivIcon(clgNo)}>
            <Popup>
              <strong>Bus No:</strong> {clgNo}
              <br />
              <strong>Last Updated:</strong>{" "}
              {new Date(loc.last).toLocaleTimeString()}
            </Popup>
          </AnimatedMarker>
        </MapContainer>
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "Segoe UI, sans-serif",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#f5f7f9ff",
    padding: "0.5rem",
  },
  backButton: {
    background: "#e5e7eb",
    border: "none",
    padding: "6px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    marginRight: "10px",
  },
  title: {
    fontSize: "22px",
    fontWeight: "600",
    color: "#1E40AF",
  },
  centered: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    fontSize: "18px",
    color: "#666",
  },
};
