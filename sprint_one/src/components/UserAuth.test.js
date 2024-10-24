import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserAuth from './UserAuth';

// Mock Firebase Auth functions
const mockCreateUserWithEmailAndPassword = jest.fn();
const mockSignInWithEmailAndPassword = jest.fn();
const mockSendPasswordResetEmail = jest.fn();

// Mock implementation for the UserAuth component props
const mockOnLogin = jest.fn();
const mockOnGuestLogin = jest.fn();

// Mocking Firebase functions
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  createUserWithEmailAndPassword: (...args) => mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args) => mockSignInWithEmailAndPassword(...args),
  sendPasswordResetEmail: (...args) => mockSendPasswordResetEmail(...args),
}));

describe('UserAuth Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock alert
    global.alert = jest.fn();
  });

  test('allows user to create a new account', async () => {
    mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({
      user: { email: 'newuser@example.com' }
    });

    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);

    // Simulate toggling to sign-up mode
    fireEvent.click(screen.getByText(/sign up now/i));

    // Simulate entering email and password
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });

    // Simulate clicking the Sign Up button
    fireEvent.click(screen.getByText(/sign up/i));

    // Wait for the mock to be called
    await waitFor(() => expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledTimes(1));

    // Verify that onLogin callback was called
    expect(mockOnLogin).toHaveBeenCalled();
  });

  test('allows user to log in', async () => {
    mockSignInWithEmailAndPassword.mockResolvedValueOnce({
      user: { email: 'existinguser@example.com' }
    });

    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);

    // Simulate entering email and password
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'existinguser@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });

    // Simulate clicking the Log In button
    fireEvent.click(screen.getByText(/log in/i));

    // Wait for the mock to be called
    await waitFor(() => expect(mockSignInWithEmailAndPassword).toHaveBeenCalledTimes(1));

    // Verify that onLogin callback was called
    expect(mockOnLogin).toHaveBeenCalled();
  });

  test('allows user to create a guest account', () => {
    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);

    // Simulate clicking the Play as Guest button
    fireEvent.click(screen.getByText(/play as guest/i));

    // Verify that the guest login callback was called
    expect(mockOnGuestLogin).toHaveBeenCalledWith(expect.stringMatching(/guest\d{5}/));

    // Verify guest mode is activated
    expect(screen.getByText(/you are playing as a guest/i)).toBeInTheDocument();
  });

  test('displays error when trying to sign up with an existing email', async () => {
    // Mock "email already in use" error
    mockCreateUserWithEmailAndPassword.mockRejectedValueOnce({
      code: 'auth/email-already-in-use'
    });

    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);

    // Simulate toggling to sign-up mode
    fireEvent.click(screen.getByText(/sign up now/i));

    // Simulate entering email and password
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'existinguser@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });

    // Simulate clicking the Sign Up button
    fireEvent.click(screen.getByText(/sign up/i));

    // Wait for the alert to be called
    await waitFor(() => expect(global.alert).toHaveBeenCalledWith('This email is already in use. Please log in instead.'));
  });

  test('sends password reset email', async () => {
    mockSendPasswordResetEmail.mockResolvedValueOnce();

    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);

    // Simulate clicking the Forgot Password button
    fireEvent.click(screen.getByText(/forgot password\?/i));

    // Simulate entering email
    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), { target: { value: 'user@example.com' } });

    // Simulate clicking the Reset Password button
    fireEvent.click(screen.getByText(/reset password/i));

    // Wait for the mock to be called
    await waitFor(() => expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(expect.any(Object), 'user@example.com'));
  });
});