import React from 'react';

/**
 * Displays a simple scoreboard given the list of players and their
 * corresponding scores. Scores is an object keyed by player ID.
 */
export default function Scoreboard({ players, scores }) {
  // Merge players with their scores and sort by score descending
  const list = players.map((p) => ({
    id: p.id,
    name: p.name,
    score: scores?.[p.id] ?? p.score ?? 0
  }));
  list.sort((a, b) => b.score - a.score);

  return (
    <ul className="scoreboard">
      {list.map((p, index) => (
        <li key={p.id} className="score-item">
          <span className="rank">{index + 1}.</span>
          <span className="player-name">{p.name}</span>
          <span className="player-score">{p.score} pts</span>
        </li>
      ))}
    </ul>
  );
}