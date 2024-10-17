// src/components/login.js
import React, { useState } from 'react';
import { login } from '../auth';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      const user = await login(email, password);
      console.log("Logged in as:", user.email);
    } catch (error) {
      console.error("Login failed:", error.message);
    }
  };

  return (
    <section className="login-section">
      <h2>Log In</h2>
      <form onSubmit={handleLogin}>
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

        <button type="submit" className="cosmic-button">Log In</button>
      </form>
    </section>
  );
}

export default login;

