import React, { useState } from 'react';

/**
 * Lobby component displayed when the user has not yet joined a room. It
 * allows the user to either create a new room with default settings
 * or join an existing room via its code. Once a room is created or
 * joined the onEnterRoom callback is invoked to transition the app
 * into the lobby view.
 */
export default function Lobby({ socket, onEnterRoom }) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const handleCreateRoom = () => {
    if (!playerName) {
      alert('Por favor, introduce tu nombre.');
      return;
    }
    // Default configuration. You could expand this with more options.
    const config = {
      rounds: 3,
      difficulty: 'medium',
      categories: ['random'],
      mode: 'classic',
      playerName
    };
    socket.emit('create-room', config, (response) => {
      if (response.success) {
        onEnterRoom({ roomCode: response.roomCode, playerName });
      } else {
        alert(response.message || 'No se pudo crear la sala');
      }
    });
  };

  const handleJoinRoom = () => {
    if (!playerName) {
      alert('Por favor, introduce tu nombre.');
      return;
    }
    if (!roomCode) {
      alert('Introduce el código de la sala');
      return;
    }
    socket.emit('join-room', { roomCode: roomCode.toUpperCase(), playerName }, (response) => {
      if (response.success) {
        onEnterRoom({ roomCode: roomCode.toUpperCase(), playerName });
      } else {
        alert(response.message || 'No se pudo unir a la sala');
      }
    });
  };

  return (
    <div className="lobby">
      <div className="form-group">
        <label>Tu nombre</label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Nombre de jugador"
        />
      </div>
      <div className="form-group">
        <label>Código de sala</label>
        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
        />
      </div>
      <div className="button-row">
        <button className="primary-button" onClick={handleCreateRoom}>Crear Sala</button>
        <button className="secondary-button" onClick={handleJoinRoom}>Unirse a Sala</button>
      </div>
    </div>
  );
}