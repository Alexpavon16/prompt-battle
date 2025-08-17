import React, { useRef, useState } from 'react';

/**
 * Displays an image with basic pinch‑to‑zoom support for mobile devices.
 * For simplicity this component uses CSS transforms rather than
 * implementing a full featured zoom/pan library. You can enhance this
 * component by adding double‑tap to zoom, pinch gestures and panning.
 */
export default function ImageDisplay({ src, alt }) {
  const imgRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [lastDistance, setLastDistance] = useState(null);

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      const [touch1, touch2] = e.touches;
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      if (lastDistance) {
        const delta = currentDistance - lastDistance;
        const newScale = Math.min(Math.max(1, scale + delta * 0.005), 3);
        setScale(newScale);
      }
      setLastDistance(currentDistance);
    }
  };
  const handleTouchEnd = () => {
    setLastDistance(null);
  };

  return (
    <div
      className="image-display"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        style={{ transform: `scale(${scale})` }}
      />
    </div>
  );
}