import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import {setDoc, doc} from 'firebase/firestore';
import {ref, getStorage, getDownloadURL} from 'firebase/storage';

const UserAuth = ({ onLogin, onGuestLogin }) => {
  // Transition between login and sign up
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Store the email and password respectively
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const placeholder = process.env.PUBLIC_URL + '/images/Guest-Avatar.jpg'

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('User signed in:', email);
      onLogin();
    } catch (error) {
      console.error('Error logging in:', error.message);
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
      try{
        avatar = await getDownloadURL(imageRef);
      } catch (error) {
        console.log('avatar not found, using placeholder image')
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
        console.error('This email is already in use. Please log in instead.');
      }
      console.error('Error signing up: ', error.message);
    }
  };

  // Function to generate guest username
  const generateGuestUsername = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000); // Generate 5 random digits
    return `guest${randomNum}`;
  };

  // Handle guest login (no Firebase)
  const handleGuestLogin = () => {
    const guestUsername = generateGuestUsername();
    alert(`You are playing as: ${guestUsername}`); // Display guest username in a pop-up
    if (onGuestLogin) {
      onGuestLogin(guestUsername); // Optional: Handle guest login in the parent component
    }
  };

  const renderGuestButton = () => {
    return (
      <button className="cosmic-button" onClick={handleGuestLogin}>
        Play as Guest
      </button>
    );
  };

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
      {isResettingPassword ? (
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
          {renderGuestButton()}
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
