import React, { useState, useEffect } from 'react';
import ImageDisplay from './ImageDisplay.jsx';
import PromptInput from './PromptInput.jsx';
import Scoreboard from './Scoreboard.jsx';

/**
 * Main game room component. Renders different views depending on the
 * current game state: showing the original image, writing prompts,
 * generating images, voting and showing results. The component
 * receives all relevant game data via props from the parent and
 * communicates with the server via the provided socket instance.
 */
export default function GameRoom({
  socket,
  roomCode,
  players,
  isHost,
  gameState,
  currentRound,
  originalImage,
  category,
  generatedImages,
  roundScores,
  totalScores
}) {
  const [promptText, setPromptText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Reset prompt submission state when a new round starts
  useEffect(() => {
    setPromptText('');
    setSubmitted(false);
  }, [currentRound]);

  const handleSubmitPrompt = () => {
    if (!promptText || submitted) return;
    socket.emit('submit-prompt', { roomCode, prompt: promptText }, (res) => {
      if (res.success) {
        setSubmitted(true);
      } else {
        alert(res.message || 'Error al enviar el prompt');
      }
    });
  };

  return (
    <div className="game-room">
      <header className="game-header">
        <h2>Ronda {currentRound}</h2>
        <span className="game-state-label">Estado: {translateState(gameState)}</span>
      </header>

      {gameState === 'showing_image' && originalImage && (
        <div className="phase showing-image">
          <h3>Observa la imagen</h3>
          <p>Categoría: {category}</p>
          <ImageDisplay src={originalImage.image} alt="Imagen original" />
        </div>
      )}

      {gameState === 'writing_prompt' && (
        <div className="phase writing-prompt">
          <h3>Escribe tu prompt</h3>
          <PromptInput
            value={promptText}
            onChange={setPromptText}
            onSubmit={handleSubmitPrompt}
            submitted={submitted}
          />
          {submitted && <p className="submitted-msg">¡Prompt enviado! Esperando a otros jugadores...</p>}
        </div>
      )}

      {gameState === 'generating_images' && (
        <div className="phase generating">
          <p>Generando imágenes...</p>
        </div>
      )}

      {gameState === 'voting' && (
        <div className="phase voting">
          <h3>Imágenes generadas</h3>
          <div className="gallery">
            {Object.entries(generatedImages).map(([playerId, imgUrl]) => (
              <div key={playerId} className="gallery-item">
                <img src={imgUrl || ''} alt={`Imagen de ${playerId}`} />
                <p>{players.find((p) => p.id === playerId)?.name || 'Jugador'}</p>
              </div>
            ))}
          </div>
          <p>La votación no está implementada en esta versión.</p>
        </div>
      )}

      {/* Show round results when available */}
      {gameState === 'showing_results' && (
        <div className="phase results">
          <h3>Resultados de la ronda</h3>
          <Scoreboard players={players} scores={totalScores} />
        </div>
      )}

      {/* Always show scoreboard in the sidebar */}
      <aside className="sidebar">
        <h4>Marcador</h4>
        <Scoreboard players={players} scores={totalScores} />
      </aside>
    </div>
  );
}

// Translate internal state keys into user friendly Spanish strings
function translateState(state) {
  switch (state) {
    case 'waiting':
      return 'Esperando';
    case 'starting':
      return 'Preparando partida';
    case 'showing_image':
      return 'Mostrando imagen';
    case 'writing_prompt':
      return 'Escribiendo prompt';
    case 'generating_images':
      return 'Generando imágenes';
    case 'voting':
      return 'Votación';
    case 'showing_results':
      return 'Mostrando resultados';
    case 'game_over':
      return 'Fin del juego';
    default:
      return state;
  }
}