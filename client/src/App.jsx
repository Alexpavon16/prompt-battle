import React, { useState, useEffect } from 'react';
import socket from './socket.js';
import Lobby from './components/Lobby.jsx';
import GameRoom from './components/GameRoom.jsx';
import WinnerScreen from './components/WinnerScreen.jsx';

/*
 * Root component for the Prompt Battle client. Handles high level state
 * transitions between the lobby, in‑game and end screen. Maintains
 * connection to the server via Socket.IO and listens for game events.
 */
export default function App() {
  // Room and player metadata
  const [roomCode, setRoomCode] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState([]);
  const [hostId, setHostId] = useState(null);
  const [isHost, setIsHost] = useState(false);

  // Game state
  const [gameState, setGameState] = useState('waiting');
  const [currentRound, setCurrentRound] = useState(0);
  const [originalImage, setOriginalImage] = useState(null);
  const [category, setCategory] = useState('');
  const [generatedImages, setGeneratedImages] = useState({});
  const [roundScores, setRoundScores] = useState({});
  const [totalScores, setTotalScores] = useState({});
  const [finalScores, setFinalScores] = useState({});

  // Track view state: lobby, game, results
  const [view, setView] = useState('landing');

  // Set up Socket.IO event listeners once when the component mounts.
  useEffect(() => {
    // Receive updated player list from the server. Determine if this
    // client is the host by comparing the host ID with our socket ID.
    socket.on('player-list', ({ players, host }) => {
      setPlayers(players);
      setHostId(host);
      setIsHost(socket.id === host);
    });

    // Game state transitions
    socket.on('game-state', (data) => {
      setGameState(data.state);
      if (data.round !== undefined) setCurrentRound(data.round);
      if (data.state === 'game_over') {
        setView('results');
      }
    });

    // Original image sent by server at the start of each round
    socket.on('original-image', ({ prompt, image, category }) => {
      setOriginalImage({ prompt, image });
      setCategory(category);
    });

    // Generated images for each player's prompt
    socket.on('generated-images', ({ images }) => {
      setGeneratedImages(images);
    });

    // Round results: similarity scores and total scores so far
    socket.on('round-results', ({ scores, totalScores }) => {
      setRoundScores(scores);
      setTotalScores(totalScores);
    });

    // Final results at the end of the game
    socket.on('game-over', ({ finalScores }) => {
      setFinalScores(finalScores);
      setView('results');
    });

    // Clean up listeners on unmount
    return () => {
      socket.off('player-list');
      socket.off('game-state');
      socket.off('original-image');
      socket.off('generated-images');
      socket.off('round-results');
      socket.off('game-over');
    };
  }, []);

  /**
   * Called when the host or player successfully enters a room. Stores
   * relevant metadata and transitions to the lobby view.
   */
  const handleEnterRoom = ({ roomCode: code, playerName }) => {
    setRoomCode(code);
    setPlayerName(playerName);
    setView('lobby');
  };

  // Render different interfaces depending on current view state.
  if (view === 'landing') {
    return (
      <div className="container">
        <h1 className="title">Prompt Battle</h1>
        <Lobby
          socket={socket}
          onEnterRoom={handleEnterRoom}
          players={players}
          isHost={isHost}
        />
      </div>
    );
  } else if (view === 'lobby') {
    return (
      <div className="container">
        <h2 className="subtitle">Sala {roomCode}</h2>
        <p className="info">Esperando jugadores... ({players.length})</p>
        {players.map((p) => (
          <p key={p.id}>{p.name} - {p.score} pts</p>
        ))}
        {isHost && (
          <button
            className="primary-button"
            onClick={() => {
              // Only host can start the game
              socket.emit('start-game', { roomCode }, (res) => {
                if (!res.success) {
                  alert(res.message);
                } else {
                  setView('game');
                }
              });
            }}
          >
            Iniciar partida
          </button>
        )}
      </div>
    );
  } else if (view === 'game') {
    return (
      <GameRoom
        socket={socket}
        roomCode={roomCode}
        players={players}
        isHost={isHost}
        gameState={gameState}
        currentRound={currentRound}
        originalImage={originalImage}
        category={category}
        generatedImages={generatedImages}
        roundScores={roundScores}
        totalScores={totalScores}
      />
    );
  } else if (view === 'results') {
    return (
      <WinnerScreen
        players={players}
        finalScores={finalScores}
      />
    );
  }
  return null;
}