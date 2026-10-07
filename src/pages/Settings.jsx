import React, { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

import {
  GoogleAuthProvider,
  reauthenticateWithPopup,
  signOut,
} from 'firebase/auth';

import { auth, db } from '../firebase';
import '../styles/pages/Settings.css';

const DELETE_ACCOUNT_KEY =
  'studythebank-delete-account-pending';

const DELETE_ACCOUNT_UID_KEY =
  'studythebank-delete-account-uid';

const skills = [
  {
    label: 'Information and Ideas',
    key: 'informationAndIdeas',
  },
  {
    label: 'Craft and Structure',
    key: 'craftAndStructure',
  },
  {
    label: 'Expression of Ideas',
    key: 'expressionOfIdeas',
  },
  {
    label: 'Standard English Conventions',
    key: 'standardEnglishConventions',
  },
  {
    label: 'Algebra',
    key: 'algebra',
  },
  {
    label: 'Advanced Math',
    key: 'advancedMath',
  },
  {
    label: 'Problem-Solving and Data Analysis',
    key: 'problemSolvingAndDataAnalysis',
  },
  {
    label: 'Geometry and Trigonometry',
    key: 'geometryAndTrigonometry',
  },
];

const defaultPracticePreferences = {
  sessionSize: '20',
  shuffle: true,
  excludeCorrect: true,
};

export default function Settings({
  user,
  setView,
}) {
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPreferences, setSavingPreferences] =
    useState(false);

  const [resettingAnalytics, setResettingAnalytics] =
    useState(false);
  const [deletingAccount, setDeletingAccount] =
    useState(false);

  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  const [satScore, setSatScore] = useState('');
  const [readingWriting, setReadingWriting] =
    useState('');
  const [math, setMath] = useState('');
  const [skillRatings, setSkillRatings] =
    useState({});

  const [practicePreferences, setPracticePreferences] =
    useState(defaultPracticePreferences);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user || !auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        setError('');

        const profileRef = doc(
          db,
          'users',
          user.uid
        );

        const profileSnap =
          await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data =
            profileSnap.data();

          setProfile(data);

          setSatScore(
            data.sat?.score ?? ''
          );

          setReadingWriting(
            data.sat?.readingWriting ?? ''
          );

          setMath(
            data.sat?.math ?? ''
          );

          setSkillRatings(
            data.skillRatings ?? {}
          );

          setPracticePreferences({
            sessionSize:
              data.practicePreferences
                ?.sessionSize ??
              defaultPracticePreferences.sessionSize,

            shuffle:
              data.practicePreferences
                ?.shuffle ??
              defaultPracticePreferences.shuffle,

            excludeCorrect:
              data.practicePreferences
                ?.excludeCorrect ??
              defaultPracticePreferences.excludeCorrect,
          });
        } else {
          const initialProfile = {
            sat: {
              hasTaken: false,
              score: null,
              readingWriting: null,
              math: null,
            },

            skillRatings: {},

            practicePreferences:
              defaultPracticePreferences,

            updatedAt:
              serverTimestamp(),
          };

          await setDoc(
            profileRef,
            initialProfile,
            { merge: true }
          );

          setProfile(initialProfile);
        }
      } catch (err) {
        console.error(
          'SETTINGS LOAD ERROR:',
          err
        );

        setError(
          'We could not load your settings. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleSkillRating = (
    key,
    rating
  ) => {
    setSkillRatings((previous) => ({
      ...previous,
      [key]: rating,
    }));
  };

  const handleSave = async () => {
    if (!user || saving) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const profileRef = doc(
        db,
        'users',
        user.uid
      );

      const hasSatScore =
        satScore !== '' ||
        readingWriting !== '' ||
        math !== '';

      const updatedSat = {
        ...profile?.sat,
        hasTaken: hasSatScore,
        score:
          satScore !== ''
            ? Number(satScore)
            : null,
        readingWriting:
          readingWriting !== ''
            ? Number(readingWriting)
            : null,
        math:
          math !== ''
            ? Number(math)
            : null,
      };

      const updatedProfile = {
        ...profile,
        sat: updatedSat,
        skillRatings,
        updatedAt:
          serverTimestamp(),
      };

      await setDoc(
        profileRef,
        updatedProfile,
        { merge: true }
      );

      setProfile({
        ...updatedProfile,
        sat: updatedSat,
      });

      setEditing(false);
    } catch (err) {
      console.error(
        'SETTINGS SAVE ERROR:',
        err
      );

      setError(
        'We could not save your changes. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSatScore(
      profile?.sat?.score ?? ''
    );

    setReadingWriting(
      profile?.sat?.readingWriting ?? ''
    );

    setMath(
      profile?.sat?.math ?? ''
    );

    setSkillRatings(
      profile?.skillRatings ?? {}
    );

    setEditing(false);
    setError('');
  };

  const handlePreferenceChange = async (
    key,
    value
  ) => {
    const updatedPreferences = {
      ...practicePreferences,
      [key]: value,
    };

    setPracticePreferences(
      updatedPreferences
    );

    if (!user) {
      return;
    }

    setSavingPreferences(true);
    setError('');

    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          practicePreferences:
            updatedPreferences,
        },
        { merge: true }
      );
    } catch (err) {
      console.error(
        'PRACTICE PREFERENCES ERROR:',
        err
      );

      setError(
        'We could not save your practice preferences.'
      );
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleResetAnalytics = async () => {
    if (
      !user ||
      resettingAnalytics
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        'Are you sure you want to reset your analytics?\n\n' +
        'This will permanently delete all of your practice history. ' +
        'Your account, SAT profile, and practice preferences will remain.'
      );

    if (!confirmed) {
      return;
    }

    setResettingAnalytics(true);
    setError('');

    try {
      const attemptsRef =
        collection(
          db,
          'users',
          user.uid,
          'practiceAttempts'
        );

      const snapshot =
        await getDocs(attemptsRef);

      await Promise.all(
        snapshot.docs.map(
          (attempt) =>
            deleteDoc(
              attempt.ref
            )
        )
      );
    } catch (err) {
      console.error(
        'RESET ANALYTICS ERROR:',
        err
      );

      setError(
        'We could not reset your analytics. Please try again.'
      );
    } finally {
      setResettingAnalytics(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !user ||
      deletingAccount ||
      !auth.currentUser
    ) {
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete your StudyTheBank account?\n\n' +
      'This will permanently delete your account, practice history, ' +
      'SAT profile, and saved preferences. This cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    setDeletingAccount(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();

      console.log('STARTING GOOGLE REAUTH...');

      await reauthenticateWithPopup(
        auth.currentUser,
        provider
      );

      console.log('GOOGLE REAUTH SUCCESSFUL');

      localStorage.setItem(
        DELETE_ACCOUNT_KEY,
        'true'
      );

      localStorage.setItem(
        DELETE_ACCOUNT_UID_KEY,
        user.uid
      );

      window.location.reload();
    } catch (err) {
      console.error(
        'REAUTHENTICATION ERROR:',
        err
      );

      setDeletingAccount(false);

      if (err.code === 'auth/popup-blocked') {
        setError(
          'Your browser blocked the Google verification window. Please allow popups for localhost and try again.'
        );
      } else if (
        err.code === 'auth/cancelled-popup-request'
      ) {
        setError(
          'The Google verification window was cancelled. Please try again.'
        );
      } else {
        setError(
          'We could not verify your account. Please try again.'
        );
      }
    }
  };

  const handleSignOut = async () => {
    try {
      setError('');

      await signOut(auth);

      setView('home');
    } catch (err) {
      console.error(
        'SIGN OUT ERROR:',
        err
      );

      setError(
        'We could not sign you out. Please try again.'
      );
    }
  };

  if (loading) {
    return (
      <main className="settings-page">
        <div className="settings-container">
          <p className="settings-loading">
            Loading your settings...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="settings-page">
      <div className="settings-container">

        <header className="settings-header">
          <div>
            <p className="settings-eyebrow">
              Account
            </p>

            <h1>Settings</h1>

            <p>
              Manage your account, SAT
              profile, and practice
              preferences.
            </p>
          </div>

          {!editing && (
            <button
              type="button"
              className="settings-edit-button"
              onClick={() =>
                setEditing(true)
              }
            >
              Edit Profile
            </button>
          )}
        </header>

        {error && (
          <p className="settings-error">
            {error}
          </p>
        )}

        <section className="settings-card">
          <div className="settings-section-header">
            <div>
              <h2>Account</h2>
              <p>
                Your Google account
                information.
              </p>
            </div>
          </div>

          <div className="account-info">
            <div className="account-avatar">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                />
              ) : (
                <span>
                  {user?.displayName?.charAt(
                    0
                  ) || '?'}
                </span>
              )}
            </div>

            <div>
              <p className="account-name">
                {user?.displayName ||
                  'StudyTheBank user'}
              </p>

              <p className="account-email">
                {user?.email ||
                  'No email available'}
              </p>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-section-header">
            <div>
              <h2>SAT Profile</h2>
              <p>
                Keep your SAT scores and
                skill ratings up to date.
              </p>
            </div>
          </div>

          {editing ? (
            <div className="settings-score-fields">
              <label>
                <span>Total score</span>

                <input
                  type="number"
                  min="400"
                  max="1600"
                  step="10"
                  value={satScore}
                  onChange={(event) =>
                    setSatScore(
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                <span>
                  Reading & Writing
                </span>

                <input
                  type="number"
                  min="200"
                  max="800"
                  step="10"
                  value={readingWriting}
                  onChange={(event) =>
                    setReadingWriting(
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                <span>Math</span>

                <input
                  type="number"
                  min="200"
                  max="800"
                  step="10"
                  value={math}
                  onChange={(event) =>
                    setMath(
                      event.target.value
                    )
                  }
                />
              </label>
            </div>
          ) : profile?.sat?.hasTaken ? (
            <div className="score-display">
              <div>
                <span>Total</span>

                <strong>
                  {profile.sat.score ??
                    '—'}
                </strong>
              </div>

              <div>
                <span>
                  Reading & Writing
                </span>

                <strong>
                  {profile.sat
                    .readingWriting ??
                    '—'}
                </strong>
              </div>

              <div>
                <span>Math</span>

                <strong>
                  {profile.sat.math ??
                    '—'}
                </strong>
              </div>
            </div>
          ) : (
            <p className="settings-empty">
              You haven't added an SAT
              score yet.
            </p>
          )}

          <div className="settings-skill-section">
            <div className="settings-subsection-header">
              <h3>Skill Ratings</h3>

              <p>
                Your College Board
                skill ratings.
              </p>
            </div>

            <div className="settings-skills">
              {skills.map((skill) => {
                const rating =
                  skillRatings[
                  skill.key
                  ];

                return (
                  <div
                    key={skill.key}
                    className="settings-skill-row"
                  >
                    <span>
                      {skill.label}
                    </span>

                    {editing ? (
                      <div className="settings-rating-buttons">
                        {[1, 2, 3, 4, 5].map(
                          (value) => (
                            <button
                              key={value}
                              type="button"
                              className={
                                rating ===
                                  value
                                  ? 'selected'
                                  : ''
                              }
                              onClick={() =>
                                handleSkillRating(
                                  skill.key,
                                  value
                                )
                              }
                            >
                              {value}
                            </button>
                          )
                        )}
                      </div>
                    ) : (
                      <span className="settings-rating">
                        {rating
                          ? `${rating}/5`
                          : 'Not set'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {editing && (
          <div className="settings-actions">
            <button
              type="button"
              className="settings-cancel-button"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="settings-save-button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : 'Save Changes'}
            </button>
          </div>
        )}

        <section className="settings-card">
          <div className="settings-section-header">
            <div>
              <h2>Data & Privacy</h2>

              <p>
                Manage your
                StudyTheBank data.
              </p>
            </div>
          </div>

          <div className="settings-danger-actions">
            <div className="settings-danger-row">
              <div>
                <strong>
                  Reset Analytics
                </strong>

                <span>
                  Permanently delete
                  your practice history
                  and start your
                  analytics from
                  scratch. Your profile
                  and practice
                  preferences will
                  remain.
                </span>
              </div>

              <button
                type="button"
                className="settings-reset-button"
                onClick={
                  handleResetAnalytics
                }
                disabled={
                  resettingAnalytics
                }
              >
                {resettingAnalytics
                  ? 'Resetting...'
                  : 'Reset Analytics'}
              </button>
            </div>

            <div className="settings-danger-row">
              <div>
                <strong>
                  Delete Account
                </strong>

                <span>
                  Permanently delete
                  your StudyTheBank
                  account and all
                  associated data.
                  This cannot be
                  undone.
                </span>
              </div>

              <button
                type="button"
                className="settings-delete-button"
                onClick={
                  handleDeleteAccount
                }
                disabled={
                  deletingAccount
                }
              >
                {deletingAccount
                  ? 'Verifying...'
                  : 'Delete Account'}
              </button>
            </div>
          </div>
        </section>

        <section className="settings-card settings-danger-card">
          <div>
            <h2>Sign Out</h2>

            <p>
              Sign out of your
              StudyTheBank account
              on this device.
            </p>
          </div>

          <button
            type="button"
            className="settings-signout-button"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </section>

      </div>
    </main>
  );
}