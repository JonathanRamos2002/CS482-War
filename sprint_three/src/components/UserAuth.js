import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { ref, getStorage, getDownloadURL } from 'firebase/storage';
import { collection, getDocs } from 'firebase/firestore'; // Correct Firestore imports
import './UserAuth.css';

const UserAuth = ({ onLogin, onGuestLogin }) => {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  const [guestUsername, setGuestUsername] = useState('');
  const placeholder = process.env.PUBLIC_URL + '/images/Guest-Avatar.jpg';
  const [guestAvatar, setGuestAvatar] = useState(placeholder);
  const [ads, setAds] = useState([]);

  // Fetch ads from Firestore
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const adsCollection = collection(db, 'ads');
        const adsSnapshot = await getDocs(adsCollection);
        const adsList = adsSnapshot.docs.map((doc) => doc.data());
        setAds(adsList); // Update the ads state
      } catch (error) {
        console.error('Error fetching ads:', error);
      }
    };

    fetchAds();
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (error) {
      console.error('Error during login:', error);
      if (error.code === 'auth/wrong-password') {
        alert('Incorrect password. Please try again.');
      } else {
        alert('Error logging in. Please check your credentials.');
      }
    }
  };

  const handleSignUp = async (event) => {
    event.preventDefault();
    try {
      const userRef = await createUserWithEmailAndPassword(auth, email, password);
      const user = userRef.user;

      const avatarPath = `avatars/${user.uid}`;
      let avatar = placeholder;

      const imageRef = ref(getStorage(), avatarPath);
      try {
        avatar = await getDownloadURL(imageRef);
      } catch {
        console.log('Avatar not found, using placeholder image.');
      }

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        username: email.split('@')[0],
        avatar,
        friends: [],
      });

      onLogin();
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        alert('This email is already in use. Please log in instead.');
      } else {
        console.error('Error signing up:', error.message);
      }
    }
  };

  const generateGuestUsername = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `guest${randomNum}`;
  };

  const handleGuestLogin = () => {
    const guestUsername = generateGuestUsername();
    setGuestUsername(guestUsername);
    setGuestAvatar(guestAvatar); // Set the guest avatar to the placeholder image
    setIsGuest(true);
    if (onGuestLogin) {
      onGuestLogin(guestUsername);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      setIsResettingPassword(false);
    } catch (error) {
      console.error('Error sending password reset email:', error.message);
    }
  };

  const logo = process.env.PUBLIC_URL + '/images/Logo3_Background_Removed.png';

  return (
    <section className="auth-container">
      <div className="ads-container left">
        {ads.map((ad, index) => (
          <a href={ad.targetUrl} target="_blank" rel="noopener noreferrer" key={index}>
            <img src={ad.imageUrl} alt="Ad" className="ad-image" />
          </a>
        ))}
      </div>
      <div className="auth-content">
        <div className="logo-container">
          <img src={logo} alt="Cosmic Radiance Logo" className="logo" />
        </div>
        {isGuest ? (
          <div className="guest-welcome">
            <h2>Welcome, {guestUsername}!</h2>
            <img src={placeholder} alt="Guest Avatar" className="profile-picture" />
            <p>You are playing as a guest.</p>
          </div>
        ) : isResettingPassword ? (
          <>
            <h2>Reset Your Password</h2>
            <form onSubmit={handleForgotPassword}>
              <input
                type="email"
                id="reset-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
              <button type="submit" className="cosmic-button">
                Reset Password
              </button>
              <button
                type="button"
                className="return-login"
                onClick={() => setIsResettingPassword(false)}
              >
                Back to Login
              </button>
            </form>
          </>
        ) : (
          <>
            <form onSubmit={isSigningUp ? handleSignUp : handleLogin}>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
              />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
              <button type="submit" className="cosmic-button">
                {isSigningUp ? 'Join the Revolution' : 'Enter the Cosmos'}
              </button>
              <button
                type="button"
                className="cosmic-button"
                onClick={handleGuestLogin}
              >
                Play as Guest
              </button>
            </form>
            {!isSigningUp && (
              <p>
                <button
                  className="switch-button"
                  onClick={() => setIsResettingPassword(true)}
                >
                  Forgot Password?
                </button>
              </p>
            )}
            <p>
              {isSigningUp ? "Already have an account? " : "Don't have an account? "}
              <button
                className="switch-button"
                onClick={() => setIsSigningUp(!isSigningUp)}
              >
                {isSigningUp ? 'Log in here' : 'Sign up now'}
              </button>
            </p>
          </>
        )}
        <footer>
          <a href="#">Explore Cosmos</a>
          <a href="#">Rules of War</a>
          <a href="#">Galactic Support</a>
        </footer>
      </div>
      <div className="ads-container right">
        {ads.map((ad, index) => (
          <a href={ad.targetUrl} target="_blank" rel="noopener noreferrer" key={index}>
            <img src={ad.imageUrl} alt="Ad" className="ad-image" />
          </a>
        ))}
      </div>
    </section>
  );
};

export default UserAuth;
