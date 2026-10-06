import React, { useState } from "react";
import {
    GoogleAuthProvider,
    signInWithPopup,
} from "firebase/auth";

import { auth } from "../firebase";
import "../styles/pages/Auth.css";

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError("");

        try {
            const provider = new GoogleAuthProvider();

            await signInWithPopup(auth, provider);
        } catch (err) {
            console.error("GOOGLE SIGN-IN ERROR:", err);

            setError(
                err?.code
                    ? `${err.code}: ${err.message}`
                    : String(err)
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <p className="auth-eyebrow">
                        StudyTheBank
                    </p>

                    <h1>Save your progress</h1>

                    <p>
                        Sign in to save your practice results
                        and track your progress over time.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="google-sign-in-button"
                >
                    {loading
                        ? "Signing in..."
                        : "Continue with Google"}
                </button>

                {error && (
                    <p className="auth-error">
                        {error}
                    </p>
                )}

                <p className="auth-note">
                    Your account is completely free.
                </p>
            </div>
        </main>
    );
}