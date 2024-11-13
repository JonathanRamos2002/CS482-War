import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FriendsList from './FriendsList';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

// Mock CSS
jest.mock('./FriendsList.css', () => ({}));

// Mock Chat component
jest.mock('./Chat', () => {
  return function MockChat({ onClose }) {
    return (
      <div data-testid="mock-chat">
        <button onClick={onClose}>Close Chat</button>
      </div>
    );
  };
});

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => 'mock-db'),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

describe('FriendsList', () => {
  const mockCurrentUser = {
    uid: 'current-user-123',
    email: 'test@example.com'
  };

  const mockFriends = [
    {
      uid: 'friend-1',
      email: 'friend1@test.com',
      username: 'Friend One',
      avatar: 'avatar1.jpg'
    },
    {
      uid: 'friend-2',
      email: 'friend2@test.com',
      username: 'Friend Two'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    console.log = jest.fn();
    console.warn = jest.fn();

    // Default mock implementations
    doc.mockReturnValue('mock-doc-ref');
    collection.mockReturnValue('mock-collection');
    query.mockReturnValue('mock-query');
    where.mockReturnValue('mock-where');

    // Setup successful mocks
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        friends: mockFriends.map(f => f.uid)
      })
    });

    getDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'friend-1' }]
    });
  });

  const renderComponent = () => {
    return render(<FriendsList currentUser={mockCurrentUser} />);
  };

  test('fetches and displays friends successfully', async () => {
    getDoc.mockImplementation((ref) => {
      if (ref === 'mock-doc-ref') {
        return Promise.resolve({
          exists: () => true,
          data: () => ({ friends: mockFriends.map(f => f.uid) })
        });
      }
      const friendId = mockFriends.find(f => ref.includes(f.uid));
      return Promise.resolve({
        exists: () => !!friendId,
        data: () => friendId
      });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Friend One')).toBeInTheDocument();
      expect(screen.getByText('Friend Two')).toBeInTheDocument();
    });
  });

  test('handles user data not existing', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => false
    });

    renderComponent();

    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith('User not found');
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });

  test('handles user without friends array', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({})
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });

  test('handles fetchFriends error', async () => {
    const error = new Error('Fetch failed');
    getDoc.mockRejectedValueOnce(error);

    renderComponent();

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(error);
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });

  test('handles non-existent friend documents', async () => {
    getDoc.mockImplementation((ref) => {
      if (ref === 'mock-doc-ref') {
        return Promise.resolve({
          exists: () => true,
          data: () => ({ friends: ['non-existent-friend'] })
        });
      }
      return Promise.resolve({
        exists: () => false
      });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });

  test('opens and closes chat successfully', async () => {
    getDoc.mockImplementation((ref) => {
      if (ref === 'mock-doc-ref') {
        return Promise.resolve({
          exists: () => true,
          data: () => ({ friends: mockFriends.map(f => f.uid) })
        });
      }
      const friendId = mockFriends.find(f => ref.includes(f.uid));
      return Promise.resolve({
        exists: () => !!friendId,
        data: () => friendId
      });
    });

    renderComponent();

    // Open chat
    await waitFor(() => {
      const messageButton = screen.getAllByText('Message Friend')[0];
      fireEvent.click(messageButton);
    });

    expect(screen.getByTestId('mock-chat')).toBeInTheDocument();

    // Close chat
    fireEvent.click(screen.getByText('Close Chat'));
    expect(screen.queryByTestId('mock-chat')).not.toBeInTheDocument();
  });

  test('handles friend without UID in chat', async () => {
    const invalidFriend = { username: 'Invalid Friend' };
    renderComponent();

    await waitFor(() => {
      // @ts-ignore - Testing invalid input
      openChat(invalidFriend);
    });

    expect(console.warn).toHaveBeenCalledWith('Friend UID is missing or undefined.');
  });

  test('handles complete friend removal process', async () => {
    // Mock successful email lookup
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'friend-1' }]
    });

    // Mock successful user data fetch
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ friends: ['friend-1', 'friend-2'] })
    });

    // Mock successful update
    updateDoc.mockResolvedValueOnce(undefined);

    renderComponent();

    await waitFor(() => {
      const removeButton = screen.getAllByText('Remove Friend')[0];
      fireEvent.click(removeButton);
    });

    expect(updateDoc).toHaveBeenCalledWith(
      'mock-doc-ref',
      { friends: ['friend-2'] }
    );
  });

  test('handles getDocumentNameByEmail empty result', async () => {
    getDocs.mockResolvedValueOnce({
      empty: true,
      docs: []
    });

    renderComponent();

    await waitFor(() => {
      const removeButton = screen.getAllByText('Remove Friend')[0];
      fireEvent.click(removeButton);
    });

    expect(updateDoc).not.toHaveBeenCalled();
  });

  test('handles getDocumentNameByEmail error', async () => {
    const error = new Error('Query failed');
    getDocs.mockRejectedValueOnce(error);

    renderComponent();

    await waitFor(() => {
      const removeButton = screen.getAllByText('Remove Friend')[0];
      fireEvent.click(removeButton);
    });

    expect(console.error).toHaveBeenCalledWith(error);
  });

  test('handles user not existing during friend removal', async () => {
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'friend-1' }]
    });

    getDoc.mockResolvedValueOnce({
      exists: () => false
    });

    renderComponent();

    await waitFor(() => {
      const removeButton = screen.getAllByText('Remove Friend')[0];
      fireEvent.click(removeButton);
    });

    expect(updateDoc).not.toHaveBeenCalled();
  });

  test('handles invalid friends data during removal', async () => {
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'friend-1' }]
    });

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ friends: 'invalid-data' })
    });

    renderComponent();

    await waitFor(() => {
      const removeButton = screen.getAllByText('Remove Friend')[0];
      fireEvent.click(removeButton);
    });

    expect(updateDoc).not.toHaveBeenCalled();
  });

  test('handles updateDoc error during friend removal', async () => {
    const error = new Error('Update failed');

    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'friend-1' }]
    });

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ friends: ['friend-1'] })
    });

    updateDoc.mockRejectedValueOnce(error);

    renderComponent();

    await waitFor(() => {
      const removeButton = screen.getAllByText('Remove Friend')[0];
      fireEvent.click(removeButton);
    });

    expect(console.error).toHaveBeenCalledWith('Error removing friend:', error);
  });

  test('handles manual friends refresh', async () => {
    renderComponent();

    await waitFor(() => {
      const refreshButton = screen.getByText('View Friends');
      fireEvent.click(refreshButton);
    });

    expect(getDoc).toHaveBeenCalledTimes(2);
  });

  test('handles null and undefined data cases', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => null
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });
});