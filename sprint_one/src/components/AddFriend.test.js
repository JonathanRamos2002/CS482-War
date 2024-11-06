// src/components/AddFriend.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddFriend from './AddFriend';

// Mock Firebase
const mockUpdateDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockArrayUnion = jest.fn(x => x);

jest.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: () => ({}),
  query: () => ({}),
  where: () => ({}),
  doc: () => ({}),
  getDocs: (...args) => mockGetDocs(...args),
  getDoc: (...args) => mockGetDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  arrayUnion: (...args) => mockArrayUnion(...args)
}));

describe('AddFriend', () => {
  const mockCurrentUser = { uid: 'testUid' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders search input and button', () => {
    render(<AddFriend currentUser={mockCurrentUser} />);
    expect(screen.getByPlaceholderText('Enter Email')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  test('handles user search with no results', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true });

    render(<AddFriend currentUser={mockCurrentUser} />);
    
    const input = screen.getByPlaceholderText('Enter Email');
    fireEvent.change(input, { target: { value: 'test@test.com' } });
    
    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });

  test('handles successful user search', async () => {
    const mockFoundUser = {
      id: 'userId',
      email: 'found@test.com',
      profilePicture: 'pic.jpg'
    };

    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      forEach: (cb) => cb({
        id: mockFoundUser.id,
        data: () => mockFoundUser
      })
    });

    render(<AddFriend currentUser={mockCurrentUser} />);
    
    const input = screen.getByPlaceholderText('Enter Email');
    fireEvent.change(input, { target: { value: mockFoundUser.email } });
    
    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(`Found: ${mockFoundUser.email}`)).toBeInTheDocument();
    });
  });

  test('handles adding a new friend successfully', async () => {
    const mockFoundUser = {
      id: 'userId',
      email: 'found@test.com',
      username: 'TestUser'
    };

    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      forEach: (cb) => cb({
        id: mockFoundUser.id,
        data: () => mockFoundUser
      })
    });

    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ friends: [] })
    });

    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<AddFriend currentUser={mockCurrentUser} />);
    
    const input = screen.getByPlaceholderText('Enter Email');
    fireEvent.change(input, { target: { value: mockFoundUser.email } });
    
    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    await waitFor(async () => {
      const addButton = screen.getByText('Add Friend');
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(alertMock).toHaveBeenCalledWith(`${mockFoundUser.username} added as a friend!`);
    });

    alertMock.mockRestore();
  });

  test('handles case when user is already a friend', async () => {
    const mockFoundUser = {
      id: 'userId',
      email: 'found@test.com'
    };

    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      forEach: (cb) => cb({
        id: mockFoundUser.id,
        data: () => mockFoundUser
      })
    });

    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ friends: ['userId'] })
    });

    render(<AddFriend currentUser={mockCurrentUser} />);
    
    const input = screen.getByPlaceholderText('Enter Email');
    fireEvent.change(input, { target: { value: mockFoundUser.email } });
    
    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    await waitFor(async () => {
      const addButton = screen.getByText('Add Friend');
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(screen.getByText('this user is already your friend!')).toBeInTheDocument();
    });
  });

  test('handles error when user data not found', async () => {
    const mockFoundUser = {
      id: 'userId',
      email: 'found@test.com'
    };

    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      forEach: (cb) => cb({
        id: mockFoundUser.id,
        data: () => mockFoundUser
      })
    });

    mockGetDoc.mockResolvedValueOnce({
      exists: () => false
    });

    render(<AddFriend currentUser={mockCurrentUser} />);
    
    const input = screen.getByPlaceholderText('Enter Email');
    fireEvent.change(input, { target: { value: mockFoundUser.email } });
    
    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    await waitFor(async () => {
      const addButton = screen.getByText('Add Friend');
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(screen.getByText('User data not found')).toBeInTheDocument();
    });
  });

  test('shows loading state during search', async () => {
    // Delay the mock response to ensure we can check loading state
    mockGetDocs.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<AddFriend currentUser={mockCurrentUser} />);
    
    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });
});