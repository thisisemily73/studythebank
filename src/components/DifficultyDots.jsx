import React from 'react';
import '../styles/components/DifficultyDots.css';

export default function DifficultyDots({ difficulty = 'Medium' }) {
  const levels = {
    Easy: 1,
    Medium: 2,
    Hard: 3,
  };

  const level = levels[difficulty] || 2;

  return (
    <span
      className={`difficulty-indicator difficulty-${difficulty.toLowerCase()}`}
      aria-label={`Difficulty: ${difficulty}`}
    >
      <span className="difficulty-dots" aria-hidden="true">
        {[1, 2, 3].map((dot) => (
          <span
            key={dot}
            className={`difficulty-dot ${dot <= level ? 'filled' : ''}`}
          />
        ))}
      </span>

      <span className="difficulty-label">
        {difficulty}
      </span>
    </span>
  );
}