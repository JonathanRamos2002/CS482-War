import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { ref, getStorage, getDownloadURL } from 'firebase/storage';

const UserAuth = ({ onLogin, onGuestLogin }) => {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  const [guestUsername, setGuestUsername] = useState('');
  const [guestAvatar, setGuestAvatar] = useState('');

  const placeholder = `${process.env.PUBLIC_URL}/images/Guest-Avatar.jpg`;

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
    setGuestAvatar(placeholder); // Set the guest avatar to the placeholder image
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

  return (
    <section className="auth-container">
      {isGuest ? ( 
        <div className="guest-welcome">
          <h2>Welcome, {guestUsername}!</h2>
          <img
            src={guestAvatar}
            alt="Guest Avatar"
            className="guest-avatar"
          />
          <p>You are playing as a guest.</p>
        </div>
      ) : isResettingPassword ? (
        <>
          <h1>Reset Your Password</h1>
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
          <h1>{isSigningUp ? 'Register for Battle' : 'Enter the Cosmos'}</h1>
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
              {isSigningUp ? 'Sign Up' : 'Log In'}
            </button>
          </form>
          <button className="cosmic-button" onClick={handleGuestLogin}>
            Play as Guest
          </button>
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
    </section>
  );
};

export default UserAuth;