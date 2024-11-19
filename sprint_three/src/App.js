import React, { useState } from 'react';
import { auth } from './firebase';
import UserAuth from './components/UserAuth';
import UserProfile from './components/UserProfile';
import AddFriend from './components/AddFriend';
import UpdateAvatar from './components/UpdateAvatar';
import FriendsList from './components/FriendsList';
import './styles.css';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AnimatedBackground } from 'animated-backgrounds';
import Lobby from './components/Lobby';
import GameTable from './components/GameTable';
import GameTableMultiplayer from './components/GameTableMultiplayer';
import Tutorial from './components/Tutorial';


function App() {
  const [user, setUser] = useState(null);
  const placeholder = process.env.PUBLIC_URL + '/images/Guest-Avatar.jpg';
  const [selectedImage, setSelectedImage] = useState(placeholder);

  const [isGuest, setIsGuest] = useState(false); // State to manage guest user
  const [guestUsername, setGuestUsername] = useState(''); // State to store guest username
  const [guestAvatar, setGuestAvatar] = useState(placeholder); // State to store guest avatar
  const navigate = useNavigate(); //hook for navigation
  const [showTutorial, setShowTutorial] = useState(false);



  const handleLogin = () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      setIsGuest(false);
    }
  };

  const handleGuestLogin = (guestUsername, guestAvatar) => {
    setGuestUsername(guestUsername);
    setGuestAvatar(placeholder);
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
      <button className="cosmic-button" onClick={() => navigate('/lobby')}>
        Continue to Lobby
      </button>
      <button className="cosmic-button" onClick={() => navigate('/table')}>
        Play Now
      </button>       
    </div>
  );

  const ProfilePage = 
  ( <div className="background-container">
      <UserProfile user={user} setUser={setUser} selectedImage={selectedImage} setSelectedImage={setSelectedImage} onLogout={handleLogout} />
      <div className="middle-container">
        <UpdateAvatar user={user} setUser={setUser} selectedImage={selectedImage} setSelectedImage={setSelectedImage}/>
        <AddFriend currentUser={user} />
        <button 
        className="cosmic-button tutorial-button"
        onClick={() => setShowTutorial(true)}
      >
        How to Play
      </button>
      </div>
      <FriendsList currentUser={user} />
      <button className="cosmic-button" onClick={() => navigate('/lobby')}>
        Continue to Lobby
      </button>
      <button className="cosmic-button" onClick={() => navigate('/table')}>
        Play Now
      </button>
    </div>
  );

  const AuthPage = 
  ( 
    <UserAuth onLogin={handleLogin} onGuestLogin={handleGuestLogin} />
  );
  /* 
   * Uncomment this code to change backgrounds on refresh, in AnimatedBackground component set animationName={animationName}
   * 
  import React, { useEffect } from 'react'; <-- if needed then move this to top of the file 
  const [animationName, setAnimationName] = useState('starryNight');
useEffect(() => {
    const animations = ['cosmicDust', 'starryNight', 'galaxySpiral'];
    const storedIndex = localStorage.getItem('backgroundAnimationIndex');
    const newIndex = storedIndex ? (parseInt(storedIndex) + 1) % animations.length : 0;
    setAnimationName(animations[newIndex]);
    localStorage.setItem('backgroundAnimationIndex', newIndex.toString());
  }, []);
  */

  return (
    <div>
      <AnimatedBackground animationName='cosmicDust' />
      {showTutorial && (
        <Tutorial onClose={() => setShowTutorial(false)} />
      )}
      <Routes>
        <Route path="/" element={user ? <Navigate to={isGuest ? "/guest" : "/profile"} /> : AuthPage}/>
        <Route path="/profile" element={user && !isGuest ? ProfilePage : <Navigate to="/" />} />
        <Route path="/guest" element={user && isGuest ? GuestPage : <Navigate to="/" />} />
        <Route path="/lobby" element={user ? <Lobby user={user} onLogout={handleLogout} isGuest={isGuest} /> : <Navigate to="/" />}/>
        <Route path="/table" element={user ? <GameTable user={user} isGuest={isGuest} guestUsername={guestUsername} /> : <Navigate to="/" />}/>
        <Route path="/table-multi" element={user ? <GameTableMultiplayer user1={user} /> : <Navigate to="/" />}/>
      </Routes>
    </div>
  );
}

export default App;