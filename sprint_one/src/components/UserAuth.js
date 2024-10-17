// src/components/UserAuth.js
import React, { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';


const UserAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // This is helpful with the transition between login and sign up
  const [isSigningUp, setIsSigningUp] = useState(false); 


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

  // HTML (front-end) is working
  return (
    <section className="auth-container">
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

      {/* Toggle between Login and Sign Up */}
      {!isSigningUp ? (
        <p>
          Don't have an account?{' '}
          <button
            className="switch-button"
            onClick={() => setIsSigningUp(true)}
          >
            Sign up now
          </button>
        </p>
      ) : (
        <p>
          Already have an account?{' '}
          <button
            className="switch-button"
            onClick={() => setIsSigningUp(false)}
          >
            Log in here
          </button>
        </p>
      )}
    </section>
  );

};

export default UserAuth;

