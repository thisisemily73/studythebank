import React from 'react';
import '../styles/components/Navbar.css';

export default function Navbar({ setView, activeView, user }) {
    return (
        <nav className="navbar">
            <h1
                onClick={() => setView('home')}
                className="navbar-brand"
            >
                studythebank
            </h1>

            <div className="navbar-links">
                <button
                    onClick={() => setView('practice')}
                    className={`navbar-link ${
                        activeView === 'practice' ? 'active' : ''
                    }`}
                >
                    Practice
                </button>

                <button
                    onClick={() => setView('analytics')}
                    className={`navbar-link ${
                        activeView === 'analytics' ? 'active' : ''
                    }`}
                >
                    Analytics
                </button>

                {user ? (
                    <button
                        onClick={() => setView('settings')}
                        className={`navbar-link ${
                            activeView === 'settings' ? 'active' : ''
                        }`}
                    >
                        Settings
                    </button>
                ) : (
                    <button
                        onClick={() => setView('auth')}
                        className={`navbar-link navbar-auth-link ${
                            activeView === 'auth' ? 'active' : ''
                        }`}
                    >
                        Sign Up / Log In
                    </button>
                )}
            </div>
        </nav>
    );
}