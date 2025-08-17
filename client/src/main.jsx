import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Render the application into the root element. Using React 18
// concurrent rendering API for optimal performance.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);