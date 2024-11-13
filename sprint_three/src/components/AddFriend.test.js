import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddFriend from './AddFriend';
import { getFirestore, getDocs, query, collection, where, getDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import '@testing-library/jest-dom';

// Mock CSS
jest.mock('./AddFriend.css', () => ({}));

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn()
}));

describe('AddFriend Component', () => {
  const mockCurrentUser = { uid: 'currentUserID' };
  const mockUser = { id: 'friend-user-id', email: 'friend@example.com', username: 'Friend' };
  
  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();
  });

  test('renders AddFriend component correctly', () => {
    render(<AddFriend currentUser={mockCurrentUser} />);
    expect(screen.getByText('Add Friend')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Email')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  test('handles input change', () => {
    render(<AddFriend currentUser={mockCurrentUser} />);
    const input = screen.getByPlaceholderText('Enter Email');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(input.value).toBe('test@example.com');
  });

  test('shows loading state during search', async () => {
    getDocs.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<AddFriend currentUser={mockCurrentUser} />);
    
    fireEvent.click(screen.getByText('Search'));
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  test('handles user not found', async () => {
    getDocs.mockResolvedValueOnce({
      empty: true,
      forEach: jest.fn()
    });

    render(<AddFriend currentUser={mockCurrentUser} />);
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });

  test('successfully searches and adds a friend', async () => {
    getDocs.mockResolvedValueOnce({
      empty: false,
      forEach: (callback) => {
        callback({ id: mockUser.id, data: () => mockUser });
      }
    });

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ friends: [] })
    });

    updateDoc.mockResolvedValueOnce();

    render(<AddFriend currentUser={mockCurrentUser} />);
    
    fireEvent.change(screen.getByPlaceholderText('Enter Email'), { 
      target: { value: 'friend@example.com' } 
    });
    
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(screen.getByText(/Found:/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Friend' }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Friend added as a friend!');
    });
  });

  test('prevents adding yourself as a friend', async () => {
    const selfUser = { id: mockCurrentUser.uid, email: 'self@example.com' };
    
    getDocs.mockResolvedValueOnce({
      empty: false,
      forEach: (callback) => {
        callback({ id: selfUser.id, data: () => selfUser });
      }
    });

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ friends: [] })
    });

    render(<AddFriend currentUser={mockCurrentUser} />);
    
    fireEvent.change(screen.getByPlaceholderText('Enter Email'), { 
      target: { value: 'self@example.com' } 
    });
    
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(screen.getByText(/Found:/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Friend' }));

    await waitFor(() => {
      expect(screen.getByText('unable to add yourself as a friend!')).toBeInTheDocument();
    });
  });

  test('prevents adding an existing friend', async () => {
    getDocs.mockResolvedValueOnce({
      empty: false,
      forEach: (callback) => {
        callback({ id: mockUser.id, data: () => mockUser });
      }
    });

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ friends: ['friend-user-id'] })
    });

    render(<AddFriend currentUser={mockCurrentUser} />);
    
    fireEvent.change(screen.getByPlaceholderText('Enter Email'), { 
      target: { value: 'friend@example.com' } 
    });
    
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(screen.getByText(/Found:/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Friend' }));

    await waitFor(() => {
      expect(screen.getByText('this user is already your friend!')).toBeInTheDocument();
    });
  });

  test('handles missing user data', async () => {
    getDocs.mockResolvedValueOnce({
      empty: false,
      forEach: (callback) => {
        callback({ id: mockUser.id, data: () => mockUser });
      }
    });

    getDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null
    });

    render(<AddFriend currentUser={mockCurrentUser} />);
    
    fireEvent.change(screen.getByPlaceholderText('Enter Email'), { 
      target: { value: 'friend@example.com' } 
    });
    
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(screen.getByText(/Found:/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Friend' }));

    await waitFor(() => {
      expect(screen.getByText('User data not found')).toBeInTheDocument();
    });
  });

  test('displays profile picture when available', async () => {
    const userWithPicture = { 
      ...mockUser, 
      profilePicture: 'http://example.com/profile.jpg' 
    };

    getDocs.mockResolvedValueOnce({
      empty: false,
      forEach: (callback) => {
        callback({ id: userWithPicture.id, data: () => userWithPicture });
      }
    });

    render(<AddFriend currentUser={mockCurrentUser} />);
    
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      const profilePic = screen.getByAltText('Profile');
      expect(profilePic).toBeInTheDocument();
      expect(profilePic.src).toBe(userWithPicture.profilePicture);
    });
  });

  test('clears state after successful friend addition', async () => {
    getDocs.mockResolvedValueOnce({
      empty: false,
      forEach: (callback) => {
        callback({ id: mockUser.id, data: () => mockUser });
      }
    });

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ friends: [] })
    });

    updateDoc.mockResolvedValueOnce();

    render(<AddFriend currentUser={mockCurrentUser} />);
    
    fireEvent.change(screen.getByPlaceholderText('Enter Email'), { 
      target: { value: 'friend@example.com' } 
    });
    
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(screen.getByText(/Found:/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Friend' }));

    await waitFor(() => {
      expect(screen.queryByText(/Found:/)).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter Email').value).toBe('');
    });
  });
});