import React, { useState } from 'react';
import { auth } from './firebase';
import UserAuth from './components/UserAuth';
import UserProfile from './components/UserProfile';
import AddFriend from './components/AddFriend';
import FriendsList from './components/FriendsList';
import './styles.css';

function App() {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false); // State to manage guest user
  const [guestUsername, setGuestUsername] = useState(''); // State to store guest username
  const [guestAvatar, setGuestAvatar] = useState(''); // State to store guest avatar

  const handleLogin = () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      setIsGuest(false);
    }
  };

  const handleGuestLogin = (guestUsername, guestAvatar) => {
    setGuestUsername(guestUsername);
    setGuestAvatar(guestAvatar);
    setIsGuest(true);
    setUser({ displayName: guestUsername, isGuest: true }); // Set user as guest
  };

  const handleLogout = () => {
    if (isGuest) {
      setIsGuest(false);
      setGuestUsername('');
      setGuestAvatar('');
      setUser(null);
    } else {
      auth.signOut().then(() => {
        setUser(null);
      });
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Cosmic Radiance</h1>
      </header>

      <main>
        {user ? (
          isGuest ? (
            <div className="guest-welcome">
              <h2>Welcome, {guestUsername}!</h2>
              <img
                src={guestAvatar}
                alt="Guest Avatar"
                style={{ width: '100px', height: '100px', borderRadius: '50%' }}
              />
              <button className="cosmic-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="user-profile-container">
              <UserProfile user={user} setUser={setUser} onLogout={handleLogout} />

              {/* Add Friend Section */}
              <div className="add-friend-section">
                <AddFriend currentUser={user} />
              </div>

              {/* Friends List Section */}
              <div className="friends-list-section">
                <FriendsList currentUser={user} />
              </div>
            </div>
          )
        ) : (
          <UserAuth onLogin={handleLogin} onGuestLogin={handleGuestLogin} />
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
