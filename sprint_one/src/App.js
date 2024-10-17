import React, {useState} from 'react';
import UserAuth from './components/UserAuth';
import UserProfile from './components/UserProfile';
import Lobby from './components/Lobby'; // Import the Lobby component
import './styles.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
    //TODO: @Brett, User Story 3
  }

  const handleLogout = () => {
    setIsLoggedIn(false);
    //TODO: @Ayo, User Story 4
  };

  return (
    <div className="container">
      <header>
        <h1>Cosmic Radiance</h1>
      </header>

      <main>
        {isLoggedIn ? (<UserProfile onLogout={() => setIsLoggedIn(false)}/>) : (<UserAuth onLogin={() => setIsLoggedIn(true)}/>)}
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
