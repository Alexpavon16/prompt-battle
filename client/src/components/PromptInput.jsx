import React, { useState } from 'react';

/**
 * Component for writing and submitting prompts. Displays a textarea
 * with character count and a submit button. Prompts are limited to
 * 500 characters. When submitted, the textarea is disabled to
 * prevent further edits until the next round begins.
 */
export default function PromptInput({ value, onChange, onSubmit, submitted }) {
  const maxChars = 500;

  // Example static suggestions. In a full implementation these could
  // be dynamically generated based on the image or user history.
  const suggestions = [
    'Añade un adjetivo',
    'Especifica el color',
    'Describe el fondo'
  ];

  return (
    <div className="prompt-input">
      <textarea
        placeholder="Escribe aquí tu prompt..."
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxChars))}
        maxLength={maxChars}
        disabled={submitted}
        rows={4}
      />
      <div className="prompt-meta">
        <span>{value.length}/{maxChars} caracteres</span>
        {!submitted && (
          <button className="primary-button" onClick={onSubmit}>
            Enviar
          </button>
        )}
      </div>
      {!submitted && (
        <div className="suggestions">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              className="suggestion"
              onClick={() => onChange(value ? `${value} ${s}` : s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}