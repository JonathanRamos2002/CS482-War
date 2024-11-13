// src/index.js
import React from 'react';            // Import React
import ReactDOM from 'react-dom/client'; // Import the ReactDOM for rendering
import App from './App';              // Import the main App component
import './styles.css';                // Import your global styles
import { BrowserRouter as Router } from 'react-router-dom';


// Create a root element for React to render into
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the App component into the root element
root.render(
  <Router>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </Router>
);

