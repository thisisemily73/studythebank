import React, { useEffect, useState } from 'react';
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

export default function App() {
  const [view, setView] = useState('home');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDesmosOpen, setIsDesmosOpen] = useState(false);

  const deletionStartedRef = React.useRef(false);

  useEffect(() => {
    let unsubscribe;

    const initializeAuth = async () => {
      try {
        const deletionPending =
          localStorage.getItem(DELETE_ACCOUNT_KEY) === 'true';

        const pendingUid =
          localStorage.getItem(DELETE_ACCOUNT_UID_KEY);

        console.log('DELETE FLOW CHECK:', {
          deletionPending,
          pendingUid,
        });

        const redirectResult = await getRedirectResult(auth);

        console.log('REDIRECT RESULT:', redirectResult);

        if (
          deletionPending &&
          pendingUid &&
          !deletionStartedRef.current
        ) {
          deletionStartedRef.current = true;
          const currentUser = auth.currentUser;

          console.log('CURRENT USER AFTER REDIRECT:', currentUser);

          if (
            currentUser &&
            currentUser.uid === pendingUid
          ) {
            console.log(
              'FINISHING ACCOUNT DELETION:',
              currentUser.uid
            );

            setAuthLoading(true);

            const attemptsRef = collection(
              db,
              'users',
              currentUser.uid,
              'practiceAttempts'
            );

            const attemptsSnapshot = await getDocs(
              attemptsRef
            );

            console.log(
              'PRACTICE ATTEMPTS TO DELETE:',
              attemptsSnapshot.size
            );

            await Promise.all(
              attemptsSnapshot.docs.map((attempt) =>
                deleteDoc(attempt.ref)
              )
            );

            await deleteDoc(
              doc(db, 'users', currentUser.uid)
            );

            console.log(
              'FIRESTORE DATA DELETED'
            );

            await deleteUser(currentUser);

            console.log(
              'FIREBASE AUTH ACCOUNT DELETED'
            );

            localStorage.removeItem(
              DELETE_ACCOUNT_KEY
            );

            localStorage.removeItem(
              DELETE_ACCOUNT_UID_KEY
            );

            setUser(null);
            setView('home');
            setAuthLoading(false);

            return;
          }

          console.warn(
            'DELETE FLOW DID NOT FIND EXPECTED USER'
          );

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
            console.log(
              'AUTH STATE CHANGED:',
              currentUser
            );

            setUser(currentUser);

            if (!currentUser) {
              setView('home');
              setAuthLoading(false);
              return;
            }

            try {
              const profileRef = doc(
                db,
                'users',
                currentUser.uid
              );

              const profileSnap = await getDoc(
                profileRef
              );

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