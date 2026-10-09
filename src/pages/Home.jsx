import React from 'react';
import { ArrowRight, CheckCircle2, Zap, ShieldCheck } from 'lucide-react';
import '../styles/pages/Home.css';

export default function Home({ setView }) {
  return (
    <main className="home-container">

      {/* Hero */}
      <section className="home-hero">

        <span className="home-hero-badge">
          100% Free • Official SAT Question Bank
        </span>

        <h1 className="home-title">
          Master the SAT with
          <span> explanations that make sense.</span>
        </h1>

        <p className="home-subtitle">
          Practice official SAT questions with real multiple-choice options,
          understand your mistakes, and discover exactly where you need to improve.
        </p>

        <div className="home-actions">
          {/* <button
            onClick={() => setView('diagnostic')}
            className="btn-primary"
          >
            Start 20-question Diagnostic
            <ArrowRight size={18} />
          </button> */}

          <button
            onClick={() => setView('practice')}
            className="btn-secondary"
          >
            Browse Practice Bank
          </button>
        </div>

        <p className="home-disclaimer">
          Free to use • No subscriptions
        </p>

      </section>


      {/* Features */}
      <section className="home-features">

        <div className="feature-card">
          <div className="feature-icon">
            <Zap size={20} />
          </div>

          <div>
            <h3>Better Explanations</h3>
            <p>
              Clear, step-by-step explanations that help you understand
              why an answer is correct.
            </p>
          </div>
        </div>


        <div className="feature-card">
          <div className="feature-icon">
            <ShieldCheck size={20} />
          </div>

          <div>
            <h3>Find Your Weak Spots</h3>
            <p>
              Your results show which SAT topics you need to practice most.
            </p>
          </div>
        </div>


        <div className="feature-card">
          <div className="feature-icon">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <h3>Practice the Real Thing</h3>
            <p>
              Work through official SAT questions with actual A, B, C,
              and D answer choices.
            </p>
          </div>
        </div>

      </section>

    </main>
  );
}