import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import UserProfile, { incrementWins, incrementLosses } from './UserProfile';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, getDoc, updateDoc, setDoc, deleteDoc, collection, getDocs, increment } from 'firebase/firestore';
import '@testing-library/jest-dom';

// Mock CSS
jest.mock('./UserProfile.css', () => ({}));

// Mock Firebase
jest.mock('../firebase', () => ({
  storage: {}
}));

// Mock all Firebase functions
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  getDownloadURL: jest.fn(),
  uploadBytes: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
  increment: jest.fn(),
  addDoc: jest.fn()
}));

describe('UserProfile Component and Functions', () => {
  // Test Increment Functions
  describe('Increment Functions', () => {
    const mockDb = 'mock-db';
    const mockUser = { uid: 'test-uid' };

    beforeEach(() => {
      jest.clearAllMocks();
      console.error = jest.fn();
      console.log = jest.fn();
    });

    test('incrementWins with existing wins field', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ wins: 5, losses: 3 })
      });

      await incrementWins(mockDb, mockUser);

      expect(updateDoc).toHaveBeenCalledWith(
        undefined,
        { wins: increment(1) }
      );
    });

    test('incrementWins with undefined wins field', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ losses: 3 })
      });

      await incrementWins(mockDb, mockUser);

      expect(updateDoc).toHaveBeenCalledTimes(2);
    });

    test('incrementLosses with existing losses field', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ wins: 5, losses: 3 })
      });

      await incrementLosses(mockDb, mockUser);

      expect(updateDoc).toHaveBeenCalledWith(
        undefined,
        { losses: increment(1) }
      );
    });

    test('incrementLosses with undefined losses field', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ wins: 5 })
      });

      await incrementLosses(mockDb, mockUser);

      expect(updateDoc).toHaveBeenCalledTimes(2);
    });

    test('handles non-existent user for incrementWins', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => false
      });

      await incrementWins(mockDb, mockUser);

      expect(console.error).toHaveBeenCalledWith('User document does not exist.');
    });

    test('handles error in incrementWins', async () => {
      getDoc.mockRejectedValueOnce(new Error('Database error'));

      await incrementWins(mockDb, mockUser);

      expect(console.error).toHaveBeenCalledWith('Error incrementing wins:', expect.any(Error));
    });
  });

  // Test UserProfile Component
  describe('UserProfile Component', () => {
    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com'
    };

    const defaultProps = {
      user: mockUser,
      setUser: jest.fn(),
      selectedImage: 'default-image.jpg',
      setSelectedImage: jest.fn(),
      onLogout: jest.fn()
    };

    beforeEach(() => {
      jest.clearAllMocks();
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          username: 'TestUser',
          wins: 5,
          losses: 3,
          isAdmin: false
        })
      });
    });

    // Stats Display Tests
    test('displays and updates stats', async () => {
      render(<UserProfile {...defaultProps} />);

      // Click to show stats
      fireEvent.click(screen.getByText('Display Stats'));

      await waitFor(() => {
        expect(screen.getByText('Wins: 5')).toBeInTheDocument();
        expect(screen.getByText('Losses: 3')).toBeInTheDocument();
      });
    });

    test('creates new stats document if none exists', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => false
      });

      render(<UserProfile {...defaultProps} />);

      fireEvent.click(screen.getByText('Display Stats'));

      await waitFor(() => {
        expect(setDoc).toHaveBeenCalledWith(
          expect.anything(),
          { wins: 0, losses: 0 },
          { merge: true }
        );
      });
    });

    // Admin Features Tests
    test('handles admin features', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          username: 'TestUser',
          isAdmin: true
        })
      });

      render(<UserProfile {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Ads')).toBeInTheDocument();
      });
    });

    test('handles ad upload process', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          username: 'TestUser',
          isAdmin: true
        })
      });

      getDocs.mockResolvedValueOnce({
        docs: [{ ref: 'doc-ref' }]
      });

      uploadBytes.mockResolvedValueOnce();
      getDownloadURL.mockResolvedValueOnce('test-url');

      render(<UserProfile {...defaultProps} />);

      // Open ads modal
      await waitFor(() => {
        fireEvent.click(screen.getByText('Ads'));
      });

      // Set ad image and URL
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      fireEvent.change(screen.getByAcceptText('image/*'), {
        target: { files: [file] }
      });

      fireEvent.change(screen.getByPlaceholderText('Enter Target URL'), {
        target: { value: 'http://test.com' }
      });

      // Upload ad
      fireEvent.click(screen.getByText('Upload Ad'));

      await waitFor(() => {
        expect(uploadBytes).toHaveBeenCalled();
        expect(deleteDoc).toHaveBeenCalled();
      });
    });

    test('handles ad upload errors', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          username: 'TestUser',
          isAdmin: true
        })
      });

      uploadBytes.mockRejectedValueOnce(new Error('Upload failed'));

      render(<UserProfile {...defaultProps} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Ads'));
      });

      const file = new File(['test'], 'test.png', { type: 'image/png' });
      fireEvent.change(screen.getByAcceptText('image/*'), {
        target: { files: [file] }
      });

      fireEvent.change(screen.getByPlaceholderText('Enter Target URL'), {
        target: { value: 'http://test.com' }
      });

      fireEvent.click(screen.getByText('Upload Ad'));

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error during ad upload process:', expect.any(Error));
      });
    });

    // Profile Update Tests
    test('handles profile update with all fields empty', async () => {
      render(<UserProfile {...defaultProps} />);

      fireEvent.click(screen.getByText('Update Profile'));
      fireEvent.change(screen.getByLabelText('Username:'), { target: { value: '' } });
      fireEvent.change(screen.getByLabelText('Email:'), { target: { value: '' } });
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(updateDoc).toHaveBeenCalledWith(
          expect.anything(),
          { username: '', email: '' }
        );
      });
    });

    // Error Handling Tests
    test('handles getUserStats error', async () => {
      getDoc.mockRejectedValueOnce(new Error('Stats fetch failed'));

      render(<UserProfile {...defaultProps} />);

      fireEvent.click(screen.getByText('Display Stats'));

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error fetching or creating user stats:', expect.any(Error));
      });
    });

    test('handles multiple profile image fetch attempts', async () => {
      getDownloadURL.mockRejectedValueOnce(new Error('Fetch failed'));

      const { rerender } = render(<UserProfile {...defaultProps} />);

      await waitFor(() => {
        expect(getDownloadURL).toHaveBeenCalledTimes(1);
      });

      rerender(<UserProfile {...defaultProps} />);

      await waitFor(() => {
        expect(getDownloadURL).toHaveBeenCalledTimes(1); // Should not fetch again
      });
    });
  });
});