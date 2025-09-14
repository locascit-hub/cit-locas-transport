

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTruck, FiUsers, FiMapPin, FiSearch, FiBell } from "react-icons/fi";
import "../styles/homescreen.css";
import { getRecentBuses } from '../utils/recentBuses';

export default function HomeScreen() {
  const navigate = useNavigate();
  const [recent, setRecent] = useState([]);

  // refs for scrollers
  const recentRef = useRef(null);

  useEffect(() => {
    const storedUserData = localStorage.getItem("test");
    if (!storedUserData) {
      navigate("/");
      return;
    }

    // load recent searches
    setRecent(getRecentBuses());

    // listen to storage changes from other tabs/windows
    const onStorage = (e) => {
      if (e.key === 'recentBuses') setRecent(getRecentBuses());
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pointer/touch drag handlers
  useEffect(() => {
    function setupDrag(scroller) {
      if (!scroller) return () => {};
      let isDown = false;
      let startX = 0;
      let startScrollLeft = 0;

      const onPointerDown = (e) => {
        isDown = true;
        scroller.setPointerCapture?.(e.pointerId);
        startX = e.clientX;
        startScrollLeft = scroller.scrollLeft;
        scroller.style.cursor = "grabbing";
        e.preventDefault();
      };

      const onPointerMove = (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.clientX;
        const walk = x - startX;
        scroller.scrollLeft = startScrollLeft - walk;
      };

      const endDrag = (e) => {
        if (!isDown) return;
        isDown = false;
        try { scroller.releasePointerCapture?.(e.pointerId); } catch (err) {}
        scroller.style.cursor = "grab";
      };

      scroller.addEventListener("pointerdown", onPointerDown);
      scroller.addEventListener("pointermove", onPointerMove);
      scroller.addEventListener("pointerup", endDrag);
      scroller.addEventListener("pointercancel", endDrag);
      scroller.addEventListener("pointerleave", endDrag);

      scroller.style.webkitOverflowScrolling = "touch";
      scroller.style.touchAction = "none";
      scroller.style.overflowX = "auto";
      scroller.style.overflowY = "hidden";

      return () => {
        scroller.removeEventListener("pointerdown", onPointerDown);
        scroller.removeEventListener("pointermove", onPointerMove);
        scroller.removeEventListener("pointerup", endDrag);
        scroller.removeEventListener("pointercancel", endDrag);
        scroller.removeEventListener("pointerleave", endDrag);
      };
    }

    const cleanup = setupDrag(recentRef.current);

    return () => {
      cleanup();
    };
  }, [recent.length]);

  function getLocationFromBus(bus) {
    const stops = bus.stops;
    if (Array.isArray(stops) && stops.length > 0) return stops[0];
    if (typeof stops === "string" && stops.trim().length > 0) {
      try {
        const parsed = JSON.parse(stops);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      } catch {}
      return stops.split(",")[0].trim();
    }
    return bus.route || bus.obu_id || bus.regnNumber || "—";
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <p style={styles.greeting}>Hello Everyone!</p>
          <p style={styles.welcomeText}>Welcome to CIT Transport</p>
          <div style={styles.statsContainer}>
            <div style={styles.statItem}>
              <FiTruck size={24} color="#FFFFFF" />
              <p style={styles.statNumber}>91</p>
              <p style={styles.statLabel}>Active Buses</p>
            </div>
            <div style={styles.statItem}>
              <FiUsers size={24} color="#FFFFFF" />
              <p style={styles.statNumber}>4000</p>
              <p style={styles.statLabel}>Students</p>
            </div>
            <div style={styles.statItem}>
              <FiMapPin size={24} color="#cfababff" />
              <p style={styles.statNumber}>65</p>
              <p style={styles.statLabel}>Numbered</p>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        {/* Recently searched section */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={styles.sectionTitle}>Recently searched</h2>
          {recent.length === 0 ? (
            <p style={{ color: '#6B7280' }}>No recent searches yet. </p>
          ) : (
            <div ref={recentRef} style={{ ...styles.busRowScrollerSingle, marginBottom: 12 }}>
              <div style={styles.busRowInnerSingle}>
                {recent.map((bus) => {
                  const id = bus.vi || bus.regnNumber || bus._id || bus.obu_id || 'UNKNOWN';
                  const location = getLocationFromBus(bus);
                  return (
                    <div 
                      key={id} 
                      style={{ ...styles.busCardHorizontal, minWidth: 180 }} 
                      onClick={() => navigate(`/route-detail/${bus.clgNo}`)}
                    >
                      <div>
                        <h4 style={{ margin: 0, fontSize: 14 }}>{id}</h4>
                        <p style={{ margin: '4px 0', color: '#6B7280' }}>{bus.route || 'Route'}</p>
                        <p style={{ margin: '4px 0', color: '#374151', fontWeight: 600 }}>CLG: {bus.clgNo ?? '—'}</p>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <FiMapPin size={14} color="#6B7280" />
                          <p style={{ ...styles.busDetailText, margin: 0 }}>{location}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={styles.quickActions}>
          <h2 style={styles.sectionTitle}>Quick Actions</h2>
          <div style={styles.actionGrid}>
            <div className="action-card" style={styles.actionCard} onClick={() => navigate("/search") }>
              <FiSearch size={32} color="#2563EB" />
              <p style={styles.actionText}>Search Bus</p>
            </div>
            <div className="action-card" style={styles.actionCard} onClick={() => navigate("/tracking") }>
              <FiMapPin size={32} color="#059669" />
              <p style={styles.actionText}>Live Tracking</p>
            </div>
            <div style={styles.notificationWrapper}>
              <div className="action-card" style={{ ...styles.actionCard, ...styles.actionCardFixedWidth }} onClick={() => navigate("/notifications") }>
                <FiBell size={32} color="#7C3AED" />
                <p style={styles.actionText}>Notifications</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* styles */
const styles = {
  container: { height: "100vh", overflowY: "auto", backgroundColor: "#F9FAFB", paddingBottom: 30 },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingLeft: 20,
    paddingRight: 20,
    background: "linear-gradient(to bottom, #2563EB, #1E40AF)",
    position: "relative",
  },
  headerContent: { display: "flex", flexDirection: "column", alignItems: "center" },
  greeting: { fontSize: 20, fontFamily: "Inter", fontWeight: "500", color: "#FFFFFF", marginBottom: 4 },
  welcomeText: { fontSize: 16, fontFamily: "Inter", fontWeight: "400", color: "rgba(255,255,255,0.8)", marginBottom: 30 },
  statsContainer: { display: "flex", flexDirection: "row", justifyContent: "space-around", width: "100%" },
  statItem: { display: "flex", flexDirection: "column", alignItems: "center" },
  statNumber: { fontSize: 24, fontFamily: "Inter", fontWeight: "700", color: "#ffffffff", marginTop: 8 },
  statLabel: { fontSize: 12, fontFamily: "Inter", fontWeight: "400", color: "rgba(255, 255, 255, 0.8)", marginTop: 4 },
  content: { padding: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter", fontWeight: "600", color: "#1F2937", marginBottom: 16 },

  /* single scroller styles */
  busRowScrollerSingle: {
    display: "block",
    overflowX: "auto",
    overflowY: "hidden",
    WebkitOverflowScrolling: "touch",
    paddingBottom: 8,
  },
  busRowInnerSingle: {
    display: "flex",
    gap: 12,
    padding: "8px 4px",
  },

  busCardHorizontal: {
    minWidth: 220,
    maxWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },

  busCard: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 12 },
  busCardHeader: { display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  busInfo: { flex: 1 },
  busId: { fontSize: 16, fontFamily: "Inter", fontWeight: "600", color: "#1F2937" },
  busRoute: { fontSize: 14, fontFamily: "Inter", fontWeight: "400", color: "#6B7280", marginTop: 2 },
  statusBadge: { paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4, borderRadius: 20 },
  statusOnTime: { backgroundColor: "#D1FAE5" },
  statusDelayed: { backgroundColor: "#FEE2E2" },
  statusText: { fontSize: 12, fontFamily: "Inter", fontWeight: "500" },
  statusTextOnTime: { color: "#059669" },
  statusTextDelayed: { color: "#DC2626" },
  busCardDetails: { display: "flex", flexDirection: "row", justifyContent: "space-between" },
  busDetail: { display: "flex", flexDirection: "row", alignItems: "center" },
  busDetailText: { fontSize: 14, fontFamily: "Inter", fontWeight: "400", color: "#6B7280", marginLeft: 6 },

  quickActions: { marginBottom: 20 },
  actionGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginTop: "16px", alignItems: "start" },
  actionCard: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", cursor: "pointer" },
  actionCardFixedWidth: { width: "calc(50% - 10px)" },
  actionText: { fontSize: 14, fontFamily: "Inter", fontWeight: "500", color: "#1F2937", marginTop: 8 },
  notificationWrapper: { gridColumn: "1 / -1", display: "flex", justifyContent: "center", alignItems: "center" },

  /* bottom-right profile button */
  profileButtonBottom: {
    position: 'fixed',
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 16,
    border: 'none',
    background: '#2563EB',
    boxShadow: '0 6px 12px rgba(37,99,235,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 999
  }
};