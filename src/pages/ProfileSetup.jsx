import React, { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import '../styles/pages/ProfileSetup.css';

const skills = [
    'Information and Ideas',
    'Craft and Structure',
    'Expression of Ideas',
    'Standard English Conventions',
    'Algebra',
    'Advanced Math',
    'Problem-Solving and Data Analysis',
    'Geometry and Trigonometry',
];

const skillKeys = {
    'Information and Ideas': 'informationAndIdeas',
    'Craft and Structure': 'craftAndStructure',
    'Expression of Ideas': 'expressionOfIdeas',
    'Standard English Conventions': 'standardEnglishConventions',
    'Algebra': 'algebra',
    'Advanced Math': 'advancedMath',
    'Problem-Solving and Data Analysis': 'problemSolvingAndDataAnalysis',
    'Geometry and Trigonometry': 'geometryAndTrigonometry',
};

export default function ProfileSetup({ setView }) {
    const [hasTakenSAT, setHasTakenSAT] = useState(false);

    const [satScore, setSatScore] = useState('');
    const [readingWriting, setReadingWriting] = useState('');
    const [math, setMath] = useState('');

    const [skillRatings, setSkillRatings] = useState({});

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSkillRating = (skill, rating) => {
        setSkillRatings((prev) => ({
            ...prev,
            [skillKeys[skill]]: rating,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const user = auth.currentUser;

        if (!user) {
            setError('You need to be signed in to save your profile.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            await setDoc(doc(db, 'users', user.uid), {
                displayName: user.displayName || '',
                email: user.email || '',
                photoURL: user.photoURL || '',

                sat: {
                    hasTaken: hasTakenSAT,
                    score: hasTakenSAT && satScore
                        ? Number(satScore)
                        : null,
                    readingWriting: hasTakenSAT && readingWriting
                        ? Number(readingWriting)
                        : null,
                    math: hasTakenSAT && math
                        ? Number(math)
                        : null,
                },

                skillRatings,

                profileComplete: true,
                updatedAt: serverTimestamp(),
            });

            setView('settings');
        } catch (err) {
            console.error(err);
            setError('We could not save your profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="profile-setup-page">
            <div className="profile-setup-container">
                <header className="profile-setup-header">
                    <p className="profile-setup-eyebrow">
                        Welcome to StudyTheBank
                    </p>

                    <h1>Set up your profile</h1>

                    <p>
                        Tell us a little about your SAT experience.
                        You can change this information later.
                    </p>
                </header>

                <form
                    className="profile-setup-card"
                    onSubmit={handleSubmit}
                >
                    <section className="profile-section">
                        <div className="profile-section-heading">
                            <span>01</span>

                            <div>
                                <h2>SAT Score</h2>
                                <p>
                                    Have you taken the SAT before?
                                </p>
                            </div>
                        </div>

                        <label className="profile-checkbox">
                            <input
                                type="checkbox"
                                checked={hasTakenSAT}
                                onChange={(event) =>
                                    setHasTakenSAT(event.target.checked)
                                }
                            />

                            <span className="custom-checkbox">
                                {hasTakenSAT && '✓'}
                            </span>

                            <span>
                                Yes, I've taken the SAT
                            </span>
                        </label>

                        {hasTakenSAT && (
                            <div className="score-fields">
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
                                        placeholder="e.g. 1350"
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
                                            setReadingWriting(
                                                event.target.value
                                            )
                                        }
                                        placeholder="e.g. 680"
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
                                        placeholder="e.g. 670"
                                    />
                                </label>
                            </div>
                        )}
                    </section>

                    <div className="profile-divider" />

                    <section className="profile-section">
                        <div className="profile-section-heading">
                            <span>02</span>

                            <div>
                                <h2>Skill ratings</h2>
                                <p>
                                    Optional — enter the 1–5 ratings from
                                    your College Board score report.
                                </p>
                            </div>
                        </div>

                        <div className="skill-rating-list">
                            {skills.map((skill) => {
                                const key = skillKeys[skill];
                                const currentRating = skillRatings[key];

                                return (
                                    <div
                                        key={skill}
                                        className="skill-rating-row"
                                    >
                                        <span>{skill}</span>

                                        <div className="rating-buttons">
                                            {[1, 2, 3, 4, 5].map((rating) => (
                                                <button
                                                    key={rating}
                                                    type="button"
                                                    className={
                                                        currentRating === rating
                                                            ? 'selected'
                                                            : ''
                                                    }
                                                    onClick={() =>
                                                        handleSkillRating(
                                                            skill,
                                                            rating
                                                        )
                                                    }
                                                >
                                                    {rating}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {error && (
                        <p className="profile-setup-error">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="profile-save-button"
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save & Continue'}
                    </button>
                </form>
            </div>
        </main>
    );
}