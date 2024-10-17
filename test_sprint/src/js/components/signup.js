// src/components/signup.js
import React, { useState } from 'react';
import { signUp } from '../auth';

function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async (event) => {
    event.preventDefault();
    try {
      const newUser = await signUp(email, password);
      console.log("Signed up as:", newUser.email);
    } catch (error) {
      console.error("Sign up failed:", error.message);
    }
  };

  return (
    <section className="signup-section">
      <h2>Create an Account</h2>
      <form onSubmit={handleSignUp}>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />

        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />

        <button type="submit" className="cosmic-button">Sign Up</button>
      </form>
    </section>
  );
}

export default signup;

