import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserProfile from './UserProfile';
import { storage } from '../firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import '@testing-library/jest-dom';

// Mock CSS
jest.mock('./UserProfile.css', () => ({}));

// Mock Firebase
jest.mock('../firebase', () => ({
  storage: {}
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  getDownloadURL: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn()
}));

describe('UserProfile Component', () => {
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    username: 'TestUser'
  };

  const mockSetUser = jest.fn();
  const mockSetSelectedImage = jest.fn();
  const mockOnLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful profile image fetch
    ref.mockReturnValue('mockStorageRef');
    getDownloadURL.mockResolvedValue('mock-image-url');
    
    // Mock successful username fetch
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ username: 'TestUser' })
    });
  });

  test('renders user profile with fetched data', async () => {
    render(
      <UserProfile
        user={mockUser}
        setUser={mockSetUser}
        selectedImage="default-image.jpg"
        setSelectedImage={mockSetSelectedImage}
        onLogout={mockOnLogout}
      />
    );

    await waitFor(() => {
      expect(screen.getByAltText('User Avatar')).toBeInTheDocument();
      expect(screen.getByText(/Welcome, TestUser !/)).toBeInTheDocument();
    });
  });

  test('handles profile image fetch error', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    getDownloadURL.mockRejectedValueOnce(new Error('Fetch failed'));

    render(
      <UserProfile
        user={mockUser}
        setUser={mockSetUser}
        selectedImage="default-image.jpg"
        setSelectedImage={mockSetSelectedImage}
        onLogout={mockOnLogout}
      />
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  test('handles username fetch error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    getDoc.mockRejectedValueOnce(new Error('Username fetch failed'));

    render(
      <UserProfile
        user={mockUser}
        setUser={mockSetUser}
        selectedImage="default-image.jpg"
        setSelectedImage={mockSetSelectedImage}
        onLogout={mockOnLogout}
      />
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  test('enters edit mode and updates profile', async () => {
    render(
      <UserProfile
        user={mockUser}
        setUser={mockSetUser}
        selectedImage="default-image.jpg"
        setSelectedImage={mockSetSelectedImage}
        onLogout={mockOnLogout}
      />
    );

    // Enter edit mode
    fireEvent.click(screen.getByText('Update Profile'));
    expect(screen.getByText('Update Your Profile')).toBeInTheDocument();

    // Update form fields
    fireEvent.change(screen.getByLabelText('Username:'), {
      target: { value: 'NewUsername' }
    });
    fireEvent.change(screen.getByLabelText('Email:'), {
      target: { value: 'new@example.com' }
    });

    // Submit form
    updateDoc.mockResolvedValueOnce();
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalled();
      expect(mockSetUser).toHaveBeenCalled();
    });
  });

  test('handles update profile error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    updateDoc.mockRejectedValueOnce(new Error('Update failed'));

    render(
      <UserProfile
        user={mockUser}
        setUser={mockSetUser}
        selectedImage="default-image.jpg"
        setSelectedImage={mockSetSelectedImage}
        onLogout={mockOnLogout}
      />
    );

    fireEvent.click(screen.getByText('Update Profile'));
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  test('cancels profile edit', () => {
    render(
      <UserProfile
        user={mockUser}
        setUser={mockSetUser}
        selectedImage="default-image.jpg"
        setSelectedImage={mockSetSelectedImage}
        onLogout={mockOnLogout}
      />
    );

    fireEvent.click(screen.getByText('Update Profile'));
    expect(screen.getByText('Update Your Profile')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Update Your Profile')).not.toBeInTheDocument();
  });

  test('handles logout confirmation flow', () => {
    render(
      <UserProfile
        user={mockUser}
        setUser={mockSetUser}
        selectedImage="default-image.jpg"
        setSelectedImage={mockSetSelectedImage}
        onLogout={mockOnLogout}
      />
    );

    // Click logout button
    fireEvent.click(screen.getByText('Log Out'));
    expect(screen.getByText('Are you sure you want to log out?')).toBeInTheDocument();

    // Cancel logout
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Are you sure you want to log out?')).not.toBeInTheDocument();

    // Confirm logout
    fireEvent.click(screen.getByText('Log Out'));
    fireEvent.click(screen.getByText('Yes, Log Out'));
    expect(mockOnLogout).toHaveBeenCalled();
  });

  test('handles non-existent user data', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null
    });

    render(
      <UserProfile
        user={mockUser}
        setUser={mockSetUser}
        selectedImage="default-image.jpg"
        setSelectedImage={mockSetSelectedImage}
        onLogout={mockOnLogout}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(`Welcome, ${mockUser.email} !`)).toBeInTheDocument();
    });
  });

  test('handles form input changes', () => {
    render(
      <UserProfile
        user={mockUser}
        setUser={mockSetUser}
        selectedImage="default-image.jpg"
        setSelectedImage={mockSetSelectedImage}
        onLogout={mockOnLogout}
      />
    );

    fireEvent.click(screen.getByText('Update Profile'));

    const usernameInput = screen.getByLabelText('Username:');
    const emailInput = screen.getByLabelText('Email:');

    fireEvent.change(usernameInput, { target: { value: 'NewUser' } });
    fireEvent.change(emailInput, { target: { value: 'new@test.com' } });

    expect(usernameInput.value).toBe('NewUser');
    expect(emailInput.value).toBe('new@test.com');
  });

  test('renders with minimal user data', () => {
    const minimalUser = { uid: 'test-uid' };
    
    render(
      <UserProfile
        user={minimalUser}
        setUser={mockSetUser}
        selectedImage="default-image.jpg"
        setSelectedImage={mockSetSelectedImage}
        onLogout={mockOnLogout}
      />
    );

    expect(screen.getByAltText('User Avatar')).toBeInTheDocument();
  });
});