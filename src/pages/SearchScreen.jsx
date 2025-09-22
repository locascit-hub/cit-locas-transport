// src/pages/SearchScreen.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch,
  FiAlertTriangle,
  FiX,
  FiMapPin,
  FiUsers,
  FiUser,
  FiMap
} from 'react-icons/fi';
import getEndpoint from '../utils/loadbalancer';
import { UserContext } from '../contexts';
import { addRecentBus } from '../utils/recentBuses';
import getTrackPageURL from '../utils/trackpagebalancer';

export default function SearchScreen() {
  const navigate = useNavigate();
  const { token, role } = useContext(UserContext); // use context for auth & role

  // redirect to root when not authenticated
  useEffect(() => {
    if (!token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a bus number to search');
      return;
    }

    setIsSearching(true);
    try {
      const resp = await fetch(
        `${getEndpoint()}/api/buses?q=${encodeURIComponent(searchQuery)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}), 
          },
        }
      );

      if(resp.status === 404) {
      window.location.reload();
      return;
      }

      if (!resp.ok) {
        // try to read message if available
        let errText = `Server responded with ${resp.status}`;
        try {
          const errBody = await resp.json();
          if (errBody && errBody.error) errText = errBody.error;
        } catch (_) {}
        throw new Error(errText);
      }
      const data = await resp.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (e) {
      alert(`Network error: ${e.message}`);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };
  const handleViewBus = (bus) => {
  // Save to Recently Viewed (MRU, dedup, capped at 3)
  addRecentBus(bus);

  // Navigate as you already do
  window.location.href = getTrackPageURL(bus.clgNo);
};

const handleViewSchedule = (bus) => {
  // Navigate to Schedule screen
  navigate('/tracking', {
    state: { bus }, // pass the whole bus object if you need inside ScheduleScreen
  });
};
  const onKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        
        <h1 style={styles.title}>Search Buses</h1>
        <p style={styles.subtitle}>Find bus routes and schedules</p>
      </div>

      <div style={styles.searchContainer}>
        <div style={styles.searchInputContainer}>
          <FiSearch size={20} color="#6B7280" />
          <input
            style={styles.searchInput}
            type="text"
            placeholder="Enter a Bus Number (e.g., 20)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery.length > 0 && (
            <button style={styles.clearButton} onClick={clearSearch}>
              <FiX size={24} color="#9CA3AF" />
            </button>
          )}
        </div>
        <button
          style={styles.searchButton}
          onClick={handleSearch}
          disabled={isSearching}
        >
          <span style={styles.searchButtonText}>
            {isSearching ? 'Searching...' : 'Search'}
          </span>
        </button>
      </div>

      <div style={styles.resultsContainer}>
        {isSearching && (
          <div style={styles.spinner}>
            <div style={{ ...styles.dot, animationDelay: '-0.32s' }}></div>
            <div style={{ ...styles.dot, animationDelay: '-0.16s' }}></div>
            <div style={styles.dot}></div>
          </div>
        )}

        {!isSearching && searchResults.length > 0 ? (
          <>
            <h2 style={styles.resultsTitle}>
              Search Results ({searchResults.length})
            </h2>
            {searchResults.map((bus) => (
              <div key={bus.regnNumber} style={styles.busCard}>
                <div style={styles.busHeader}>
                  <div style={styles.busInfo}>
                    <h3 style={styles.busId}>{bus.regnNumber}</h3>
                    <p style={styles.busRoute}>{bus.route}</p>
                  </div>
                <button
  style={styles.trackButton}
  onClick={() => handleViewBus(bus)}
>
  <FiMap size={16} color="#FFFFFF" />
  <span style={styles.trackButtonText}>Track Now</span>
</button>
                </div>

                <div style={styles.busDetails}>
                  <div style={styles.detailRow}>
                    <FiMapPin size={16} color="#6B7280" />
                    <p style={styles.detailText}>
                      Current: {bus.currentLocation ?? '---'}
                    </p>
                  </div>
                  <div style={styles.detailRow}>
                    <FiUsers size={16} color="#6B7280" />
                    <p style={styles.detailText}>
                      RouteNo: {bus.clgNo ?? '---'}
                    </p>
                  </div>
                  <div style={styles.detailRow}>
                    <FiUser size={16} color="#6B7280" />
                    <p style={styles.detailText}>
                      Driver: {bus.driver ?? '---'}
                    </p>
                  </div>
                </div>

                <div style={styles.routeSection}>
                  <h4 style={styles.routeTitle}>Route Stops:</h4>
                  <div style={styles.stopsContainer}>
                    {Array.isArray(bus.stops) &&
                      bus.stops.map((stop, index) => (
                        <div key={index} style={styles.stopItem}>
                          <div
                            style={
                              stop === bus.currentLocation
                                ? styles.currentStopDot
                                : styles.stopDot
                            }
                          />
                          <p
                            style={
                              stop === bus.currentLocation
                                ? styles.currentStopText
                                : styles.stopText
                            }
                          >
                            {stop}
                          </p>
                          <span style={styles.stopTime}>
                            {bus.schedule?.[index] ?? '--:--'}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                
              </div>
            ))}
          </>
        ) : !isSearching && searchQuery.length > 0 ? (
          <div style={styles.noResults}>
            <FiAlertTriangle size={48} color="#9CA3AF" />
            <p style={styles.noResultsText}>No buses found</p>
            <p style={styles.noResultsSubtext}>
              Try searching with a different bus number
            </p>
          </div>
        ) : (
          <div style={styles.searchPrompt}>
            <FiSearch size={48} color="#9CA3AF" />
            <p style={styles.promptText}>Search for buses</p>
            <p style={styles.promptSubtext}>
              Enter a bus number to see routes and schedules
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Styles object
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    height: '100dvh',
    backgroundColor: '#F9FAFB',
    overflowY: 'auto',
    paddingBottom: 30,
  },

  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingLeft: 20,
    paddingBottom: 20,
    borderBottom: '1px solid #E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1F2937',
    margin: 0,
    marginBottom: 4,
    alignSelf: 'center',
    textAlign: 'left',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 400,
    color: '#6B7280',
    margin: 0,
    alignSelf: 'center',
    textAlign: 'left',
    marginTop: 10,
  },
  searchContainer: { padding: 20, backgroundColor: '#FFFFFF' },
  searchInputContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: '0 16px',
    marginBottom: 12,
    border: '1px solid #E5E7EB',
  },
  searchInput: {
    flex: 1,
    padding: '12px',
    fontSize: 16,
    color: '#1F2937',
    border: 'none',
    outline: 'none',
  },
  clearButton: {
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    padding: '0 8px',
  },
  searchButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: '12px',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: 600,
    color: '#FFFFFF',
  },
  resultsContainer: { padding: 20, flex: 1 },
  spinner: { display: 'flex', justifyContent: 'center', padding: 20 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: '#2563EB',
    margin: 5,
    animation: 'bounce 1s infinite ease-in-out',
  },
  resultsTitle: { fontSize: 18, fontWeight: 600, color: '#1F2937', marginBottom: 16 },
  busCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    boxShadow: '0 2px 3px rgba(0,0,0,0.1)',
  },
  busHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  busInfo: { flex: 1 },
  busId: { fontSize: 18, fontWeight: 700, color: '#1F2937', margin: 0 },
  busRoute: { fontSize: 16,fontWeight:500, color: '#050505ff', margin: '4px 0 0' },
  statusBadge: { padding: '6px 12px', borderRadius: 20 },
  statusOnTime: { backgroundColor: '#D1FAE5' },
  statusDelayed: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: 600 },
  statusTextOnTime: { color: '#059669' },
  statusTextDelayed: { color: '#DC2626' },
  busDetails: { marginBottom: 16 },
  detailRow: { display: 'flex', alignItems: 'center', marginBottom: 8 },
  detailText: { marginLeft: 8, fontSize: 14, color: '#6B7280' },
  routeSection: { marginBottom: 16 },
  routeTitle: { fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#1F2937' },
  stopsContainer: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16 },
  stopItem: { display: 'flex', alignItems: 'center', marginBottom: 12 },
  stopDot: { width: 8, height: 8, borderRadius: '50%', backgroundColor: '#D1D5DB', marginRight: 12 },
  currentStopDot: { backgroundColor: '#2563EB', width: 12, height: 12, borderRadius: '50%', marginRight: 12 },
  stopText: { flex: 1, fontSize: 14, color: '#6B7280' },
  currentStopText: { flex: 1, fontWeight: 600, color: '#2563EB' },
  stopTime: { fontSize: 12, color: '#9CA3AF' },
  trackButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
  },
  trackButtonText: { marginLeft: 8, fontSize: 16, fontWeight: 600, color: '#FFFFFF' },
  noResults: { textAlign: 'center', padding: '60px 0' },
  noResultsText: { fontSize: 18, fontWeight: 600, color: '#6B7280', margin: 0 },
  noResultsSubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  searchPrompt: { textAlign: 'center', padding: '80px 0' },
  promptText: { fontSize: 18, fontWeight: 600, color: '#6B7280', margin: 0 },
  promptSubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
};