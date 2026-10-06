import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

import { auth, db } from '../firebase';
import '../styles/pages/Settings.css';

const skills = [
  { label: 'Information and Ideas', key: 'informationAndIdeas' },
  { label: 'Craft and Structure', key: 'craftAndStructure' },
  { label: 'Expression of Ideas', key: 'expressionOfIdeas' },
  { label: 'Standard English Conventions', key: 'standardEnglishConventions' },
  { label: 'Algebra', key: 'algebra' },
  { label: 'Advanced Math', key: 'advancedMath' },
  { label: 'Problem-Solving and Data Analysis', key: 'problemSolvingAndDataAnalysis' },
  { label: 'Geometry and Trigonometry', key: 'geometryAndTrigonometry' },
];

export default function Settings({ user, setView }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  const [satScore, setSatScore] = useState('');
  const [readingWriting, setReadingWriting] = useState('');
  const [math, setMath] = useState('');
  const [skillRatings, setSkillRatings] = useState({});

  useEffect(() => {
    const loadProfile = async () => {
      // Ensure both the user prop and Firebase's current auth user are ready
      if (!user || !auth.currentUser) {
        console.log("SETTINGS: auth not ready", {
          user,
          currentUser: auth.currentUser,
        });

        setLoading(false);
        return;
      }

      console.log("SETTINGS: authenticated", {
        userUid: user.uid,
        authUid: auth.currentUser.uid,
      });

      try {
        const profileRef = doc(db, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data = profileSnap.data();
          setProfile(data);
          setSatScore(data.sat?.score ?? '');
          setReadingWriting(data.sat?.readingWriting ?? '');
          setMath(data.sat?.math ?? '');
          setSkillRatings(data.skillRatings ?? {});
        } else {
          // Optional: Automatically initialize a blank profile doc if it doesn't exist yet
          await setDoc(profileRef, {
            sat: { hasTaken: false, score: null, readingWriting: null, math: null },
            skillRatings: {},
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (err) {
        console.error(err);
        setError('We could not load your profile.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleSkillRating = (key, rating) => {
    setSkillRatings((prev) => ({
      ...prev,
      [key]: rating,
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError('');

    try {
      const profileRef = doc(db, 'users', user.uid);

      const updatedProfile = {
        ...profile,
        sat: {
          ...profile?.sat,
          score: satScore ? Number(satScore) : null,
          readingWriting: readingWriting
            ? Number(readingWriting)
            : null,
          math: math ? Number(math) : null,
        },
        skillRatings,
        updatedAt: serverTimestamp(),
      };

      await setDoc(profileRef, updatedProfile, { merge: true });

      setProfile(updatedProfile);
      setEditing(false);
    } catch (err) {
      console.error(err);
      setError('We could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSatScore(profile?.sat?.score ?? '');
    setReadingWriting(profile?.sat?.readingWriting ?? '');
    setMath(profile?.sat?.math ?? '');
    setSkillRatings(profile?.skillRatings ?? {});
    setEditing(false);
    setError('');
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setView('home');
    } catch (err) {
      console.error(err);
      setError('We could not sign you out. Please try again.');
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
            <p className="settings-eyebrow">Account</p>

            <h1>Settings</h1>

            <p>
              Manage your profile and SAT information.
            </p>
          </div>

          {!editing && (
            <button
              type="button"
              className="settings-edit-button"
              onClick={() => setEditing(true)}
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
              <p>Your Google account information.</p>
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
                  {user?.displayName?.charAt(0) || '?'}
                </span>
              )}
            </div>

            <div>
              <p className="account-name">
                {user?.displayName || 'StudyTheBank user'}
              </p>

              <p className="account-email">
                {user?.email || 'No email available'}
              </p>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-section-header">
            <div>
              <h2>SAT Score</h2>
              <p>
                Keep your latest SAT scores up to date.
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
                    setSatScore(event.target.value)
                  }
                />
              </label>

              <label>
                <span>Reading & Writing</span>

                <input
                  type="number"
                  min="200"
                  max="800"
                  step="10"
                  value={readingWriting}
                  onChange={(event) =>
                    setReadingWriting(event.target.value)
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
                    setMath(event.target.value)
                  }
                />
              </label>
            </div>
          ) : profile?.sat?.hasTaken ? (
            <div className="score-display">
              <div>
                <span>Total</span>
                <strong>
                  {profile.sat.score ?? '—'}
                </strong>
              </div>

              <div>
                <span>Reading & Writing</span>
                <strong>
                  {profile.sat.readingWriting ?? '—'}
                </strong>
              </div>

              <div>
                <span>Math</span>
                <strong>
                  {profile.sat.math ?? '—'}
                </strong>
              </div>
            </div>
          ) : (
            <p className="settings-empty">
              You haven't added an SAT score yet.
            </p>
          )}
        </section>

        <section className="settings-card">
          <div className="settings-section-header">
            <div>
              <h2>Skill Ratings</h2>
              <p>
                Your College Board skill ratings.
              </p>
            </div>
          </div>

          <div className="settings-skills">
            {skills.map((skill) => {
              const rating = skillRatings[skill.key];

              return (
                <div
                  key={skill.key}
                  className="settings-skill-row"
                >
                  <span>{skill.label}</span>

                  {editing ? (
                    <div className="settings-rating-buttons">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={
                            rating === value
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
                      ))}
                    </div>
                  ) : (
                    <span className="settings-rating">
                      {rating ? `${rating}/5` : 'Not set'}
                    </span>
                  )}
                </div>
              );
            })}
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
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        <section className="settings-card settings-danger-card">
          <div>
            <h2>Account</h2>

            <p>
              Sign out of your StudyTheBank account on this device.
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