import React from 'react';
import SignUp from './components/SignUp';
import Login from './components/Login';
import UserProfile from './components/UserProfile';
import './styles.css';

function App() {
  return (
    <div className="container">
      <header>
        <h1>Cosmic Radiance War</h1>
        <p className="tagline">Conquer the Galaxy!</p>
      </header>

      <main>
        {/* You can toggle between Login and SignUp components */}
	{<Login />}
        {/*<SignUp />*/}
        {/* <UserProfile /> */}
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
