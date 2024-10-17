// src/App.js
import React from 'react';
import Login from './components/login';
import SignUp from './components/signup';

function App() {
  return (
    <div className="container">
      <header>
        <h1>Cosmic Radiance War</h1>
        <p className="tagline">Conquer the Galaxy!</p>
      </header>
      
      <main>
        <Login />
        <SignUp />
      </main>
      
      <footer>
        <a href="#">Explore the Cosmos</a>
        <a href="#">Rules of War</a>
        <a href="#">Contact Galactic Support</a>
      </footer>
    </div>
  );
}

export default App;

