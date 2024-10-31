import React, { useState } from 'react';
import { auth } from './firebase';
import UserAuth from './components/UserAuth';
import UserProfile from './components/UserProfile';
import AddFriend from './components/AddFriend';
import UpdateAvatar from './components/UpdateAvatar';
import FriendsList from './components/FriendsList';
import './styles.css';
import { Routes, Route, Navigate } from 'react-router-dom';


function App() {
  const [user, setUser] = useState(null);
  const placeholder = process.env.PUBLIC_URL + '/images/Guest-Avatar.jpg';
  const [selectedImage, setSelectedImage] = useState(placeholder);

  const [isGuest, setIsGuest] = useState(false); // State to manage guest user
  const [guestUsername, setGuestUsername] = useState(''); // State to store guest username
  const [guestAvatar, setGuestAvatar] = useState(placeholder); // State to store guest avatar


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

  const GuestPage = 
  ( <div className="guest-welcome">
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
  );

  const ProfilePage = 
  ( <div className="user-profile-container">
      <UserProfile user={user} setUser={setUser} selectedImage={selectedImage} setSelectedImage={setSelectedImage}                  onLogout={handleLogout} />

      <UpdateAvatar user={user} setUser={setUser} selectedImage={selectedImage} setSelectedImage={setSelectedImage}/>

      <AddFriend currentUser={user} />

      <FriendsList currentUser={user} />
    </div>
  );

  const AuthPage = 
  ( 
    <UserAuth onLogin={handleLogin} onGuestLogin={handleGuestLogin} />
  );

  return (
      <Routes>
        <Route path="/" element={user ? <Navigate to={isGuest ? "/guest" : "/profile"} /> : AuthPage}/>
        <Route path="/profile" element={user && !isGuest ? ProfilePage : <Navigate to="/" />} />
        <Route path="/guest" element={user && isGuest ? GuestPage : <Navigate to="/" />} />
      </Routes>
  );
}

export default App;
