import React from 'react';

import Scoreboard from './Scoreboard.jsx';

/**
 * WinnerScreen displays the final ranking after all rounds are complete. It
 * reuses the Scoreboard component for listing players by their final
 * scores and highlights the top player. You could add confetti or
 * other celebratory animations here.
 */
export default function WinnerScreen({ players, finalScores }) {
  // Derive the sorted list for display
  const list = players.map((p) => ({
    id: p.id,
    name: p.name,
    score: finalScores?.[p.id] ?? p.score ?? 0
  }));
  list.sort((a, b) => b.score - a.score);

  const winner = list[0];

  return (
    <div className="winner-screen">
      <h2>¡Juego terminado!</h2>
      {winner && (
        <div className="winner-announcement">
          <h3>Ganador: {winner.name}</h3>
          <p>Puntuación: {winner.score} pts</p>
        </div>
      )}
      <h4>Clasificación final</h4>
      <Scoreboard players={players} scores={finalScores} />
      <p>Gracias por jugar a Prompt Battle. ¡Vuelve pronto!</p>
    </div>
  );
}