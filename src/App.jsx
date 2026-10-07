import React, { useEffect, useRef, useState } from 'react';
import {
  deleteUser,
  getRedirectResult,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';

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

const DELETE_ACCOUNT_KEY =
  'studythebank-delete-account-pending';

const DELETE_ACCOUNT_UID_KEY =
  'studythebank-delete-account-uid';

const protectedPaths = [
  '/dashboard',
  '/analytics',
  '/settings',
  '/profile-setup',
];

const pathToView = {
  '/': 'home',
  '/dashboard': 'dashboard',
  '/practice': 'practice',
  '/diagnostic': 'diagnostic',
  '/analytics': 'analytics',
  '/auth': 'auth',
  '/profile-setup': 'profileSetup',
  '/settings': 'settings',
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDesmosOpen, setIsDesmosOpen] = useState(false);

  const deletionStartedRef = useRef(false);

  const activeView = pathToView[location.pathname] || '';

  const setView = (nextView) => {
    const path =
      nextView === 'home'
        ? '/'
        : `/${nextView}`;

    navigate(path);
  };

  useEffect(() => {
    let unsubscribe;

    const initializeAuth = async () => {
      try {
        const deletionPending =
          localStorage.getItem(DELETE_ACCOUNT_KEY) === 'true';

        const pendingUid =
          localStorage.getItem(DELETE_ACCOUNT_UID_KEY);

        await getRedirectResult(auth);

        if (
          deletionPending &&
          pendingUid &&
          !deletionStartedRef.current
        ) {
          deletionStartedRef.current = true;

          const currentUser = auth.currentUser;

          if (
            currentUser &&
            currentUser.uid === pendingUid
          ) {
            setAuthLoading(true);

            const attemptsRef = collection(
              db,
              'users',
              currentUser.uid,
              'practiceAttempts'
            );

            const attemptsSnapshot =
              await getDocs(attemptsRef);

            await Promise.all(
              attemptsSnapshot.docs.map((attempt) =>
                deleteDoc(attempt.ref)
              )
            );

            await deleteDoc(
              doc(db, 'users', currentUser.uid)
            );

            await deleteUser(currentUser);

            localStorage.removeItem(
              DELETE_ACCOUNT_KEY
            );

            localStorage.removeItem(
              DELETE_ACCOUNT_UID_KEY
            );

            setUser(null);
            navigate('/', { replace: true });
            setAuthLoading(false);

            return;
          }

          localStorage.removeItem(
            DELETE_ACCOUNT_KEY
          );

          localStorage.removeItem(
            DELETE_ACCOUNT_UID_KEY
          );
        }

        unsubscribe = onAuthStateChanged(
          auth,
          async (currentUser) => {
            setUser(currentUser);

            if (!currentUser) {
              if (
                protectedPaths.includes(
                  location.pathname
                )
              ) {
                navigate('/auth', { replace: true });
              }

              setAuthLoading(false);
              return;
            }

            try {
              const profileRef = doc(
                db,
                'users',
                currentUser.uid
              );

              const profileSnap =
                await getDoc(profileRef);

              if (!profileSnap.exists()) {
                navigate('/profile-setup', {
                  replace: true,
                });
              } else {
                const profile =
                  profileSnap.data();

                if (!profile.profileComplete) {
                  navigate('/profile-setup', {
                    replace: true,
                  });
                } else if (
                  location.pathname === '/' ||
                  location.pathname === '/auth'
                ) {
                  navigate('/dashboard', {
                    replace: true,
                  });
                }
              }
            } catch (err) {
              console.error(
                'PROFILE CHECK ERROR:',
                err
              );
            } finally {
              setAuthLoading(false);
            }
          }
        );
      } catch (error) {
        console.error(
          'AUTH INITIALIZATION ERROR:',
          error
        );

        localStorage.removeItem(
          DELETE_ACCOUNT_KEY
        );

        localStorage.removeItem(
          DELETE_ACCOUNT_UID_KEY
        );

        setAuthLoading(false);
      }
    };

    initializeAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  if (authLoading) {
    return null;
  }

  return (
    <div className="app">
      <Navbar
        setView={setView}
        activeView={activeView}
        user={user}
      />

      <main>
        <Routes>
          <Route
            path="/"
            element={<Home setView={setView} />}
          />

          <Route
            path="/dashboard"
            element={
              <Dashboard
                user={user}
                setView={setView}
              />
            }
          />

          <Route
            path="/practice"
            element={
              <Practice
                setIsDesmosOpen={setIsDesmosOpen}
              />
            }
          />

          <Route
            path="/diagnostic"
            element={
              <Diagnostic
                setView={setView}
                setIsDesmosOpen={setIsDesmosOpen}
              />
            }
          />

          <Route
            path="/analytics"
            element={
              <Analytics setView={setView} />
            }
          />

          <Route
            path="/auth"
            element={
              <Auth setView={setView} />
            }
          />

          <Route
            path="/profile-setup"
            element={
              <ProfileSetup setView={setView} />
            }
          />

          <Route
            path="/settings"
            element={
              <Settings
                user={user}
                setView={setView}
              />
            }
          />

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </main>

      <Footer setView={setView} />
    </div>
  );
}