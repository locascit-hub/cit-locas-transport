import React, { useMemo, useEffect, useState,useContext  } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import decryptJWT from './utils/decrypt';

import NavBar from './components/NavBar';

// Pages
import WelcomeScreen from './pages/WelcomeScreen';
import LoginScreen from './pages/LoginScreen';
import RegisterScreen from './pages/RegisterScreen';
import HomeScreen from './pages/HomeScreen';
import SearchScreen from './pages/SearchScreen';
import TrackingScreen from './pages/TrackingScreen';
import NotificationScreen from './pages/NotificationScreen';
import ProfileScreen from './pages/ProfileScreen';
import RouteDetailScreen from './pages/RouteDetailScreen';
import { UserProvider, UserContext } from './contexts'; // import context
import InchargeLoginScreen from './pages/InchargeLogin';
import getEndpoint from './utils/loadbalancer';

// Utility: Detect iOS Safari/Chrome (all use WebKit)
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// Root wrapper
function AppShell({ installPrompt, handleInstallClick }) {


async function purgeIndexedDB(dbname) {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      console.warn("This browser doesn't support IndexedDB.");
      resolve();
      return;
    }

    const request = indexedDB.open(dbname);

    request.onsuccess = (event) => {
      const db = event.target.result;
      const tx = db.transaction(db.objectStoreNames, "readwrite");

      tx.oncomplete = () => {
        db.close();
        resolve();
      };

      tx.onerror = (e) => reject(e);

      // Clear every object store (like truncating all tables)
      for (const storeName of db.objectStoreNames) {
        tx.objectStore(storeName).clear();
      }
    };

    request.onerror = (event) => reject(event);
  });
}


//version purge
  useEffect(() => {
    const st_version='1.0.0'
    const version=localStorage.getItem('__v');
    console.log(version);
    if(version!==st_version){
      //purge idb
      purgeIndexedDB('notifications-db');
      localStorage.removeItem('recentBuses');
      localStorage.setItem('__v',st_version);
      if(version){
      window.location.reload();}
    }
  },[]);


  // remote logout
  useEffect(() => {

    // Listen for push events forwarded from service worker
    if ('serviceWorker' in navigator) {
      const handler = async (event) => {
        if (event.data?.type === 'LOG_OUT') {
              purgeIndexedDB('notifications-db');
              localStorage.clear();
              window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener('message', handler);
      return () => navigator.serviceWorker.removeEventListener('message', handler);
    }
  }, []);


  
  const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  };

    const subscribeUserToPush = async (userEmail, userToken) => {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        
        console.log("Subscription created successfully:", subscription);

        const response = await fetch(`${getEndpoint()}/subscribe`, {
          method: "POST",
          body: JSON.stringify({subscription:subscription,email: userEmail}), // THIS IS THE CRUCIAL LINE
          headers: { "Content-Type": "application/json", ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}), },
        });
        
        if (response.ok) {
          console.log("Subscription sent to server successfully.");
        } else {
          const errorText = await response.text();
          console.error("Failed to send subscription to server:", response.status, errorText);
        }
      } catch (err) {
        console.error("Failed to subscribe to push notifications:", err);
      }

    }
    else {
      console.error("Service Worker not supported in this browser.");
    }
  };
  // In your parent component (e.g., App.js)

const unsubscribeUserFromPush = async (token) => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      // Tell the backend to delete this subscription
      await fetch(`${getEndpoint()}/api/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      
      // Unsubscribe the browser
      await subscription.unsubscribe();
      console.log('User unsubscribed successfully.');
    }
  } catch (error) {
    console.error('Failed to unsubscribe user:', error);
    throw error; // Re-throw the error to be caught in the component
  }
};



  const location = useLocation();
  const hideNavOn = ['/','/incharge-cit-login-xyz', '/login', '/register','/incharge-cit-xyz'];
  const showNav = !hideNavOn.includes(location.pathname.toLowerCase());
  const { token, userData } = useContext(UserContext);
   const isLoggedIn = !!token;

  return (
    <>
    
      <Routes>
        
        <Route path="/" element={isLoggedIn ? <Navigate to="/home" /> : <WelcomeScreen installPrompt={installPrompt} handleInstallClick={handleInstallClick} />} />
        <Route path="/incharge-cit-login-xyz" element={isLoggedIn ? <Navigate to="/home" /> : <InchargeLoginScreen />} />
        <Route path="/login" element={<LoginScreen purgeIDB={purgeIndexedDB} subscribeUserToPush={subscribeUserToPush} />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/search" element={<SearchScreen />} />
        <Route path="/tracking" element={<TrackingScreen />} />
        <Route path="/notifications" element={<NotificationScreen subscribeUserToPush={subscribeUserToPush} />} />
        <Route path="/profile" element={<ProfileScreen logoutPurge={purgeIndexedDB} userData={userData} />} />
        <Route path="/route-detail" element={<RouteDetailScreen />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {showNav && <NavBar />}
    
    </>
  );
}

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [role, setRole] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [blockpage, setBlockPage] = useState(false);
  


  // Block non-mobile devices
useEffect(() => {
  const ua = navigator.userAgent || "";
  const isMobileUA = /Android|iPhone|iPad|iPod/i.test(ua);
  const hasTouch = navigator.maxTouchPoints > 0; // use >0 instead of >1 (some iPhones report exactly 1)

  if (isMobileUA && hasTouch) {
    setBlockPage(false); // allow real mobiles
  } else {
    setBlockPage(true);  // block desktops, even with UA spoof
  }
}, []);



    

  // // Notification permission handling
  // useEffect(() => {
  //   if (!isIOS()) {
  //     if (Notification.permission !== 'granted') {
  //       Notification.requestPermission()
  //         .then((permission) => {
  //           console.log(`Notification permission: ${permission}`);
  //         })
  //         .catch((err) => {
  //           console.warn('Notification request failed:', err);
  //         });
  //     }
  //   } else {
  //     console.log('Notifications not supported on this device/browser.');
  //   }
  // }, []);



  // Install prompt handler
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    console.log(`User ${choiceResult.outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  return (
    blockpage ? 
    (<div style={{display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',height:'100vh',padding:20,textAlign:'center'}}>
      <h2>Unsupported Device</h2>
      <p>please access this application on an iOS or Android mobile device.</p>
    </div>) :
        <UserProvider>
        <Router>
          <AppShell installPrompt={showInstallButton} handleInstallClick={handleInstallClick}  />
        </Router>
        <ToastContainer position="top-right" autoClose={3000} />
      </UserProvider>
  );
}
