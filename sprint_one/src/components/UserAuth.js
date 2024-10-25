// src/components/UserAuth.js
import React, { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';



const UserAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // This is helpful with the transition between login and sign up
  const [isSigningUp, setIsSigningUp] = useState(false); 
  const [isResettingPassword, setIsResettingPassword] = useState(false); 


// TODO: @Brett here should go the functionality to login with firebase
  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('User logged in:', email);
    } catch (error){
      console.log('Error logging in:', error.message);
    }
  };


// TODO: @Brett here should go the functionality to sign up with firebase
  const handleSignUp = async (event) => {
    event.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      console.log('User signed up:', email);
    } catch(error) {
      console.error('Error signing up:', error.message);
    }
  };
  //TODO: @Ayo here i am handling password resetting
  /**
 * Sends a password reset email to the user's email address
 * @param {React.FormEvent} event 
 * @returns {Promise<void>}
 * @throws {FirebaseError} When email is invalid 
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
  }

  // HTML (front-end) is working
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
            <button type="submit" className="cosmic-button">Send Password Reset Email</button>
            <button
              className="switch-button"
              onClick={() => setIsResettingPassword(false)}
            >
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
              {isSigningUp ? "Log in here" : "Sign up now"}
            </button>
          </p>
        </>
      )}
    </section>
  );
};

export default UserAuth;