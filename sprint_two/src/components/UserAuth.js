import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { ref, getStorage, getDownloadURL } from 'firebase/storage';
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

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('User signed in:', email);
      onLogin();
    } catch (error) {
      console.error('Error during login:', error);
      // Check error codes for incorrect password or user not found
      if (error.code === 'auth/wrong-password') {
        alert('Incorrect password. Please try again.');
      } else {
        console.error('Error logging in:', error.message);
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
      } catch (error) {
        console.log('Avatar not found, using placeholder image');
      }

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        username: email.split('@')[0],
        avatar: avatar,
        friends: [],
      });

      console.log('User signed up:', email);
      onLogin();
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        alert('This email is already in use. Please log in instead.');
      } else {
        console.error('Error signing up:', error.message);
      }
    }
  };

  // Generate a guest username
  const generateGuestUsername = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `guest${randomNum}`;
  };

  // Handle guest login
  const handleGuestLogin = () => {
    const guestUsername = generateGuestUsername();
    setGuestUsername(guestUsername);
    setGuestAvatar(guestAvatar); // Set the guest avatar to the placeholder image
    setIsGuest(true);
    if (onGuestLogin) {
      onGuestLogin(guestUsername);
    }
  };
    /**
 * Sends a password reset email to the user's email address
 * @param {React.FormEvent} event 
 * @returns {Promise<void>}
 * @throws {FirebaseError} When email is invalid.
 * @example
 * handleForgotPassword(event) 
 */
  const handleForgotPassword = async (event) => {
    event.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent to:', email);
      setIsResettingPassword(false);
    } catch (error) {
      console.error('Error sending password reset email:', error.message);
    }
  };

  const logo = process.env.PUBLIC_URL + '/images/Logo.png';

  return (
    <section className="container">
      <div className='logo-container'>
        <img src={logo} alt="Cosmic Radiance Logo" className='logo'/>
      </div>
      {isGuest ? ( 
        <div className="guest-welcome">
          <h2>Welcome, {guestUsername}!</h2>
          <img src={placeholder} alt="Guest Avatar" className='profile-picture'/>
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
            <button type="submit" className="cosmic-button">Reset Password</button>
            <button className="return-login" onClick={() => setIsResettingPassword(false)}>
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
            <button className="cosmic-button" onClick={handleGuestLogin}>Play as Guest</button>
          </form>
          {!isSigningUp && (
            <p>
              <button className="switch-button" onClick={() => setIsResettingPassword(true)}>
                Forgot Password?
              </button>
            </p>
          )}
          <p>
            {isSigningUp ? "Already have an account? " : "Don't have an account? "}
            <button className="switch-button" onClick={() => setIsSigningUp(!isSigningUp)}>
              {isSigningUp ? "Log in here" : "Sign up now"}
            </button>
          </p>
        </>
      )}
      <footer>
        <a href="#">Explore Cosmos</a>
        <a href="#">Rules of War</a>
        <a href="#">Galactic Support</a>
      </footer>
    </section>
  );
};

export default UserAuth;