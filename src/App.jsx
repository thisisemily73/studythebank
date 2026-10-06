import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from './firebase';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import Practice from './pages/Practice';
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  if (authLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar
        setView={setView}
        activeView={view}
        user={user}
      />

      <main className="flex-1 p-6">
        {view === 'home' && <Home setView={setView} />}

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

      {isDesmosOpen && (
        <DesmosModal
          onClose={() => setIsDesmosOpen(false)}
        />
      )}
    </div>
  );
}