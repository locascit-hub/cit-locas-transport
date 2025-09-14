// src/pages/ProfileScreen.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../contexts';
import getEndpoint from '../utils/loadbalancer';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
  </svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

// --- 1. NEW SVG ICON ADDED ---
const MyLocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" />
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
  </svg>
);

// --- 2. NEW COMPONENT FOR THE BUTTON ---
function CurrentLocationButton({ setPinnedLocation }) {
  const map = useMap();

  const handleClick = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = { lat: latitude, lng: longitude };
        setPinnedLocation(newPos);
        map.flyTo([latitude, longitude], 17); // Fly to new location with a closer zoom
      },
      (error) => {
        alert(`Could not get your location: ${error.message}. Please enable location services in your browser.`);
        console.warn("Geolocation error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  return (
    <button onClick={handleClick} className="current-location-btn" title="Go to my location" type="button">
      <MyLocationIcon />
    </button>
  );
}

export default function ProfileScreen({ userData: propUserData, logoutPurge }) {
  const navigate = useNavigate();
  const { token, userData: ctxUserData, role, setRole, setToken, setSno } = useContext(UserContext);

  const userData = propUserData || ctxUserData;
  const [shareLink, setShareLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [scheduleLink, setScheduleLink] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [clgNo, setclgNo] = useState('');
  const [busSaving, setBusSaving] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([12.98, 80.22]); // Default center (e.g., Chennai)
  const [locationSaving, setLocationSaving] = useState(false);
  const [isLocationSavingDisabled, setIsLocationSavingDisabled] = useState(false);
   const [userBusNo, setUserBusNo] = useState('');
   const [isEditMode, setIsEditMode] = useState(false);
   const location = useLocation();
const mapSectionRef = React.useRef(null);

  useEffect(() => {
    if (!token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  useEffect(() => {
  if (location.state?.redirectToMap && mapSectionRef.current) {
    // Scroll smoothly to map section
    mapSectionRef.current.scrollIntoView({ behavior: "smooth" });
  }
}, [location]);

  useEffect(() => {
    const checkTimeForDisable = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentTimeInMinutes = hours * 60 + minutes;

      const startTimeInMinutes = 5 * 60 + 45; // 5:45 AM
      const endTimeInMinutes = 8 * 60; // 8:00 AM

      if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes) {
        setIsLocationSavingDisabled(true);
      } else {
        setIsLocationSavingDisabled(false);
      }
    };
    
    checkTimeForDisable();
    const timerId = setInterval(checkTimeForDisable, 60000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    const savedLocation = localStorage.getItem('user_pinned_location');
    if (savedLocation) {
      try {
        const parsedLocation = JSON.parse(savedLocation);
        setPinnedLocation(parsedLocation);
        setMapCenter([parsedLocation.lat, parsedLocation.lng]);
        return;
      } catch (e) {
        console.error("Could not parse saved location from localStorage.");
      }
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const currentLocation = { lat: latitude, lng: longitude };
        setPinnedLocation(currentLocation);
        setMapCenter([latitude, longitude]);
      },
      (error) => {
        console.warn("Geolocation permission denied or failed:", error.message);
      }
    );
  }, []);

  const parseEmail = (email) => {
    if (!email) return { name: '', dept: '', batch: '' };
    const [beforeAt] = email.split('@');
    const [name, deptBatch] = (beforeAt || '').split('.');
    const dept = (deptBatch && deptBatch.slice(0, 4).toUpperCase()) || '';
    const year = deptBatch ? parseInt(deptBatch.slice(4, 8), 10) : NaN;
    const batch = !isNaN(year) ? `${year}-${year + 4}` : '';
    const formattedName = name ? (name.charAt(0).toUpperCase() + name.slice(1)) : '';
    return { name: formattedName, dept, batch };
  };

  const logOut = () => {
    logoutPurge('notifications-db');
    localStorage.clear();
    window.location.reload();
  };

  const saveBusNo = async () => {
    if (!clgNo.trim()) return;
    if (!userData?.email) {
      alert('User email not available.');
      return;
    }
    setBusSaving(true);
    try {
      localStorage.setItem('user_bus_no', clgNo.trim());
      const activeToken = token || localStorage.getItem('test');
      const resp = await fetch(`${getEndpoint()}/api/save-busno`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ id: userData.email, clgNo: clgNo.trim() }),
      });
      const result = await resp.json().catch(() => ({ error: resp.statusText }));
      if (resp.ok) {
        alert('Bus number updated successfully ✅');
        setUserBusNo(clgNo.trim());
        setclgNo('');
      } else {
        alert('Failed to save bus number: ' + (result.error || resp.statusText));
      }
    } catch (err) {
      console.error('Error saving bus number:', err);
      alert('Something went wrong while saving bus number.');
    } finally {
      setBusSaving(false);
    }
  };

  const saveShareLink = async () => {
    if (!shareLink.trim()) return;
    if (!userData?.email) {
      alert('User email not available.');
      return;
    }
    setSaving(true);
    try {
      const activeToken = token || localStorage.getItem('test');
      const resp = await fetch(`${getEndpoint()}/api/save-sharelink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ shareLink: shareLink.trim(), inchargeEmail: userData.email }),
      });
      const result = await resp.json().catch(() => ({ error: resp.statusText }));
      if (resp.status === 404) {
        alert('Resource not found: ' + (result.error || resp.statusText) + '. Please contact admin.');
        return;
      }
      if (resp.ok) {
        alert('Share link updated successfully ✅');
        setShareLink('');
      } else {
        alert('Failed to save share link: ' + (result.error || resp.statusText));
      }
    } catch (err) {
      console.error('Error saving share link:', err);
      alert('Something went wrong while saving.');
    } finally {
      setSaving(false);
    }
  };

  const saveScheduleLink = async () => {
    if (!scheduleLink.trim()) return;
    if (!userData?.email) {
      alert('User email not available.');
      return;
    }
    setScheduleSaving(true);
    try {
      const activeToken = token || localStorage.getItem('test');
      const resp = await fetch(`${getEndpoint()}/api/save-schedulelink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ scheduleLink: scheduleLink.trim(), inchargeEmail: userData.email }),
      });
      const result = await resp.json().catch(() => ({ error: resp.statusText }));
      if (resp.status === 404) {
        alert('Resource not found: ' + (result.error || resp.statusText) + '. Please contact admin.');
        return;
      }
      if (resp.ok) {
        alert('Schedule link saved and route table replacement initiated ✅');
        setScheduleLink('');
      } else {
        alert('Failed to save schedule link: ' + (result.error || resp.statusText));
      }
    } catch (err) {
      console.error('Error saving schedule link:', err);
      alert('Something went wrong while saving the schedule link.');
    } finally {
      setScheduleSaving(false);
    }
  };

  const saveUserLocation = async () => {
    if (isLocationSavingDisabled) {
      alert("Location saving is disabled between 5:45 AM and 8:00 AM.");
      return;
    }
    if (!pinnedLocation) {
      alert('Please select a location on the map first.');
      return;
    }
    if (!userData?.email) {
      alert('User email is not available to save location.');
      return;
    }
    setLocationSaving(true);
    try {
      localStorage.setItem('user_pinned_location', JSON.stringify(pinnedLocation));
    } catch (e) {
      console.error("Failed to save location to localStorage", e);
      alert("Could not save location locally. Please check your browser settings.");
    }
    try {
      const activeToken = token || localStorage.getItem('test');
      const resp = await fetch(`${getEndpoint()}/api/save-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          email: userData.email,
          latitude: pinnedLocation.lat,
          longitude: pinnedLocation.lng,
        }),
      });
      const result = await resp.json().catch(() => ({ error: resp.statusText }));
      if (resp.ok) {
        alert('Your location has been saved successfully! ✅');
      } else {
        alert('Failed to save location to server: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error saving user location:', err);
      alert('An error occurred while saving your location.');
    } finally {
      setLocationSaving(false);
    }
  };

  function LocationPicker() {
    const map = useMapEvents({
      click(e) {
        setPinnedLocation(e.latlng);
        map.flyTo(e.latlng, map.getZoom());
      },
    });
    return null;
  }

  if (!userData) return null;
  const { name, dept, batch } = parseEmail(userData.email);
  const userInitial = name ? name.charAt(0).toUpperCase() : 'S';
  const shownRole = role || userData?.role || 'student';

  return (
    <>
      <style>{`
        :root {
          --primary-blue: #1E40AF;
          --light-blue: #3B82F6;
          --background-color: #F3F4F6;
          --card-background: #FFFFFF;
          --text-primary: #1F2937;
          --text-secondary: #6B7280;
          --border-color: #E5E7EB;
        }
        .profile-screen {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          min-height: 100dvh;
          background-color: var(--background-color);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        .profile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background-color: var(--card-background);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .profile-header-title { margin: 0; font-size: 1.25rem; font-weight: 600; color: var(--text-primary); }
        .notification-btn { background: none; border: none; cursor: pointer; color: var(--text-secondary); padding: 0.5rem; border-radius: 50%; }
        .profile-content {
          flex-grow: 1;
          padding: 1.5rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .profile-banner {
          background: linear-gradient(135deg, var(--primary-blue), var(--light-blue));
          color: white;
          padding: 1.75rem 1.25rem;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 8px 16px rgba(0,0,0,0.08);
        }
        .profile-avatar {
          width: 100px; height: 100px; border-radius: 50%; border: 4px solid white;
          margin: 0 auto 0.75rem auto; display: inline-flex; align-items: center; justify-content: center;
          font-size: 2rem; font-weight: 700; background: #E0E0E0; color: #333;
        }
        .profile-greeting { margin: 0 0 6px 0; font-size: 1.25rem; font-weight: 700; }
        .profile-email { margin: 0; font-size: 0.95rem; opacity: 0.9; }
        .profile-details-card { background: var(--card-background); border-radius: 12px; padding: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .detail-item { display: flex; justify-content: space-between; align-items: left; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); }
        .detail-item:last-child { border-bottom: none; }
        .detail-label { font-size: 0.95rem; color: var(--text-secondary); }
        .detail-value { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); }
        .logout-btn { width: 100%; margin-top: 0.75rem; padding: 0.7rem; font-size: 1rem; font-weight: 600; color: white; background-color: var(--primary-blue); border: none; border-radius: 10px; cursor: pointer; }
        .logout-btn:hover { opacity: 0.95; transform: translateY(-1px); }
        .sharelink-box { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
        .sharelink-box input { flex: 1; padding: 0.6rem; border-radius: 8px; border: 1px solid #d1d5db; font-size: 0.95rem; }
        .sharelink-box button { padding: 0.6rem 0.9rem; border-radius: 8px; border: none; background: var(--primary-blue); color: #fff; cursor: pointer; }
        .sharelink-box button:disabled { background: #9ca3af; cursor: not-allowed; }
        .leaflet-container {
            border-radius: 12px;
        }
        .map-tooltip {
            position: relative;
            display: inline-block;
            cursor: help;
        }
        .map-tooltip-icon {
          background-color: rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          color: #333;
        }
        .map-tooltip-text {
          visibility: hidden;
          width: 220px;
          background-color: #333;
          color: #fff;
          text-align: center;
          border-radius: 6px;
          padding: 8px;
          position: absolute;
          z-index: 1;
          bottom: 150%;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0;
          transition: opacity 0.3s;
          font-size: 0.85rem;
        }
        .map-tooltip:hover .map-tooltip-text {
          visibility: visible;
          opacity: 1;
        }
        
        /* --- 3. NEW CSS FOR THE BUTTON --- */
        .current-location-btn {
            position: absolute;
            top: 80px; /* Position below the zoom controls */
            left: 10px;
            z-index: 401; /* Make sure it's above map tiles */
            background: white;
            border: 2px solid rgba(0,0,0,0.2);
            border-radius: 4px;
            width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 1px 5px rgba(0,0,0,0.4);
        }
        .current-location-btn:hover {
            background-color: #f4f4f4;
        }
            @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.2;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
        
        .pulsing-circle-overlay {
            stroke: none; /* Hide the stroke of the animated circle */
            animation: pulse 2.5s ease-out infinite;
            transform-origin: center; /* Ensure scaling happens from the center */
        }
            .edit-location-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--primary-blue);
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 8px;
        }
        .edit-location-btn:hover {
          background-color: rgba(30, 64, 175, 0.1);
        }
          .map-container-wrapper {
          position: relative;
        }

        .map-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(243, 244, 246, 0.7);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 400; /* Above the map, below the controls */
          border-radius: 12px;
          cursor: not-allowed;
          transition: opacity 0.3s ease-in-out;
        }
        .map-overlay-content {
          text-align: center;
          color: var(--text-secondary);
          padding: 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
        }
      `}</style>
      <div className="profile-screen">
        <header className="profile-header">
          <h2 className="profile-header-title">My Profile</h2>
          <button className="notification-btn" onClick={() => navigate('/notifications')} aria-label="Notifications">
            <BellIcon />
          </button>
        </header>
        <main className="profile-content">
          <section className="profile-banner">
            <div className="profile-avatar" aria-hidden>{userInitial}</div>
            <h3 className="profile-greeting">Hello, {name || 'Student'}!</h3>
            <p className="profile-email">{userData.email}</p>
          </section>
          
          

          <section className="profile-details-card" aria-labelledby="profile-details">
            <div className="detail-item">
              <span className="detail-label">Department</span>
              <span className="detail-value">{dept || 'Not Available'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Batch</span>
              <span className="detail-value">{batch || 'Not Available'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Role</span>
              <span className="detail-value">{shownRole}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Bus No</span>
               <span className="detail-value">{userBusNo || 'Not Set'}</span>
            </div>
            <div className="detail-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <span className="detail-label">Bus Number</span>
              <div className="sharelink-box" style={{ width: '100%', marginTop: '6px' }}>
                <input
                  aria-label="Bus number"
                  type="text"
                  placeholder="Enter your bus number..."
                  value={clgNo}
                  onChange={(e) => setclgNo(e.target.value)}
                />
                <button type="button" onClick={saveBusNo} disabled={busSaving}>
                  {busSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            {shownRole === 'incincharge@cit@chennai@0409harge' && (
              <div style={{ marginTop: 12 }}>
                <div className="sharelink-box">
                  <input aria-label="Share link" type="text" placeholder="Enter new share link..." value={shareLink} onChange={(e) => setShareLink(e.target.value)} />
                  <button type="button" onClick={saveShareLink} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
                <div className="sharelink-box">
                  <input aria-label="Schedule link" type="text" placeholder="Enter new schedule link (will replace route table)..." value={scheduleLink} onChange={(e) => setScheduleLink(e.target.value)} />
                  <button type="button" onClick={saveScheduleLink} disabled={scheduleSaving}>{scheduleSaving ? 'Saving...' : 'Save'}</button>
                </div>
              </div>
            )}
          </section>
        <div ref={mapSectionRef}>
          <section className="profile-details-card" aria-labelledby="location-picker-heading">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
              <h3 id="location-picker-heading" style={{ margin: '0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Set Your bording point
              </h3>
              <div className="map-tooltip">
                <div className="map-tooltip-icon">
                  <InfoIcon />
                </div>
                <span className="map-tooltip-text">
                  This map is for setting your pickup point. You'll be notified when the bus is 1km away from your location.
                </span>
              </div>
              <button 
                className="edit-location-btn" 
                onClick={() => setIsEditMode(!isEditMode)}
                aria-label={isEditMode ? "Cancel Editing" : "Edit Location"}
              >
                <EditIcon />
                {isEditMode ? 'Cancel' : 'Edit'}
              </button>
            </div>

            <p style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}> Get notified when bus is within <strong>1km</strong></p>
            <div id="map-container" style={{ position: 'relative', height: '250px', width: '100%', marginBottom: '1rem' }}>
              <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationPicker isEditMode={isEditMode} setPinnedLocation={setPinnedLocation} />
                {pinnedLocation && (
      <>
        <Marker position={pinnedLocation}></Marker>
        {/* --- 5. RENDER THE 1KM RADIUS CIRCLE AND ANIMATION --- */}
        <Circle
          center={pinnedLocation}
          radius={1000} // Radius is in meters, so 1000m = 1km
          pathOptions={{ color: '#1E40AF', fillColor: '#3B82F6', fillOpacity: 0.2, weight: 2 }}
        />
      </>
    )}
                <CurrentLocationButton setPinnedLocation={setPinnedLocation} />
              </MapContainer>
              {!isEditMode && (
                <div className="map-overlay">
                  <div className="map-overlay-content">
                    <p>Click "Edit" to change your pickup location.</p>
                  </div>
                </div>
              )}
            </div>
            <button
              className="logout-btn"
              style={{ backgroundColor: 'var(--primary-blue)', marginTop: '0' }}
              onClick={isEditMode ? saveUserLocation : () => setIsEditMode(true)}
              disabled={isLocationSavingDisabled || (isEditMode && (!pinnedLocation || locationSaving))}
            >
              {isEditMode
                ? (locationSaving ? 'Saving Location...' : 'Confirm My Location')
                : 'Edit Location'
              }
            </button>
          </section>
          </div>
          <button className="logout-btn" onClick={logOut} aria-label="Logout"><LogoutIcon /> Logout</button>
          <footer>
            <center>Made by <b>Team Locas-CIT</b></center>
          </footer>
        </main>
      </div>
    </>
  );
}