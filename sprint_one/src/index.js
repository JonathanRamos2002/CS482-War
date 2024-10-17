// src/index.js
import React from 'react';            // Import React
import ReactDOM from 'react-dom/client'; // Import the ReactDOM for rendering
import App from './App';              // Import the main App component
import './styles.css';                // Import your global styles

// Create a root element for React to render into
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the App component into the root element
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

