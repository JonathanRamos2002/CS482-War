import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserAuth from './UserAuth';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { ref, getStorage, getDownloadURL } from 'firebase/storage';
import '@testing-library/jest-dom';

// Mock CSS
jest.mock('./UserAuth.css', () => ({}));

// Mock Firebase modules
jest.mock('../firebase', () => ({
  auth: {},
  db: {},
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  setDoc: jest.fn(),
  doc: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  getStorage: jest.fn(),
  getDownloadURL: jest.fn(),
}));

describe('UserAuth Component', () => {
  const mockOnLogin = jest.fn();
  const mockOnGuestLogin = jest.fn();
  const mockEmail = 'test@example.com';
  const mockPassword = 'password123';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PUBLIC_URL = '';
    global.console.error = jest.fn();
    global.console.log = jest.fn();
    global.alert = jest.fn();
  });

  test('renders login form by default', () => {
    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);
    
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByText('Enter the Cosmos')).toBeInTheDocument();
    expect(screen.getByText('Play as Guest')).toBeInTheDocument();
  });

  test('switches between login and signup forms', () => {
    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);
    
    fireEvent.click(screen.getByText('Sign up now'));
    expect(screen.getByText('Join the Revolution')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Log in here'));
    expect(screen.getByText('Enter the Cosmos')).toBeInTheDocument();
  });

  test('handles successful login', async () => {
    signInWithEmailAndPassword.mockResolvedValueOnce({ user: { email: mockEmail } });
    
    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);
    
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: mockEmail } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: mockPassword } });
    fireEvent.click(screen.getByText('Enter the Cosmos'));

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });

  test('handles login errors', async () => {
    const wrongPasswordError = { code: 'auth/wrong-password', message: 'Wrong password' };
    signInWithEmailAndPassword.mockRejectedValueOnce(wrongPasswordError);
    
    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);
    
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: mockEmail } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: mockPassword } });
    fireEvent.click(screen.getByText('Enter the Cosmos'));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Incorrect password. Please try again.');
    });

    // Test generic error
    signInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/other-error', message: 'Other error' });
    fireEvent.click(screen.getByText('Enter the Cosmos'));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Error logging in. Please check your credentials.');
    });
  });

  test('handles successful signup', async () => {
    const mockUser = { uid: 'test-uid', email: mockEmail };
    createUserWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser });
    getDownloadURL.mockResolvedValueOnce('avatar-url');
    setDoc.mockResolvedValueOnce();
    
    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);
    
    fireEvent.click(screen.getByText('Sign up now'));
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: mockEmail } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: mockPassword } });
    fireEvent.click(screen.getByText('Join the Revolution'));

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalled();
    });
  });

  test('handles signup errors', async () => {
    createUserWithEmailAndPassword.mockRejectedValueOnce({ 
      code: 'auth/email-already-in-use',
      message: 'Email already in use'
    });
    
    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);
    
    fireEvent.click(screen.getByText('Sign up now'));
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: mockEmail } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: mockPassword } });
    fireEvent.click(screen.getByText('Join the Revolution'));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('This email is already in use. Please log in instead.');
    });

    // Test generic signup error
    createUserWithEmailAndPassword.mockRejectedValueOnce({ 
      code: 'auth/other-error',
      message: 'Other error'
    });
    fireEvent.click(screen.getByText('Join the Revolution'));

    await waitFor(() => {
      expect(global.console.error).toHaveBeenCalled();
    });
  });

  test('handles guest login', () => {
    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);
    
    fireEvent.click(screen.getByText('Play as Guest'));
    
    expect(mockOnGuestLogin).toHaveBeenCalled();
    expect(screen.getByText(/Welcome, guest\d{5}!/)).toBeInTheDocument();
  });

  test('handles password reset flow', async () => {
    sendPasswordResetEmail.mockResolvedValueOnce();
    
    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);
    
    fireEvent.click(screen.getByText('Forgot Password?'));
    expect(screen.getByText('Reset Your Password')).toBeInTheDocument();
    
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { 
      target: { value: mockEmail } 
    });
    fireEvent.click(screen.getByText('Reset Password'));

    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, mockEmail);
    });
  });

  test('handles password reset errors', async () => {
    sendPasswordResetEmail.mockRejectedValueOnce(new Error('Reset failed'));
    
    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);
    
    fireEvent.click(screen.getByText('Forgot Password?'));
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), { 
      target: { value: mockEmail } 
    });
    fireEvent.click(screen.getByText('Reset Password'));

    await waitFor(() => {
      expect(global.console.error).toHaveBeenCalled();
    });
  });

  test('handles navigation between forms', () => {
    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);
    
    // Go to password reset
    fireEvent.click(screen.getByText('Forgot Password?'));
    expect(screen.getByText('Reset Your Password')).toBeInTheDocument();
    
    // Back to login
    fireEvent.click(screen.getByText('Back to Login'));
    expect(screen.getByText('Enter the Cosmos')).toBeInTheDocument();
  });

  test('handles avatar not found during signup', async () => {
    const mockUser = { uid: 'test-uid', email: mockEmail };
    createUserWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser });
    getDownloadURL.mockRejectedValueOnce(new Error('Avatar not found'));
    setDoc.mockResolvedValueOnce();
    
    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);
    
    fireEvent.click(screen.getByText('Sign up now'));
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: mockEmail } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: mockPassword } });
    fireEvent.click(screen.getByText('Join the Revolution'));

    await waitFor(() => {
      expect(global.console.log).toHaveBeenCalledWith('Avatar not found, using placeholder image');
    });
  });

  test('renders footer links', () => {
    render(<UserAuth onLogin={mockOnLogin} onGuestLogin={mockOnGuestLogin} />);
    
    expect(screen.getByText('Explore Cosmos')).toBeInTheDocument();
    expect(screen.getByText('Rules of War')).toBeInTheDocument();
    expect(screen.getByText('Galactic Support')).toBeInTheDocument();
  });
});