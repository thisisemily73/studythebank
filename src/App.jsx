import React, { useEffect, useState } from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
} from 'firebase/firestore';

import { auth, db } from './firebase';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Practice from './pages/Practice';
import Dashboard from './pages/Dashboard';
import Diagnostic from './pages/Diagnostic';
import Analytics from './pages/Analytics';
import Auth from './pages/Auth';
import Settings from './pages/Settings';
import ProfileSetup from './pages/ProfileSetup';

export default function App() {
  const [view, setView] = useState('home');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDesmosOpen, setIsDesmosOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("AUTH STATE CHANGED:", currentUser);

      setUser(currentUser);

      if (!currentUser) {
        setAuthLoading(false);
        return;
      }

      try {
        const profileRef = doc(db, 'users', currentUser.uid);
        const profileSnap = await getDoc(profileRef);

        if (!profileSnap.exists()) {
          setView('profileSetup');
        } else {
          const profile = profileSnap.data();

          if (profile.profileComplete) {
            setView('dashboard');
          } else {
            setView('profileSetup');
          }
        }
      } catch (err) {
        console.error("PROFILE CHECK ERROR:", err);
      } finally {
        setAuthLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        await getRedirectResult(auth);
      } catch (error) {
        console.error(
          'Google redirect error:',
          error
        );
      }
    };

    handleRedirectResult();
  }, []);

  if (authLoading) {
    return null;
  }

  return (
    <div className="app">
      <Navbar
        setView={setView}
        activeView={view}
        user={user}
      />

      <main>
        {view === 'home' && (
          <Home setView={setView} />
        )}

        {view === 'dashboard' && (
          <Dashboard
            user={user}
            setView={setView}
          />
        )}

        {view === 'diagnostic' && (
          <Diagnostic
            setView={setView}
            setIsDesmosOpen={setIsDesmosOpen}
          />
        )}

        {view === 'practice' && (
          <Practice
            setIsDesmosOpen={setIsDesmosOpen}
          />
        )}

        {view === 'analytics' && (
          <Analytics setView={setView} />
        )}

        {view === 'auth' && (
          <Auth setView={setView} />
        )}

        {view === 'profileSetup' && (
          <ProfileSetup setView={setView} />
        )}

        {view === 'settings' && (
          <Settings
            user={user}
            setView={setView}
          />
        )}
      </main>

      <Footer setView={setView} />

      {isDesmosOpen && (
        <DesmosModal
          onClose={() => setIsDesmosOpen(false)}
        />
      )}
    </div>
  );
}