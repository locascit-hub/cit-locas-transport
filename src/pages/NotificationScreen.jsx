import React, { useState, useEffect, useContext } from 'react';
import {
  FiBell,
  FiSend,
  FiAlertTriangle,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiImage,
  FiTrash,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../contexts';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import 'yet-another-react-lightbox/styles.css';
import getEndpoint from '../utils/loadbalancer';
import { openDB } from 'idb';

// ---------- IndexedDB Helper (No changes here) ----------
const DB_NAME = 'notifications-db';
const STORE_NAME = 'notifications';

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME, { keyPath: '_id' });
  },
});

const saveNotifications = async (notifs) => {
  const db = await dbPromise;
  const tx = db.transaction(STORE_NAME, "readwrite");
  notifs.forEach((notif) => tx.store.put(notif));
  await tx.done;
  const purgeTx = db.transaction(STORE_NAME, "readwrite");
  const all = await purgeTx.store.getAll();
  if (all.length > 30) {
    all.sort((a, b) => new Date(b.time) - new Date(a.time));
    const excess = all.slice(30);
    for (const old of excess) {
      await purgeTx.store.delete(old._id);
    }
  }
  await purgeTx.done;
};

const getAllNotifications = async () => {
  const db = await dbPromise;
  const all = await db.getAll(STORE_NAME);
  all.sort((a, b) => new Date(b.time) - new Date(a.time));
  return all;
};

const getNotificationById = async (id) => {
  const db = await dbPromise;
  return db.get(STORE_NAME, id);
};

const getLatestNotificationTime = async () => {
  const db = await dbPromise;
  const all = await db.getAll(STORE_NAME);
  if (all.length === 0) return 0;
  return Math.max(...all.map((n) => new Date(n.time).getTime()));
};


// ---------- NotificationScreen ----------
// MODIFICATION: Add unsubscribeUserFromPush to the props
export default function NotificationScreen({ subscribeUserToPush, unsubscribeUserFromPush }) {
  const { role, token } = useContext(UserContext);
  const { userData } = useContext(UserContext);
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [newNotification, setNewNotification] = useState({ title: "", description: "" });
  const [selectedImage, setSelectedImage] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [issub, setIssub] = useState(() => localStorage.getItem('notificationToggleState') === 'true');
  const [isPushSupported, setIsPushSupported] = useState(false);

  useEffect(() => {
    if (!userData) navigate('/');
  }, [userData, navigate]);
  
  useEffect(() => {
    localStorage.setItem('notificationToggleState', issub);
  }, [issub]);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.getSubscription();
        setIssub(!!subscription); 
      } catch (err) {
        console.error("Error checking subscription status:", err);
        setIssub(false);
      }
    };

    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsPushSupported(true);
      checkSubscriptionStatus();
    } else {
      setIsPushSupported(false);
    }
  }, []);

  // MODIFICATION: Updated handleToggleChange to handle both subscribing and unsubscribing
  const handleToggleChange = async () => {
    if (issub) {
      // --- Try to UNSUBSCRIBE ---
      try {
        await unsubscribeUserFromPush(token);
        setIssub(false);
        alert("Unsubscribed from notifications.");
      } catch (err) {
        console.error("Failed to unsubscribe user:", err);
        alert("Could not unsubscribe. Please try again.");
      }
    } else {
      // --- Try to SUBSCRIBE ---
      try {
        await subscribeUserToPush(userData?.email, token);
        setIssub(true);
        alert("Successfully subscribed to notifications!");
      } catch (err) {
        console.error("Failed to subscribe user:", err);
        setIssub(false);
        alert("Failed to subscribe. Please ensure you allow notification permissions in your browser.");
      }
    }
  };

  const fetchNotifications = async () => {
      setLoading(true);
    try {
      const storedNotifications = await getAllNotifications();
      setNotifications(storedNotifications);
      const latestTime = await getLatestNotificationTime();
      const res = await fetch(`${getEndpoint()}/api/notifications?after=${latestTime}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const newNotifs = await res.json();
      if (newNotifs.length > 0) {
        setNotifications((prev) => [...newNotifs, ...prev]);
        await saveNotifications(newNotifs);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (id) => {
    const db = await dbPromise;
    const notif = await db.get(STORE_NAME, id);
    if (notif) {
      notif.read = true;
      await db.put(STORE_NAME, notif);
    }
  };

  useEffect(() => {
    fetchNotifications();
    if ('serviceWorker' in navigator) {
      const handler = async (event) => {
        if (event.data?.type === 'NEW_NOTIFICATION') {
          fetchNotifications();
        }
      };
      navigator.serviceWorker.addEventListener('message', handler);
      return () => navigator.serviceWorker.removeEventListener('message', handler);
    }
  }, []);

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Are you sure you want to delete this notification?');
    if (!confirmed) return;

    try {
      const res = await fetch(`${getEndpoint()}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        alert('Deleted successfully');
      } else {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleImageSelect = (e) => {
    if (e.target.files?.[0]) setSelectedImage(e.target.files[0]);
  };

  const sendNotification = async () => {
    if (!newNotification.title.trim() || !newNotification.description.trim()) {
      alert('Please enter both title and description');
      return;
    }

    const formData = new FormData();
    formData.append('title', newNotification.title);
    formData.append('message', newNotification.description);
    formData.append('sender', 'Transport Incharge');
    formData.append('type', 'info');
    formData.append('targetStudentIds', 'all');
    if (selectedImage) formData.append('image', selectedImage);

    setLoading(true);
    try {
      const res = await fetch(`${getEndpoint()}/api/notifications`, {
        method: 'POST',
        body: formData,
        ...(token && { headers: { Authorization: `Bearer ${token}` } }),
      });
      const data = await res.json();
      if (data.success) {
        setNewNotification({ title: "", description: "" });
        setSelectedImage(null);
        setNotifications((prev) => [data.notif, ...prev]);
        await saveNotifications([data.notif]);
      }
      alert('Notification sent successfully');
    } catch (error) {
      alert('Error sending notification');
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'warning':
        return <FiAlertTriangle size={20} color="#F59E0B" />;
      case 'alert':
        return <FiAlertCircle size={20} color="#EF4444" />;
      case 'success':
        return <FiCheckCircle size={20} color="#10B981" />;
      default:
        return <FiInfo size={20} color="#3B82F6" />;
    }
  };

  const getNotificationBorder = (type) => {
    switch (type) {
      case 'warning':
        return '#F59E0B';
      case 'alert':
        return '#EF4444';
      case 'success':
        return '#10B981';
      default:
        return '#3B82F6';
    }
  };

  const getSliderStyles = (isChecked) => ({
    ...styles.toggleSlider,
    backgroundColor: isChecked ? '#2563EB' : '#ccc',
  });

  const getSliderKnobStyles = (isChecked) => ({
    ...styles.toggleSliderBefore,
    transform: isChecked ? 'translateX(20px)' : 'translateX(0)',
  });

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <p style={styles.title}>Notifications</p>
          {notifications.filter(n => !n.read).length > 0 && (
            <div style={styles.unreadBadge}>
              <p style={styles.unreadCount}>
                {notifications.filter(n => !n.read).length}
              </p>
            </div>
          )}
        </div>
        
        {role === "student" && isPushSupported && (
          <div style={styles.toggleContainer}>
            <label style={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={issub}
                onChange={handleToggleChange}
                style={styles.toggleCheckbox}
              />
              <span style={getSliderStyles(issub)}>
                <span style={getSliderKnobStyles(issub)}></span>
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Send Notification */}
      {role === 'incharge@cit@chennai@0409' && (
        <div style={styles.sendSection}>
          <p style={styles.sendTitle}>Send Notification</p>
          <label style={styles.uploadButton}>
            <FiImage size={16} color="#2563EB" style={{ marginRight: 6 }} />
            <span style={styles.uploadText}>
              {selectedImage ? 'Change Selected Image' : 'Upload Image'}
            </span>
            <input type="file" accept="image/*" onChange={handleImageSelect} hidden />
          </label>
          {selectedImage && (
            <div style={styles.previewContainer}>
              <img src={URL.createObjectURL(selectedImage)} alt="preview" style={styles.imagePreview} />
              <button style={styles.removeImageButton} onClick={() => setSelectedImage(null)}>Remove Image</button>
            </div>
          )}
          <input
            type="text"
            style={styles.titleInput}
            placeholder="Enter title..."
            value={newNotification.title}
            onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
          />
          <div style={styles.inputContainer}>
            <textarea
              style={styles.input}
              placeholder="Type your description..."
              value={newNotification.description}
              onChange={(e) => setNewNotification(prev => ({ ...prev, description: e.target.value }))}
            />
            <button style={{ ...styles.sendButton, backgroundColor: loading ? '#94a3b8' : '#2563EB' }} onClick={sendNotification} disabled={loading}>
              <FiSend size={16} color="#FFFFFF" />
            </button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div style={styles.notificationsList}>
        {notifications.map(notification => (
          <div
            key={notification._id || notification.id}
            style={{
              ...styles.notificationCard,
              ...(notification.read ? {} : styles.unreadCard),
              borderLeft: `4px solid ${getNotificationBorder(notification.type)}`,
            }}
          >
            {role === 'incharge@cit@chennai@0409' && (
              <button
                style={styles.deleteButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(notification._id);
                }}
                title="Delete Notification"
              >
                <FiTrash size={16} color="#EF4444" />
              </button>
            )}

            <button
              style={styles.notificationContent}
              onClick={() => {
                if (notification.imageUrl) {
                  const uri = `${getEndpoint()}/api/img?id=${notification.imageUrl}`;
                  setLightboxImages([{ src: uri }]);
                  setLightboxOpen(true);
                }
                if (!notification.read) {
                  notification.read = true;
                  setNotifications(prev => [...prev]);
                  markNotificationAsRead(notification._id);
                }
              }}
            >
              <div style={styles.notificationHeader}>
                <div style={styles.notificationIcon}>{getNotificationIcon(notification.type)}</div>
                <div style={styles.notificationMeta}>
                  <p style={styles.notificationTitle}>{notification.title}</p>
                  <p style={styles.notificationSender}>From: {notification.sender}</p>
                </div>
              </div>

              <p style={styles.notificationMessage}>{notification.message}</p>

              {notification.imageUrl && (
                <img
                  src={`${getEndpoint()}/api/img?id=${notification.imageUrl}`}
                  alt="attachment"
                  style={styles.notificationImage}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxImages([{ src: `${getEndpoint()}/api/img?id=${notification.imageUrl}` }]);
                    setLightboxOpen(true);
                    if (!notification.read) {
                      notification.read = true;
                      setNotifications(prev => [...prev]);
                      markNotificationAsRead(notification._id);
                    }
                  }}
                />
              )}

              <div style={styles.notificationFooter}>
                <span style={styles.notificationTime}>{new Date(notification.time).toLocaleString()}</span>
                {!notification.read && <span style={styles.unreadDot} />}
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {notifications.length === 0 && (
        <div style={styles.emptyState}>
          <FiBell size={48} color="#9CA3AF" />
          <h4 style={styles.emptyTitle}>No Notifications</h4>
          <p style={styles.emptyMessage}>You're all caught up! New notifications will appear here.</p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={lightboxImages}
          plugins={[Zoom]}
          carousel={{ finite: true, preload: 0 }}
          zoom={{
            maxZoomPixelRatio: 3,
            zoomInMultiplier: 1.2,
            doubleTapDelay: 300,
            doubleClickDelay: 300,
            keyboardMoveDistance: 50,
          }}
        />
      )}
    </div>
  );
}

// Styles object remains the same
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#F9FAFB',
    fontFamily: 'Inter, sans-serif',
    minHeight: '100vh',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingLeft: 20,
    paddingRight: 20,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #E5E7EB',
  },
  previewContainer: {
    position: 'relative',
    display: 'inline-block',
    marginBottom: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    padding: '2px 6px',
    fontSize: 10,
    cursor: 'pointer',
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1F2937',
    margin: 0,
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    padding: '2px 8px',
    marginLeft: 12,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#FFFFFF',
    margin: 0,
  },
  sendSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottom: '1px solid #E5E7EB',
  },
  sendTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1F2937',
    margin: 0,
    marginBottom: 12,
  },
  uploadButton: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: '6px 12px',
    backgroundColor: '#E0ECFF',
    borderRadius: 8,
    marginBottom: 10,
    cursor: 'pointer',
  },
  uploadText: {
    color: '#2563EB',
    fontSize: '14px',
    fontWeight: 600,
    margin: 0,
  },
  imagePreview: {
    width: 100,
    height: 100,
    marginBottom: 10,
    borderRadius: 8,
    objectFit: 'cover',
  },
  titleInput: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: '16px',
    color: '#1F2937',
    border: '1px solid #E5E7EB',
    marginBottom: 12,
    fontFamily: 'Inter, sans-serif',
  },
  inputContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: '16px',
    color: '#1F2937',
    border: '1px solid #E5E7EB',
    resize: 'none',
    minHeight: 80,
    marginRight: 12,
    fontFamily: 'Inter, sans-serif',
  },
  sendButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
  },
  notificationsList: {
    flex: 1,
    padding: 20,
    paddingBottom: 80,
    overflowY: 'auto',
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderLeft: '4px solid transparent',
    boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
    position: 'relative',
  },
  unreadCard: {
    backgroundColor: '#F0F9FF',
  },
  notificationContent: {
    display: 'block',
    padding: 16,
    width: '100%',
    textAlign: 'left',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  notificationHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationMeta: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1F2937',
    margin: 0,
    marginBottom: 2,
  },
  notificationSender: {
    fontSize: '12px',
    fontWeight: 400,
    color: '#6B7280',
    margin: 0,
  },
  notificationMessage: {
    fontSize: '14px',
    fontWeight: 400,
    color: '#4B5563',
    lineHeight: '20px',
    margin: 0,
    marginBottom: 12,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  notificationImage: {
    width: '100%',
    maxHeight: 200,
    borderRadius: 10,
    marginTop: 10,
    objectFit: 'cover',
  },
  notificationFooter: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: '12px',
    fontWeight: 400,
    color: '#9CA3AF',
    margin: 0,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#2563EB',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1F2937',
    margin: '16px 0 8px 0',
  },
  emptyMessage: {
    fontSize: '14px',
    fontWeight: 400,
    color: '#6B7280',
    margin: 0,
  },
  toggleContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  toggleSwitch: {
    position: 'relative',
    display: 'inline-block',
    width: 44,
    height: 24,
  },
  toggleCheckbox: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  toggleSlider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ccc',
    transition: '.4s',
    borderRadius: 24,
  },
  toggleSliderBefore: {
    position: 'absolute',
    height: 18,
    width: 18,
    left: 3,
    bottom: 3,
    backgroundColor: 'white',
    transition: '.4s',
    borderRadius: '50%',
  },
};