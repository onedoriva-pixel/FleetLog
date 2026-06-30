import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import NewTrip from './components/NewTrip';
import Records from './components/Records';
import Reports from './components/Reports';
import Setup from './components/Setup';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('fleetlog-theme') || 'light');

  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let role = 'Staff';
        let name = user.email;

        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            role = userDoc.data().role || 'Staff';
            name = userDoc.data().name || user.email;
          }
        } catch (err) {
          console.error("Error fetching user role: ", err);
        }

        setCurrentUser({
          uid: user.uid,
          email: user.email,
          name,
          role
        });
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Monitor real-time trips collection changes when logged in
  useEffect(() => {
    if (!currentUser) {
      setTrips([]);
      return;
    }

    const tripsRef = collection(db, 'trips');
    const q = query(tripsRef, orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripsData = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setTrips(tripsData);
    }, (err) => {
      console.error("Firestore trips snapshot error: ", err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleLogout = () => {
    signOut(auth);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('fleetlog-theme', next);
  };

  const renderView = () => {
    switch (activeView) {
      case 'newtrip':
        return <NewTrip trips={trips} currentUser={currentUser} />;
      case 'records':
        return <Records trips={trips} currentUser={currentUser} />;
      case 'reports':
        return <Reports trips={trips} />;
      case 'setup':
        return <Setup />;
      case 'dashboard':
      default:
        return <Dashboard trips={trips} />;
    }
  };

  if (authLoading) {
    return (
      <div className="login-screen" style={{ flexDirection: 'column', gap: '20px' }}>
        <div className="brand" style={{ justifyContent: 'center' }}>
          <div className="brand-mark"></div>
          <h1>FleetLog</h1>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading application states...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className={`shell active`} data-theme={theme}>
      {/* Mobile Hamburger menu */}
      <button className="hamburger" onClick={toggleSidebar}>☰</button>
      
      {/* Sidebar overlay backdrop for mobile */}
      <div 
        className={`overlay ${sidebarOpen ? 'active' : ''}`} 
        onClick={closeSidebar}
      ></div>

      {/* Navigation Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"></div>
          <h1>FleetLog</h1>
        </div>
        <p className="brand-sub">Vehicle Scheduler</p>
        
        <button 
          className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => { setActiveView('dashboard'); closeSidebar(); }}
        >
          Dashboard
        </button>
        <button 
          className={`nav-item ${activeView === 'newtrip' ? 'active' : ''}`}
          onClick={() => { setActiveView('newtrip'); closeSidebar(); }}
        >
          New Travel Request
        </button>
        <button 
          className={`nav-item ${activeView === 'records' ? 'active' : ''}`}
          onClick={() => { setActiveView('records'); closeSidebar(); }}
        >
          All Records
        </button>
        <button 
          className={`nav-item ${activeView === 'reports' ? 'active' : ''}`}
          onClick={() => { setActiveView('reports'); closeSidebar(); }}
        >
          Reports (Excel)
        </button>
        {currentUser.role !== 'Staff' && (
          <button 
            className={`nav-item ${activeView === 'setup' ? 'active' : ''}`}
            onClick={() => { setActiveView('setup'); closeSidebar(); }}
          >
            Setup &amp; Sync
          </button>
        )}
        
        <div className="sidebar-footer">
          <div className="sidebar-theme-toggle">
            <button className="theme-btn" onClick={toggleTheme} title="Toggle theme">
              <span className="theme-btn-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
              <span className="theme-btn-label">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </div>
          Logged in as<br />
          <b>{currentUser.name} ({currentUser.role})</b><br />
          <button 
            className="nav-item" 
            style={{ marginTop: '10px', paddingLeft: 0, display: 'flex', alignItems: 'center', gap: '5px' }} 
            onClick={handleLogout}
          >
            ↩ Log out
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="main">
        <div key={activeView} className="view-panel">
          {renderView()}
        </div>
      </div>
    </div>
  );
}
