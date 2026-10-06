import React from 'react';
import '../styles/components/Footer.css';

export default function Footer({ setView }) {
    return (
        <footer className="footer">
            <div className="footer-container">
                <button
                    type="button"
                    className="footer-brand"
                    onClick={() => setView('home')}
                >
                    studythebank
                </button>

                <p className="footer-text">
                    Free SAT practice powered by OpenSAT.
                </p>

                <p className="footer-attribution">
                    Questions provided by{' '}
                    <a
                        href="https://github.com/Anas099X/OpenSAT"
                        target="_blank"
                        rel="noreferrer"
                    >
                        OpenSAT by Anas099X
                    </a>
                </p>

                <div className="footer-links">
                    <button
                        type="button"
                        onClick={() => setView('practice')}
                    >
                        Practice
                    </button>

                    <button
                        type="button"
                        onClick={() => setView('analytics')}
                    >
                        Analytics
                    </button>
                </div>

                <p className="footer-copyright">
                    © {new Date().getFullYear()} StudyTheBank
                </p>
            </div>
        </footer>
    );
}