import React, {useState} from 'react';
import {auth} from './firebase';
import UserAuth from './components/UserAuth';
import UserProfile from './components/UserProfile';
import AddFriend from './components/AddFriend';
import FriendsList from './components/FriendsList';
//import Lobby from './components/Lobby'; // Import the Lobby component
import './styles.css';

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
    }
  };

  const handleLogout = () => {
    auth.signOut().then(() => { 
      setUser(null);
    });
  };

  return (
    <div className="container">
      <header>
        <h1>Cosmic Radiance</h1>
      </header>

      <main>
        {user ? (
          <div className="user-profile-container">
            {/* User Profile Section */}
            <div className="user-profile-section">
              <UserProfile user={user} setUser={setUser} onLogout={handleLogout} />
            </div>

            {/* Add Friend Section */}
            <div className="add-friend-section">
              <AddFriend currentUser={user} />
            </div>

            {/* Friends List Section */}
            <div className="friends-list-section">
              <FriendsList currentUser={user} />
            </div>
          </div>
        ) : (
          <UserAuth onLogin={handleLogin} />
        )}
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
