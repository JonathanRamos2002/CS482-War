import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UpdateAvatar from './UpdateAvatar';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

// Mock CSS
jest.mock('./UpdateAvatar.css', () => ({}));

// Mock Firebase modules
jest.mock('../firebase', () => ({
  storage: 'mock-storage'
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => 'mock-db'),
  doc: jest.fn(),
  updateDoc: jest.fn()
}));

describe('UpdateAvatar', () => {
  const mockUser = { uid: 'test-uid' };
  const mockSetUser = jest.fn();
  const mockSetSelectedImage = jest.fn();
  const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });

  beforeEach(() => {
    jest.clearAllMocks();
    ref.mockReturnValue('mock-storage-ref');
    uploadBytes.mockResolvedValue(undefined);
    getDownloadURL.mockResolvedValue('test-url');
    updateDoc.mockResolvedValue(undefined);
    global.console.error = jest.fn();

    // Reset all mocked functions
    mockSetUser.mockClear();
    mockSetSelectedImage.mockClear();
  });

  const simulateFileUpload = async (file) => {
    const { container } = render(
      <UpdateAvatar
        user={mockUser}
        setUser={mockSetUser}
        selectedImage="initial-image.jpg"
        setSelectedImage={mockSetSelectedImage}
      />
    );

    const input = container.querySelector('input[type="file"]');
    await act(async () => {
      fireEvent.change(input, {
        target: { files: file ? [file] : [] }
      });
    });

    return { container, input };
  };

  test('renders upload component correctly', async () => {
    const { container } = await simulateFileUpload(null);
    
    expect(screen.getByText('Upload a New Picture')).toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toHaveAttribute('accept', 'image/*');
  });

  test('handles successful file upload completely', async () => {
    const downloadURL = 'new-image-url';
    getDownloadURL.mockResolvedValueOnce(downloadURL);
    doc.mockReturnValueOnce('mock-user-doc');

    await simulateFileUpload(mockFile);

    await waitFor(() => {
      // Verify Firebase storage operations
      expect(ref).toHaveBeenCalledWith('mock-storage', `avatars/${mockUser.uid}`);
      expect(uploadBytes).toHaveBeenCalledWith('mock-storage-ref', mockFile);
      expect(getDownloadURL).toHaveBeenCalledWith('mock-storage-ref');

      // Verify state updates
      expect(mockSetSelectedImage).toHaveBeenCalledWith(downloadURL);
      expect(mockSetUser).toHaveBeenCalled();

      // Verify Firestore update
      expect(doc).toHaveBeenCalledWith('mock-db', 'users', mockUser.uid);
      expect(updateDoc).toHaveBeenCalledWith('mock-user-doc', {
        avatar: downloadURL
      });
    });

    // Verify loading state is cleaned up
    expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
  });

  test('shows and removes loading state correctly', async () => {
    uploadBytes.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    await simulateFileUpload(mockFile);

    // Verify loading state appears
    expect(screen.getByText('Uploading...')).toBeInTheDocument();

    await waitFor(() => {
      // Verify loading state is removed
      expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
    });
  });

  test('handles upload error correctly', async () => {
    const error = new Error('Upload failed');
    uploadBytes.mockRejectedValueOnce(error);

    await simulateFileUpload(mockFile);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('error uploading image:', error.message);
      expect(mockSetSelectedImage).not.toHaveBeenCalled();
      expect(mockSetUser).not.toHaveBeenCalled();
      expect(updateDoc).not.toHaveBeenCalled();
      expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
    });
  });

  test('handles download URL error correctly', async () => {
    uploadBytes.mockResolvedValueOnce(undefined);
    getDownloadURL.mockRejectedValueOnce(new Error('Download URL failed'));

    await simulateFileUpload(mockFile);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
      expect(mockSetSelectedImage).not.toHaveBeenCalled();
      expect(mockSetUser).not.toHaveBeenCalled();
      expect(updateDoc).not.toHaveBeenCalled();
    });
  });

  test('handles Firestore update error correctly', async () => {
    uploadBytes.mockResolvedValueOnce(undefined);
    getDownloadURL.mockResolvedValueOnce('test-url');
    updateDoc.mockRejectedValueOnce(new Error('Firestore update failed'));

    await simulateFileUpload(mockFile);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
      expect(mockSetSelectedImage).toHaveBeenCalled();
      expect(mockSetUser).toHaveBeenCalled();
    });
  });

  test('sets user correctly with new avatar', async () => {
    uploadBytes.mockResolvedValueOnce(undefined);
    const newAvatarUrl = 'new-avatar-url';
    getDownloadURL.mockResolvedValueOnce(newAvatarUrl);

    await simulateFileUpload(mockFile);

    await waitFor(() => {
      const setUserCallback = mockSetUser.mock.calls[0][0];
      const updatedUser = setUserCallback({ ...mockUser, avatar: 'old-avatar' });
      expect(updatedUser).toEqual({
        ...mockUser,
        avatar: 'initial-image.jpg'
      });
    });
  });

  test('handles empty file selection', async () => {
    const { container } = render(
      <UpdateAvatar
        user={mockUser}
        setUser={mockSetUser}
        selectedImage="initial-image.jpg"
        setSelectedImage={mockSetSelectedImage}
      />
    );

    const input = container.querySelector('input[type="file"]');
    await act(async () => {
      fireEvent.change(input, { target: { files: [] } });
    });

    expect(uploadBytes).not.toHaveBeenCalled();
    expect(getDownloadURL).not.toHaveBeenCalled();
    expect(mockSetSelectedImage).not.toHaveBeenCalled();
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  test('updates database with new avatar URL', async () => {
    const newAvatarUrl = 'new-avatar-url';
    getDownloadURL.mockResolvedValueOnce(newAvatarUrl);
    const mockDocRef = 'mock-doc-ref';
    doc.mockReturnValueOnce(mockDocRef);

    await simulateFileUpload(mockFile);

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
        avatar: newAvatarUrl
      });
    });
  });

  test('cleans up after successful upload', async () => {
    uploadBytes.mockResolvedValueOnce(undefined);
    getDownloadURL.mockResolvedValueOnce('test-url');
    updateDoc.mockResolvedValueOnce(undefined);

    await simulateFileUpload(mockFile);

    await waitFor(() => {
      expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
    });
  });
});